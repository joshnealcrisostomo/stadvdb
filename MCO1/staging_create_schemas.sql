DROP TABLE IF EXISTS stg_temperature, stg_power, stg_world_energy, tr_world_energy, dim_date, dim_geo, fact_energy, fact_weather;

CREATE TABLE IF NOT EXISTS stg_temperature (
    id SERIAL PRIMARY KEY,
    Year INT NOT NULL,
    avg_mean_temp_deg_c NUMERIC(4,2)
);

CREATE TABLE IF NOT EXISTS stg_power (
    year INT NOT NULL,
    biomass NUMERIC,
    coal NUMERIC,
    geothermal NUMERIC,
    hydro NUMERIC,
    natural_gas NUMERIC,
    oil_based NUMERIC,
    solar NUMERIC,
    wind NUMERIC,
    grand_total NUMERIC
);

CREATE TABLE IF NOT EXISTS stg_world_energy (
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    indicator_name TEXT NOT NULL,
    indicator_code TEXT NOT NULL,
    data_year  INT NOT NULL,
    coal_value NUMERIC,
    hydro_value NUMERIC,
    natural_gas_value NUMERIC,
    nuclear_value NUMERIC, 
    oil_value NUMERIC,
    renewable_value NUMERIC
);
