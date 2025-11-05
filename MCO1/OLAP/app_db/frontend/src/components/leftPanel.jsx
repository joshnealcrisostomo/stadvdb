import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from '../css/leftPanel.module.css';

const LeftPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuClick = (path) => {
        navigate(path);
    };
    
    const getMenuItemClass = (path) => {
        const isActive = location.pathname === path;
        return `${styles.menuItem} ${isActive ? styles.active : ''}`;
    };

    return (
        <div className={styles.leftPanel}>
            <div 
                className={getMenuItemClass('/')}
                onClick={() => handleMenuClick('/')}
            >
                <span>Home</span>
            </div>

            <div className={styles.separator}></div>

            <div 
                className={getMenuItemClass('/energyMix')}
                onClick={() => handleMenuClick('/energyMix')}
            >
                <span>Energy Mix</span>
            </div>

            <div 
                className={getMenuItemClass('/phGreenEnergy')}
                onClick={() => handleMenuClick('/phGreenEnergy')}
            >
                <span>PH Green Energy</span>
            </div>

            <div 
                className={getMenuItemClass('/phTotalEnergy')}
                onClick={() => handleMenuClick('/phTotalEnergy')}
            >
                <span>PH Total Energy Generation</span>
            </div>

            <div 
                className={getMenuItemClass('/renewVsNon')}
                onClick={() => handleMenuClick('/renewVsNon')}
            >
                <span>Renewable vs. Non-Renewable</span>
            </div>

            <div 
                className={getMenuItemClass('/nonRenew')}
                onClick={() => handleMenuClick('/nonRenew')}
            >
                <span>Non-Renewable Energy Sources</span>
            </div>
        </div>
    );
};

export default LeftPanel;