DROP TABLE IF EXISTS "Set", Card, Customer, Product, Inventory, "Order", OrderItem, Cart, CartItem CASCADE;
DROP PROCEDURE IF EXISTS checkout_cart;

-- 1. "Set" Table
CREATE TABLE "Set" (
    set_id SERIAL PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL,
    series VARCHAR(255),
    release_date DATE
);

-- 2. Card Table
CREATE TABLE Card (
    card_id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    set_id INTEGER REFERENCES "Set"(set_id),
    rarity VARCHAR(100),
    types VARCHAR(100),
    image_url TEXT
);

-- 3. Product Table
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES Card(card_id),
    condition VARCHAR(255) NOT NULL,
    price NUMERIC(10, 4) NOT NULL,
    UNIQUE (card_id, condition)
);

-- 4. Inventory Table (UPDATED with Constraint)
CREATE TABLE Inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Product(product_id) UNIQUE,
    quantity INTEGER NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL,
    
    -- CONSTRAINT: Strictly prevent negative stock
    CONSTRAINT inventory_quantity_check CHECK (quantity >= 0)
);

-- 5. Customer Table
CREATE TABLE Customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- 6. Status Enum
DROP TYPE IF EXISTS order_status;
CREATE TYPE order_status AS ENUM ('Pending', 'Shipped', 'Delivered');

-- 7. Order Table
CREATE TABLE "Order" (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES Customer(customer_id),
    order_date TIMESTAMPTZ NOT NULL,
    status order_status NOT NULL,
    total_amt NUMERIC(10, 4) NOT NULL
);
    
-- 8. OrderItem Table
CREATE TABLE OrderItem (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES "Order"(order_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL,
    price_at_sale NUMERIC(10, 4) NOT NULL
);

-- 9. Cart Table
CREATE TABLE Cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. CartItem Table
CREATE TABLE "Cart_Item" (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES Cart(cart_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_item_cart_id ON "Cart_Item" (cart_id);

-- 11. Transactional Stored Procedure (Checkout Logic)
-- This handles the heavy lifting of moving items from Cart to Order safely.
CREATE OR REPLACE PROCEDURE checkout_cart(p_customer_id INT, OUT p_order_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id INT;
    v_total_amt NUMERIC(10, 4);
BEGIN
    -- A. Get the user's active cart
    SELECT cart_id INTO v_cart_id FROM Cart WHERE customer_id = p_customer_id LIMIT 1;
    
    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'No active cart found for customer %', p_customer_id;
    END IF;

    -- B. Calculate Total
    SELECT SUM(ci.quantity * p.price) INTO v_total_amt
    FROM "Cart_Item" ci
    JOIN Product p ON ci.product_id = p.product_id
    WHERE ci.cart_id = v_cart_id;

    IF v_total_amt IS NULL THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- C. DEADLOCK AVOIDANCE: Lock rows in consistent order (ASC)
    PERFORM 1 
    FROM Inventory i
    JOIN "Cart_Item" ci ON i.product_id = ci.product_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY i.product_id ASC
    FOR UPDATE; 

    -- D. Deduct Inventory (Will fail if check constraint is violated)
    UPDATE Inventory i
    SET quantity = i.quantity - ci.quantity,
        last_updated = NOW()
    FROM "Cart_Item" ci
    WHERE i.product_id = ci.product_id
      AND ci.cart_id = v_cart_id;

    -- E. Create the Order
    INSERT INTO "Order" (customer_id, order_date, status, total_amt)
    VALUES (p_customer_id, NOW(), 'Pending', v_total_amt)
    RETURNING order_id INTO p_order_id;

    -- F. Move items to OrderItem
    INSERT INTO OrderItem (order_id, product_id, quantity, price_at_sale)
    SELECT p_order_id, ci.product_id, ci.quantity, p.price
    FROM "Cart_Item" ci
    JOIN Product p ON ci.product_id = p.product_id
    WHERE ci.cart_id = v_cart_id;

    -- G. Clear the Cart Items
    DELETE FROM "Cart_Item" WHERE cart_id = v_cart_id;

END;
$$;