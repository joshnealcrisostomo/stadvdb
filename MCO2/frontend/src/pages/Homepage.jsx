import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- ICONS ---
const CartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const Homepage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedSet, setSelectedSet] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedCondition, setSelectedCondition] = useState('');
    const [sortOrder, setSortOrder] = useState('price-asc');

    // Dropdown Options (Fetched from API now)
    const [sets, setSets] = useState([]);
    const [rarities, setRarities] = useState([]);
    const [types, setTypes] = useState([]);
    const [conditions, setConditions] = useState([]);

    // --- 1. FETCH FILTER OPTIONS (Runs once on mount) ---
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await axios.get('/api/inventory/filters');
                const { sets, rarities, conditions, types } = response.data;
                setSets(sets || []);
                setRarities(rarities || []);
                setConditions(conditions || []);
                setTypes(types || []);
            } catch (err) {
                console.error("Error loading filter options:", err);
            }
        };
        fetchFilterOptions();
    }, []);

    // --- 2. FETCH PRODUCTS (Runs when any filter changes) ---
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                // Build query params object
                const params = {
                    search: searchTerm,
                    set: selectedSet,
                    rarity: selectedRarity,
                    condition: selectedCondition,
                    type: selectedType,
                    sort: sortOrder
                };

                // Pass params to axios. 
                // URL becomes: /api/inventory?search=...&set=...&sort=...
                const response = await axios.get('/api/inventory', { params });
                setProducts(response.data);
                
            } catch (err) {
                console.error("Error loading products:", err);
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce search to prevent API spam while typing
        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(delayDebounceFn);

    }, [searchTerm, selectedSet, selectedRarity, selectedCondition, selectedType, sortOrder]);

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900">
            <main className="w-full max-w-[1600px] mx-auto px-6 py-8">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Latest Arrivals</h2>
                    
                    {/* Filter Bar */}
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                         <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search cards..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A6ACF] focus:border-transparent outline-none shadow-sm w-64 transition-all"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        {/* Set Dropdown */}
                        <select 
                            value={selectedSet}
                            onChange={(e) => setSelectedSet(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]"
                        >
                            <option value="">All Sets</option>
                            {sets.map(set => <option key={set} value={set}>{set}</option>)}
                        </select>
                        
                        {/* Rarity Dropdown */}
                        <select 
                            value={selectedRarity}
                            onChange={(e) => setSelectedRarity(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]"
                        >
                            <option value="">All Rarities</option>
                            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>

                        {/* Type Dropdown */}
                        <select 
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]"
                        >
                            <option value="">All Types</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {/* Condition Dropdown */}
                        <select 
                            value={selectedCondition}
                            onChange={(e) => setSelectedCondition(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[140px]"
                        >
                            <option value="">All Conditions</option>
                            {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* Sort Dropdown */}
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[160px]"
                        >
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="newest">Newest Arrivals</option>
                        </select>
                    </div>
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A6ACF]"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg border border-red-100 font-medium">
                        {error}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xl">No cards found matching your filters.</p>
                        <button 
                            onClick={() => {
                                setSearchTerm(''); 
                                setSelectedSet(''); 
                                setSelectedRarity('');
                                setSelectedType('');
                                setSelectedCondition('');
                            }}
                            className="mt-4 text-[#5A6ACF] font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product.product_id} product={product} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

// --- PRODUCT CARD COMPONENT ---
const ProductCard = ({ product }) => {
    const getConditionColor = (condition) => {
        switch(condition) {
            case 'Near Mint': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Lightly Played': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Moderately Played': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Heavily Played': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Damaged': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const imageUrl = product.image_url || "https://images.pokemontcg.io/base1/1.png"; 

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group relative overflow-hidden">
            
            <div className="relative w-full aspect-[3/4] bg-[#F1F2F7] flex items-center justify-center overflow-hidden p-4">
                 <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border tracking-wider shadow-sm ${getConditionColor(product.condition)}`}>
                    {product.condition}
                </div>
                <img 
                    src={imageUrl} 
                    alt={product.card_name}
                    className="h-full w-auto mt-15 object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-300 ease-out"
                    loading="lazy"
                />
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {product.set_name || "Pokemon TCG"} 
                </div>
                <h3 className="text-gray-900 font-bold text-lg leading-snug mb-1 line-clamp-1 group-hover:text-[#5A6ACF] transition-colors">
                    {product.card_name}
                </h3>
                <div className="mt-auto pt-4 flex items-end justify-between">
                    <div>
                        <span className="text-xl font-extrabold text-gray-900">${Number(product.price).toFixed(2)}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.quantity > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of Stock'}
                        </span>
                    </div>
                </div>

                <button 
                    disabled={product.quantity === 0}
                    className={`mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer
                        ${product.quantity > 0 
                            ? 'bg-[#2a2a2a] text-white hover:bg-[#5A6ACF] shadow-md hover:shadow-lg active:scale-95' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <CartIcon />
                    {product.quantity > 0 ? 'Add to Cart' : 'Sold Out'}
                </button>
            </div>
        </div>
    );
};

export default Homepage;