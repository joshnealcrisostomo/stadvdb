import pandas as pd
from tcgdexsdk import TCGdex, Language
import asyncio

async def fetch_and_save(endpoint, filename):
    """
    A helper function to fetch data from an endpoint
    and save it to a CSV file.
    """
    try:
        print(f"Fetching {filename}...")
        # Fetch the data (e.g., tcgdex.set.list())
        data_list = await endpoint.list()
        
        # Convert the list of objects to a list of dictionaries
        data_dicts = [vars(item) for item in data_list]
        
        # Save to CSV
        df = pd.DataFrame(data_dicts)
        output_file = f"{filename}.csv"
        df.to_csv(output_file, index=False, encoding='utf-8')
        print(f"Successfully saved {filename}.csv")
        
    except Exception as e:
        print(f"Error fetching {filename}: {e}")

async def main():
    # --- 1. Initialization ---
    print("Initializing TCGdex SDK...")
    tcgdex = TCGdex(Language.EN) 

    print("Starting to fetch essential endpoint data...")

    # --- 2. Create a list of all tasks to run ---
    # We will fetch all of these at the same time
    tasks = [
        fetch_and_save(tcgdex.set, "sets"),
        fetch_and_save(tcgdex.serie, "series"),
        fetch_and_save(tcgdex.rarity, "rarities"),
        fetch_and_save(tcgdex.type, "types"),
        fetch_and_save(tcgdex.illustrator, "illustrators"),
        fetch_and_save(tcgdex.variant, "variants")
    ]
    
    # --- 3. Run all tasks in parallel ---
    await asyncio.gather(*tasks)
    
    print("\n--- SUCCESS ---")
    print("All essential filter data has been saved to separate CSV files.")


# --- 4. Run the main async function ---
if __name__ == "__main__":
    asyncio.run(main())