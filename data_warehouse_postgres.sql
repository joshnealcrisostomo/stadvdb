-- Connect to your database first
-- TO DO:
-- Open pgAdmin and connect to your pgsql
-- create new database 'data_warehouse' but any name should work
-- right click on the database -> click 'CREATE script'
-- Copy and paste the code below

-- DIMENSION TABLES

CREATE TABLE dim_date (
    date_key SERIAL PRIMARY KEY,
    calendar_year INT NOT NULL
);

CREATE TABLE dim_geo (
    geo_key SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    region_grp VARCHAR(50)
);

CREATE TABLE dim_fuel_source (
    fuel_key SERIAL PRIMARY KEY,
    fuel_name VARCHAR(50) NOT NULL,
    is_renewable CHAR(1) CHECK (is_renewable IN ('Y','N')),
    energy_categ VARCHAR(20)
);

CREATE TABLE dim_temp (
    temp_key SERIAL PRIMARY KEY,
    year INT NOT NULL,
    avg_mean_temp_deg_c NUMERIC(4,2)
);

-- FACT TABLES

CREATE TABLE renewable_output (
    date_key INT NOT NULL,
    geo_key INT NOT NULL,
    temp_key INT NOT NULL,
    renew_out_pct NUMERIC(18,15),
    PRIMARY KEY (date_key, geo_key, temp_key),
    FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
    FOREIGN KEY (geo_key) REFERENCES dim_geo(geo_key),
    FOREIGN KEY (temp_key) REFERENCES dim_temp(temp_key)
);

CREATE TABLE fuel_generation (
    date_key INT NOT NULL,
    fuel_key INT NOT NULL,
    temp_key INT NOT NULL,
    pow_gen_gwh INT,
    PRIMARY KEY (date_key, fuel_key, temp_key),
    FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
    FOREIGN KEY (fuel_key) REFERENCES dim_fuel_source(fuel_key),
    FOREIGN KEY (temp_key) REFERENCES dim_temp(temp_key)
);
