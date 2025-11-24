const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// OLAP Connection
const olapPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'pokemon_olap_db', // <--- IMPORTANT: Connects to the OLAP DB
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// API Endpoints
router.get('/revenue-trends', async (req, res) => {
    try {
        const query = `
            SELECT d.full_date, SUM(f.total_revenue) as total_revenue 
            FROM fact_sales f 
            JOIN dim_date d ON f.date_key = d.date_key 
            GROUP BY d.full_date 
            ORDER BY d.full_date ASC;
        `;
        const result = await olapPool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OLAP Query Failed' });
    }
});

router.get('/top-products', async (req, res) => {
    try {
        const query = `
            SELECT p.card_name, SUM(f.quantity_sold) as quantity_sold 
            FROM fact_sales f 
            JOIN dim_product p ON f.product_key = p.product_key 
            GROUP BY p.card_name 
            ORDER BY quantity_sold DESC 
            LIMIT 5;
        `;
        const result = await olapPool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OLAP Query Failed' });
    }
});

router.get('/sales-by-set', async (req, res) => {
    try {
        const query = `
            SELECT p.set_name, SUM(f.total_revenue) as total_revenue 
            FROM fact_sales f 
            JOIN dim_product p ON f.product_key = p.product_key 
            GROUP BY p.set_name;
        `;
        const result = await olapPool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OLAP Query Failed' });
    }
});

module.exports = router;