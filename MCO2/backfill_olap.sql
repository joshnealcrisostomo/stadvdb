-- 1. Sync Dimensions (Safe to run multiple times)
INSERT INTO dim_product (product_id_oltp, card_name, set_name, series_name, rarity, condition, current_price)
SELECT p.product_id, c.card_name, s.set_name, s.series, c.rarity, p.condition, p.price
FROM Product p
LEFT JOIN Card c ON p.card_id = c.card_id
LEFT JOIN "Set" s ON c.set_id = s.set_id
ON CONFLICT (product_id_oltp) DO NOTHING;

INSERT INTO dim_customer (customer_id_oltp, user_name, full_name)
SELECT customer_id, user_name, first_name || ' ' || last_name
FROM Customer
ON CONFLICT (customer_id_oltp) DO NOTHING;

-- 2. Populate Facts
-- Note: dim_date is already populated by your create_olap_schema.sql
INSERT INTO fact_sales (date_key, product_key, customer_key, order_id, quantity_sold, unit_price, total_revenue)
SELECT 
    to_char(o.order_date, 'YYYYMMDD')::INT as date_key,
    dp.product_key,
    dc.customer_key,
    o.order_id,
    oi.quantity,
    oi.price_at_sale,
    (oi.quantity * oi.price_at_sale)
FROM OrderItem oi
JOIN "Order" o ON oi.order_id = o.order_id
JOIN dim_product dp ON dp.product_id_oltp = oi.product_id
JOIN dim_customer dc ON dc.customer_id_oltp = o.customer_id
ON CONFLICT (order_id, product_key) DO NOTHING;

RAISE NOTICE 'OLAP Backfill Completed Successfully.';