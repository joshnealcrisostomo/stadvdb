# pip install psycopg2-binary

import psycopg2
import csv
import os
from dotenv import load_dotenv

CREATE_TABLES_PGSQL = """
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

"""
TABLES_CSV = [
    {
        "table": "observed_timeseries_clean.csv",
        "columns": [
            "year, avg_mean_temp_deg_c"
        ]
    },
    {
        "table": "power_generation_clean.csv",
        "columns": [
            "year, biomass, coal, geothermal, hydro, natural gas, oil-based, solar, wind, grand total"
        ]
    },
    {
        "table":""
    }
    
]
temperature_csv = "observed_timeseries_clean.csv"


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

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error during ETL:", e)

if __name__ == "__main__":
    run_etl()


