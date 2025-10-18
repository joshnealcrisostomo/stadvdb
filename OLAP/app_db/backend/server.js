// server.js
import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Example route: fetch all users (kept for context)
app.get("/api/users", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// New API endpoint for Green Energy Generation vs. Weather
app.get("/api/green-energy-vs-weather", async (req, res) => {
    const { startYear, endYear, sources } = req.query;

    if (!startYear || !endYear) {
        return res.status(400).json({ error: "startYear and endYear are required" });
    }

    // Safely parse and validate years
    const startY = parseInt(startYear);
    const endY = parseInt(endYear);

    if (isNaN(startY) || isNaN(endY)) {
        return res.status(400).json({ error: "Invalid year values" });
    }

    // Split sources string into an array and filter out non-green/non-renewable sources
    const greenSources = Array.isArray(sources) 
        ? sources 
        : (typeof sources === 'string' ? sources.split(',') : []);

    // Green/Renewable energy sources from the original list: Hydro, Solar, Wind, Biomass, Geothermal
    const renewableSources = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];
    const filteredSources = greenSources.filter(source => renewableSources.includes(source));

    // Base query to fetch temperature data (all years in range)
    let queryText = `
        SELECT 
            wd.year,
            wd.avg_temp_c,
            eg.source,
            eg.generation_gwh
        FROM 
            weather_data wd
        LEFT JOIN 
            energy_generation eg ON wd.year = eg.year
        WHERE 
            wd.year >= $1 AND wd.year <= $2
    `;
    const queryParams = [startY, endY];
    
    // Add filtering for selected energy sources
    if (filteredSources.length > 0) {
        // Build a list of placeholders ($3, $4, ...) for the IN clause
        const sourcePlaceholders = filteredSources.map((_, i) => `$${i + 3}`).join(', ');
        
        queryText += ` AND eg.source IN (${sourcePlaceholders})`;
        queryParams.push(...filteredSources);
    } else {
        // If no sources are selected, we still want the weather data for the year range, 
        // but we filter out the generation data to keep the response clean.
        queryText += ` AND eg.source IS NULL`;
    }

    queryText += `
        ORDER BY 
            wd.year, eg.source;
    `;

    try {
        const result = await pool.query(queryText, queryParams);
        
        // --- Data Transformation for Frontend (Chart.js) ---
        const transformedData = {
            years: [],
            temperature: [],
            energy: {}
        };
        
        const yearSet = new Set();

        result.rows.forEach(row => {
            const year = row.year;
            
            if (!yearSet.has(year)) {
                yearSet.add(year);
                transformedData.years.push(year);
                transformedData.temperature.push(row.avg_temp_c);
            }

            if (row.source && row.generation_gwh !== null) {
                if (!transformedData.energy[row.source]) {
                    transformedData.energy[row.source] = [];
                }
                transformedData.energy[row.source].push({
                    x: year, // Use year for the x-axis
                    y: parseFloat(row.generation_gwh) // Generation value for the y-axis
                });
            }
        });

        res.json(transformedData);
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ error: "Database query failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));