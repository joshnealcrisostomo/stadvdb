import psycopg2
import os
import csv
import random
import json
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

# Paths
BASE_DIR = os.path.join("pokemon-tcg-data-master", "pokemon-tcg-data-master")
SETS_FILE = os.path.join(BASE_DIR, "sets", "en.json")
PRODUCTS_FILE = "mock_products.csv" 

DB_CONFIG = {
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASS,
    "host": DB_HOST,
    "port": DB_PORT
}

# Files to process for Cards
CARD_FILES_MAP = {
    "base1.json": "base1",
    "base2.json": "base2",
    "base3.json": "base3",
    "base4.json": "base4",
    "base5.json": "base5",
    "base6.json": "base6",
    "basep.json": "basep",
    "dp1.json": "dp1",
    "dp2.json": "dp2",
    "dp3.json": "dp3",
    "dp4.json": "dp4",
    "dp5.json": "dp5",
    "dp6.json": "dp6",
    "dp7.json": "dp7",
    "dpp.json": "dpp"
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def populate_cards_and_sets(conn):
    cur = conn.cursor()
    json_set_id_to_db_id = {} 
    
    # --- STEP 1: PROCESS SETS ---
    print(f"--- Processing Sets from {SETS_FILE} ---")
    try:
        with open(SETS_FILE, 'r', encoding='utf-8') as f:
            sets_data = json.load(f)
            
        count = 0
        for s in sets_data:
            json_id = s.get('id')
            set_name = s.get('name')
            
            if json_id in CARD_FILES_MAP.values():
                # Check if set exists to avoid duplicates
                cur.execute('SELECT set_id FROM "Set" WHERE set_name = %s', (set_name,))
                existing = cur.fetchone()
                
                if existing:
                    new_db_id = existing[0]
                else:
                    cur.execute(
                        """
                        INSERT INTO "Set" (set_name, series, release_date)
                        VALUES (%s, %s, %s)
                        RETURNING set_id;
                        """,
                        (set_name, s.get('series'), s.get('releaseDate'))
                    )
                    new_db_id = cur.fetchone()[0]
                    count += 1
                
                json_set_id_to_db_id[json_id] = new_db_id
        
        print(f"Sets processed. New inserts: {count}")

    except FileNotFoundError:
        print(f"Error: Sets file not found at {SETS_FILE}")
        return

    # --- STEP 2: PROCESS CARDS ---
    print(f"\n--- Processing Cards ---")
    total_cards = 0
    
    for filename, json_set_id in CARD_FILES_MAP.items():
        try:
            file_path = os.path.join(BASE_DIR, "cards", "en", filename)
            db_set_id = json_set_id_to_db_id.get(json_set_id)
            
            if not db_set_id:
                continue

            # Check if cards exist for this set
            cur.execute("SELECT COUNT(*) FROM Card WHERE set_id = %s", (db_set_id,))
            if cur.fetchone()[0] > 0:
                print(f"Skipping {filename}: Cards already exist for Set ID {db_set_id}.")
                continue

            with open(file_path, 'r', encoding='utf-8') as f:
                cards_data = json.load(f)
                
            file_count = 0
            for card in cards_data:
                types_list = card.get('types', [])
                types_str = ", ".join(types_list) if types_list else None

                cur.execute(
                    """
                    INSERT INTO Card (card_name, set_id, rarity, types, image_url)
                    VALUES (%s, %s, %s, %s, %s);
                    """,
                    (
                        card.get('name'), 
                        db_set_id,           
                        card.get('rarity', 'Common'),
                        types_str,
                        card.get('images', {}).get('small', '')
                    )
                )
                file_count += 1
            
            print(f"  -> Inserted {file_count} cards from {filename}")
            total_cards += file_count
            
        except FileNotFoundError:
            print(f"  -> Warning: File not found at {file_path}")
        except Exception as e:
            print(f"  -> Error processing {filename}: {e}")

    conn.commit()
    cur.close()
    print(f"Cards processing complete. Total new cards: {total_cards}")

def populate_inventory(conn):
    """Reads mock_products.csv and fills Product & Inventory tables"""
    cur = conn.cursor()
    print(f"\n--- Processing Products & Inventory from {PRODUCTS_FILE} ---")
    
    try:
        with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f) # Expects header: card_id, condition, price
            count = 0
            
            for row in reader:
                try:
                    # 1. Insert Product (Upsert: Update price if exists)
                    cur.execute(
                        """
                        INSERT INTO Product (card_id, condition, price)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (card_id, condition) 
                        DO UPDATE SET price = EXCLUDED.price
                        RETURNING product_id;
                        """,
                        (row['card_id'], row['condition'], row['price'])
                    )
                    product_id = cur.fetchone()[0]

                    # 2. Generate Random Inventory Data
                    # 10% chance of being out of stock, otherwise 1-50 items
                    quantity = 0 if random.random() < 0.1 else random.randint(1, 50)
                    last_updated = datetime.now(timezone.utc)

                    # 3. Insert Inventory (Upsert: Update qty if exists)
                    cur.execute(
                        """
                        INSERT INTO Inventory (product_id, quantity, last_updated)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (product_id) 
                        DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = EXCLUDED.last_updated;
                        """,
                        (product_id, quantity, last_updated)
                    )
                    count += 1
                    
                except Exception as inner_e:
                    # This usually happens if card_id doesn't exist in the Card table
                    # print(f"Skipping product row {row}: {inner_e}")
                    pass

        conn.commit()
        cur.close()
        print(f"Success! Processed {count} inventory items.")

    except FileNotFoundError:
        print(f"Warning: {PRODUCTS_FILE} not found. Skipping inventory population.")
    except Exception as e:
        print(f"Error processing inventory: {e}")
        conn.rollback()

if __name__ == "__main__":
    conn = get_db_connection()
    if conn:
        # 1. Populate Sets and Cards
        populate_cards_and_sets(conn)
        
        # 2. Populate Products and Inventory
        populate_inventory(conn)
        
        conn.close()