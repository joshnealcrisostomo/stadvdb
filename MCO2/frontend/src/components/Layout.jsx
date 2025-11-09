import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx'; 
import NavBar from './NavBar.jsx';

const Layout = () => {
    return (
        <div className="h-full flex flex-col font-sans bg-[#fafafa]">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <NavBar />
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;