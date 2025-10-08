import React from 'react';
import Header from './header.jsx'; 
import LeftPanel from './leftPanel.jsx';
import styles from '../css/layout.module.css';

const Layout = ({ children }) => {
    return (
        <div className={styles.container}>
            
            <Header />

            <div className={styles.panelsWrapper}>
                
                <LeftPanel className={styles.leftPanel} />
                
                <div className={styles.mainPanel}>
                    {children}
                </div>

            </div>
            
        </div>
    );
};

export default Layout;
