import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- ICONS (Using SVG for simplicity, no extra deps) ---
const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const UploadIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const DownloadIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const TrashIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    // --- 1. FETCH DATA ---
    const fetchInventory = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/inventory');
            setInventory(response.data);
        } catch (err) {
            console.error("Error loading inventory:", err);
            setMessage({ type: 'error', text: "Failed to load inventory." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // --- 2. CSV PARSER (Native JS) ---
    const parseCSV = (text) => {
        const lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) return []; 
        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]+/g, ''));
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                let val = values[index]?.trim();
                if (val) val = val.replace(/['"]+/g, '');
                obj[header] = val;
            });
            return obj;
        });
    };

    // --- 3. IMPORT HANDLER ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvText = event.target.result;
                const jsonData = parseCSV(csvText);
                if (jsonData.length === 0) throw new Error("CSV is empty or invalid.");

                const response = await axios.post('/api/inventory/upload', jsonData);
                setMessage({ type: 'success', text: response.data.message });
                fetchInventory(); // Refresh table after upload
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: "Failed to upload inventory." });
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; 
            }
        };
        reader.readAsText(file);
    };

    // --- 4. EXPORT HANDLER ---
    const handleExport = () => {
        if (!inventory || inventory.length === 0) {
            alert("No inventory to export!");
            return;
        }
        const headers = Object.keys(inventory[0]).join(',');
        const csvRows = inventory.map(row => Object.values(row).map(val => `"${val}"`).join(','));
        const csvString = [headers, ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // --- 5. TRUNCATE HANDLER (NEW) ---
    const handleTruncate = async () => {
        if (!window.confirm("Are you sure you want to clear ALL inventory data? This cannot be undone.")) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete('/api/inventory');
            setMessage({ type: 'success', text: response.data.message });
            fetchInventory(); // Refresh table (should be empty now)
        } catch (err) {
            console.error("Error clearing inventory:", err);
            setMessage({ type: 'error', text: "Failed to clear inventory." });
        } finally {
            setLoading(false);
        }
    };

    // --- 6. FILTERING ---
    const filteredInventory = inventory.filter(item => 
        item.card_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col font-sans bg-[#fafafa] p-6">
            
            {/* Header Section */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
                    <p className="text-gray-500 mt-1">Manage stock levels and prices for your store.</p>
                </div>
                <div className="flex gap-3">
                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden" 
                    />
                    
                    {/* Truncate Button (Red) */}
                    <button 
                        onClick={handleTruncate}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <TrashIcon /> Clear All
                    </button>

                    {/* Export Button */}
                    <button 
                        onClick={handleExport}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <DownloadIcon /> Export CSV
                    </button>

                    {/* Import Button (Primary) */}
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-[#5A6ACF] text-white rounded-lg hover:bg-[#4a58b0] transition-colors text-sm font-medium shadow-sm"
                    >
                        <UploadIcon /> Import CSV
                    </button>
                </div>
            </div>

            {/* Feedback Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex justify-between items-center">
                <div className="relative w-72">
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A6ACF] focus:border-transparent"
                    />
                    <div className="absolute left-3 top-2.5">
                        <SearchIcon />
                    </div>
                </div>
                <div className="text-sm text-gray-500">
                    Showing {filteredInventory.length} items
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden flex-grow flex flex-col">
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Product ID</th>
                                <th className="px-6 py-4">Card Name</th>
                                <th className="px-6 py-4">Condition</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Quantity</th>
                                <th className="px-6 py-4">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5A6ACF]"></div>
                                    </td>
                                </tr>
                            ) : filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                                        No inventory found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => (
                                    <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">#{item.product_id}</td>
                                        <td className="px-6 py-4 font-medium text-[#5A6ACF]">{item.card_name || 'Unknown Card'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                item.condition === 'Near Mint' ? 'bg-green-100 text-green-800' :
                                                item.condition === 'Damaged' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {item.condition}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">${Number(item.price).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <div className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                                                {item.quantity}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">
                                            {new Date(item.last_updated).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer (Mock for visual completeness) */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <button className="text-gray-500 hover:text-gray-700 text-sm font-medium disabled:opacity-50" disabled>Previous</button>
                    <span className="text-sm text-gray-600">Page 1 of 1</span>
                    <button className="text-gray-500 hover:text-gray-700 text-sm font-medium disabled:opacity-50" disabled>Next</button>
                </div>
            </div>
        </div>
    );
};

export default Inventory;