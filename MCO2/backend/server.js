// server.js

// --- 1. Load Environment Variables ---
// Make sure to run: npm install dotenv
require('dotenv').config();

// --- 2. Import Dependencies ---
const express = require('express');
const cors = require('cors'); 

// --- 3. Import Your API Routes ---
// NOTE: Adjusted paths to './' to match the flat file structure of this environment.
// If you create a 'routes' folder, move these files there and update paths to './routes/...'
const cartRoutes = require('./routes/cartApi');
const inventoryApiRoutes = require('./routes/inventoryApi'); 
const pokemonApiRoutes = require('./routes/pokemonApi');
const checkoutApi = require('./routes/checkoutApi');

// --- 4. Initialize Express App ---
const app = express();

// --- 5. Use Middleware ---
app.use(cors());
// INCREASED LIMIT: Essential for uploading large CSV JSON payloads
app.use(express.json({ limit: '50mb' })); 

// --- 6. Mount Your API Routes ---
app.use('/api', cartRoutes); // Keeps the cart functionality working
app.use('/api/inventory', inventoryApiRoutes); // Connects the Homepage logic
app.use('/api/pokemon', pokemonApiRoutes); // Connects the Pokemon logic
app.use('/api/checkout', checkoutApi);

// --- 7. Basic Test Route ---
app.get('/api', (req, res) => {
    res.json({ message: "Server is connected to PostgreSQL!" });
});

// --- 8. Start The Server ---
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});