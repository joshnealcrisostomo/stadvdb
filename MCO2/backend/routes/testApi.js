// backend/routes/testApi.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

// POST /api/test/restock-lock
// Triggers the "Seller Action" that locks the table for 5 seconds
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        console.log("🔒 STARTING BATCH UPDATE (Locking Inventory)...");
        
        await client.query('BEGIN');

        // 1. Lock rows (Seller updating 100 items)
        // This conflicts with the 'FOR UPDATE' in your Checkout logic
        await client.query(`
            UPDATE inventory 
            SET quantity = quantity + 10 
            WHERE product_id BETWEEN 1 AND 100
        `);

        // 2. Sleep for 5 seconds to simulate processing time
        await client.query('SELECT pg_sleep(5)');

        // 3. Commit releases the lock
        await client.query('COMMIT');
        
        console.log("🔓 BATCH UPDATE COMPLETE (Locks Released)");
        res.json({ message: "Restock simulation complete. Locks released." });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;