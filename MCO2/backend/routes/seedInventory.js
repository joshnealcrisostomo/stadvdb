// backend/routes/seedInventory.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser'); // We will install this in the docker command

const LOCK_FILE = '/app/data/inventory_seeded.lock';
const CSV_FILE = '/app/inventory.csv';

// Database Connection (Same as your API)
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

async function seed() {
    // 1. CHECK: If lock file exists, skip seeding
    if (fs.existsSync(LOCK_FILE)) {
        console.log('>> Inventory already seeded. Skipping.');
        process.exit(0);
    }

    console.log('>> Starting Inventory Import...');
    const results = [];

    // 2. READ CSV
    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (data) => {
            // Map CSV columns to your Schema expected format
            // Adjust these keys based on your actual CSV headers
            results.push({
                product_id: parseInt(data.product_id), 
                quantity: parseInt(data.quantity)
            });
        })
        .on('end', async () => {
            if (results.length === 0) {
                console.log('No data in CSV.');
                process.exit(0);
            }

            const client = await pool.connect();
            try {
                // 3. BULK UPSERT (Logic adapted from your inventoryApi.js)
                const productIds = results.map(i => i.product_id);
                const quantities = results.map(i => i.quantity);

                await client.query('BEGIN');

                const query = `
                    INSERT INTO Inventory (product_id, quantity, last_updated)
                    SELECT * FROM UNNEST($1::int[], $2::int[], ARRAY_FILL(NOW(), ARRAY[array_length($1::int[], 1)]))
                    ON CONFLICT (product_id) 
                    DO UPDATE SET 
                        quantity = EXCLUDED.quantity,
                        last_updated = NOW();
                `;

                await client.query(query, [productIds, quantities]);
                await client.query('COMMIT');
                
                console.log(`>> Successfully imported ${results.length} items.`);

                // 4. CREATE LOCK FILE
                // This ensures it doesn't run again until the volume is destroyed
                if (!fs.existsSync('/app/data')) fs.mkdirSync('/app/data');
                fs.writeFileSync(LOCK_FILE, 'Seeded on ' + new Date().toISOString());
                console.log('>> Lock file created.');

            } catch (err) {
                await client.query('ROLLBACK');
                console.error('Error seeding inventory:', err);
                process.exit(1);
            } finally {
                client.release();
                pool.end(); // Close connection
            }
        });
}

seed();