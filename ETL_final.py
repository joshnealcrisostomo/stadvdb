import xml.etree.ElementTree as ET
import csv
import psycopg2
import os
import requests
from dotenv import load_dotenv

# --- Load env variables ---
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "staging_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "your_password")

# --- connect to the PostgreSQL database ---
conn = psycopg2.connect(
    host=DB_HOST,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)
conn.autocommit = True
cur = conn.cursor()

drop_tables = """
DROP TABLE IF EXISTS stg_temperature, stg_power, stg_world_energy, tr_world_energy;
"""

cur.execute(drop_tables)


# --- EXTRACTION --- 

# Create staging tables

stg_temperature = """
CREATE TABLE IF NOT EXISTS stg_temperature (
    id SERIAL PRIMARY KEY,
    Year INT NOT NULL,
    avg_mean_temp_deg_c NUMERIC(4,2)
    )
"""

stg_power = """
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
)
"""

stg_world_energy = """
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

)
"""

cur.execute(stg_temperature)
cur.execute(stg_power)
cur.execute(stg_world_energy)

# Load data into the staging tables

with open('observed_timeseries_clean.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)  # Skip the header row
    for row in reader:
        cur.execute("INSERT INTO stg_temperature (Year, avg_mean_temp_deg_c) VALUES (%s, %s)", row)

with open('power_generation_clean.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)    
    for row in reader:
        cur.execute("INSERT INTO stg_power (year, biomass, coal, geothermal, hydro, natural_gas, oil_based, solar, wind, grand_total) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", row)

indicators = [
    'EG.ELC.COAL.ZS', #coal
    'EG.ELC.HYRO.ZS', #hydroelectric
    'EG.ELC.NGAS.ZS', #natural gas
    'EG.ELC.NUCL.ZS', #nuclear
    'EG.ELC.PETR.ZS', #oil
    'EG.ELC.RNEW.ZS'  #renewable sources
]

worldbank_data = {}

for indicator in indicators:
    page = 1
    all_records = []
    
    while True:
        api_url = f"https://api.worldbank.org/v2/country/all/indicator/{indicator}?format=json&per_page=1000&page={page}"
        print(f"Fetching: {api_url}")
        response = requests.get(api_url)

        if response.status_code != 200:
            print(f"Request failed with status {response.status_code}")
            break

        data_json = response.json()

        if not data_json or len(data_json) < 2 or not data_json[1]:
            break
        
        all_records.extend(data_json[1])

        total_pages = data_json[0].get('pages', 1)
        print(f"Page {page} of {total_pages} fetched.")

        if page >= total_pages:
            break

        page += 1

    worldbank_data[indicator] = all_records
    print(f"Finished fetching {indicator}: {len(all_records)} records\n")



for indicator, records in worldbank_data.items():
    for record in records:   # <-- iterate directly
        cur.execute("""
            INSERT INTO stg_world_energy (
                country_name,
                country_code,
                indicator_name,
                indicator_code,
                data_year,
                coal_value,
                hydro_value,
                natural_gas_value,
                nuclear_value, 
                oil_value,
                renewable_value
            ) VALUES (%s, %s, %s, %s, %s,
                      %s, %s, %s, %s, %s, %s)
            """,
            (
                record['country']['value'],
                record['country']['id'],
                record['indicator']['value'],
                record['indicator']['id'],
                int(record['date']),
                record['value'] if indicator=='EG.ELC.COAL.ZS' else None,
                record['value'] if indicator=='EG.ELC.HYRO.ZS' else None,
                record['value'] if indicator=='EG.ELC.NGAS.ZS' else None,
                record['value'] if indicator=='EG.ELC.NUCL.ZS' else None,
                record['value'] if indicator=='EG.ELC.PETR.ZS' else None,
                record['value'] if indicator=='EG.ELC.RNEW.ZS' else None,
            )
        )


        

# -- TRANSFORMATION --
cur.execute("""
UPDATE stg_world_energy
SET coal_value = coal_value / 100,
    hydro_value = hydro_value / 100,
    natural_gas_value = natural_gas_value / 100,
    nuclear_value = nuclear_value / 100,
    oil_value = oil_value / 100,
    renewable_value = renewable_value / 100;
            """)

cur.execute("""
CREATE TABLE tr_world_energy AS 
SELECT 
    country_code,
    country_name,
    data_year,
    MAX(coal_value) FILTER (WHERE indicator_code = 'EG.ELC.COAL.ZS') AS coal_value,
    MAX(hydro_value) FILTER (WHERE indicator_code = 'EG.ELC.HYD.ZS') AS hydro_value,
    MAX(natural_gas_value) FILTER (WHERE indicator_code = 'EG.ELC.NGAS.ZS') AS natural_gas_value,
    MAX(nuclear_value) FILTER (WHERE indicator_code = 'EG.ELC.NUCL.ZS') AS nuclear_value,
    MAX(oil_value) FILTER (WHERE indicator_code = 'EG.ELC.OIL.ZS') AS oil_value,
    MAX(renewable_value) FILTER (WHERE indicator_code = 'EG.ELC.RNWL.ZS')
FROM stg_world_energy
GROUP BY country_code, country_name, data_year;
""")
conn.close()
cur.close()





