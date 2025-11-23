import React, { useState } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Revenue Trends (Join dim_date + fact_sales)
const REVENUE_DATA = [
    { full_date: '2023-01-01', total_revenue: 4000 },
    { full_date: '2023-02-01', total_revenue: 3000 },
    { full_date: '2023-03-01', total_revenue: 5000 },
    { full_date: '2023-04-01', total_revenue: 7500 },
    { full_date: '2023-05-01', total_revenue: 6000 },
    { full_date: '2023-06-01', total_revenue: 9000 },
];

// Top Selling Cards (dim_product + fact_sales)
const TOP_PRODUCTS_DATA = [
    { card_name: 'Charizard VMAX', quantity_sold: 120 },
    { card_name: 'Pikachu Illustrator', quantity_sold: 98 },
    { card_name: 'Umbreon VMAX', quantity_sold: 75 },
    { card_name: 'Mewtwo EX', quantity_sold: 50 },
    { card_name: 'Rayquaza GX', quantity_sold: 40 },
];

// Sales by Set (dim_product + fact_sales) 
const SET_DATA = [
    { set_name: 'Darkness Ablaze', total_revenue: 15000 },
    { set_name: 'Evolving Skies', total_revenue: 12000 },
    { set_name: 'Base Set', total_revenue: 8000 },
    { set_name: 'Promo', total_revenue: 5000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Statistics = () => {
    // State for the "buttons redirect" requirement
    const [activeTab, setActiveTab] = useState('overview');

    // Chart Components
    const RevenueChart = () => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Revenue Trends</h3>
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales (total_revenue) & dim_date (full_date)</p>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="full_date" tickFormatter={(str) => str.substring(0,7)} />
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
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales (quantity_sold) & dim_product (card_name)</p>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TOP_PRODUCTS_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
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
            <p className="text-xs text-gray-400 mb-2">Source: fact_sales (total_revenue) & dim_product (set_name)</p>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={SET_DATA}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ set_name, percent }) => `${set_name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total_revenue"
                    >
                        {SET_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="h-screen flex flex-col font-sans bg-[#fafafa] p-10 pt-0 overflow-y-auto">
            
            {/* Header & Navigation Buttons */}
            <div className="sticky top-0 z-10 bg-[#fafafa] pt-10 pb-6 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 mb-6">
                
                {/* HEADER (Identifies Data Source) */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Read-only reports from <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">OLAP Database</span>
                    </p>
                </div>

                {/* NAVIGATION BUTTONS */}
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