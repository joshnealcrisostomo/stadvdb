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

// 1. GET Inventory with Server-Side Filtering & Sorting
router.get('/', async (req, res) => {
    try {
        // Extract query parameters
        const { search, set, rarity, type, condition, sort } = req.query;

        let sqlQuery = `
            SELECT 
                i.product_id, 
                i.quantity, 
                i.last_updated,
                p.price,
                p.condition,
                c.card_name,
                c.image_url,
                c.rarity,
                c.types,
                s.set_name
            FROM Inventory i
            JOIN Product p ON i.product_id = p.product_id
            JOIN Card c ON p.card_id = c.card_id
            LEFT JOIN "Set" s ON c.set_id = s.set_id
            WHERE 1=1
        `;

        let values = [];
        let paramIndex = 1;

        // --- Dynamic Filtering (Server-Side) ---
        
        if (search) {
            sqlQuery += ` AND c.card_name ILIKE $${paramIndex}`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        if (set) {
            sqlQuery += ` AND s.set_name = $${paramIndex}`;
            values.push(set);
            paramIndex++;
        }

        if (rarity) {
            sqlQuery += ` AND c.rarity = $${paramIndex}`;
            values.push(rarity);
            paramIndex++;
        }

        if (condition) {
            sqlQuery += ` AND p.condition = $${paramIndex}`;
            values.push(condition);
            paramIndex++;
        }

        if (type) {
            // Uses ILIKE to search inside the "Types" string (e.g., "Fire, Flying")
            sqlQuery += ` AND c.types ILIKE $${paramIndex}`;
            values.push(`%${type}%`);
            paramIndex++;
        }

        // --- Sorting ---
        switch (sort) {
            case 'price-asc':
                sqlQuery += ` ORDER BY p.price ASC`;
                break;
            case 'price-desc':
                sqlQuery += ` ORDER BY p.price DESC`;
                break;
            case 'newest':
                sqlQuery += ` ORDER BY i.last_updated DESC`;
                break;
            default:
                sqlQuery += ` ORDER BY i.product_id ASC`;
                break;
        }

        const { rows } = await pool.query(sqlQuery, values);
        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// 2. GET Filter Options (New Endpoint)
// Fetches unique values for Sets, Rarities, Conditions, and Types
router.get('/filters', async (req, res) => {
    try {
        // We perform separate queries to get distinct values efficiently
        const setsQuery = `SELECT DISTINCT s.set_name FROM "Set" s JOIN Card c ON s.set_id = c.set_id JOIN Product p ON c.card_id = p.card_id JOIN Inventory i ON p.product_id = i.product_id ORDER BY s.set_name`;
        const raritiesQuery = `SELECT DISTINCT c.rarity FROM Card c JOIN Product p ON c.card_id = p.card_id JOIN Inventory i ON p.product_id = i.product_id WHERE c.rarity IS NOT NULL ORDER BY c.rarity`;
        const conditionsQuery = `SELECT DISTINCT condition FROM Product ORDER BY condition`;
        const typesQuery = `SELECT DISTINCT types FROM Card c JOIN Product p ON c.card_id = p.card_id JOIN Inventory i ON p.product_id = i.product_id WHERE types IS NOT NULL`;

        const [setsResult, raritiesResult, conditionsResult, typesResult] = await Promise.all([
            pool.query(setsQuery),
            pool.query(raritiesQuery),
            pool.query(conditionsQuery),
            pool.query(typesQuery)
        ]);

        // Process Types (Split comma-separated strings and get unique)
        const uniqueTypes = new Set();
        typesResult.rows.forEach(row => {
            if (row.types) {
                row.types.split(', ').forEach(t => uniqueTypes.add(t));
            }
        });

        res.json({
            sets: setsResult.rows.map(r => r.set_name),
            rarities: raritiesResult.rows.map(r => r.rarity),
            conditions: conditionsResult.rows.map(r => r.condition),
            types: Array.from(uniqueTypes).sort()
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// 3. POST Inventory (Import) - Bulk Upsert
router.post('/upload', async (req, res) => {
    const client = await pool.connect();
    try {
        const items = req.body; // Expect array of objects
        if (!items.length) return res.status(400).send("No items");

        // Prepare arrays for bulk SQL operation
        const productIds = items.map(i => i.product_id);
        const quantities = items.map(i => i.quantity);
        
        await client.query('BEGIN');

        // ONE QUERY to handle the entire file
        const query = `
            INSERT INTO Inventory (product_id, quantity, last_updated)
            SELECT * FROM UNNEST($1::int[], $2::int[], ARRAY_FILL(NOW(), ARRAY[array_length($1::int[], 1)]))
            ON CONFLICT (product_id) 
            DO UPDATE SET 
                quantity = EXCLUDED.quantity, -- Or "inventory.quantity + EXCLUDED.quantity" if adding stock
                last_updated = NOW();
        `;

        await client.query(query, [productIds, quantities]);

        await client.query('COMMIT');
        res.json({ message: "Batch upload complete" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send("Import failed");
    } finally {
        client.release();
    }
});

// 4. DELETE Inventory - Unchanged
router.delete('/', async (req, res) => {
    try {
        await pool.query('TRUNCATE TABLE Inventory RESTART IDENTITY CASCADE');
        res.json({ message: 'Inventory table cleared successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear inventory' });
    }
});

module.exports = router;