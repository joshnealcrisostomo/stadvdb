DROP TABLE IF EXISTS "Set", Card, Customer, Product, Inventory, Sale, OrderItem;

-- "Set" Table
CREATE TABLE "Set" (
    set_id SERIAL PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL,
    series VARCHAR(255)
);

-- Card Table
CREATE TABLE Card (
    card_id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    set_id INTEGER REFERENCES "Set"(set_id)
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

--Sale Table
CREATE TABLE Sale (
    sale_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES Customer(customer_id),
    sale_date TIMESTAMPTZ NOT NULL,
    total_price NUMERIC(10, 4) NOT NULL
);

--OrderItem Table
CREATE TABLE OrderItem (
    sale_id INTEGER NOT NULL REFERENCES Sale(sale_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL,
    price_at_sale NUMERIC(10, 4) NOT NULL,
    PRIMARY KEY (sale_id, product_id) -- Composite Primary Key
);


