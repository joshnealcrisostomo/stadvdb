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

// POST /api/checkout
// Triggers the stored procedure to move items from Cart -> Order
router.post('/', async (req, res) => {
    // const customerId = req.user?.id || 1; 

    const customerId = req.headers['x-test-user-id'] || req.user?.id || 1;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // CALL the stored procedure
        // logic: It calculates total, locks inventory (deadlock safe), 
        // deducts stock, creates order, moves items, and clears cart.
        const result = await client.query('CALL checkout_cart($1, NULL)', [customerId]);

        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: "Checkout successful! Your order has been placed." 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Checkout Error:", err.message);

        if (err.message.includes('inventory_quantity_check')) {
            return res.status(400).json({ 
                error: "One or more items in your cart are out of stock." 
            });
        }
        
        if (err.message.includes('Cart is empty')) {
             return res.status(400).json({ 
                error: "Your cart is empty." 
            });
        }

        res.status(500).json({ error: "Checkout failed. Please try again." });
    } finally {
        client.release();
    }
});

module.exports = router;