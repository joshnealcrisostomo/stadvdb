import psycopg2
import os
import csv
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost") 
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "Joshneal2245")
DB_NAME = os.getenv("DB_NAME", "oltp_db")
DB_PORT = os.getenv("DB_PORT", "5432")

INVENTORY_FILE = "mock_inventory.csv"

DB_CONFIG = {
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASS,
    "host": DB_HOST,
    "port": DB_PORT
}

def populate_inventory_from_csv():
    print(f"--- Connecting to database: {DB_NAME} on {DB_HOST} ---")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    print(f"--- Reading Inventory from {INVENTORY_FILE} ---")
    
    try:
        with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            updated_count = 0
            
            for row in reader:
                try:
                    # Parse values
                    p_id = int(row['product_id'])
                    qty = int(row['quantity'])
                    last_updated = row['last_updated']

                    # Insert into Inventory (Upsert logic)
                    # If product_id exists, we update the quantity instead of failing
                    cur.execute(
                        """
                        INSERT INTO Inventory (product_id, quantity, last_updated)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (product_id) 
                        DO UPDATE SET 
                            quantity = EXCLUDED.quantity, 
                            last_updated = EXCLUDED.last_updated
                        RETURNING (xmax = 0) AS inserted;
                        """,
                        (p_id, qty, last_updated)
                    )
                    
                    # Check if it was an insert or update
                    is_insert = cur.fetchone()[0]
                    if is_insert:
                        count += 1
                    else:
                        updated_count += 1

                except ValueError:
                    print(f"Skipping invalid row: {row}")
                except Exception as inner_e:
                    print(f"Error inserting product_id {row.get('product_id')}: {inner_e}")
                    conn.rollback() # Rollback just this statement so loop continues

        conn.commit()
        cur.close()
        conn.close()
        print(f"\nSuccess! Inserted: {count} | Updated: {updated_count}")

    except FileNotFoundError:
        print(f"Error: {INVENTORY_FILE} not found. Make sure it is in the same folder.")
    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == "__main__":
    populate_inventory_from_csv()