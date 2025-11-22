import React, { useState, useEffect } from 'react';
import { Trash2, CreditCard, ShoppingBag } from 'lucide-react';

const Cart = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data from the backend
    useEffect(() => {
        const fetchCart = async () => {
            try {
                // Adjust this URL to match your actual backend route
                const response = await fetch('/api/cart'); 
                
                if (!response.ok) {
                    throw new Error('Failed to fetch cart items');
                }
                
                const data = await response.json();
                setCartItems(data);
            } catch (err) {
                console.error("Error loading cart:", err);
                setError('Could not load cart items.');
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, []);

    const grandTotal = cartItems.reduce((sum, item) => sum + parseFloat(item.line_total), 0);

    if (loading) {
        return (
            <div className="h-screen flex flex-col font-sans bg-[#fafafa] p-10 items-center justify-center">
                <div className="text-slate-400 animate-pulse">Loading Snorlax's Stash...</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col font-sans bg-[#fafafa] p-6 md:p-10 pt-0 overflow-y-auto">
            <div className="max-w-8xl mx-auto w-full">
                <h1 className="text-3xl font-bold text-slate-800 mb-8 mt-4 flex items-center gap-2">
                    <ShoppingBag className="w-8 h-8 text-indigo-600" />
                    Your Cart
                </h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                {cartItems.length === 0 && !error ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-lg">Your stash is empty.</p>
                        <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Go to Shop
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Card Details</th>
                                            <th className="px-6 py-4 font-medium text-center">Condition</th>
                                            <th className="px-6 py-4 font-medium text-center">Quantity</th>
                                            <th className="px-6 py-4 font-medium text-right">Price</th>
                                            <th className="px-6 py-4 font-medium text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cartItems.map((item) => (
                                            <tr key={item.cart_item_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-30 h-42 bg-slate-200 rounded flex-shrink-0 overflow-hidden relative border border-slate-200">
                                                            {item.image_url ? (
                                                                <img 
                                                                    src={item.image_url} 
                                                                    alt={item.card_name} 
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none'; 
                                                                        e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            
                                                            <div className={`${item.image_url ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center text-slate-400`}>
                                                                <CreditCard size={20} />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="font-bold text-slate-800">{item.card_name}</div>
                                                            <div className="text-xs text-slate-500">{item.set_name} • {item.series}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                        ${item.condition === 'Near Mint' ? 'bg-green-100 text-green-800' : 
                                                          item.condition === 'Lightly Played' ? 'bg-blue-100 text-blue-800' : 
                                                          'bg-yellow-100 text-yellow-800'}`}>
                                                        {item.condition}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
                                                        <span className="px-3 py-1 text-sm font-medium text-slate-700">
                                                            {item.quantity}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-600 font-medium">
                                                    ${parseFloat(item.unit_price || item.price).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                                    ${parseFloat(item.line_total).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-10">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Order Summary</h2>
                                
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Subtotal ({cartItems.length} items)</span>
                                        <span>${grandTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Shipping</span>
                                        <span>Free</span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 mb-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-base font-medium text-slate-800">Total</span>
                                        <span className="text-2xl font-bold text-indigo-600">${grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 shadow-sm hover:shadow transition-all">
                                    Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;