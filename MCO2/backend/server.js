// --- 1. Load Environment Variables ---
// Place this at the VERY TOP to ensure all .env variables
// are loaded before any other code runs.
require('dotenv').config();

// --- 2. Import Dependencies ---
const express = require('express');
const cors = require('cors'); // For allowing your React frontend to call the backend
const path = require('path'); // For serving the built React app (in production)

// --- 3. Import Your API Routes ---
const pokemonApiRoutes = require('./routes/pokemonApi');

// --- 4. Initialize Express App ---
const app = express();

// --- 5. Use Middleware ---
// Enable CORS (Cross-Origin Resource Sharing)
// This is CRITICAL to allow your React app (on http://localhost:5173)
// to fetch data from this server (on http://localhost:5001)
app.use(cors());

// Enable Express to parse JSON in request bodies (for POST/PUT requests)
app.use(express.json());

// --- 6. Mount Your API Routes ---
// This tells Express to use your pokemonApi.js file
// for any request that starts with "/api/pokemon"
app.use('/api/pokemon', pokemonApiRoutes);

// --- (Future Step: Add your other routes here) ---
// e.g., app.use('/api/products', productRoutes); // For your transactional DB
// e.g., app.use('/api/users', userRoutes);       // For login

// --- 7. (Optional) Basic Server Test Route ---
app.get('/api', (req, res) => {
    res.json({ message: "Hello from the Snorlax's Stash server!" });
});


// --- 8. Start The Server ---
const PORT = process.env.PORT || 5001; // Use port 5001 or one from .env

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("Press CTRL+C to stop the server.");
});