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
        const yearQuery = `
            SELECT
                MIN(d.year) AS min_year,
                MAX(d.year) AS max_year
            FROM fact_energy f
            JOIN dim_date d ON f.date_key = d.date_key
            WHERE f.geo_key = 43;
        `;

        const countryQuery = `SELECT country_name FROM mv_distinct_countries;`;

        const [yearResult, countryResult] = await Promise.all([
            pool.query(yearQuery),
            pool.query(countryQuery)
        ]);

        const phMinYear = 1990;
        const phMaxYear = yearResult.rows[0].max_year;
        const globalMinYear = 1960;

        const countries = countryResult.rows.map(row => row.country_name);

        res.json({
            minYear: phMinYear,
            maxYear: phMaxYear,
            globalMinYear: globalMinYear,
            countries
        });

    } catch (err) {
        console.error("Database Query Error in /api/filters:", err);
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

    const caseClauses = sourceList.map(source => {
        const columnName = sourceToColumnMap[source];
        if (columnName) {
            return `WHEN '${source}' THEN f.${columnName}`;
        }
        return '';
    }).join(' ');

    const queryText = `
        SELECT
            d.year,
            g.country_name,
            s.source_name,
            CASE s.source_name ${caseClauses} END AS percentage
        FROM
            fact_energy f
        JOIN
            dim_date d ON f.date_key = d.date_key
        JOIN
            dim_geo g ON f.geo_key = g.geo_key
        CROSS JOIN
            (VALUES ${sourceList.map(s => `('${s}')`).join(',')}) AS s(source_name)
        WHERE
            d.year >= $1 AND d.year <= $2
            AND g.country_name = ANY($3::text[])
            -- MODIFICATION: Removed the "IS NOT NULL" filter to allow nulls
        ORDER BY
            g.country_name, s.source_name, d.year;
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
            
            // MODIFICATION: Check for null and pass it, otherwise parse float
            transformedData[key].push({
                x: year,
                y: percentage === null ? null : parseFloat(percentage)
            });
        });
        res.json(transformedData);
    } catch (err) {
        console.error("Database Query Error in /api/energy-mix-comparison:", err);
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
            f.geo_key = 43
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

        // Helper function to parse nulls correctly
        const parseOrNull = (val) => (val === null || val === undefined) ? null : parseFloat(val);

        result.rows.forEach(row => {
            responseData.years.push(row.year);
            // MODIFICATION: Handle null temperature
            responseData.temperature.push(parseOrNull(row.avg_mean_temp_deg_c));
            
            // MODIFICATION: Always push data, passing null if value is null
            responseData.energy['Hydro'].push({ x: row.year, y: parseOrNull(row.hydro_gwh) });
            responseData.energy['Solar'].push({ x: row.year, y: parseOrNull(row.solar_gwh) });
            responseData.energy['Wind'].push({ x: row.year, y: parseOrNull(row.wind_gwh) });
            responseData.energy['Biomass'].push({ x: row.year, y: parseOrNull(row.biomass_gwh) });
            responseData.energy['Geothermal'].push({ x: row.year, y: parseOrNull(row.geothermal_gwh) });

            // This part for totals is fine, || 0 is correct for a SUM
            const totalGwh = 
                (parseFloat(row.hydro_gwh) || 0) +
                (parseFloat(row.solar_gwh) || 0) +
                (parseFloat(row.wind_gwh) || 0) +
                (parseFloat(row.biomass_gwh) || 0) +
                (parseFloat(row.geothermal_gwh) || 0);
            yearlyTotals.push({ year: row.year, totalGwh });
        });
        
        yearlyTotals.sort((a, b) => a.totalGwh - b.totalGwh);
        responseData.bottomYears = yearlyTotals.slice(0, 5);
        responseData.topYears = yearlyTotals.slice(-5).reverse();
        res.json(responseData);
    } catch (err) {
        console.error("Database Query Error for green-energy-vs-weather:", err);
        res.status(500).json({ error: "Failed to fetch energy vs weather data" });
    }
});

app.get('/api/ph-total-energy', async (req, res) => {
    // ... (This endpoint uses SUM(), which already handles nulls correctly. No changes needed.)
    const { startYear, endYear, aggregation } = req.query;
    if (!startYear || !endYear || !aggregation) {
        return res.status(400).json({ error: 'startYear, endYear, and aggregation are required.' });
    }
    let query;
    let queryParams;
    if (aggregation === 'all-time') {
        queryParams = [];
        query = `
            SELECT 'All-Time Total' AS period, SUM(f.coal_gwh) AS coal, SUM(f.oil_gwh) AS oil, SUM(f.natural_gas_gwh) AS natural_gas, SUM(f.hydro_gwh) AS hydro, SUM(f.solar_gwh) AS solar, SUM(f.wind_gwh) AS wind, SUM(f.geothermal_gwh) AS geothermal, SUM(f.biomass_gwh) AS biomass
            FROM fact_energy f JOIN dim_date d ON f.date_key = d.date_key WHERE f.geo_key = 43;
        `;
    } else {
        let groupByClause, selectClause;
        queryParams = [startYear, endYear];
        switch (aggregation) {
            case '5-year':
                groupByClause = 'FLOOR(d.year / 5) * 5';
                selectClause = `CONCAT(FLOOR(d.year / 5) * 5, ' - ', FLOOR(d.year / 5) * 5 + 4) AS period`;
                break;
            case 'decade':
                groupByClause = 'FLOOR(d.year / 10) * 10';
                selectClause = `CONCAT(FLOOR(d.year / 10) * 10, ' - ', FLOOR(d.year / 10) * 10 + 9) AS period`;
                break;
            default:
                groupByClause = 'd.year';
                selectClause = 'd.year::TEXT AS period';
                break;
        }
        query = `
            SELECT ${selectClause}, SUM(f.coal_gwh) AS coal, SUM(f.oil_gwh) AS oil, SUM(f.natural_gas_gwh) AS natural_gas, SUM(f.hydro_gwh) AS hydro, SUM(f.solar_gwh) AS solar, SUM(f.wind_gwh) AS wind, SUM(f.geothermal_gwh) AS geothermal, SUM(f.biomass_gwh) AS biomass
            FROM fact_energy f JOIN dim_date d ON f.date_key = d.date_key
            WHERE f.geo_key = 43 AND d.year >= $1 AND d.year <= $2
            GROUP BY ${groupByClause} ORDER BY ${groupByClause} ASC;
        `;
    }
    try {
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error("Database Query Error for ph-total-energy:", err);
        res.status(500).json({ error: "Failed to fetch total energy data" });
    }
});

app.get('/api/ph-renewable-vs-non', async (req, res) => {
    // ... (This endpoint also uses SUM(). No changes needed.)
    const { startYear, endYear, aggregation } = req.query;
    if (!startYear || !endYear || !aggregation) {
        return res.status(400).json({ error: 'startYear, endYear, and aggregation are required.' });
    }
    let query, groupByClause, selectClause;
    let queryParams = [startYear, endYear];
    switch (aggregation) {
        case '5-year':
            groupByClause = 'FLOOR(d.year / 5) * 5';
            selectClause = `CONCAT(FLOOR(d.year / 5) * 5, ' - ', FLOOR(d.year / 5) * 5 + 4) AS period`;
            break;
        case 'decade':
            groupByClause = 'FLOOR(d.year / 10) * 10';
            selectClause = `CONCAT(FLOOR(d.year / 10) * 10, ' - ', FLOOR(d.year / 10) * 10 + 9) AS period`;
            break;
        case 'all-time':
            groupByClause = "'All-Time Total'";
            selectClause = "'All-Time Total' AS period";
            queryParams = [];
            break;
        default:
            groupByClause = 'd.year';
            selectClause = 'd.year::TEXT AS period';
            break;
    }
    const yearFilter = (aggregation !== 'all-time') ? 'AND d.year >= $1 AND d.year <= $2' : '';
    query = `
        SELECT ${selectClause}, SUM(f.hydro_gwh + f.solar_gwh + f.wind_gwh + f.geothermal_gwh + f.biomass_gwh) AS renewable_total, SUM(f.coal_gwh + f.oil_gwh + f.natural_gas_gwh) AS non_renewable_total
        FROM fact_energy f JOIN dim_date d ON f.date_key = d.date_key
        WHERE f.geo_key = 43 ${yearFilter}
        GROUP BY ${groupByClause} ORDER BY ${groupByClause} ASC;
    `;
    try {
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error("Database Query Error for ph-renewable-vs-non:", err);
        res.status(500).json({ error: "Failed to fetch renewable vs non-renewable data" });
    }
});

app.get('/api/non-renewable-generation', async (req, res) => {
    const { startYear, endYear, countries } = req.query;
    if (!startYear || !endYear || !countries) {
        return res.status(400).json({ error: "startYear, endYear, and countries are required." });
    }
    const countryList = countries.split(',').filter(c => c);
    if (countryList.length === 0) {
        return res.status(400).json({ error: "At least one country is required." });
    }
    const query = `
        SELECT d.year, g.country_name, SUM(f.coal_pct) AS coal, SUM(f.oil_pct) AS oil, SUM(f.natural_gas_pct) AS natural_gas, SUM(f.nuclear_pct) AS nuclear
        FROM fact_energy f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_geo g ON f.geo_key = g.geo_key
        WHERE d.year >= $1 AND d.year <= $2 AND g.country_name = ANY($3::text[])
        GROUP BY g.country_name, d.year ORDER BY g.country_name, d.year;
    `;
    try {
        const result = await pool.query(query, [startYear, endYear, countryList]);
        const transformedData = {};
        const sourceMap = { 'coal': 'Coal', 'oil': 'Oil', 'natural_gas': 'Natural Gas', 'nuclear': 'Nuclear' };
        result.rows.forEach(row => {
            const { year, country_name } = row;
            for (const sourceKey in sourceMap) {
                const sourceName = sourceMap[sourceKey];
                const key = `${country_name} - ${sourceName}`;
                const decimalValue = row[sourceKey];
                if (!transformedData[key]) {
                    transformedData[key] = [];
                }

                // MODIFICATION: Always push, but check for null/undefined before parsing
                transformedData[key].push({
                    x: year,
                    y: (decimalValue !== null && decimalValue !== undefined) ? parseFloat(decimalValue) * 100 : null
                });
            }
        });
        res.json(transformedData);
    } catch (err) {
        console.error("Database Query Error for non-renewable-generation:", err);
        res.status(500).json({ error: "Failed to fetch non-renewable generation data" });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));