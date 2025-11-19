import psycopg2
import os
from dotenv import load_dotenv
import json

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

BASE_DIR = os.path.join("pokemon-tcg-data-master", "pokemon-tcg-data-master")
SETS_FILE = os.path.join(BASE_DIR, "sets", "en.json")

DB_CONFIG = {
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASS,
    "host": DB_HOST,
    "port": DB_PORT
}

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

def populate_data(conn):
    cur = conn.cursor()
    
    # --- STEP 1: INSERT SETS & MAP IDs ---
    json_set_id_to_db_id = {} 
    
    print(f"--- Processing Sets from {SETS_FILE} ---")
    try:
        with open(SETS_FILE, 'r', encoding='utf-8') as f:
            sets_data = json.load(f)
            
        count = 0
        for s in sets_data:
            json_id = s.get('id')
            
            # Only insert if this set is in our file list
            if json_id in CARD_FILES_MAP.values():
                cur.execute(
                    """
                    INSERT INTO "Set" (set_name, series, release_date)
                    VALUES (%s, %s, %s)
                    RETURNING set_id;
                    """,
                    (s.get('name'), s.get('series'), s.get('releaseDate'))
                )
                
                # Save the mapping: "base1" -> 1 (Database ID)
                new_db_id = cur.fetchone()[0]
                json_set_id_to_db_id[json_id] = new_db_id
                count += 1
        
        print(f"Inserted {count} sets. ID Mapping created.")

    except FileNotFoundError:
        print(f"Error: Sets file not found at {SETS_FILE}")
        return
    except Exception as e:
        print(f"Error processing sets: {e}")
        return

    # --- STEP 2: INSERT CARDS USING MAPPED IDs ---
    print(f"\n--- Processing Cards ---")
    total_cards = 0
    
    for filename, json_set_id in CARD_FILES_MAP.items():
        try:
            file_path = os.path.join(BASE_DIR, "cards", "en", filename)
            db_set_id = json_set_id_to_db_id.get(json_set_id)
            
            if not db_set_id:
                print(f"Skipping {filename}: Set '{json_set_id}' not inserted in Step 1.")
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                cards_data = json.load(f)
                
            file_count = 0
            for card in cards_data:
                # Handle types array: Join into a string like "Fire, Flying" or "Water"
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
            
            print(f"  -> Inserted {file_count} cards from {filename} (Linked to Set ID: {db_set_id})")
            total_cards += file_count
            
        except FileNotFoundError:
            print(f"  -> Warning: File not found at {file_path}")
        except Exception as e:
            print(f"  -> Error processing {filename}: {e}")

    conn.commit()
    cur.close()
    print(f"\nSuccess! Total cards inserted: {total_cards}")

if __name__ == "__main__":
    conn = get_db_connection()
    if conn:
        populate_data(conn)
        conn.close()