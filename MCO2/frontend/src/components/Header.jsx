import React from 'react';
import { useNavigate } from 'react-router-dom';
import brandIcon from '../assets/shop.png';

const Header = () => {
    const navigate = useNavigate();
    const handleLogoClick = () => {
        navigate('/shop');
    }
    return (
        <header className="flex items-center w-full min-h-[70px] border-b border-[#e0e0e0] font-sans text-[#333]">
            <div 
                className="bg-[#F1F2F7] w-[250px] h-[70px] flex justify-center items-center cursor-pointer"
                onClick ={handleLogoClick}
            >
                <div className="flex items-center gap-2">
                    <span 
                        className="w-[50px] h-[50px] bg-[url('../assets/shop.png')] bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${brandIcon})` }}
                    ></span>
                </div>
            </div>

            <div className="flex-grow flex items-center justify-start pl-10">
                <span className="text-[32px] font-bold text-[#000080]">SHOP-E</span>
            </div>
        </header>
    );
};

export default Header;