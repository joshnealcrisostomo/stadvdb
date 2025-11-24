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

// GET /api/cart
// Retrieves the current user's cart items with full details
router.get('/cart', async (req, res) => {
    try {
        // const customerId = req.user?.id || 1;
        const customerId = req.headers['x-test-user-id'] || req.user?.id || 1;

        const query = `
            SELECT 
                ci.cart_item_id,
                cd.card_name,
                cd.image_url,
                s.set_name,
                s.series,
                p.condition,
                p.price,
                ci.quantity,
                (p.price * ci.quantity) as line_total,
                cd.card_id
            FROM 
                cart c
            JOIN 
                "Cart_Item" ci ON c.cart_id = ci.cart_id
            JOIN 
                product p ON ci.product_id = p.product_id
            JOIN 
                card cd ON p.card_id = cd.card_id
            JOIN 
                "Set" s ON cd.set_id = s.set_id
            WHERE 
                c.customer_id = $1
            ORDER BY 
                ci.added_at DESC;
        `;

        const result = await pool.query(query, [customerId]);
        res.json(result.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// POST /api/cart
// Optimized "Add to Cart" using UPSERT (Insert or Update) logic
router.post('/cart', async (req, res) => {
    const { product_id, quantity } = req.body;
    // const customerId = req.user?.id || 1; // Fallback to user ID 1

    const customerId = req.headers['x-test-user-id'] || req.user?.id || 1;
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // STEP 1: Get or Create Cart (Low Overhead)
        // We try to find the existing cart first.
        let cartRes = await client.query(
            `SELECT cart_id FROM cart WHERE customer_id = $1 LIMIT 1`,
            [customerId]
        );

        let cartId;
        if (cartRes.rows.length === 0) {
            const newCart = await client.query(
                `INSERT INTO cart (customer_id, created_at, last_updated) 
                 VALUES ($1, NOW(), NOW()) 
                 RETURNING cart_id`,
                [customerId]
            );
            cartId = newCart.rows[0].cart_id;
        } else {
            cartId = cartRes.rows[0].cart_id;
        }

        // STEP 2: The Optimized Upsert
        // This single query handles both "Adding new item" and "Updating existing quantity".
        // It relies on the UNIQUE(cart_id, product_id) constraint we added to the DB.
        const upsertQuery = `
            INSERT INTO "Cart_Item" (cart_id, product_id, quantity, added_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (cart_id, product_id) 
            DO UPDATE SET 
                quantity = "Cart_Item".quantity + EXCLUDED.quantity,
                added_at = NOW()
            RETURNING cart_item_id, quantity, product_id;
        `;

        const itemRes = await client.query(upsertQuery, [cartId, product_id, quantity]);

        // STEP 3: Touch the Cart
        // Keep the cart "fresh" so we know it's active (useful for cleanup jobs later)
        await client.query(
            `UPDATE cart SET last_updated = NOW() WHERE cart_id = $1`,
            [cartId]
        );

        await client.query('COMMIT');
        
        // Return success with the updated item details
        res.json({ 
            success: true, 
            message: "Item added to cart", 
            cartId,
            item: itemRes.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error adding to cart:", err);
        res.status(500).json({ error: "Server Error", details: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;