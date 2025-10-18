import csv
import psycopg2
import os
import io
import requests
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "your_password")
DB_STAGING = os.getenv("DB_STAGING", "staging_db")
DB_WAREHOUSE = os.getenv("DB_WAREHOUSE", "data_warehouse")

# --- Connect to staging DB ---
conn_stg = psycopg2.connect(
    host=DB_HOST,
    database=DB_STAGING,
    user=DB_USER,
    password=DB_PASS
)
conn_stg.autocommit = True
cur_stg = conn_stg.cursor()

# --- Connect to warehouse DB ---
conn_dw = psycopg2.connect(
    host=DB_HOST,
    database=DB_WAREHOUSE,
    user=DB_USER,
    password=DB_PASS
)
conn_dw.autocommit = True
cur_dw = conn_dw.cursor()

# -------------------
# --- TRUNCATE STAGING TABLES ---
# -------------------
cur_stg.execute("TRUNCATE TABLE stg_temperature, stg_power, stg_world_energy;")

# -------------------
# --- EXTRACTION ---
# -------------------

# Load temperature CSV
with open('observed_timeseries_clean.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        cur_stg.execute("""
            INSERT INTO stg_temperature (year, avg_mean_temp_deg_c)
            VALUES (%s, %s);
        """, row)

# Load power CSV
with open('power_generation_clean.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        cur_stg.execute("""
            INSERT INTO stg_power (year, biomass, coal, geothermal, hydro, natural_gas, oil_based, solar, wind, grand_total)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, row)

# Fetch World Bank API → staging
indicators = [
    'EG.ELC.COAL.ZS',  'EG.ELC.HYRO.ZS',  'EG.ELC.NGAS.ZS',
    'EG.ELC.NUCL.ZS', 'EG.ELC.PETR.ZS', 'EG.ELC.RNEW.ZS'
]

worldbank_data = {}
for indicator in indicators:
    page = 1
    all_records = []
    while True:
        api_url = f"https://api.worldbank.org/v2/country/all/indicator/{indicator}?format=json&per_page=1000&page={page}"
        print(f"Fetching {indicator} page {page}...")  # <-- debug print
        response = requests.get(api_url)
        if response.status_code != 200:
            print(f"Request failed with status {response.status_code}")
            break
        data_json = response.json()
        if not data_json or len(data_json) < 2 or not data_json[1]: break
        all_records.extend(data_json[1])
        if page >= data_json[0].get('pages', 1): break
        page += 1
    worldbank_data[indicator] = all_records
    print(f"Finished fetching {indicator}: {len(all_records)} records")


# Insert World Bank data into staging
for indicator, records in worldbank_data.items():
    for r in records:
        cur_stg.execute("""
            INSERT INTO stg_world_energy (
                country_name, country_code, indicator_name, indicator_code, data_year,
                coal_value, hydro_value, natural_gas_value, nuclear_value, oil_value, renewable_value
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            r['country']['value'], r['country']['id'],
            r['indicator']['value'], r['indicator']['id'],
            int(r['date']),
            r['value'] if indicator=='EG.ELC.COAL.ZS' else None,
            r['value'] if indicator=='EG.ELC.HYRO.ZS' else None,
            r['value'] if indicator=='EG.ELC.NGAS.ZS' else None,
            r['value'] if indicator=='EG.ELC.NUCL.ZS' else None,
            r['value'] if indicator=='EG.ELC.PETR.ZS' else None,
            r['value'] if indicator=='EG.ELC.RNEW.ZS' else None
        ))

# -------------------
# --- TRANSFORMATION ---
# -------------------

# Convert % values
cur_stg.execute("""
UPDATE stg_world_energy
SET coal_value = coal_value / 100,
    hydro_value = hydro_value / 100,
    natural_gas_value = natural_gas_value / 100,
    nuclear_value = nuclear_value / 100,
    oil_value = oil_value / 100,
    renewable_value = renewable_value / 100;
""")

# Aggregate world energy
cur_stg.execute("""
DROP TABLE IF EXISTS tr_world_energy;
CREATE TABLE tr_world_energy AS
SELECT country_code, country_name, data_year,
    MAX(coal_value) FILTER (WHERE indicator_code='EG.ELC.COAL.ZS') AS coal_value,
    MAX(hydro_value) FILTER (WHERE indicator_code='EG.ELC.HYRO.ZS') AS hydro_value,
    MAX(natural_gas_value) FILTER (WHERE indicator_code='EG.ELC.NGAS.ZS') AS natural_gas_value,
    MAX(nuclear_value) FILTER (WHERE indicator_code='EG.ELC.NUCL.ZS') AS nuclear_value,
    MAX(oil_value) FILTER (WHERE indicator_code='EG.ELC.PETR.ZS') AS oil_value,
    MAX(renewable_value) FILTER (WHERE indicator_code='EG.ELC.RNEW.ZS') AS renewable_value
FROM stg_world_energy
GROUP BY country_code, country_name, data_year;
""")

# -------------------
# --- LOAD TO WAREHOUSE ---
# -------------------

# --- DIMENSION TABLES ---

# -------------------
# --- LOAD TO WAREHOUSE ---
# -------------------



# --- DIMENSIONS ---

# dim_date
cur_stg.execute("SELECT DISTINCT year FROM stg_power")
years_power = cur_stg.fetchall()
cur_stg.execute("SELECT DISTINCT data_year FROM stg_world_energy")
years_wb = cur_stg.fetchall()
cur_stg.execute("SELECT DISTINCT year FROM stg_temperature")
years_temp = cur_stg.fetchall()

all_years = sorted(set([y[0] for y in years_power + years_wb + years_temp]))

cur_dw.executemany(
    """
    INSERT INTO dim_date (year)
    VALUES (%s)
    ON CONFLICT (year) DO NOTHING;
    """,
    [(y,) for y in all_years]
)

# dim_geo
cur_stg.execute("SELECT DISTINCT country_code, country_name FROM stg_world_energy")
countries = cur_stg.fetchall()

cur_dw.executemany(
    """
    INSERT INTO dim_geo (country_code, country_name)
    VALUES (%s, %s)
    ON CONFLICT (country_code) DO UPDATE
    SET country_name = EXCLUDED.country_name;
    """,
    countries
)

# Add PH manually
cur_dw.execute(
    """
    INSERT INTO dim_geo (country_code, country_name)
    VALUES (%s, %s)
    ON CONFLICT (country_code) DO NOTHING;
    """,
    ("PH", "Philippines")
)

# --- FACT TABLES ---

# Helper to convert None -> NULL
def to_pg(value):
    return value if value is not None else None

# --- fact_weather ---
cur_stg.execute("SELECT year, avg_mean_temp_deg_c FROM stg_temperature")
weather_rows = []
for year, temp in cur_stg.fetchall():
    cur_dw.execute("SELECT date_key FROM dim_date WHERE year=%s", (year,))
    date_key = cur_dw.fetchone()[0]
    weather_rows.append((date_key, temp))

cur_dw.executemany(
    """
    INSERT INTO fact_weather (date_key, avg_mean_temp_deg_c)
    VALUES (%s, %s)
    ON CONFLICT (date_key) DO UPDATE
    SET avg_mean_temp_deg_c = EXCLUDED.avg_mean_temp_deg_c;
    """,
    weather_rows
)

# --- fact_energy from stg_power (PH only) ---
cur_stg.execute("SELECT * FROM stg_power")
cur_dw.execute("SELECT geo_key FROM dim_geo WHERE country_code='PH'")
geo_key = cur_dw.fetchone()[0]

power_rows = []
for row in cur_stg.fetchall():
    year, biomass, coal, geothermal, hydro, ngas, oil, solar, wind, total = row
    cur_dw.execute("SELECT date_key FROM dim_date WHERE year=%s", (year,))
    date_key = cur_dw.fetchone()[0]
    power_rows.append((
        date_key, geo_key, to_pg(biomass), to_pg(coal), to_pg(geothermal),
        to_pg(hydro), to_pg(ngas), to_pg(oil), to_pg(solar), to_pg(wind), to_pg(total)
    ))

cur_dw.executemany(
    """
    INSERT INTO fact_energy (
        date_key, geo_key, biomass, coal, geothermal, hydro,
        natural_gas, oil, solar, wind, grand_total
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (date_key, geo_key) DO UPDATE
    SET biomass = EXCLUDED.biomass,
        coal = EXCLUDED.coal,
        geothermal = EXCLUDED.geothermal,
        hydro = EXCLUDED.hydro,
        natural_gas = EXCLUDED.natural_gas,
        oil = EXCLUDED.oil,
        solar = EXCLUDED.solar,
        wind = EXCLUDED.wind,
        grand_total = EXCLUDED.grand_total;
    """,
    power_rows
)

# --- fact_energy from tr_world_energy (World Bank) ---
cur_stg.execute("SELECT * FROM tr_world_energy")
rows = cur_stg.fetchall()

output_rows = []
for row in rows:
    country_code, country_name, data_year, coal, hydro, ngas, nuclear, oil, renewable = row
    cur_dw.execute("SELECT date_key FROM dim_date WHERE year=%s", (data_year,))
    date_key = cur_dw.fetchone()[0]
    cur_dw.execute("SELECT geo_key FROM dim_geo WHERE country_code=%s", (country_code,))
    geo_key = cur_dw.fetchone()[0]

    output_rows.append((
        date_key, geo_key, to_pg(coal), to_pg(hydro), to_pg(ngas),
        to_pg(oil), to_pg(nuclear), to_pg(renewable)
    ))

cur_dw.executemany(
    """
    INSERT INTO fact_energy (
        date_key, geo_key, coal, hydro, natural_gas, oil, nuclear, renewable
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (date_key, geo_key) DO UPDATE
    SET coal = EXCLUDED.coal,
        hydro = EXCLUDED.hydro,
        natural_gas = EXCLUDED.natural_gas,
        oil = EXCLUDED.oil,
        nuclear = EXCLUDED.nuclear,
        renewable = EXCLUDED.renewable;
    """,
    output_rows
)



# -------------------
# --- CLOSE CONNECTIONS ---
# -------------------

cur_stg.close()
conn_stg.close()
cur_dw.close()
conn_dw.close()


