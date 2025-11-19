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

// --- API ROUTES ---

router.get('/cards', async (req, res) => {
    try {
        const { q, pageSize = 50, page = 1 } = req.query;
        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(page, 10) - 1) * limit;

        // 1. UPDATE SELECT: Added c.types
        let sqlQuery = `
            SELECT 
                c.card_id, c.card_name, c.rarity, c.image_url, c.types,
                s.set_id, s.set_name, s.series, s.release_date
            FROM card c
            LEFT JOIN "Set" s ON c.set_id = s.set_id
        `;

        let whereClauses = [];
        let values = [];
        let paramIndex = 1;

        // --- Dynamic Filtering ---
        if (q) {
            const queries = q.split(' ');
            queries.forEach(query => {
                const parts = query.split(':');
                if (parts.length < 2) return;
                
                const key = parts[0];
                const value = parts.slice(1).join(':').replace(/["*]/g, '');

                if (key === 'name') {
                    whereClauses.push(`c.card_name ILIKE $${paramIndex}`);
                    values.push(`%${value}%`);
                    paramIndex++;
                } else if (key === 'set.id' || key === 'set.name') {
                    whereClauses.push(`s.set_id = $${paramIndex}`);
                    values.push(parseInt(value, 10));
                    paramIndex++;
                } else if (key === 'rarity') {
                    whereClauses.push(`c.rarity ILIKE $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                } else if (key === 'types') {
                    // 2. UPDATE FILTER: Search inside the types string
                    whereClauses.push(`c.types ILIKE $${paramIndex}`);
                    values.push(`%${value}%`);
                    paramIndex++;
                }
            });
        }

        if (whereClauses.length > 0) {
            sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
        }

        const countQuery = `SELECT COUNT(*) FROM (${sqlQuery}) AS total`;
        const countResult = await pool.query(countQuery, values);
        const totalCount = parseInt(countResult.rows[0].count, 10);

        sqlQuery += ` ORDER BY c.card_id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const { rows } = await pool.query(sqlQuery, values);

        // 3. UPDATE MAPPING: Split string "Fire, Flying" -> ["Fire", "Flying"]
        const formattedData = rows.map(row => ({
            id: row.card_id.toString(),
            name: row.card_name,
            rarity: row.rarity,
            types: row.types ? row.types.split(', ') : [], 
            images: { small: row.image_url },
            set: {
                id: row.set_id.toString(),
                name: row.set_name,
                series: row.series,
                releaseDate: row.release_date
            }
        }));

        res.json({
            data: formattedData,
            page: parseInt(page, 10),
            pageSize: limit,
            count: formattedData.length,
            totalCount: totalCount
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

router.get('/cards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 4. UPDATE SINGLE CARD SELECT
        const query = `
            SELECT 
                c.card_id, c.card_name, c.rarity, c.image_url, c.types,
                s.set_id, s.set_name, s.series, s.release_date
            FROM card c
            LEFT JOIN "Set" s ON c.set_id = s.set_id
            WHERE c.card_id = $1
        `;
        
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const row = rows[0];
        const card = {
            id: row.card_id.toString(),
            name: row.card_name,
            rarity: row.rarity,
            types: row.types ? row.types.split(', ') : [], // Fix format here too
            images: { small: row.image_url },
            set: {
                id: row.set_id.toString(),
                name: row.set_name,
                series: row.series,
                releaseDate: row.release_date
            }
        };

        res.json({ data: card });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

router.get('/filters', async (req, res) => {
    try {
        const setsResult = await pool.query('SELECT * FROM "Set" ORDER BY set_name');
        const rarityResult = await pool.query('SELECT DISTINCT rarity FROM card WHERE rarity IS NOT NULL ORDER BY rarity');
        
        // 5. UPDATE FILTERS: Get unique types
        // We split the comma-separated strings and get unique values
        const typesResult = await pool.query('SELECT DISTINCT types FROM card WHERE types IS NOT NULL');
        
        const uniqueTypes = new Set();
        typesResult.rows.forEach(row => {
            if (row.types) {
                row.types.split(', ').forEach(t => uniqueTypes.add(t));
            }
        });

        const sets = setsResult.rows.map(s => ({
            id: s.set_id.toString(),
            name: s.set_name,
            series: s.series
        }));

        const rarities = rarityResult.rows.map(r => r.rarity);

        res.json({
            sets: sets,
            rarities: rarities,
            types: Array.from(uniqueTypes).sort() 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

module.exports = router;