import csv
import random
from datetime import datetime, timezone

INPUT_PRODUCT_FILE = "mock_products.csv"
OUTPUT_INVENTORY_FILE = "mock_inventory.csv"

def generate_inventory_csv():
    print(f"Reading from {INPUT_PRODUCT_FILE}...")
    
    rows_to_write = []
    
    try:
        with open(INPUT_PRODUCT_FILE, mode='r', encoding='utf-8') as infile:
            reader = csv.reader(infile)
            
            # Skip header if it exists
            header = next(reader, None)
            if header and header[0].lower() == 'card_id':
                # Detect if the first row is actually a header
                pass 
            else:
                pass

            # Start Product IDs at 1 (matching PostgreSQL SERIAL behavior)
            product_id_counter = 1
            
            for row in reader:
                if not row: continue # Skip empty rows
                
                # 1. Product ID (Sequentially assigned)
                p_id = product_id_counter
                
                # 2. Random Quantity (Weighted to have some stock)
                # 10% chance of being out of stock (0)
                # 90% chance of having 1-50 items
                if random.random() < 0.1:
                    quantity = 0
                else:
                    quantity = random.randint(1, 50)
                
                # 3. Last Updated Timestamp (Current UTC time)
                last_updated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S%z")
                
                rows_to_write.append([p_id, quantity, last_updated])
                product_id_counter += 1

        # Write to CSV
        with open(OUTPUT_INVENTORY_FILE, mode='w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile)
            # Header matching Inventory Table
            writer.writerow(["product_id", "quantity", "last_updated"])
            writer.writerows(rows_to_write)

        print(f"Success! Generated inventory for {product_id_counter - 1} products.")
        print(f"File saved as: {OUTPUT_INVENTORY_FILE}")

    except FileNotFoundError:
        print(f"Error: Could not find '{INPUT_PRODUCT_FILE}'. Make sure it's in the same folder.")

if __name__ == "__main__":
    generate_inventory_csv()