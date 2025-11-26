import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// --- ICONS ---
const CartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const ErrorIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// --- TOAST NOTIFICATION COMPONENT ---
const Toast = ({ show, message, type, onClose }) => {
    if (!show) return null;

    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-6 py-4 bg-white rounded-xl shadow-2xl border border-gray-100 transform transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {type === 'success' ? <CheckIcon /> : <ErrorIcon />}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${type === 'success' ? 'text-gray-900' : 'text-red-600'}`}>
                    {type === 'success' ? 'Success' : 'Error'}
                </h4>
                <p className="text-sm text-gray-500">{message}</p>
            </div>
            <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

// --- ADD TO CART MODAL ---
const AddToCartModal = ({ isOpen, onClose, onConfirm, product, quantity, setQuantity }) => {
    if (!isOpen || !product) return null;

    const handleIncrement = () => {
        if (quantity < product.quantity) setQuantity(quantity + 1);
    };

    const handleDecrement = () => {
        if (quantity > 1) setQuantity(quantity - 1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-extrabold text-gray-900">Add to Cart</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex gap-5 mb-8">
                        <div className="w-24 aspect-[3/4] bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 shadow-sm">
                             <img 
                                src={product.image_url || "https://images.pokemontcg.io/base1/1.png"} 
                                alt={product.card_name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-800 leading-tight mb-1">{product.card_name}</h4>
                            <p className="text-sm text-gray-500 mb-2">{product.set_name} • {product.rarity}</p>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                product.condition === 'Near Mint' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {product.condition}
                            </div>
                            <p className="text-sm font-medium text-gray-600 mt-2">Stock: {product.quantity}</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Select Quantity</label>
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 p-1">
                            <div className="flex items-center w-32">
                                <button 
                                    onClick={handleDecrement}
                                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
                                    disabled={quantity <= 1}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                </button>
                                <span className="flex-1 text-center font-bold text-lg text-gray-900">{quantity}</span>
                                <button 
                                    onClick={handleIncrement}
                                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
                                    disabled={quantity >= product.quantity}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </button>
                            </div>
                            <div className="pr-4 text-right">
                                <span className="block text-xs text-gray-500 font-medium uppercase tracking-wider">Total</span>
                                <span className="block font-extrabold text-xl text-[#5A6ACF]">${(product.price * quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onConfirm(product, quantity)}
                            className="flex-[2] bg-[#2a2a2a] text-white px-4 py-3.5 rounded-xl font-bold hover:bg-[#5A6ACF] transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                            <CartIcon />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

    // Dropdown Options
    const [sets, setSets] = useState([]);
    const [rarities, setRarities] = useState([]);
    const [types, setTypes] = useState([]);
    const [conditions, setConditions] = useState([]);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);

    // --- TOAST STATE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        // Auto hide after 3 seconds
        setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
        }, 3000);
    };

    // --- 1. FETCH FILTER OPTIONS ---
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await api.get('/inventory/filters');
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

    // --- 2. FETCH PRODUCTS ---
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    search: searchTerm,
                    set: selectedSet,
                    rarity: selectedRarity,
                    condition: selectedCondition,
                    type: selectedType,
                    sort: sortOrder
                };
                const response = await api.get('/inventory', { params });
                setProducts(response.data);
            } catch (err) {
                console.error("Error loading products:", err);
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(delayDebounceFn);

    }, [searchTerm, selectedSet, selectedRarity, selectedCondition, selectedType, sortOrder]);

    // --- CART HANDLERS ---
    const openAddToCartModal = (product) => {
        setSelectedProduct(product);
        setQuantity(1); // Reset quantity to 1 when opening
        setIsModalOpen(true);
    };

    const closeAddToCartModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedProduct(null), 200); // Delay clearing data for animation smoothness
    };

    const handleConfirmAddToCart = async (product, qty) => {
        try {
            console.log(`Adding ${qty} of ${product.card_name} to cart.`);
            
            await api.post('/cart', { 
                product_id: product.product_id,
                quantity: qty
            });

            // Close modal first
            closeAddToCartModal();

            // Show custom toast instead of alert
            showToast(`Added ${qty}x ${product.card_name} to your cart!`, 'success');
            
            // Refresh products to update stock display if needed
        } catch (err) {
            console.error("Error adding to cart:", err);
            closeAddToCartModal();
            showToast("Failed to add item to cart. Please try again.", 'error');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900 relative">
            <main className="w-full max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Latest Arrivals</h2>
                    <div className="flex flex-wrap gap-3">
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

                        {/* Filters (Sets, Rarity, Type, Condition, Sort) */}
                        <select value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]">
                            <option value="">All Sets</option>
                            {sets.map(set => <option key={set} value={set}>{set}</option>)}
                        </select>
                        
                        <select value={selectedRarity} onChange={(e) => setSelectedRarity(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]">
                            <option value="">All Rarities</option>
                            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>

                        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[120px]">
                            <option value="">All Types</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[140px]">
                            <option value="">All Conditions</option>
                            {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#5A6ACF] focus:border-[#5A6ACF] p-2.5 shadow-sm cursor-pointer min-w-[160px]">
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="newest">Newest Arrivals</option>
                        </select>
                    </div>
                </div>

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
                                setSearchTerm(''); setSelectedSet(''); setSelectedRarity(''); setSelectedType(''); setSelectedCondition('');
                            }}
                            className="mt-4 text-[#5A6ACF] font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {products.map((product) => (
                            <ProductCard 
                                key={product.product_id} 
                                product={product} 
                                onAddToCartClick={openAddToCartModal} 
                            />
                        ))}
                    </div>
                )}
            </main>

            <AddToCartModal 
                isOpen={isModalOpen}
                onClose={closeAddToCartModal}
                onConfirm={handleConfirmAddToCart}
                product={selectedProduct}
                quantity={quantity}
                setQuantity={setQuantity}
            />

            <Toast 
                show={toast.show} 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};

// --- PRODUCT CARD COMPONENT ---
const ProductCard = ({ product, onAddToCartClick }) => {
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
            
            <div className="relative w-full aspect-[3/4] bg-[#F1F2F7] flex items-center justify-center overflow-hidden p-4 pt-12">
                 <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border tracking-wider shadow-sm ${getConditionColor(product.condition)}`}>
                    {product.condition}
                </div>
                <img 
                    src={imageUrl} 
                    alt={product.card_name}
                    className="h-full w-auto object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-300 ease-out"
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
                    onClick={() => onAddToCartClick(product)}
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