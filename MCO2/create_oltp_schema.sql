DROP TABLE IF EXISTS "Set", Card, Customer, Product, Inventory, "Order", OrderItem, Cart, CartItem CASCADE;

-- "Set" Table
CREATE TABLE "Set" (
    set_id SERIAL PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL,
    series VARCHAR(255),
    release_date DATE
);

-- Card Table
CREATE TABLE Card (
    card_id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    set_id INTEGER REFERENCES "Set"(set_id),
    rarity VARCHAR(100),
    types VARCHAR(100),
    image_url TEXT
);

-- Product Table
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES Card(card_id),
    condition VARCHAR(255) NOT NULL,
    price NUMERIC(10, 4) NOT NULL,

    -- Ensures a card and condition combination is only one product
    UNIQUE (card_id, condition)
);

-- Inventory Table
CREATE TABLE Inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Product(product_id) UNIQUE,
    quantity INTEGER NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL
);

-- Customer Table
CREATE TABLE Customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

--Order Table
CREATE TABLE "Order" (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES Customer(customer_id),
    order_date TIMESTAMPTZ NOT NULL,
    total_price NUMERIC(10, 4) NOT NULL
);

--OrderItem Table
CREATE TABLE OrderItem (
    order_id INTEGER NOT NULL REFERENCES "Order"(order_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL,
    price_at_sale NUMERIC(10, 4) NOT NULL,
    PRIMARY KEY (order_id, product_id) -- Composite Primary Key
);

--Cart Table
CREATE TABLE Cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--CartItem Table
CREATE TABLE CartItem (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES Cart(cart_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id)
);

