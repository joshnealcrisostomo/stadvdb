import psycopg2
import os
import random
import string
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Configuration matches your ETL.py source config
DB_CONFIG = {
    "host": os.getenv("DB_SOURCE_HOST", "localhost"),
    "database": os.getenv("DB_SOURCE_NAME", "oltp_db"),
    "user": os.getenv("DB_SOURCE_USER", "postgres"),
    "password": os.getenv("DB_SOURCE_PASS", "Joshneal2245"),
    "port": os.getenv("DB_SOURCE_PORT", "5432")
}

# Settings
NUM_ORDERS = 2500  # Will generate approx 5000-7000 OrderItems (avg 2-3 items per order)
MAX_ITEMS_PER_ORDER = 5
START_DATE = datetime.now() - timedelta(days=365*2) # Data spanning back 2 years
ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered']

def connect_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(f"Successfully connected to database '{DB_CONFIG['database']}' at {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        return conn
    except Exception as e:
        print("Connection failed! Ensure Docker is running and ports are mapped.")
        raise e

def get_valid_ids(conn):
    """Fetches existing IDs to ensure Foreign Key constraints are met."""
    cur = conn.cursor()
    
    # 1. Check Customers
    print("Fetching existing Customers...")
    cur.execute("SELECT customer_id FROM Customer")
    customers = [row[0] for row in cur.fetchall()]
    
    if not customers:
        raise Exception("No customers found in the Customer table! Please ensure your Docker 'customer_seeder' service ran successfully.")
    
    # 2. Check Products
    print("Fetching existing Products...")
    cur.execute("SELECT product_id, price FROM Product")
    products = cur.fetchall() # List of (id, price) tuples
    
    if not products:
         raise Exception("No products found in the Product table! Please ensure your Docker 'inventory_seeder' service ran successfully.")

    cur.close()
    
    print(f"Found {len(customers)} Customers and {len(products)} Products.")
    return customers, products

def generate_random_date(start_date, end_date):
    """Generates a random datetime between two dates."""
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    random_seconds = random.randrange(24*60*60)
    return start_date + timedelta(days=random_number_of_days, seconds=random_seconds)

def generate_data():
    conn = None
    try:
        conn = connect_db()
        customers, products = get_valid_ids(conn)
        cur = conn.cursor()
        
        print(f"Generating {NUM_ORDERS} orders with random dates and items...")
        
        orders_generated = 0
        items_generated = 0
        
        # Batch lists
        order_inserts = []      # (customer_id, order_date, status, total_amt)
        order_item_inserts = [] # (order_id, product_id, quantity, price_at_sale)
        
        # We need to insert Orders one by one or return IDs to link OrderItems. 
        # For performance with 5000+ rows, we will loop and insert batches.
        
        for _ in range(NUM_ORDERS):
            # 1. Pick Random Customer & Date
            cust_id = random.choice(customers)
            ord_date = generate_random_date(START_DATE, datetime.now())
            status = random.choice(ORDER_STATUSES)
            
            # 2. Generate Random Items for this Order
            num_items = random.randint(1, MAX_ITEMS_PER_ORDER)
            selected_products = random.sample(products, num_items) # Unique products per order
            
            current_order_items = []
            total_amt = 0
            
            for prod_id, price in selected_products:
                qty = random.randint(1, 4)
                # Vary price slightly to simulate historical price changes? 
                # Or keep strictly equal to product table. Let's keep it equal for simplicity.
                item_total = float(price) * qty
                total_amt += item_total
                
                current_order_items.append({
                    "product_id": prod_id,
                    "quantity": qty,
                    "price": price
                })
            
            # 3. Insert Order and Get ID
            # We execute immediately here to get the Serial ID for the items
            cur.execute("""
                INSERT INTO "Order" (customer_id, order_date, status, total_amt)
                VALUES (%s, %s, %s, %s)
                RETURNING order_id
            """, (cust_id, ord_date, status, total_amt))
            
            new_order_id = cur.fetchone()[0]
            orders_generated += 1
            
            # 4. Prepare OrderItems
            for item in current_order_items:
                order_item_inserts.append((
                    new_order_id,
                    item["product_id"],
                    item["quantity"],
                    item["price"]
                ))
                items_generated += 1
            
            # Periodic Commit/Feedback every 500 orders
            if orders_generated % 500 == 0:
                print(f"   ... Created {orders_generated} Orders and {items_generated} Items so far.")

        # 5. Bulk Insert Items
        print("Inserting all OrderItems...")
        
        # Using executemany for bulk insertion of items
        insert_query = """
            INSERT INTO OrderItem (order_id, product_id, quantity, price_at_sale)
            VALUES (%s, %s, %s, %s)
        """
        cur.executemany(insert_query, order_item_inserts)
        
        conn.commit()
        print(f"Success! Generated {orders_generated} Orders and {items_generated} OrderItems.")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error generating data: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    generate_data()