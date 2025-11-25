import React, { useState, useEffect, useCallback } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const API_BASE_URL = 'http://localhost:5001/api/reports';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6B6B', '#4ECDC4'];

const Statistics = () => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // --- Data States ---
    const [filterOptions, setFilterOptions] = useState({ years: [], sets: [], rarities: [] });
    const [summaryData, setSummaryData] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [topProductsData, setTopProductsData] = useState([]);
    const [setData, setSetData] = useState([]);
    
    // --- Filter States ---
    const [filters, setFilters] = useState({
        year: 'All',
        month: 'All',
        set: 'All',
        rarity: 'All'
    });

    // --- Sorting State ---
    const [sortBy, setSortBy] = useState('quantity'); // 'quantity' or 'revenue'

    const [loading, setLoading] = useState(true);

    // Initial Load: Get Filter Options (Years, Sets, etc.)
    useEffect(() => {
        fetch(`${API_BASE_URL}/filters`)
            .then(res => res.json())
            .then(data => setFilterOptions(data))
            .catch(err => console.error("Error fetching filters:", err));
    }, []);

    // Fetch Data based on Filters
    const fetchData = useCallback(async () => {
        setLoading(true);
        const queryParams = new URLSearchParams({
            ...filters,
            sortBy
        }).toString();

        try {
            const [summaryRes, revenueRes, productsRes, setsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/summary?${queryParams}`),
                fetch(`${API_BASE_URL}/revenue-trends?${queryParams}`),
                fetch(`${API_BASE_URL}/top-products?${queryParams}`),
                fetch(`${API_BASE_URL}/sales-by-set?${queryParams}`)
            ]);

            const summary = await summaryRes.json();
            const revenue = await revenueRes.json();
            const products = await productsRes.json();
            const sets = await setsRes.json();

            setSummaryData(summary);
            setRevenueData(revenue);
            setTopProductsData(products);
            setSetData(sets);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, [filters, sortBy]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Filter Changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // --- Components ---

    const FilterBar = () => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
            {/* Year Filter */}
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Year</label>
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                >
                    <option value="All">All Years</option>
                    {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Month</label>
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                >
                    <option value="All">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                </select>
            </div>

            {/* Set Filter */}
            <div className="flex flex-col min-w-[150px]">
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Card Set</label>
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.set}
                    onChange={(e) => handleFilterChange('set', e.target.value)}
                >
                    <option value="All">All Sets</option>
                    {filterOptions.sets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Rarity Filter (Proxy for Card Type) */}
            <div className="flex flex-col min-w-[150px]">
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Card Type / Rarity</label>
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.rarity}
                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                >
                    <option value="All">All Types</option>
                    {filterOptions.rarities.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Sort Toggle (Only relevant for lists/charts, but global is fine) */}
            <div className="flex flex-col ml-auto">
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Sort By</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setSortBy('quantity')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortBy === 'quantity' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Quantity
                    </button>
                    <button 
                        onClick={() => setSortBy('revenue')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortBy === 'revenue' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Revenue
                    </button>
                </div>
            </div>
        </div>
    );

    const KPICard = ({ title, value, subtext, colorClass }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-40">
            <div>
                <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">{title}</h3>
                <div className={`text-3xl font-extrabold mt-2 ${colorClass}`}>
                    {value}
                </div>
            </div>
            <p className="text-gray-400 text-xs">{subtext}</p>
        </div>
    );

    const OverviewDashboard = () => {
        if (!summaryData) return null;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard 
                    title="Total Revenue" 
                    value={`$${Number(summaryData.total_revenue).toLocaleString()}`} 
                    subtext="Gross income from sales"
                    colorClass="text-green-600"
                />
                <KPICard 
                    title="Total Units Sold" 
                    value={Number(summaryData.total_units).toLocaleString()} 
                    subtext="Individual cards sold"
                    colorClass="text-blue-600"
                />
                <KPICard 
                    title="Avg. Order Value" 
                    value={`$${Number(summaryData.avg_price).toLocaleString()}`} 
                    subtext="Average price per card"
                    colorClass="text-purple-600"
                />
                <KPICard 
                    title="Total Orders" 
                    value={Number(summaryData.total_orders).toLocaleString()} 
                    subtext="Unique transactions"
                    colorClass="text-orange-600"
                />
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col font-sans bg-[#f8f9fa] overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-500">Real-time OLAP insights</p>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {['overview', 'revenue', 'products', 'sets'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200
                                ${activeTab === tab 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }
                            `}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <FilterBar />

                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">
                        Loading Data...
                    </div>
                ) : (
                    <>
                        {/* OVERVIEW TAB: Shows Text Dashboard */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <OverviewDashboard />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="font-bold text-gray-700 mb-4">Top Performing Sets</h3>
                                        <ul className="space-y-3">
                                            {setData.slice(0, 5).map((set, idx) => (
                                                <li key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition">
                                                    <span className="font-medium text-gray-700">{set.set_name}</span>
                                                    <span className="font-bold text-gray-900">${Number(set.total_revenue).toLocaleString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="font-bold text-gray-700 mb-4">Best Selling Cards</h3>
                                        <ul className="space-y-3">
                                            {topProductsData.slice(0, 5).map((card, idx) => (
                                                <li key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition">
                                                    <span className="font-medium text-gray-700">{card.card_name}</span>
                                                    <div className="text-right">
                                                        <div className="font-bold text-gray-900">{card.quantity_sold} units</div>
                                                        <div className="text-xs text-gray-400">${Number(card.total_revenue).toLocaleString()}</div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* REVENUE TAB */}
                        {activeTab === 'revenue' && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px]">
                                <h3 className="font-bold text-gray-700 mb-6">Revenue Trends Over Time</h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <LineChart data={revenueData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis 
                                            dataKey="full_date" 
                                            tickFormatter={(str) => str ? new Date(str).toLocaleDateString() : ''} 
                                            stroke="#9ca3af"
                                            tick={{fontSize: 12}}
                                        />
                                        <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                        />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey={sortBy === 'revenue' ? "total_revenue" : "total_quantity"} 
                                            stroke="#4F46E5" 
                                            strokeWidth={3} 
                                            dot={{r: 4}}
                                            activeDot={{r: 8}}
                                            name={sortBy === 'revenue' ? "Revenue ($)" : "Units Sold"} 
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* PRODUCTS TAB */}
                        {activeTab === 'products' && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[600px]">
                                <h3 className="font-bold text-gray-700 mb-6">Top 10 Products by {sortBy === 'revenue' ? 'Revenue' : 'Volume'}</h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <BarChart data={topProductsData} layout="vertical" margin={{left: 40}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eee" />
                                        <XAxis type="number" stroke="#9ca3af" />
                                        <YAxis type="category" dataKey="card_name" width={150} tick={{fontSize: 11}} stroke="#4b5563"/>
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Bar 
                                            dataKey={sortBy === 'revenue' ? "total_revenue" : "quantity_sold"} 
                                            fill="#10B981" 
                                            radius={[0, 4, 4, 0]} 
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* SETS TAB */}
                        {activeTab === 'sets' && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px]">
                                <h3 className="font-bold text-gray-700 mb-6">Distribution by Card Set</h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <PieChart>
                                        <Pie
                                            data={setData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ set_name, percent }) => percent > 0.05 ? `${set_name} ${(percent * 100).toFixed(0)}%` : ''}
                                            outerRadius={160}
                                            fill="#8884d8"
                                            dataKey={sortBy === 'revenue' ? "total_revenue" : "quantity_sold"} 
                                        >
                                            {setData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Statistics;