// server.js

// --- 1. Load Environment Variables ---
require('dotenv').config();

// --- 2. Import Dependencies ---
const express = require('express');
const cors = require('cors'); 

// --- 3. Import Your API Routes ---
const pokemonApiRoutes = require('./routes/pokemonApi');

// --- 4. Initialize Express App ---
const app = express();

// --- 5. Use Middleware ---
app.use(cors());
app.use(express.json());

// --- 6. Mount Your API Routes ---
app.use('/api/pokemon', pokemonApiRoutes);

// --- 7. Basic Test Route ---
app.get('/api', (req, res) => {
    res.json({ message: "Server is connected to PostgreSQL!" });
});

// --- 8. Start The Server ---
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});