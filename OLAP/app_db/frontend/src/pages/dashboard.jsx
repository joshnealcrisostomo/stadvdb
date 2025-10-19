import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../css/dashboard.module.css';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleCardClick = (path) => {
        navigate(path);
    };

    const CardHeader = ({ title }) => (
        <div className={styles.cardHeader}>
            <p className={styles.cardTitle}>{title}</p>
        </div>
    );

    return (
            <div className={styles.container}>
                <div className={styles.pageTitle}>
                    <h1>Dashboard</h1>
                </div>

                <div className={styles.separator}></div>

                <div className={styles.content}>
                    <div className={styles.upperHalf}>
                        <div 
                            className={styles.leftCard}
                            onClick={() => handleCardClick('/energyMix')}
                        >
                            <h3 className={styles.sectionTitle}>Energy Mix Comparison of Countries</h3>
                            <div className={styles.chartPlaceholder}>
                                [Bar Chart Visualization]
                            </div>
                        </div>

                        <div 
                            className={styles.rightCard}
                            onClick={() => handleCardClick('/phGreenEnergy')}
                        >
                            <h3 className={styles.sectionTitle}>Philippine Green Energy Generation vs. Weather</h3>     
                            <div className={styles.chartPlaceholder}>
                                [Scatter or Line plot]
                            </div>
                        </div>
                    </div>

                    <div className={styles.lowerHalf}>
                        <div 
                            className={styles.cardOne}
                            onClick={() => handleCardClick('/phTotalEnergy')}
                        >
                            <h3 className={styles.sectionTitle}>Philippines’ Total Energy Generation and Mix Composition</h3>
                            <p className={styles.subText}>Lorem ipsum dolor sit amet, consectetur</p>
                            
                            <div className={styles.chartPlaceholder}>
                                [Stacked Bar Chart]
                            </div>
                        </div>

                        <div 
                            className={styles.cardTwo}
                            onClick={() => handleCardClick('/renewVsNon')}
                        >
                            <h3 className={styles.sectionTitle}>Trends in Renewable vs Non-Renewable Energy Sources in the Philippines</h3>
                            <p className={styles.subText}>Adipiscing elit, sed do eiusmod tempor</p>
                            
                            <div className={styles.chartPlaceholder}>
                                [Stacked Line Chart]
                            </div>
                        </div>

                        <div 
                            className={styles.cardThree}
                            onClick={() => handleCardClick('/nonRenew')}
                        >
                            <h3 className={styles.sectionTitle}>Non-Renewable Energy Sources Generation between different countries</h3>
                            <div className={styles.chartPlaceholder}>
                                [Stacked Area Chart/Clustered Bar Chart]
                            </div>
                        </div>
                    </div>
                </div>    
            </div>
    );
};

export default Dashboard;