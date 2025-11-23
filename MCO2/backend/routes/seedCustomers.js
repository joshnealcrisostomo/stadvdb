const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'oltp_db',
    password: process.env.DB_PASS || 'Joshneal2245', // Ensure this matches your docker-compose
    port: process.env.DB_PORT || 5432,
});

const seedUsers = async () => {
    // 1. Your specific "Hero" users for demo/manual testing
    const heroUsers = [
        {
            first_name: "Ash",
            last_name: "Ketchum",
            user_name: "AshKetch20",
            plain_password: "Buyer1_1234"
        },
        {
            first_name: "Roronoa",
            last_name: "Zoro",
            user_name: "Zoro_11",
            plain_password: "Buyer2_1234"
        },
        {
            first_name: "Killua",
            last_name: "Zoldyck",
            user_name: "Kill_Zoldy",
            plain_password: "Buyer3_1234"
        }
    ];

    try {
        await client.connect();
        console.log(`✅ Connected to database at ${client.host}...`);

        // --- PART 1: Insert Hero Users ---
        console.log("--- Seeding Hero Users ---");
        for (const user of heroUsers) {
            const hashedPassword = await bcrypt.hash(user.plain_password, 10);
            
            await insertUser(user.first_name, user.last_name, user.user_name, hashedPassword);
        }

        // --- PART 2: Bulk Seed 1000 Users for JMeter ---
        console.log("\n--- Seeding 1,000 Bot Users for Load Testing ---");
        
        // OPTIMIZATION: Hash the password ONCE. 
        // Hashing 1000 times inside the loop would take ~100 seconds. This takes ~0.1s.
        const commonPasswordHash = await bcrypt.hash("BotPassword123!", 10);

        // We use a simple loop. For 1000 rows, sequential inserts are fast enough.
        // If you needed 1,000,000 rows, we would use COPY or bulk insert.
        for (let i = 1; i <= 1000; i++) {
            const username = `User_${i}`;
            
            // Skip if this username overlaps with heroes (unlikely with this naming)
            await insertUser(
                `BotFirst${i}`, 
                `BotLast${i}`, 
                username, 
                commonPasswordHash
            );

            if (i % 100 === 0) process.stdout.write(`.`); // Progress bar
        }
        console.log("\n✅ Successfully seeded 1,000+ users!");

    } catch (err) {
        console.error('❌ Error seeding users:', err);
    } finally {
        await client.end();
    }
};

// Helper function to handle the Insert and Duplicate checks
async function insertUser(first, last, username, passHash) {
    const query = `
        INSERT INTO Customer (first_name, last_name, user_name, password_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_name) DO NOTHING
        RETURNING customer_id;
    `;
    
    // Note: I added "ON CONFLICT DO NOTHING" to prevent crashing if you run this script twice.
    // Ensure your "Customer" table has a UNIQUE constraint on 'user_name'.

    try {
        const res = await client.query(query, [first, last, username, passHash]);
        if (res.rows.length > 0) {
            // Uncomment if you want to see every insert (spammy for 1000 users)
            // console.log(`Inserted: ${username} (ID: ${res.rows[0].customer_id})`);
        }
    } catch (e) {
        console.error(`Failed to insert ${username}:`, e.message);
    }
}

seedUsers();