-- Star Schema for Data Warehouse

USE data_warehouse;

-- DIMENSION TABLES

CREATE TABLE DIM_DATE (
    dateKey INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL
);

CREATE TABLE DIM_GEO (
    geoKey INT PRIMARY KEY AUTO_INCREMENT,
    countryCode VARCHAR(3) NOT NULL,
    countryName VARCHAR(100) NOT NULL,
    regionGrp VARCHAR(50)
);

-- FACT TABLES

CREATE TABLE FACT_WEATHER (
    weatherId
    dateKey INT NOT NULL NOT NULL REFERENCES dim_date(date_key),
    avg_mean_temp_deg_c  NUMERIC(4,2)

);

CREATE TABLE FACT_ENERGY (
    energyId INT PRIMARY KEY AUTO_INCREMENT,
    dateKey INT NOT NULL REFERENCES dim_date(date_key),
    geoKey INT NOT NULL REFERENCES dim_country(country_key),

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