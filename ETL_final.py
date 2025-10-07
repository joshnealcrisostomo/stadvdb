import xml.etree.ElementTree as ET
import csv
import psycopg2
import os
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
DROP TABLE IF EXISTS stg_temperature, stg_power, stg_renewable;
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

stg_renewable = """
CREATE TABLE IF NOT EXISTS stg_renewable (
    countryname TEXT NOT NULL,
    country_code TEXT NOT NULL,
    indicator_name TEXT NOT NULL,
    indicator_code TEXT NOT NULL,
    data_year  INT NOT NULL,
    data_value NUMERIC
)
"""

cur.execute(stg_temperature)
cur.execute(stg_power)
cur.execute(stg_renewable)

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

sql = "INSERT INTO stg_renewable (country_name, country_code, indicator_name, indicator_code, data_year, data_value) VALUES (%s, %s, %s, %s, %s, %s)"

try:
        tree = ET.parse('worldbank.xml')
        root = tree.getroot()
        
        insert_ctr = 0

        records = root.findall('.//record')
        print(f"Found {len(records)} records in XML")
        
        for record in records:
            data = {}
            for field in record.findall('field'):
                field_name = field.get('name')
                field_key = field.get('key')
                field_value = field.text

                if field_name == 'Country or Area':
                    data['country_name'] = field_value
                    data['country_code'] = field_key
                elif field_name == 'Item':
                    data['indicator_name'] = field_value
                    data['indicator_code'] = field_key
                elif field_name == 'Year':
                    data['data_year'] = int(field_value) if field_value else None
                elif field_name == 'Value':
                    data['data_value'] = float(field_value) if field_value else None

            values = (
                data.get('country_name'),
                data.get('country_code'),
                data.get('indicator_name'),
                data.get('indicator_code'),
                data.get('data_year'),
                data.get('data_value')
            )

            cur.execute("INSERT INTO stg_renewable (country_name, country_code, indicator_name, indicator_code, data_year, data_value) VALUES (%s, %s, %s, %s, %s, %s)", values)
            conn.commit()

        
except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")

cur.close()





