const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Connect to the DB using Environment Variables (with fallbacks for local testing)
const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'oltp_db',
    password: process.env.DB_PASS || 'Joshneal2245',
    port: process.env.DB_PORT || 5432,
});

const seedUsers = async () => {
    const usersToInsert = [
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
        console.log(`🐳 Connected to database at ${client.host}...`);

        for (const user of usersToInsert) {
            // Hash password with 10 rounds of salt
            const hashedPassword = await bcrypt.hash(user.plain_password, 10);

            const query = `
                INSERT INTO Customer (first_name, last_name, user_name, password_hash)
                VALUES ($1, $2, $3, $4)
                RETURNING customer_id, user_name;
            `;

            const values = [
                user.first_name, 
                user.last_name, 
                user.user_name, 
                hashedPassword
            ];

            try {
                const res = await client.query(query, values);
                console.log(`✅ Inserted: ${res.rows[0].user_name} (ID: ${res.rows[0].customer_id})`);
            } catch (insertError) {
                // Handle duplicate usernames
                if (insertError.code === '23505') {
                    console.log(`⚠️  Skipped: ${user.user_name} already exists.`);
                } else {
                    throw insertError;
                }
            }
        }

    } catch (err) {
        console.error('❌ Error seeding users:', err);
    } finally {
        await client.end();
    }
};

seedUsers();