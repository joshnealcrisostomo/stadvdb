# This file is responsible for the creation of the transactional database.

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "your_password")
DB_NAME = os.getenv("DB_NAME", "schema_name")

db_creation = "create_oltp_schema.sql"

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

# -- Create OLTP tables
execute_sql_file(DB_NAME, "create_oltp_schema.sql")

print("Schema created successfully!")