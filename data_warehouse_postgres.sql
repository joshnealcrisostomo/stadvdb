-- Star Schema for Data Warehouse

-- DIMENSION TABLES

CREATE TABLE dim_date (
    date_key SERIAL PRIMARY KEY,
    year INT NOT NULL
);

CREATE TABLE dim_geo (
    geo_key SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    region_grp VARCHAR(50)
);

-- FACT TABLES

CREATE TABLE fact_weather (
    weather_id SERIAL PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    avg_mean_temp_deg_c NUMERIC(4,2)
);

CREATE TABLE fact_energy (
    energy_id SERIAL PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    geo_key INT NOT NULL REFERENCES dim_geo(geo_key),

    coal           NUMERIC(18,2),
    hydro          NUMERIC(18,2),
    natural_gas    NUMERIC(18,2),
    oil            NUMERIC(18,2),
    nuclear        NUMERIC(18,2),

    renewable      NUMERIC(18,2),   -- only for WB % data

    biomass        NUMERIC(18,2),
    geothermal     NUMERIC(18,2),
    solar          NUMERIC(18,2),
    wind           NUMERIC(18,2),

    grand_total    NUMERIC(18,2)    -- applies to PH rows only
);