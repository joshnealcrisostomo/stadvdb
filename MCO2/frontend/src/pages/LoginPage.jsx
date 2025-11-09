import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import brandIcon from '../assets/shop.png';

const validCredentials = {
    'Buyer1': 'Buyer1_1234',
    'Buyer2': 'Buyer2_1234',
    'Buyer3': 'Buyer3_1234',
    'Seller1': 'Seller1_1234',
};

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }

        if (validCredentials[username] && validCredentials[username] === password) {
            console.log('Login successful for user:', username);

            const userRole = username.startsWith('Seller') ? 'seller' : 'buyer';
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('username', username);

            navigate('/shop');
        } else {
            setError('Invalid username or password.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-[#fafafa] font-sans p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8">
                
                {/* Header with Icon */}
                <div className="flex flex-col items-center mb-6">
                    <span 
                        className="w-[60px] h-[60px] bg-cover bg-center bg-no-repeat mb-4"
                        style={{ backgroundImage: `url(${brandIcon})` }} 
                    ></span>
                    <h2 className="text-3xl font-bold text-[#18299a]">
                        SHOP-E
                    </h2>
                    <p className="text-[#7D8198] mt-1">
                        Please sign in to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-[10px] mb-4 text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label 
                            htmlFor="username" 
                            className="block text-sm font-medium text-[#7D8198] mb-2"
                        >
                            Username
                        </label>
                        <input 
                            type="text" 
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]/50"
                            placeholder="e.g., Buyer1"
                        />
                    </div>

                    <div className="mb-6">
                        <label 
                            htmlFor="password" 
                            className="block text-sm font-medium text-[#7D8198] mb-2"
                        >
                            Password
                        </label>
                        <input 
                            type="password" 
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]/50"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-[#5A6ACF] text-white py-3 rounded-[10px] font-semibold hover:bg-[#4a58b0] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#5A6ACF] focus:ring-offset-2 cursor-pointer"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;