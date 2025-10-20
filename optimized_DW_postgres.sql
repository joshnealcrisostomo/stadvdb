-- Star Schema for Data Warehouse
-- Dropping objects in reverse order of creation to respect dependencies
DROP MATERIALIZED VIEW IF EXISTS mv_distinct_countries;
DROP TABLE IF EXISTS fact_energy, fact_weather, dim_geo, dim_date;

-- ===============================================
-- DIMENSION TABLES
-- ===============================================

CREATE TABLE dim_date (
    date_key SERIAL PRIMARY KEY,
    year INT NOT NULL
);

CREATE TABLE dim_geo (
    geo_key SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL
);

-- ===============================================
-- FACT TABLES
-- ===============================================

CREATE TABLE fact_weather (
    weather_id SERIAL PRIMARY KEY,
    date_key INT NOT NULL, -- Foreign key constraint added below
    avg_mean_temp_deg_c NUMERIC(4,2)
);

CREATE TABLE fact_energy (
    energy_id SERIAL PRIMARY KEY,
    date_key INT NOT NULL, -- Foreign key constraint added below
    geo_key INT NOT NULL,  -- Foreign key constraint added below

    biomass_gwh           NUMERIC(18,2),
    coal_gwh              NUMERIC(18,2),
    geothermal_gwh        NUMERIC(18,2),
    hydro_gwh             NUMERIC(18,2),
    natural_gas_gwh       NUMERIC(18,2),
    oil_gwh               NUMERIC(18,2),
    solar_gwh             NUMERIC(18,2),
    wind_gwh              NUMERIC(18,2),
    grand_total_gwh       NUMERIC(18,2),

    coal_pct              NUMERIC(18,2),   
    hydro_pct             NUMERIC(18,2),
    natural_gas_pct       NUMERIC(18,2),
    oil_pct               NUMERIC(18,2),
    nuclear_pct           NUMERIC(18,2),
    renewable_pct         NUMERIC(18,2)
);

-- ===============================================
-- CONSTRAINTS
-- ===============================================

-- UNIQUE Constraints
ALTER TABLE dim_date
ADD CONSTRAINT unique_dim_date UNIQUE(year);

ALTER TABLE dim_geo
ADD CONSTRAINT unique_dim_geo UNIQUE(country_code);

ALTER TABLE fact_weather
ADD CONSTRAINT unique_fact_weather UNIQUE(date_key);

ALTER TABLE fact_energy
ADD CONSTRAINT unique_fact_energy UNIQUE(date_key, geo_key);


-- FOREIGN KEY Constraints (Optimization)
ALTER TABLE fact_weather
ADD CONSTRAINT fk_fact_weather_dim_date
FOREIGN KEY (date_key) REFERENCES dim_date(date_key);

ALTER TABLE fact_energy
ADD CONSTRAINT fk_fact_energy_dim_date
FOREIGN KEY (date_key) REFERENCES dim_date(date_key);

ALTER TABLE fact_energy
ADD CONSTRAINT fk_fact_energy_dim_geo
FOREIGN KEY (geo_key) REFERENCES dim_geo(geo_key);


-- ===============================================
-- INDEXES FOR QUERY PERFORMANCE (Optimization)
-- ===============================================

-- Index for faster lookups by country/geo key on the largest table
CREATE INDEX idx_fact_energy_geo_key ON fact_energy(geo_key);

-- Index for fast filtering by year ranges
CREATE INDEX idx_dim_date_year ON dim_date(year);

-- Index for fast lookups by country name
CREATE INDEX idx_dim_geo_country_name ON dim_geo(country_name);


-- ===============================================
-- MATERIALIZED VIEW FOR FILTERS (Optimization)
-- ===============================================
CREATE MATERIALIZED VIEW mv_distinct_countries AS
SELECT DISTINCT g.country_name
FROM fact_energy f
JOIN dim_geo g ON f.geo_key = g.geo_key
WHERE g.country_name IS NOT NULL AND f.renewable_pct IS NOT NULL
ORDER BY g.country_name ASC;