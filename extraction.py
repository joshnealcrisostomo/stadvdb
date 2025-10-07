import psycopg2
import csv
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

power_csv = "power_generation_clean.csv"

def run_etl():
    conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    cur = conn.cursor()

    # 1️⃣ Read CSV and collect fuel column names
    with open(power_csv, 'r') as f:
        reader = csv.DictReader(f)
        fuel_columns = [col for col in reader.fieldnames if col != "Years"]

        # Load staging data
        staging_rows = []
        for row in reader:
            year = int(row['Years'])
            for fuel in fuel_columns:
                value = row[fuel]
                if value:  # skip empty cells
                    staging_rows.append((year, fuel.strip(), float(value)))

    # 2️⃣ Populate dimension tables
    # dim_temp
    years = set(r[0] for r in staging_rows)
    for y in years:
        cur.execute("INSERT INTO dim_temp (year) VALUES (%s) ON CONFLICT (year) DO NOTHING", (y,))

    # dim_fuel_source
    fuels = set(r[1] for r in staging_rows)
    for f in fuels:
        cur.execute("INSERT INTO dim_fuel_source (fuel_name) VALUES (%s) ON CONFLICT (fuel_name) DO NOTHING", (f,))

    conn.commit()

    # 3️⃣ Populate fact table using dimension keys
    for year, fuel, pow_gen in staging_rows:
        # Lookup keys
        cur.execute("SELECT temp_key FROM dim_temp WHERE year=%s", (year,))
        temp_key = cur.fetchone()[0]

        cur.execute("SELECT fuel_key FROM dim_fuel_source WHERE fuel_name=%s", (fuel,))
        fuel_key = cur.fetchone()[0]

        # Insert into fact
        cur.execute(
            "INSERT INTO fuel_generation (temp_key, fuel_key, pow_gen_gwh) VALUES (%s,%s,%s)",
            (temp_key, fuel_key, pow_gen)
        )

    conn.commit()
    cur.close()
    conn.close()
    print("ETL completed successfully!")

if __name__ == "__main__":
    run_etl()
