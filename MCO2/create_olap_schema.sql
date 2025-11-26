-- 0. Clean up
DROP TABLE IF EXISTS fact_sales CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;
DROP TABLE IF EXISTS dim_product CASCADE;
DROP TABLE IF EXISTS dim_customer CASCADE;
DROP TABLE IF EXISTS "Set", Card, Customer, Product, "Order", OrderItem CASCADE;
DROP SUBSCRIPTION IF EXISTS olap_sub;

-- ==========================================
-- 1. OLAP DESTINATION SCHEMA
-- ==========================================
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL,
    day_of_week INT,
    day_name VARCHAR(20),
    month INT,
    month_name VARCHAR(20),
    quarter INT,
    year INT,
    is_weekend BOOLEAN
);

CREATE TABLE dim_product (
    product_key SERIAL PRIMARY KEY,
    product_id_oltp INT,
    card_name VARCHAR(255),
    set_name VARCHAR(255),
    series_name VARCHAR(255),
    rarity VARCHAR(50),
    condition VARCHAR(50),
    current_price DECIMAL(10, 2),
    CONSTRAINT unique_product_oltp UNIQUE (product_id_oltp)
);

CREATE TABLE dim_customer (
    customer_key SERIAL PRIMARY KEY,
    customer_id_oltp INT,
    user_name VARCHAR(100),
    full_name VARCHAR(255),
    CONSTRAINT unique_customer_oltp UNIQUE (customer_id_oltp)
);

CREATE TABLE fact_sales (
    sales_id SERIAL PRIMARY KEY,
    date_key INT REFERENCES dim_date(date_key),
    product_key INT REFERENCES dim_product(product_key),
    customer_key INT REFERENCES dim_customer(customer_key),
    order_id INT, 
    quantity_sold INT,
    unit_price DECIMAL(10, 2),
    total_revenue DECIMAL(10, 2),
    CONSTRAINT unique_fact_order_product UNIQUE (order_id, product_key)
);

-- ==========================================
-- 1.5 PRE-POPULATE STATIC DIMENSIONS
-- ==========================================
-- We populate this immediately so Foreign Keys don't fail during the initial sync.
INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
SELECT 
    to_char(datum, 'YYYYMMDD')::INT AS date_key,
    datum AS full_date,
    EXTRACT(ISODOW FROM datum) AS day_of_week,
    to_char(datum, 'Day') AS day_name,
    EXTRACT(MONTH FROM datum) AS month,
    to_char(datum, 'Month') AS month_name,
    EXTRACT(QUARTER FROM datum) AS quarter,
    EXTRACT(YEAR FROM datum) AS year,
    CASE WHEN EXTRACT(ISODOW FROM datum) IN (6, 7) THEN TRUE ELSE FALSE END AS is_weekend
FROM (
    -- Generate dates from Jan 1, 2023 for 10 years (adjust as needed)
    SELECT '2023-01-01'::DATE + sequence.day AS datum
    FROM generate_series(0, 3650) AS sequence(day)
) DQ
ON CONFLICT (date_key) DO NOTHING;

-- ==========================================
-- 2. STAGING TABLES (Public Schema)
-- ==========================================
CREATE TABLE "Set" (set_id INT PRIMARY KEY, set_name VARCHAR(255), series VARCHAR(255), release_date DATE);
CREATE TABLE Card (card_id INT PRIMARY KEY, card_name VARCHAR(255), set_id INT, rarity VARCHAR(100), types VARCHAR(100), image_url TEXT);
CREATE TABLE Product (product_id INT PRIMARY KEY, card_id INT, condition VARCHAR(255), price NUMERIC(10, 4));
CREATE TABLE Customer (customer_id INT PRIMARY KEY, first_name VARCHAR(255), last_name VARCHAR(255), user_name VARCHAR(255), password_hash VARCHAR(255));
CREATE TABLE "Order" (order_id INT PRIMARY KEY, customer_id INT, order_date TIMESTAMPTZ, status VARCHAR(50), total_amt NUMERIC(10, 4));
CREATE TABLE OrderItem (order_item_id INT PRIMARY KEY, order_id INT, product_id INT, quantity INT, price_at_sale NUMERIC(10, 4));

-- ==========================================
-- 3. AUTOMATED REPORTING TRIGGERS
-- ==========================================

-- A. Sync Dimensions
CREATE OR REPLACE FUNCTION sync_dim_customer() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dim_customer (customer_id_oltp, user_name, full_name)
    VALUES (NEW.customer_id, NEW.user_name, NEW.first_name || ' ' || NEW.last_name)
    ON CONFLICT (customer_id_oltp) DO UPDATE SET user_name = EXCLUDED.user_name, full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_customer AFTER INSERT OR UPDATE ON Customer FOR EACH ROW EXECUTE FUNCTION sync_dim_customer();

CREATE OR REPLACE FUNCTION sync_dim_product() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dim_product (product_id_oltp, card_name, set_name, series_name, rarity, condition, current_price)
    SELECT p.product_id, c.card_name, s.set_name, s.series, c.rarity, p.condition, p.price
    FROM Product p
    LEFT JOIN Card c ON p.card_id = c.card_id
    LEFT JOIN "Set" s ON c.set_id = s.set_id
    WHERE p.product_id = NEW.product_id
    ON CONFLICT (product_id_oltp) DO UPDATE SET current_price = EXCLUDED.current_price, condition = EXCLUDED.condition;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_product AFTER INSERT OR UPDATE ON Product FOR EACH ROW EXECUTE FUNCTION sync_dim_product();

-- B. Sync Facts (The "Forward" Trigger)
-- This fires when an Item arrives. It tries to find the Order.
CREATE OR REPLACE FUNCTION sync_fact_sales_forward() RETURNS TRIGGER AS $$
DECLARE
    v_date_key INT;
    v_product_key INT;
    v_customer_key INT;
    v_order_date TIMESTAMPTZ;
    v_customer_id INT;
BEGIN
    -- Try to find the parent order
    SELECT order_date, customer_id INTO v_order_date, v_customer_id 
    FROM "Order" WHERE order_id = NEW.order_id;
    
    -- If Order not found yet, STOP. The "Backfill" trigger will catch this later.
    IF v_order_date IS NULL THEN RETURN NEW; END IF;

    v_date_key := to_char(v_order_date, 'YYYYMMDD')::INT;
    
    SELECT product_key INTO v_product_key FROM dim_product WHERE product_id_oltp = NEW.product_id;
    SELECT customer_key INTO v_customer_key FROM dim_customer WHERE customer_id_oltp = v_customer_id;

    IF v_product_key IS NOT NULL AND v_customer_key IS NOT NULL THEN
        INSERT INTO fact_sales (date_key, product_key, customer_key, order_id, quantity_sold, unit_price, total_revenue)
        VALUES (v_date_key, v_product_key, v_customer_key, NEW.order_id, NEW.quantity, NEW.price_at_sale, (NEW.quantity * NEW.price_at_sale))
        ON CONFLICT (order_id, product_key) DO UPDATE SET quantity_sold = EXCLUDED.quantity_sold, total_revenue = EXCLUDED.total_revenue;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_sales_forward AFTER INSERT ON OrderItem FOR EACH ROW EXECUTE FUNCTION sync_fact_sales_forward();

-- C. Sync Facts (The "Backfill" Trigger)
-- This fires when an Order arrives (potentially late). It looks for waiting Items.
CREATE OR REPLACE FUNCTION sync_backfill_sales() RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    v_date_key INT;
    v_product_key INT;
    v_customer_key INT;
BEGIN
    v_date_key := to_char(NEW.order_date, 'YYYYMMDD')::INT;
    
    -- Ensure Date Dimension exists for this date (Safety net for future dates)
    INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
    VALUES (
        v_date_key, NEW.order_date::DATE, 
        EXTRACT(ISODOW FROM NEW.order_date), to_char(NEW.order_date, 'Day'),
        EXTRACT(MONTH FROM NEW.order_date), to_char(NEW.order_date, 'Month'),
        EXTRACT(QUARTER FROM NEW.order_date), EXTRACT(YEAR FROM NEW.order_date),
        CASE WHEN EXTRACT(ISODOW FROM NEW.order_date) IN (6, 7) THEN TRUE ELSE FALSE END
    ) ON CONFLICT DO NOTHING;

    -- Find customer key
    SELECT customer_key INTO v_customer_key FROM dim_customer WHERE customer_id_oltp = NEW.customer_id;

    -- Loop through any Items that arrived BEFORE this Order
    FOR item IN SELECT * FROM OrderItem WHERE order_id = NEW.order_id LOOP
        SELECT product_key INTO v_product_key FROM dim_product WHERE product_id_oltp = item.product_id;
        
        IF v_product_key IS NOT NULL AND v_customer_key IS NOT NULL THEN
            INSERT INTO fact_sales (date_key, product_key, customer_key, order_id, quantity_sold, unit_price, total_revenue)
            VALUES (v_date_key, v_product_key, v_customer_key, NEW.order_id, item.quantity, item.price_at_sale, (item.quantity * item.price_at_sale))
            ON CONFLICT (order_id, product_key) DO NOTHING;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_backfill_sales AFTER INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION sync_backfill_sales();

-- ==========================================
-- 4. START SUBSCRIPTION
-- ==========================================
CREATE SUBSCRIPTION olap_sub 
CONNECTION 'host=db port=5432 user=replicator password=replica_pass dbname=oltp_db' 
PUBLICATION olap_source_pub;