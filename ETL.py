# For JN's device: python3 ETL.py

import pandas as pd
import mysql.connector
from sqlalchemy import create_engine, text

# MySQL Configurations
DB_URI = "mysql+pymysql://stadvdb:admin123@localhost:3306/"

# Database and Table Configurations
SOURCE_SCHEMAS = {
    "renew": "renew_elect.renewable_electricity",
    "power": "power_gen.power_generation",
    "temp":  "air_temp.observed_timeseries_clean"
}

# Main Data Warehouse Schema
DW_SCHEMA = "data_warehouse"

# Engine Creation
# Prevents hitting MySQL’s idle timeout, because connections are refreshed regularly
# Sends a tiny ping query to make sure it’s alive. If it’s dead, it opens a new one.
engine = create_engine(DB_URI, pool_recycle=3600, pool_pre_ping=True)


# TRUNCATE DATA WAREHOUSE TABLES *for testing/developing lang to*
def reset_tables(conn):
    conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
    tables = [
        "FUEL_GENERATION",
        "RENEWABLE_OUTPUT",
        "DIM_FUEL_SOURCE",
        "DIM_TEMP",
        "DIM_DATE",
        "DIM_GEO"
    ]
    
    # Every time this runs, it clears out old data (not ideal for production)
    for t in tables:
        conn.execute(text(f"TRUNCATE TABLE {DW_SCHEMA}.{t}"))
        
    conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


# DIMENSION UPSERTS

# Ensures one surrogate key per year
# Prevents duplicate years in the time dimension
def upsert_dim_date(conn, years):
    mapping = {}
    
    for y in years:
        res = conn.execute(
            text(f"SELECT dateKey FROM {DW_SCHEMA}.DIM_DATE WHERE calendarYear=:yr"),
            {"yr": y}
        ).fetchone()
        
        # If year already exists, fetch its "dateKey" and reuse it
        if res:
            mapping[y] = res[0]
        else:
            # If not, insert a new row into "DIM_DATE"
            conn.execute(text(f"INSERT INTO {DW_SCHEMA}.DIM_DATE (calendarYear) VALUES (:yr)"), {"yr": y})
            mapping[y] = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    return mapping

# Ensures one surrogate key per country
# Facts for “Philippines” always point to the same geoKey, even if data comes from multiple source files
def upsert_dim_geo(conn):
    geo_rows = conn.execute(text(f"SELECT DISTINCT countryCode, countryName FROM {SOURCE_SCHEMAS['renew']}"))
    
    mapping = {}
    for code, name in geo_rows:
        code = (code or "").upper().strip()
        res = conn.execute(text(f"SELECT geoKey FROM {DW_SCHEMA}.DIM_GEO WHERE countryCode=:c OR countryName=:n"),
                           {"c": code, "n": name}).fetchone()
        
        # If country already exists, reuse its "geoKey"
        if res:
            mapping[code or name] = res[0]
        else:
            # If not, insert a new row with that country into "DIM_GEO"
            conn.execute(text(f"""
                INSERT INTO {DW_SCHEMA}.DIM_GEO (countryCode, countryName, regionGrp)
                VALUES (:c,:n,NULL)
            """), {"c": code, "n": name})
            mapping[code or name] = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    return mapping

# Ensures one surrogate key per fuel source
# Facts can be aggregated by renewable vs non-renewable, or by category
def upsert_dim_fuel(conn):
    fuel_columns = ["Biomass", "Coal", "Geothermal", "Hydro", 
                    "Natural Gas", "Oil-based", "Solar", "Wind"]
        
    mapping = {}
    for f in fuel_columns:
        f = f.strip()
        res = conn.execute(text(f"SELECT fuelKey FROM {DW_SCHEMA}.DIM_FUEL_SOURCE WHERE fuelName=:f"), {"f": f}).fetchone()
        
        # If fuel source already exists, reuse its "fuelKey"
        if res:
            mapping[f] = res[0]
        else:
            # If not, insert a new row with that fuel source into "DIM_FUEL_SOURCE"
            low = f.lower()
            if any(k in low for k in ["hydro", "wind", "solar", "geo", "biomass"]):
                r, c = "Y", "Green Energy"
            elif any(k in low for k in ["coal", "oil", "natural gas"]):
                r, c = "N", "Fossil Fuels"
            else:
                r, c = "N", "Other"
                
            conn.execute(text(f"""
                INSERT INTO {DW_SCHEMA}.DIM_FUEL_SOURCE (fuelName, isRenewable, energyCateg)
                VALUES (:f, :r, :c)
            """), {"f": f, "r": r, "c": c})   
            
            mapping[f] = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    return mapping

# Ensures temperature values stay current per year, while keeping the same surrogate key
def upsert_dim_temp(conn):
    rows = conn.execute(text(f"SELECT DISTINCT Category, `Average Mean Surface Air Temperature (degC)` FROM {SOURCE_SCHEMAS['temp']}"))
    
    mapping = {}
    for y, t in rows:
        res = conn.execute(text(f"SELECT tempKey FROM {DW_SCHEMA}.DIM_TEMP WHERE year=:y"), {"y": y}).fetchone()
        
        if res:
            mapping[y] = res[0]
            conn.execute(text(f"UPDATE {DW_SCHEMA}.DIM_TEMP SET avgMeanTempDegC=:t WHERE year=:y"),
                         {"t": t, "y": y})
        else:
            conn.execute(text(f"INSERT INTO {DW_SCHEMA}.DIM_TEMP (year, avgMeanTempDegC) VALUES (:y,:t)"),
                         {"y": y, "t": t})
            mapping[y] = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    return mapping

# FACT TABLE LOADS
def load_facts(conn, date_map, geo_map, fuel_map, temp_map):
    # Renewable Output Fact
    renew_rows = conn.execute(text(f"""
        SELECT countryCode, countryName, dataYear, dataValue
        FROM {SOURCE_SCHEMAS['renew']}
        WHERE dataYear IS NOT NULL AND dataValue IS NOT NULL
    """))
    
    # Ensures one row per country per year of renewable output
    for ccode,cname,y,v in renew_rows:
        dateKey, geoKey, tempKey = date_map.get(y), geo_map.get(ccode) or geo_map.get(cname), temp_map.get(y)
        if all([dateKey,geoKey,tempKey]):
            conn.execute(text(f"""
                INSERT INTO {DW_SCHEMA}.RENEWABLE_OUTPUT (dateKey,geoKey,tempKey,renewOutPct)
                VALUES (:d,:g,:t,:v)
                ON DUPLICATE KEY UPDATE renewOutPct=VALUES(renewOutPct)
            """), {"d":dateKey,"g":geoKey,"t":tempKey,"v":v})

    # Fuel Generation Fact
    power_rows = conn.execute(text(f"""
        SELECT Years, Biomass, Coal, Geothermal, Hydro,
               `Natural Gas`, `Oil-based`, Solar, Wind
        FROM {SOURCE_SCHEMAS['power']}
    """))
    
    # Ensures no duplicate rows per fuel per year
    for row in power_rows.mappings():
        y = row["Years"]

        for fuel in ["Biomass", "Coal", "Geothermal", "Hydro", 
                     "Natural Gas", "Oil-based", "Solar", "Wind"]:
            v = row[fuel]
            if v is None:
                continue

            dateKey, fuelKey, tempKey = date_map.get(y), fuel_map.get(fuel), temp_map.get(y)

            if all([dateKey, fuelKey, tempKey]):
                conn.execute(text(f"""
                    INSERT INTO {DW_SCHEMA}.FUEL_GENERATION (dateKey, fuelKey, tempKey, powGenGWH)
                    VALUES (:d, :f, :t, :v)
                    ON DUPLICATE KEY UPDATE powGenGWH=VALUES(powGenGWH)
                """), {"d": dateKey, "f": fuelKey, "t": tempKey, "v": v})

# AGGREGATED FACT LOADS
def load_aggregates(conn):
    # Clear old data (optional if running repeatedly)
    conn.execute(text(f"DELETE FROM {DW_SCHEMA}.FACT_RENEW_VS_NONRENEW"))
    conn.execute(text(f"DELETE FROM {DW_SCHEMA}.FACT_ENERGY_MIX"))

    # Insert Renewable vs Non-Renewable totals
    conn.execute(text(f"""
        INSERT INTO {DW_SCHEMA}.FACT_RENEW_VS_NONRENEW (dateKey, isRenewable, totalGenGWH)
        SELECT f.dateKey, d.isRenewable, SUM(f.powGenGWH)
        FROM {DW_SCHEMA}.FUEL_GENERATION f
        JOIN {DW_SCHEMA}.DIM_FUEL_SOURCE d ON f.fuelKey = d.fuelKey
        GROUP BY f.dateKey, d.isRenewable
    """))

    # Insert Energy Mix totals by fuel type
    conn.execute(text(f"""
        INSERT INTO {DW_SCHEMA}.FACT_ENERGY_MIX (dateKey, fuelKey, totalGenGWH)
        SELECT f.dateKey, f.fuelKey, SUM(f.powGenGWH)
        FROM {DW_SCHEMA}.FUEL_GENERATION f
        GROUP BY f.dateKey, f.fuelKey
    """))


# MAIN
def main():
    with engine.begin() as conn:
        # Collect unique years
        years = [y for (y,) in conn.execute(text(f"SELECT DISTINCT dataYear FROM {SOURCE_SCHEMAS['renew']}"))] + \
                [y for (y,) in conn.execute(text(f"SELECT DISTINCT Years FROM {SOURCE_SCHEMAS['power']}"))] + \
                [y for (y,) in conn.execute(text(f"SELECT DISTINCT Category FROM {SOURCE_SCHEMAS['temp']}"))]
                
        years = sorted(set(y for y in years if y is not None))
        
        # Reset DW tables before loading *FOR TESTING/DEVELOPING ONLY*
        reset_tables(conn)

        date_map = upsert_dim_date(conn, years)
        geo_map  = upsert_dim_geo(conn)
        fuel_map = upsert_dim_fuel(conn)
        temp_map = upsert_dim_temp(conn)

        # Load fact tables
        load_facts(conn, date_map, geo_map, fuel_map, temp_map)
        
        # Load aggregated tables (para sa reports 4 and 5)
        load_aggregates(conn) 

if __name__ == "__main__":
    main()
