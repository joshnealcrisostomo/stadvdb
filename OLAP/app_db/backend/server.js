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

const sourceToColumnMap = {
    'Coal': 'coal_pct',
    'Hydro': 'hydro_pct',
    'Natural Gas': 'natural_gas_pct',
    'Oil': 'oil_pct',
    'Nuclear': 'nuclear_pct',
    'Renewable': 'renewable_pct'
};

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

app.get("/api/energy-mix-comparison", async (req, res) => {
    const { startYear, endYear, countries, sources } = req.query;

    if (!startYear || !endYear || !countries || !sources) {
        return res.status(400).json({ error: "startYear, endYear, countries, and sources are required query parameters." });
    }

    const startY = parseInt(startYear, 10);
    const endY = parseInt(endYear, 10);
    const countryList = countries.split(',').filter(c => c);
    const sourceList = sources.split(',').filter(s => s);

    if (isNaN(startY) || isNaN(endY) || countryList.length === 0 || sourceList.length === 0) {
        return res.status(400).json({ error: "Invalid year, country, or source values provided." });
    }

    // This transforms columns into rows for easier filtering
    const unpivotClauses = sourceList
        .map(source => {
            const columnName = sourceToColumnMap[source];
            if (columnName) {
                return `
                    SELECT geo_key, date_key, '${source}' AS source_name, ${columnName} AS percentage
                    FROM fact_energy
                    WHERE ${columnName} IS NOT NULL
                `;
            }
            return null;
        })
        .filter(Boolean);

    if (unpivotClauses.length === 0) {
        return res.json({});
    }
    
    const unpivotedDataSubquery = unpivotClauses.join(' UNION ALL ');

    const queryText = `
        SELECT
            d.year,
            g.country_name,
            u.source_name,
            u.percentage
        FROM (${unpivotedDataSubquery}) AS u
        JOIN dim_date d ON u.date_key = d.date_key
        JOIN dim_geo g ON u.geo_key = g.geo_key
        WHERE d.year >= $1 AND d.year <= $2 AND g.country_name = ANY($3::text[])
        ORDER BY g.country_name, u.source_name, d.year;
    `;

    const queryParams = [startY, endY, countryList];

    try {
        const result = await pool.query(queryText, queryParams);

        const transformedData = {};
        result.rows.forEach(row => {
            const { country_name, year, source_name, percentage } = row;
            const key = `${country_name} - ${source_name}`;
            
            if (!transformedData[key]) {
                transformedData[key] = [];
            }
            transformedData[key].push({
                x: year,
                y: parseFloat(percentage)
            });
        });
        res.json(transformedData);
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ error: "Database query failed" });
    }
});

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
        responseData.topYears = yearlyTotals.slice(-5).reverse();

        res.json(responseData);

    } catch (err) {
        console.error("Database Query Error for green-energy-vs-weather:", err);
        res.status(500).json({ error: "Failed to fetch energy vs weather data" });
    }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));