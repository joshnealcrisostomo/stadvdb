require('dotenv').config();
const express = require('express');
const cors = require('cors'); 

const authMiddleware = require('./middleware/authMiddleware');

const cartRoutes = require('./routes/cartApi');
const inventoryApiRoutes = require('./routes/inventoryApi'); 
const pokemonApiRoutes = require('./routes/pokemonApi');
const checkoutApi = require('./routes/checkoutApi');
const testRoutes = require('./routes/testApi');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); 

app.use('/api/test', testRoutes);

app.use(authMiddleware);

app.use('/api', cartRoutes);
app.use('/api/inventory', inventoryApiRoutes);
app.use('/api/pokemon', pokemonApiRoutes); 
app.use('/api/checkout', checkoutApi);

app.get('/api', (req, res) => {
    res.json({ message: "Server is connected to PostgreSQL!" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});