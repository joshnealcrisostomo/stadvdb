const express = require('express');
const fs = require('fs/promises'); // Use the 'promises' version of File System
const path = require('path'); // For building file paths

const router = express.Router();

// --- In-Memory Database ---
let allCards = [];
let allSets = [];
let allRarities = [];
let allTypes = [];
// --------------------------

const DATA_PATH = path.join(__dirname, '..', 'data', 'pokemon-tcg-data-master', 'pokemon-tcg-data-master');
const LOCAL_SETS_TO_LOAD = ['base1.json', 'base2.json', 'base3.json', 'base4.json', 'base5.json', 'base6.json', 'basep.json'];

async function loadDataIntoMemory() {
    try {
        console.log("Loading all local Pokémon data into server memory...");

        // 1. Load Sets filter
        const setsPath = path.join(DATA_PATH, 'sets', 'en.json');
        allSets = JSON.parse(await fs.readFile(setsPath, 'utf-8'));
        console.log(`Loaded ${allSets.length} sets.`);

        // 2. Load Cards
        const cardsPath = path.join(DATA_PATH, 'cards', 'en');
        
        for (const fileName of LOCAL_SETS_TO_LOAD) {
            const filePath = path.join(cardsPath, fileName);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const setCards = JSON.parse(fileContent);

            // --- THIS IS THE FIX ---
            const setId = fileName.replace('.json', '');
            const setInfo = allSets.find(s => s.id === setId);

            if (!setInfo) {
                console.warn(`Warning: Could not find set info for ${fileName}. Cards from this set will be missing '.set' data.`);
            }

            const cardsWithSetData = setCards.map(card => {
                card.set = setInfo; // Attach the set object to each card
                return card;
            });
            // --- END OF FIX ---

            allCards.push(...cardsWithSetData);
        }
        console.log(`Successfully loaded ${allCards.length} local cards.`);

        // --- 3. DYNAMICALLY BUILD FILTERS ---
        const raritySet = new Set();
        const typeSet = new Set();

        for (const card of allCards) {
            if (card.rarity) {
                raritySet.add(card.rarity);
            }
            if (card.types && Array.isArray(card.types)) {
                card.types.forEach(type => typeSet.add(type));
            }
        }

        allRarities = [...raritySet].sort();
        allTypes = [...typeSet].sort();

        console.log(`Dynamically generated ${allRarities.length} rarities and ${allTypes.length} types.`);
        console.log("--- Pokémon API is ready and running from local files. ---");

    } catch (err) {
        console.error("!!! FAILED TO LOAD LOCAL JSON DATA !!!", err.message);
        console.error("Please ensure your 'backend/data' folder contains 'sets/en.json' and 'cards/en/base1.json', etc.");
    }
}

// Run the function as soon as the server starts
loadDataIntoMemory();

// --- NEW API ROUTES (Reading from Memory) ---

/**
 * @route   GET /api/pokemon/cards
 * @desc    Fetch a list of cards from memory
 * @access  Public
 */
router.get('/cards', (req, res) => {
    let results = [...allCards]; // Start with a copy of all cards

    // --- INFINITE SCROLL (MODIFIED) ---
    // Now accepts 'page' query param, defaulting to 1
    const { q, select, pageSize = 50, page = 1 } = req.query;

    // --- 1. Handle Filtering (the 'q' param) ---
    if (q) {
        const queries = q.split(' ');
        
        queries.forEach(query => {
            const [key, value] = query.split(':', 2);
            if (!key || !value) return;

            const cleanValue = value.replace(/["*]/g, '').toLowerCase();

            results = results.filter(card => {
                if (key === 'name') {
                    return card.name.toLowerCase().includes(cleanValue);
                }
                if (key === 'set.id') {
                    return card.set && card.set.id === cleanValue;
                }
                if (key === 'rarity') {
                    return card.rarity && card.rarity.toLowerCase() === cleanValue.toLowerCase();
                }
                if (key === 'types') {
                    return card.types && card.types.some(type => type.toLowerCase() === cleanValue.toLowerCase());
                }
                return true;
            });
        });
    }

    // --- 2. Handle Field Selection (the 'select' param) ---
    if (select) {
        const fields = select.split(',');
        results = results.map(card => {
            const newCard = {};
            fields.forEach(field => {
                if (field.includes('.')) {
                    const [obj, prop] = field.split('.');
                    if (card[obj]) {
                        if (!newCard[obj]) {
                            newCard[obj] = {};
                        }
                        newCard[obj][prop] = card[obj][prop];
                    }
                } else {
                    newCard[field] = card[field];
                }
            });
            return newCard;
        });
    }

    // --- 3. Handle Pagination (MODIFIED) ---
    const limit = parseInt(pageSize, 10);
    const currentPage = parseInt(page, 10);
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit; // Use start index + limit

    const paginatedResults = results.slice(startIndex, endIndex);
    const totalCount = results.length; // Total count of *filtered* items

    // Send the final data, formatted just like the original API
    res.json({
        data: paginatedResults,
        page: currentPage, // Send back the current page
        pageSize: paginatedResults.length,
        count: paginatedResults.length,
        totalCount: totalCount // Send back the total filtered count
    });
});

/**
 * @route   GET /api/pokemon/cards/:id
 * @desc    Fetch a SINGLE card from memory
 * @access  Public
 */
router.get('/cards/:id', (req, res) => {
    const cardId = req.params.id;
    const card = allCards.find(c => c.id === cardId);

    if (card) {
        res.json({ data: card });
    } else {
        res.status(404).json({ error: 'Card not found' });
    }
});

/**
 * @route   GET /api/pokemon/filters
 * @desc    Fetch all filter data from memory
 * @access  Public
 */
router.get('/filters', (req, res) => {
    res.json({
        sets: allSets,
        rarities: allRarities,
        types: allTypes
    });
});

module.exports = router;