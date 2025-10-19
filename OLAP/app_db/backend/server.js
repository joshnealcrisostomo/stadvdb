import express from "express";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_WAREHOUSE,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT || 5432,
});

// --- NEW API ENDPOINT FOR DYNAMIC FILTERS ---
app.get("/api/filters", async (req, res) => {
    try {
        // Query for min/max years that have renewable data
        const yearQuery = `
            SELECT
                MIN(d.year) AS min_year,
                MAX(d.year) AS max_year
            FROM fact_energy f
            JOIN dim_date d ON f.date_key = d.date_key
            WHERE f.renewable_pct IS NOT NULL;
        `;

        // Query for distinct countries that have renewable data
        const countryQuery = `
            SELECT DISTINCT g.country_name
            FROM fact_energy f
            JOIN dim_geo g ON f.geo_key = g.geo_key
            WHERE g.country_name IS NOT NULL AND f.renewable_pct IS NOT NULL
            ORDER BY g.country_name ASC;
        `;

        // Execute both queries concurrently for efficiency
        const [yearResult, countryResult] = await Promise.all([
            pool.query(yearQuery),
            pool.query(countryQuery)
        ]);

        const minYear = yearResult.rows[0].min_year;
        const maxYear = yearResult.rows[0].max_year;
        const countries = countryResult.rows.map(row => row.country_name);

        res.json({ minYear, maxYear, countries });

    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ error: "Failed to fetch filter data" });
    }
});


// --- API ENDPOINT FOR ENERGY MIX COMPARISON ---
app.get("/api/energy-mix-comparison", async (req, res) => {
    // ... (This endpoint remains the same as before)
    const { startYear, endYear, countries } = req.query;

    if (!startYear || !endYear || !countries) {
        return res.status(400).json({ error: "startYear, endYear, and countries are required query parameters." });
    }

    const startY = parseInt(startYear, 10);
    const endY = parseInt(endYear, 10);
    const countryList = Array.isArray(countries) ? countries : countries.split(',').filter(c => c);

    if (isNaN(startY) || isNaN(endY) || countryList.length === 0) {
        return res.status(400).json({ error: "Invalid year or country values provided." });
    }

    const queryText = `
        SELECT
            d.year,
            g.country_name,
            f.renewable_pct AS renewable_percentage
        FROM fact_energy f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_geo g ON f.geo_key = g.geo_key
        WHERE d.year >= $1 AND d.year <= $2 AND g.country_name = ANY($3::text[]) AND f.renewable IS NOT NULL
        ORDER BY g.country_name, d.year;
    `;
    const queryParams = [startY, endY, countryList];

    try {
        const result = await pool.query(queryText, queryParams);
        const transformedData = {};
        result.rows.forEach(row => {
            const { country_name, year, renewable_percentage } = row;
            if (!transformedData[country_name]) {
                transformedData[country_name] = [];
            }
            transformedData[country_name].push({
                x: year,
                y: parseFloat(renewable_percentage)
            });
        });
        res.json(transformedData);
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ error: "Database query failed" });
    }
});

// --- NEW: API ENDPOINT FOR GREEN ENERGY VS WEATHER ---
app.get('/api/green-energy-vs-weather', async (req, res) => {
    const { startYear, endYear } = req.query;

    if (!startYear || !endYear) {
        return res.status(400).json({ error: 'startYear and endYear are required.' });
    }
    
    const query = `
        SELECT
            d.year,
            w.avg_mean_temp_deg_c,
            f.hydro_gwh,
            f.solar_gwh,
            f.wind_gwh,
            f.biomass_gwh,
            f.geothermal_gwh
        FROM fact_energy f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN fact_weather w ON f.date_key = w.date_key
        JOIN dim_geo g ON f.geo_key = g.geo_key
        WHERE
            f.geo_key = 43 -- Filter for the Philippines
            AND d.year >= $1
            AND d.year <= $2
        ORDER BY d.year ASC;
    `;

    try {
        const result = await pool.query(query, [startYear, endYear]);
        
        const responseData = {
            years: [],
            temperature: [],
            energy: { 'Hydro': [], 'Solar': [], 'Wind': [], 'Biomass': [], 'Geothermal': [] },
        };

        // --- NEW: Calculate total GWh per year ---
        const yearlyTotals = [];

        result.rows.forEach(row => {
            responseData.years.push(row.year);
            responseData.temperature.push(parseFloat(row.avg_mean_temp_deg_c));

            // Map energy sources
            if (row.hydro_gwh > 0) responseData.energy['Hydro'].push({ x: row.year, y: parseFloat(row.hydro_gwh) });
            if (row.solar_gwh > 0) responseData.energy['Solar'].push({ x: row.year, y: parseFloat(row.solar_gwh) });
            if (row.wind_gwh > 0) responseData.energy['Wind'].push({ x: row.year, y: parseFloat(row.wind_gwh) });
            if (row.biomass_gwh > 0) responseData.energy['Biomass'].push({ x: row.year, y: parseFloat(row.biomass_gwh) });
            if (row.geothermal_gwh > 0) responseData.energy['Geothermal'].push({ x: row.year, y: parseFloat(row.geothermal_gwh) });
            
            // Sum all GWh for the current year
            const totalGwh = 
                (parseFloat(row.hydro_gwh) || 0) +
                (parseFloat(row.solar_gwh) || 0) +
                (parseFloat(row.wind_gwh) || 0) +
                (parseFloat(row.biomass_gwh) || 0) +
                (parseFloat(row.geothermal_gwh) || 0);

            yearlyTotals.push({ year: row.year, totalGwh });
        });
        
        // Sort by total GWh to find highest and lowest
        yearlyTotals.sort((a, b) => a.totalGwh - b.totalGwh);

        // Add the sorted data to the response object
        responseData.bottomYears = yearlyTotals.slice(0, 5);
        responseData.topYears = yearlyTotals.slice(-5).reverse(); // slice gets last 5, reverse makes it descending

        res.json(responseData);

    } catch (err) {
        console.error("Database Query Error for green-energy-vs-weather:", err);
        res.status(500).json({ error: "Failed to fetch energy vs weather data" });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));