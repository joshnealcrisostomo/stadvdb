# pip install psycopg2-binary

import psycopg2
import csv
import os
from dotenv import load_dotenv

CREATE_TABLES_PGSQL = """
CREATE TABLE IF NOT EXISTS dim_date (
    date_key SERIAL PRIMARY KEY,
    calendar_year INT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_geo (
    geo_key SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    region_grp VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS dim_fuel_source (
    fuel_key SERIAL PRIMARY KEY,
    fuel_name VARCHAR(50) NOT NULL,
    is_renewable CHAR(1) CHECK (is_renewable IN ('Y','N')),
    energy_categ VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS dim_temp (
    temp_key SERIAL PRIMARY KEY,
    year INT NOT NULL,
    avg_mean_temp_deg_c NUMERIC(4,2)
);

CREATE TABLE IF NOT EXISTS renewable_output (
    date_key INT NOT NULL,
    geo_key INT NOT NULL,
    temp_key INT NOT NULL,
    renew_out_pct NUMERIC(18,15),
    PRIMARY KEY (date_key, geo_key, temp_key),
    FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
    FOREIGN KEY (geo_key) REFERENCES dim_geo(geo_key),
    FOREIGN KEY (temp_key) REFERENCES dim_temp(temp_key)
);

CREATE TABLE IF NOT EXISTS fuel_generation (
    date_key INT NOT NULL,
    fuel_key INT NOT NULL,
    temp_key INT NOT NULL,
    pow_gen_gwh INT,
    PRIMARY KEY (date_key, fuel_key, temp_key),
    FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
    FOREIGN KEY (fuel_key) REFERENCES dim_fuel_source(fuel_key),
    FOREIGN KEY (temp_key) REFERENCES dim_temp(temp_key)
);

"""

temperature_csv = "observed_timeseries_clean.csv"
power_csv = "power_generation_clean.csv"


def run_etl():
    #Connect to the PostgreSQL database
    try:
        load_dotenv()

        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")

        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        cur =  conn.cursor()

        #Create Tables
        cur.execute(CREATE_TABLES_PGSQL)
        conn.commit()

        #Load Data
        with open(temperature_csv, 'r') as f:
            next(f)
            cur.copy_from(f, "dim_temp", sep=",", columns=("year", "avg_mean_temp_deg_c"))

        with open(power_csv, 'r') as f:
            next(f)
            
            cur.copy_from(f, "fuel_generation", sep=",", columns=("Years" , "Biomass" , "Coal" , "Geothermal" , "Hydro" , "Natural Gas" , "Oil-based" , "Solar" , "Wind" , "Grand Total"))

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error during ETL:", e)

if __name__ == "__main__":
    run_etl()


