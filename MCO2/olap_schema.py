import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "pokemon_olap")

star_schema_file = "create_olap_schema.sql"

def execute_sql_file(db_name, filepath):
    """Execute all SQL statements from a file on the given database."""
    try:
        if not os.path.exists(filepath):
            print(f"❌ Error: Could not find '{filepath}' in the current directory.")
            return

        with psycopg2.connect(host=DB_HOST, database=db_name, user=DB_USER, password=DB_PASS) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                print(f"Reading {filepath}...")
                with open(filepath, "r") as f:
                    sql_content = f.read()
                
                print("Executing schema creation...")
                cur.execute(sql_content)
                print(f"✅ Executed {filepath} on {db_name}")
                
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('dim_date', 'dim_product', 'dim_customer', 'fact_sales');
                """)
                tables = cur.fetchall()
                print(f"   Verified tables: {[t[0] for t in tables]}")

    except Exception as e:
        print(f"❌ Error executing {filepath} on {db_name}: {e}")

# -- Create Star Schema tables
execute_sql_file(DB_NAME, star_schema_file)