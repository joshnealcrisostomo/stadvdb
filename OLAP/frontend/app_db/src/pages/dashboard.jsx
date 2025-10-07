import React from 'react';
import Header from '../components/header';
import LeftPanel from '../components/leftPanel';
import RightPanel from '../components/rightPanel';
import styles from '../css/dashboard.module.css';

const Dashboard = () => {
    return (
        <div className={styles.container}>
            <LeftPanel />
            
            <div className={styles.mainPanel}>
                <Header />
                <div className={styles.content}>
                    <h2>Welcome to the Dashboard</h2>
                    <p>This is the main content area.</p>
                </div>
            </div>

            <RightPanel />
        </div>
    );
};

export default Dashboard;
