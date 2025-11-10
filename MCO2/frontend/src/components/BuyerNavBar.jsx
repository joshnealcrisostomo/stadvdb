import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BuyerNavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const baseStyles = "flex items-center py-[10px] px-[40px] cursor-pointer transition-colors duration-100 ease-linear w-[90%] box-border text-[14px]";

    const handleMenuClick = (path) => {
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');

        navigate('/'); 
    };

    const getMenuItemClass = (path) => {
        const isActive = location.pathname === path;
        const activeStyles = "text-[#18299a] bg-[#5A6ACF]/10 rounded-[10px] font-bold";
        const inactiveStyles = "hover:text-[#5A6ACF] hover:bg-[#5A6ACF]/10 hover:rounded-[10px] hover:font-bold";

        return `${baseStyles} ${isActive ? activeStyles : inactiveStyles}`;
    };

    return (
        <div className="w-[250px] bg-[#F1F2F7] text-[#7D8198] flex flex-col items-center pt-[55px] h-screen font-poppins">
            <div 
                className={getMenuItemClass('/shop')}
                onClick={() => handleMenuClick('/shop')}
            >
                <span>Shop</span>
            </div>

            <div className="w-[80%] h-px bg-[#e0e0e0] my-[10px]"></div>

            <div 
                className={getMenuItemClass('/likedItems')}
                onClick={() => handleMenuClick('/likedItems')}
            >
                <span>Liked Items</span>
            </div>

            <div 
                className={getMenuItemClass('/cart')}
                onClick={() => handleMenuClick('/cart')}
            >
                <span>Cart</span>
            </div>

            <div className="w-[80%] h-px bg-[#e0e0e0] my-[10px]"></div>

            <div 
                className={`${baseStyles} hover:text-red-600 hover:bg-red-600/10 hover:rounded-[10px] hover:font-bold`}
                onClick={handleLogout}
            >
                <span>Logout</span>
            </div>
        </div>
    );
};

export default BuyerNavBar;