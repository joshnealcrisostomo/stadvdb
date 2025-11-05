import psycopg2
import os
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "your_password")
DB_STAGING = os.getenv("DB_STAGING", "staging_db")
DB_WAREHOUSE = os.getenv("DB_WAREHOUSE", "data_warehouse")

# --- SQL files ---
staging_sql_file = "staging_create_schemas.sql"
warehouse_sql_file = "data_warehouse_postgres.sql"

def execute_sql_file(db_name, filepath):
    """Execute all SQL statements from a file on the given database."""
    try:
        with psycopg2.connect(host=DB_HOST, database=db_name, user=DB_USER, password=DB_PASS) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                with open(filepath, "r") as f:
                    sql_content = f.read()
                cur.execute(sql_content)
                print(f"✅ Executed {filepath} on {db_name}")
    except Exception as e:
        print(f"❌ Error executing {filepath} on {db_name}: {e}")

# --- Create staging tables ---
execute_sql_file(DB_STAGING, staging_sql_file)

# --- Create warehouse tables ---
execute_sql_file(DB_WAREHOUSE, warehouse_sql_file)

print("All schemas created successfully!")
