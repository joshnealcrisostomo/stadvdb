import psycopg2
import os
import time  # <--- NEW IMPORT
from datetime import timedelta, date
from dotenv import load_dotenv

load_dotenv()

# 1. CONFIGURATION
SOURCE_CONFIG = {
    "host": os.getenv("DB_SOURCE_HOST", "localhost"),
    "database": os.getenv("DB_SOURCE_NAME", "pokemon_app_db"),
    "user": os.getenv("DB_SOURCE_USER", "postgres"),
    "password": os.getenv("DB_SOURCE_PASS", "password")
}

TARGET_CONFIG = {
    "host": os.getenv("DB_TARGET_HOST", "localhost"),
    "database": os.getenv("DB_TARGET_NAME", "pokemon_olap_db"),
    "user": os.getenv("DB_TARGET_USER", "postgres"),
    "password": os.getenv("DB_TARGET_PASS", "password")
}

def run_etl_bridge():
    conn_source = None
    conn_target = None
    
    try:
        print("--- Starting ETL Batch ---")
        conn_source = psycopg2.connect(**SOURCE_CONFIG)
        
        # Create a named cursor for Server-Side iteration
        cur_source = conn_source.cursor(name='server_side_cursor') 

        conn_target = psycopg2.connect(**TARGET_CONFIG)
        conn_target.autocommit = True
        cur_target = conn_target.cursor()

        # ... [Rest of your existing extraction logic remains exactly the same] ...
        
        # STEP 1: DIMENSIONS 
        cur_dim_source = conn_source.cursor() 

        # Products
        # print("Extracting Products...") 
        cur_dim_source.execute("""
            SELECT 
                p.product_id, c.card_name, s.set_name, s.series, c.rarity, p.condition, p.price
            FROM Product p 
            JOIN Card c ON p.card_id = c.card_id 
            JOIN "Set" s ON c.set_id = s.set_id
        """)
        products = cur_dim_source.fetchall()
        
        cur_target.executemany("""
            INSERT INTO dim_product (product_id_oltp, card_name, set_name, series_name, rarity, condition, current_price)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (product_id_oltp) DO UPDATE SET 
                current_price = EXCLUDED.current_price, 
                condition = EXCLUDED.condition;
        """, products)

        # Customers
        # print("Extracting Customers...")
        cur_dim_source.execute("SELECT customer_id, user_name, first_name || ' ' || last_name FROM Customer")
        customers = cur_dim_source.fetchall()
        
        cur_target.executemany("""
            INSERT INTO dim_customer (customer_id_oltp, user_name, full_name)
            VALUES (%s, %s, %s)
            ON CONFLICT (customer_id_oltp) DO UPDATE SET 
                user_name = EXCLUDED.user_name, 
                full_name = EXCLUDED.full_name;
        """, customers)
        
        cur_dim_source.close()

        # Date
        # print("Syncing Date Dimension...")
        cur_date_source = conn_source.cursor()
        cur_date_source.execute('SELECT MIN(order_date), MAX(order_date) FROM "Order"')
        row = cur_date_source.fetchone()
        cur_date_source.close()
        
        min_date = row[0].date() if row and row[0] else date.today()
        max_date = row[1].date() if row and row[1] else date.today()
        
        date_rows = []
        curr = min_date
        while curr <= max_date:
            date_rows.append((
                int(curr.strftime('%Y%m%d')), curr, curr.isoweekday(), curr.strftime('%A'),
                curr.month, curr.strftime('%B'), (curr.month - 1) // 3 + 1, curr.year, curr.isoweekday() >= 6
            ))
            curr += timedelta(days=1)

        cur_target.executemany("""
            INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (date_key) DO NOTHING;
        """, date_rows)

        # FACT TABLE 
        cur_target.execute("SELECT product_id_oltp, product_key FROM dim_product")
        p_map = dict(cur_target.fetchall())
        
        cur_target.execute("SELECT customer_id_oltp, customer_key FROM dim_customer")
        c_map = dict(cur_target.fetchall())

        # print("Extracting Sales...")
        cur_source.itersize = 2000 
        cur_source.execute("""
            SELECT 
                to_char(o.order_date, 'YYYYMMDD')::int, oi.product_id, o.customer_id, 
                o.order_id, oi.quantity, oi.price_at_sale, (oi.quantity * oi.price_at_sale)
            FROM OrderItem oi 
            JOIN "Order" o ON oi.order_id = o.order_id
        """)
        
        batch_buffer = []
        BATCH_SIZE = 2000
        total_loaded = 0

        while True:
            rows = cur_source.fetchmany(BATCH_SIZE)
            if not rows: break
            
            for row in rows:
                d_key, pid, cid, oid, qty, price, total = row
                if pid in p_map and cid in c_map:
                    batch_buffer.append((d_key, p_map[pid], c_map[cid], oid, qty, price, total))
            
            if batch_buffer:
                cur_target.executemany("""
                    INSERT INTO fact_sales (date_key, product_key, customer_key, order_id, quantity_sold, unit_price, total_revenue)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (order_id, product_key) DO UPDATE SET
                        quantity_sold = EXCLUDED.quantity_sold, 
                        total_revenue = EXCLUDED.total_revenue,
                        unit_price = EXCLUDED.unit_price;
                """, batch_buffer)
                total_loaded += len(batch_buffer)
                batch_buffer = [] 

        print(f"ETL Batch Completed. Synced {total_loaded} sales rows.")

    except Exception as e:
        print(f"ETL Batch Failed: {e}")
    finally:
        if conn_source: conn_source.close()
        if conn_target: conn_target.close()

# --- UPDATED MAIN EXECUTION LOOP ---
if __name__ == "__main__":
    # Default to 60 seconds if not set in docker-compose
    SLEEP_INTERVAL = int(os.getenv("ETL_INTERVAL", "60"))
    
    print(f"Starting ETL Service. Running every {SLEEP_INTERVAL} seconds.")
    
    while True:
        try:
            run_etl_bridge()
        except Exception as e:
            print(f"CRITICAL ERROR in Loop: {e}")
        
        # Sleep to reduce load on DB (Batch processing)
        time.sleep(SLEEP_INTERVAL)