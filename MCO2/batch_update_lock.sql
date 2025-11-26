-- batch_update_lock.sql

BEGIN;

-- 1. Lock 100 inventory rows (Simulating a Restock CSV upload)
-- We target 'inventory' because that is what your Checkout procedure locks!
UPDATE inventory 
SET quantity = quantity + 10 
WHERE product_id BETWEEN 1 AND 100;

-- 2. Sleep for 5 seconds (Simulating processing time)
-- This holds the lock. Buyers trying to check out these items will FREEZE here.
SELECT pg_sleep(5);

-- 3. Commit (Releases the locks, letting buyers finish)
COMMIT;