import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmLogoutModal from './ConfirmLogoutModal';

const SellerNavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isModalOpen, setIsModalOpen] = useState(false);

    const baseStyles = "flex items-center py-[10px] px-[40px] cursor-pointer transition-colors duration-100 ease-linear w-[90%] box-border text-[14px]";

    const handleMenuClick = (path) => {
        navigate(path);
    };

    const performLogout = () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        navigate('/'); 
    };

    const handleLogoutClick = () => {
        setIsModalOpen(true);
    };

    const handleConfirmLogout = () => {
        performLogout();
        setIsModalOpen(false);
    };

    const getMenuItemClass = (path) => {
        const isActive = location.pathname === path;
        const activeStyles = "text-[#18299a] bg-[#5A6ACF]/10 rounded-[10px] font-bold";
        const inactiveStyles = "hover:text-[#5A6ACF] hover:bg-[#5A6ACF]/10 hover:rounded-[10px] hover:font-bold";

        return `${baseStyles} ${isActive ? activeStyles : inactiveStyles}`;
    };

    return (
        <>
            <div className="w-[250px] bg-[#F1F2F7] text-[#7D8198] flex flex-col items-center pt-[55px] h-screen font-poppins">
                <div 
                    className={getMenuItemClass('/statistics')}
                    onClick={() => handleMenuClick('/statistics')}
                >
                    <span>Dashboard</span>
                </div>

                <div className="w-[80%] h-px bg-[#e0e0e0] my-[10px]"></div>

                <div 
                    className={getMenuItemClass('/restockItems')}
                    onClick={() => handleMenuClick('/restockItems')}
                >
                    <span>Restock</span>
                </div>

                <div 
                    className={getMenuItemClass('/removeItems')}
                    onClick={() => handleMenuClick('/removeItems')}
                >
                    <span>Remove Items</span>
                </div>

                <div 
                    className={getMenuItemClass('/inventory')}
                    onClick={() => handleMenuClick('/inventory')}
                >
                    <span>Inventory</span>
                </div> 

                <div className="w-[80%] h-px bg-[#e0e0e0] my-[10px]"></div>

                <div 
                    className={`${baseStyles} hover:text-red-600 hover:bg-red-600/10 hover:rounded-[10px] hover:font-bold`}
                    onClick={handleLogoutClick}
                >
                    <span>Logout</span>
                </div>
            </div>

            <ConfirmLogoutModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmLogout}
            />
        </>
    );
};

export default SellerNavBar;