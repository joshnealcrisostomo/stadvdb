import React, { useState, useEffect } from 'react';
import BuyerNavBar from './BuyerNavBar.jsx';
import SellerNavBar from './SellerNavBar.jsx';

const NavBar = () => {
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    if (userRole === null) {
        return <div className="w-[250px] bg-[#F1F2F7] h-screen"></div>;
    }

    if (userRole === 'seller') {
        return <SellerNavBar />;
    }

    return <BuyerNavBar />;
};

export default NavBar;