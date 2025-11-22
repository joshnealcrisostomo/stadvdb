-- 0. Clean up old tables if they exist (Re-runnable script)
DROP TABLE IF EXISTS fact_sales CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;
DROP TABLE IF EXISTS dim_product CASCADE;
DROP TABLE IF EXISTS dim_customer CASCADE;

-- 1. Create Dimension Tables

CREATE TABLE dim_date (
    date_key INT PRIMARY KEY, -- Format YYYYMMDD
    full_date DATE NOT NULL,
    day_of_week INT,          -- 1-7
    day_name VARCHAR(20),     -- Monday, Tuesday...
    month INT,                -- 1-12
    month_name VARCHAR(20),   -- January, February...
    quarter INT,              -- 1-4
    year INT,
    is_weekend BOOLEAN
);

CREATE TABLE dim_product (
    product_key SERIAL PRIMARY KEY,
    product_id_oltp INT,      -- Reference to original DB
    card_name VARCHAR(255),
    set_name VARCHAR(255),
    series_name VARCHAR(255),
    rarity VARCHAR(50),
    condition VARCHAR(50),
    current_price DECIMAL(10, 2),
    
    -- Constraint required for UPSERT
    CONSTRAINT unique_product_oltp UNIQUE (product_id_oltp)
);

CREATE TABLE dim_customer (
    customer_key SERIAL PRIMARY KEY,
    customer_id_oltp INT,     -- Reference to original DB
    user_name VARCHAR(100),
    full_name VARCHAR(255),
    
    -- Constraint required for UPSERT
    CONSTRAINT unique_customer_oltp UNIQUE (customer_id_oltp)
);

-- 2. Create Fact Table

CREATE TABLE fact_sales (
    sales_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    date_key INT REFERENCES dim_date(date_key),
    product_key INT REFERENCES dim_product(product_key),
    customer_key INT REFERENCES dim_customer(customer_key),
    
    -- Degenerate Dimension
    order_id INT, 
    
    -- Measures
    quantity_sold INT,
    unit_price DECIMAL(10, 2),
    total_revenue DECIMAL(10, 2),
    
    -- Constraint required for UPSERT (One product entry per order)
    CONSTRAINT unique_fact_order_product UNIQUE (order_id, product_key)
);

-- 3. Create Indexes for Performance
CREATE INDEX idx_fact_date ON fact_sales(date_key);
CREATE INDEX idx_fact_product ON fact_sales(product_key);
CREATE INDEX idx_fact_customer ON fact_sales(customer_key);