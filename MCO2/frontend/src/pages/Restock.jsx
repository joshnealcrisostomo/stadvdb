import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// A debounce function to prevent API calls on every keystroke
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const RestockItems = () => {
    // State for cards and API status
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false); // For initial load/new searches
    const [error, setError] = useState(null);

    // --- INFINITE SCROLL (NEW STATE) ---
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true); // Is there more data to fetch?
    const [loadingMore, setLoadingMore] = useState(false); // For "load more" spinner
    const scrollContainerRef = useRef(null); // Ref for the scrollable div

    // State for filter dropdown data
    const [filters, setFilters] = useState({ sets: [], rarities: [], types: [] });
    const [loadingFilters, setLoadingFilters] = useState(true);

    // State for selected filter values
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSet, setSelectedSet] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [selectedType, setSelectedType] = useState('');

    // Debounce the search term to avoid excessive API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // 1. Fetch filter data (sets, rarities, types) on component mount
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                setLoadingFilters(true);
                const response = await axios.get('/api/pokemon/filters');
                setFilters({
                    sets: response.data.sets || [],
                    rarities: response.data.rarities || [],
                    types: response.data.types || []
                });
            } catch (err) {
                console.error("Error fetching filters:", err);
                setError('Could not load filter data.');
            } finally {
                setLoadingFilters(false);
            }
        };
        fetchFilterData();
    }, []); // Empty array means this runs once on mount


    // --- INFINITE SCROLL (HELPER FUNCTION) ---
    // Helper to build the query string from current state
    const buildQueryString = () => {
        let queryParts = [];
        if (debouncedSearchTerm) {
            queryParts.push(`name:${debouncedSearchTerm}*`);
        }
        if (selectedSet) {
            queryParts.push(`set.id:${selectedSet}`);
        }
        if (selectedRarity) {
            queryParts.push(`rarity:"${selectedRarity}"`);
        }
        if (selectedType) {
            queryParts.push(`types:${selectedType}`);
        }
        return queryParts.join(' ');
    };

    // --- INFINITE SCROLL (MODIFIED) ---
    // 2. Fetch cards when search/filter state changes (NEW SEARCH)
    // This effect handles *new* searches, resets to page 1, and *replaces* cards.
    useEffect(() => {
        const fetchNewData = async () => {
            setLoading(true); // Show main loading spinner
            setPage(1); // Reset to page 1
            setError(null);
            
            const queryString = buildQueryString();

            try {
                const response = await axios.get('/api/pokemon/cards', {
                    params: {
                        q: queryString || undefined,
                        pageSize: 50,
                        page: 1 // Always fetch page 1 for a new search
                    }
                });
                
                const newCards = response.data.data || [];
                setCards(newCards); // Replace old cards
                setHasMore(response.data.totalCount > newCards.length); // Check if there's more

            } catch (err) {
                console.error("Error fetching cards:", err);
                setError('Could not fetch cards.');
            } finally {
                setLoading(false); // Hide main loading spinner
            }
        };

        fetchNewData();
        
    }, [debouncedSearchTerm, selectedSet, selectedRarity, selectedType]); // Re-run on filter changes


    // --- INFINITE SCROLL (NEW FUNCTION) ---
    // 3. Load *more* cards (PAGINATION)
    // This function is called by the scroll handler to fetch the *next* page
    const loadMoreCards = async () => {
        // Guard: Don't fetch if already loading, or if no more cards
        if (loading || loadingMore || !hasMore) return; 

        setLoadingMore(true);
        setError(null);
        
        const nextPage = page + 1;
        const queryString = buildQueryString();

        try {
            const response = await axios.get('/api/pokemon/cards', {
                params: {
                    q: queryString || undefined,
                    pageSize: 50,
                    page: nextPage // Fetch the next page
                }
            });

            const newCards = response.data.data || [];
            
            // Append new cards to existing cards
            setCards(prevCards => {
                const allCards = [...prevCards, ...newCards];
                
                // Update hasMore based on the total count from the API
                setHasMore(response.data.totalCount > allCards.length);
                
                return allCards;
            });
            
            setPage(nextPage); // Update the page number

        } catch (err) {
            console.error("Error fetching more cards:", err);
            setError('Could not load more cards.');
        } finally {
            setLoadingMore(false);
        }
    };

    // --- INFINITE SCROLL (NEW FUNCTION) ---
    // 4. Scroll handler
    // This function checks if the user has scrolled near the bottom
    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;

        // Check if scrolled to ~200px from the bottom
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 200;

        if (atBottom) {
            loadMoreCards();
        }
    };


    // This is what the seller clicks to list an item
    const handleSelectCard = (card) => {
        console.log('Selected card:', card.name, card.id);
        // In a real app, this would open a modal:
        // setSelectedCardForListing(card);
        // setIsModalOpen(true);
    };

    return (
        // Main container: full height, flex column
        <div className="h-full flex flex-col font-sans bg-[#fafafa] p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">List New Card</h1>
            <p className="text-gray-600 mb-6">
                Find a card from the official database to add to your store's inventory.
            </p>

            {/* --- Filter Bar --- */}
            <div className="flex flex-wrap gap-4 mb-6">
                {/* Search Bar */}
                <div className="relative flex-grow min-w-[250px]">
                    <input
                        type="text"
                        placeholder="Search by card name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Set Filter */}
                <select 
                    value={selectedSet} 
                    onChange={(e) => setSelectedSet(e.target.value)}
                    disabled={loadingFilters}
                    className="flex-grow min-w-[150px] p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]"
                >
                    <option value="">All Sets</option>
                    {filters.sets.map(set => (
                        <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                </select>

                {/* Rarity Filter */}
                <select 
                    value={selectedRarity} 
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    disabled={loadingFilters}
                    className="flex-grow min-w-[150px] p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]"
                >
                    <option value="">All Rarities</option>
                    {filters.rarities.map(rarity => (
                        <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                </select>

                {/* Type Filter */}
                <select 
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value)}
                    disabled={loadingFilters}
                    className="flex-grow min-w-[150px] p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]"
                >
                    <option value="">All Types</option>
                    {filters.types.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* --- Card Display Area --- */}
            {/* --- INFINITE SCROLL (MODIFIED) --- */}
            {/* Added ref and onScroll handler to this div */}
            <div 
                className="flex-grow bg-white border border-gray-200 rounded-lg shadow-inner overflow-y-auto p-6"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {/* Main loading spinner (for new searches) */}
                {loading && (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#5A6ACF]"></div>
                    </div>
                )}
                
                {/* Error message */}
                {error && !loading && (
                    <div className="flex justify-center items-center h-full">
                        <span className="text-red-500 text-lg">{error}</span>
                    </div>
                )}

                {/* No results message */}
                {!loading && !error && cards.length === 0 && (
                     <div className="flex justify-center items-center h-full">
                        <span className="text-gray-500 text-lg">No cards found. Try adjusting your filters.</span>
                    </div>
                )}
                
                {/* Card grid (only shown when not doing a new search) */}
                {!loading && !error && cards.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {cards.map(card => (
                            <div 
                                key={card.id} // Using card.id as key
                                className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col justify-between"
                            >
                                <img 
                                    src={card.images.small} 
                                    alt={card.name} 
                                    className="w-full h-auto"
                                />
                                <div className="p-3">
                                    <h3 className="text-sm font-semibold truncate" title={card.name}>{card.name}</h3>
                                    <p className="text-xs text-gray-500">{card.set.name}</p>
                                    <button 
                                        onClick={() => handleSelectCard(card)}
                                        className="w-full bg-[#5A6ACF] text-white text-sm font-medium py-2 px-3 rounded-md mt-3 hover:bg-[#4a58b0] transition-colors"
                                    >
                                        Select
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- INFINITE SCROLL (NEW JSX) --- */}
                {/* "Loading More" spinner at the bottom */}
                {loadingMore && (
                    <div className="flex justify-center items-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5A6ACF]"></div>
                    </div>
                )}

                {/* "End of results" message */}
                {!hasMore && !loadingMore && cards.length > 0 && (
                    <div className="flex justify-center items-center py-6">
                        <span className="text-gray-500">End of results</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockItems;