const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const olapPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_OLAP_HOST || 'db_olap', 
    database: process.env.DB_OLAP_NAME || 'pokemon_olap', 
    password: process.env.DB_PASSWORD || 'Joshneal2245',
    port: 5432
});

/**
 * Helper to build dynamic WHERE clauses and parameters
 */
const buildFilters = (query) => {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by Year (using dim_date)
    if (query.year && query.year !== 'All') {
        conditions.push(`d.year = $${paramIndex++}`);
        params.push(parseInt(query.year));
    }

    // Filter by Month (using dim_date)
    if (query.month && query.month !== 'All') {
        conditions.push(`d.month = $${paramIndex++}`);
        params.push(parseInt(query.month));
    }

    // Filter by Set (using dim_product)
    if (query.set && query.set !== 'All') {
        conditions.push(`p.set_name = $${paramIndex++}`);
        params.push(query.set);
    }

    // Filter by Rarity (Proxy for Card Type)
    if (query.rarity && query.rarity !== 'All') {
        conditions.push(`p.rarity = $${paramIndex++}`);
        params.push(query.rarity);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    return { whereClause, params, paramIndex };
};

// --- 1. Filter Options Endpoint ---
router.get('/filters', async (req, res) => {
    try {
        const yearsQuery = `SELECT DISTINCT year FROM dim_date ORDER BY year DESC`;
        const setsQuery = `SELECT DISTINCT set_name FROM dim_product ORDER BY set_name ASC`;
        const raritiesQuery = `SELECT DISTINCT rarity FROM dim_product ORDER BY rarity ASC`;

        const [years, sets, rarities] = await Promise.all([
            olapPool.query(yearsQuery),
            olapPool.query(setsQuery),
            olapPool.query(raritiesQuery)
        ]);

        res.json({
            years: years.rows.map(r => r.year),
            sets: sets.rows.map(r => r.set_name),
            rarities: rarities.rows.map(r => r.rarity)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// --- 2. Summary Dashboard (Overview) ---
router.get('/summary', async (req, res) => {
    try {
        const { whereClause, params } = buildFilters(req.query);

        const query = `
            SELECT 
                COALESCE(SUM(f.total_revenue), 0) as total_revenue,
                COALESCE(SUM(f.quantity_sold), 0) as total_units,
                COUNT(DISTINCT f.order_id) as total_orders,
                ROUND(AVG(f.unit_price), 2) as avg_price
            FROM fact_sales f
            JOIN dim_date d ON f.date_key = d.date_key
            JOIN dim_product p ON f.product_key = p.product_key
            ${whereClause};
        `;

        const result = await olapPool.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Summary Query Failed' });
    }
});

// --- 3. Revenue Trends ---
router.get('/revenue-trends', async (req, res) => {
    try {
        const { whereClause, params } = buildFilters(req.query);
        
        const query = `
            SELECT 
                d.full_date, 
                SUM(f.total_revenue) as total_revenue,
                SUM(f.quantity_sold) as total_quantity
            FROM fact_sales f 
            JOIN dim_date d ON f.date_key = d.date_key 
            JOIN dim_product p ON f.product_key = p.product_key
            ${whereClause}
            GROUP BY d.full_date 
            ORDER BY d.full_date ASC;
        `;
        
        const result = await olapPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Revenue Query Failed' });
    }
});

// --- 4. Top Products (Sorted) ---
router.get('/top-products', async (req, res) => {
    try {
        const { whereClause, params } = buildFilters(req.query);
        const sortBy = req.query.sortBy === 'revenue' ? 'total_revenue' : 'quantity_sold';

        const query = `
            SELECT 
                p.card_name, 
                SUM(f.quantity_sold) as quantity_sold,
                SUM(f.total_revenue) as total_revenue
            FROM fact_sales f 
            JOIN dim_product p ON f.product_key = p.product_key 
            JOIN dim_date d ON f.date_key = d.date_key
            ${whereClause}
            GROUP BY p.card_name 
            ORDER BY ${sortBy} DESC 
            LIMIT 10;
        `;
        const result = await olapPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Top Products Query Failed' });
    }
});

// --- 5. Sales by Set ---
router.get('/sales-by-set', async (req, res) => {
    try {
        const { whereClause, params } = buildFilters(req.query);
        
        const query = `
            SELECT 
                p.set_name, 
                SUM(f.total_revenue) as total_revenue,
                SUM(f.quantity_sold) as quantity_sold
            FROM fact_sales f 
            JOIN dim_product p ON f.product_key = p.product_key 
            JOIN dim_date d ON f.date_key = d.date_key
            ${whereClause}
            GROUP BY p.set_name
            ORDER BY total_revenue DESC;
        `;
        const result = await olapPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Set Query Failed' });
    }
});

module.exports = router;