import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brandIcon from '../assets/game.png';

const Header = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    const handleLogoClick = () => {
        if (userRole === 'seller') {
            navigate('/statistics');
        } else {
            navigate('/shop');
        }
    }

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Searching for:', searchTerm);
    }

    return (
        <header className="flex items-center justify-between w-full min-h-[70px] border-b border-[#e0e0e0] font-sans text-[#333]">
            <div className="flex items-center flex-grow">
                <div 
                    className="bg-[#F1F2F7] w-[250px] h-[70px] flex justify-center items-center cursor-pointer"
                    onClick={handleLogoClick}
                >
                    <div className="flex items-center gap-2">
                        <span 
                            className="w-[50px] h-[50px] bg-cover bg-center bg-no-repeat"

                            style={{ backgroundImage: `url(${brandIcon})` }}
                        ></span>
                    </div>
                </div>

                <div className="flex items-center justify-start pl-10">
                    <span className="text-[32px] font-bold text-[#000080]">Snorlax's Stash</span>
                </div>
            </div>

            <div className="flex items-center pr-10">
                {userRole === 'buyer' && (
                    <form onSubmit={handleSearch} className="relative w-full max-w-xs">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search cards..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A6ACF]/50"
                        />
                        <button 
                            type="submit" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5A6ACF] transition-colors"
                            aria-label="Search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </header>
    );
};

export default Header;