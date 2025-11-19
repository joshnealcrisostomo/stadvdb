const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database Connection
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

// --- ROUTES ---

// 1. GET Inventory (For Exporting to CSV)
router.get('/', async (req, res) => {
    try {
        // Join with Product and Card to get human-readable details
        const query = `
            SELECT 
                i.product_id, 
                i.quantity, 
                i.last_updated,
                p.price,
                p.condition,
                c.card_name
            FROM Inventory i
            JOIN Product p ON i.product_id = p.product_id
            JOIN Card c ON p.card_id = c.card_id
            ORDER BY i.product_id ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// 2. POST Inventory (For Importing CSV)
router.post('/upload', async (req, res) => {
    const client = await pool.connect();
    try {
        const items = req.body; // Expecting an array of objects
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }

        await client.query('BEGIN'); // Start transaction

        // Process each row from the CSV
        for (const item of items) {
            // Support both 'product_id' (from file) or auto-lookup if we added that feature later
            const productId = parseInt(item.product_id || item.id, 10);
            const quantity = parseInt(item.quantity, 10);
            
            // Default to NOW() if no date provided
            const lastUpdated = item.last_updated || new Date().toISOString(); 

            if (!productId || isNaN(quantity)) continue; // Skip invalid rows

            // Upsert: Insert, or Update if it exists
            const query = `
                INSERT INTO Inventory (product_id, quantity, last_updated)
                VALUES ($1, $2, $3)
                ON CONFLICT (product_id) 
                DO UPDATE SET 
                    quantity = EXCLUDED.quantity,
                    last_updated = EXCLUDED.last_updated
            `;
            await client.query(query, [productId, quantity, lastUpdated]);
        }

        await client.query('COMMIT'); // Commit transaction
        res.json({ message: `Successfully processed ${items.length} items.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to upload inventory' });
    } finally {
        client.release();
    }
});

module.exports = router;