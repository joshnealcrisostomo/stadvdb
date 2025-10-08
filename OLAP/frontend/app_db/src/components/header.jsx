import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../css/header.module.css';
import { FaBell, FaSearch } from 'react-icons/fa';

const Header = () => {
    const navigate = useNavigate();
    const handleLogoClick = () => {
        navigate('/');
    }
    return (
        <header className={styles.headerContainer}>
            <div 
                className={styles.leftPanel}
                onClick ={handleLogoClick}
            >
                <div className={styles.brand}>
                    <span className={styles.brandIcon}>🌍</span>
                    <span className={styles.brandName}>Energy Mix & Weather</span>
                </div>
            </div>

            <div className={styles.centerPanel}>
                <div className={styles.searchBar}>
                    <input type="text" placeholder="Search" className={styles.searchInput} />
                    <FaSearch className={styles.searchIcon} />
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.userProfile}>
                    <div className={styles.userAvatar}>🍔</div>
                    <span className={styles.userName}>Josh Crisostomo</span>
                    <span className={styles.userDropdown}>&lt;</span>
                </div>
                <div className={styles.notification}>
                    <FaBell className={styles.notificationIcon} />
                    <span className={styles.notificationBadge}></span>
                </div>
            </div>
        </header>
    );
};

export default Header;