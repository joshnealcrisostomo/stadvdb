import csv
import random

OUTPUT_FILE = "mock_products.csv"
TOTAL_ROWS = 600
MIN_CARD_ID = 1
MAX_CARD_ID = 1504

CONDITIONS = [
    "Near Mint", 
    "Lightly Played", 
    "Moderately Played", 
    "Heavily Played", 
    "Damaged"
]

# Weights: Near Mint is more common than Damaged
CONDITION_WEIGHTS = [0.4, 0.3, 0.15, 0.1, 0.05] 

# Price Multipliers based on condition
PRICE_MULTIPLIERS = {
    "Near Mint": 1.0,
    "Lightly Played": 0.8,
    "Moderately Played": 0.6,
    "Heavily Played": 0.4,
    "Damaged": 0.25
}

def generate_csv():
    print(f"Generating {TOTAL_ROWS} unique products...")
    
    # Set to track uniqueness (card_id, condition)
    existing_combinations = set()
    rows = []

    while len(rows) < TOTAL_ROWS:
        # 1. Pick a random card ID
        card_id = random.randint(MIN_CARD_ID, MAX_CARD_ID)
        
        # 2. Pick a weighted random condition
        condition = random.choices(CONDITIONS, weights=CONDITION_WEIGHTS, k=1)[0]
        
        # 3. Check Uniqueness Constraint from Schema
        if (card_id, condition) in existing_combinations:
            continue # Skip duplicate
            
        # 4. Generate a realistic random price
        base_price = random.uniform(1.0, 100.0) # Random price between $1 and $100
        
        # Apply 'Rare' factor (just random chance for expensive cards)
        if random.random() < 0.05: # 5% chance of being a "Chase Card"
            base_price = random.uniform(100.0, 500.0)
            
        final_price = round(base_price * PRICE_MULTIPLIERS[condition], 2)
        
        # 5. Add to list
        existing_combinations.add((card_id, condition))
        rows.append([card_id, condition, final_price])

    with open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        # Header matching your DB columns (skipping product_id as it is SERIAL)
        writer.writerow(["card_id", "condition", "price"])
        writer.writerows(rows)

    print(f"Success! '{OUTPUT_FILE}' created with {len(rows)} rows.")

if __name__ == "__main__":
    generate_csv()