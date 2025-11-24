import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const API_BASE_URL = 'http://localhost:5001/api/reports';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const Statistics = () => {
    const [activeTab, setActiveTab] = useState('overview');
    
    const [revenueData, setRevenueData] = useState([]);
    const [topProductsData, setTopProductsData] = useState([]);
    const [setData, setSetData] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                
                // Revenue Trends
                const revenueRes = await fetch(`${API_BASE_URL}/revenue-trends`);
                if (!revenueRes.ok) throw new Error("Failed to fetch revenue");
                const revenueJson = await revenueRes.json();
                
                // Top Products
                const productsRes = await fetch(`${API_BASE_URL}/top-products`);
                if (!productsRes.ok) throw new Error("Failed to fetch top products");
                const productsJson = await productsRes.json();

                // Sales by Set
                const setsRes = await fetch(`${API_BASE_URL}/sales-by-set`);
                if (!setsRes.ok) throw new Error("Failed to fetch sets");
                const setsJson = await setsRes.json();

                setRevenueData(revenueJson);
                setTopProductsData(productsJson);
                setSetData(setsJson);
                setLoading(false);
            } catch (err) {
                console.error("Failed to connect to OLAP DB:", err);
                setError("Failed to load reports. Is the Backend Server running?");
                setLoading(false);
            }
        };

        fetchReportData();
    }, []); // Empty dependency array, will run once the page opens.

    // Chart Components
    const RevenueChart = () => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Revenue Trends</h3>
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales & dim_date</p>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* Maps to 'full_date' from your SQL query */}
                    <XAxis dataKey="full_date" tickFormatter={(str) => str ? str.substring(0,10) : ''} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" strokeWidth={2} name="Total Revenue ($)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );

    const TopCardsChart = () => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Top Selling Cards</h3>
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales & dim_product</p>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    {/* Maps to 'card_name' from your SQL query */}
                    <YAxis type="category" dataKey="card_name" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity_sold" fill="#82ca9d" radius={[0, 4, 4, 0]} name="Quantity Sold" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    const SetPieChart = () => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Revenue by Set</h3>
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales & dim_product</p>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={setData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ set_name, percent }) => `${set_name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total_revenue"
                    >
                        {setData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );

    if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Analytics from OLAP DB...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-600 font-bold p-10 text-center">{error} <br/> <span className="text-sm font-normal text-black mt-2 block">Check console (F12) for details.</span></div>;

    return (
        <div className="h-screen flex flex-col font-sans bg-[#fafafa] p-10 pt-0 overflow-y-auto">
            
            {/* --- SECTION 1: HEADER & SECTION 2: NAVIGATION BUTTONS --- */}
            <div className="sticky top-0 z-10 bg-[#fafafa] pt-10 pb-6 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 mb-6">
                
                {/* SECTION 1: HEADER */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Live reports from <span className="font-mono text-green-600 bg-green-50 px-1 rounded">OLAP Database</span>
                    </p>
                </div>

                {/* SECTION 2: NAVIGATION BUTTONS */}
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm mt-4 md:mt-0">
                    {['overview', 'revenue', 'products', 'sets'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                                ${activeTab === tab 
                                    ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }
                            `}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

            </div>

            {/* Content Area */}
            <div className="flex-1 pb-10">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueChart />
                        </div>
                        <TopCardsChart />
                        <SetPieChart />
                    </div>
                )}

                {activeTab === 'revenue' && <RevenueChart />}
                {activeTab === 'products' && <TopCardsChart />}
                {activeTab === 'sets' && <SetPieChart />}
            </div>
        </div>
    );
};

export default Statistics;