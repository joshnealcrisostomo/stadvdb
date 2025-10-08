import React, { useState } from 'react';
import styles from '../css/phGreenEnergy.module.css';

const MIN_YEAR = 1990;
const MAX_YEAR = 2020;
const ENERGY_SOURCES = ['Coal', 'Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal', 'Natural Gas', 'Oil-based'];
const getYearLabel = (value) => String(value);

const PhGreenEnergy = () => {
    const [yearRange, setYearRange] = useState([MIN_YEAR, MIN_YEAR + 1]);
    const [startYear, endYear] = yearRange;
    const [activeSources, setActiveSources] = useState([]);

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear)]);
        }
    };

    const handleSourceToggle = (source) => {
        setActiveSources(prevSources => {
            if (prevSources.includes(source)) {
                return prevSources.filter(s => s !== source);
            } else {
                return [...prevSources, source];
            }
        });
    };

    const filteredData = {
        yearRange: yearRange.join(' - '),
        sources: activeSources,
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Philippines' Green Energy Generation vs. Weather</h1>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.content}>
                <div className={styles.filterTab}>
                    <div className={styles.yearFilter}>
                        <div className={styles.yearControlGroup}>
                            <label className={styles.filterLabel}>Select Year Range:</label>
                            
                            <div className={styles.sliderAndDisplay}>
                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        min={MIN_YEAR}
                                        max={MAX_YEAR}
                                        value={startYear}
                                        step="1"
                                        onChange={(e) => handleYearChange(e, 'start')}
                                        className={styles.yearSlider}
                                        aria-label="Start Year Slider"
                                    />
                                    <input
                                        type="range"
                                        min={MIN_YEAR}
                                        max={MAX_YEAR}
                                        value={endYear}
                                        step="1"
                                        onChange={(e) => handleYearChange(e, 'end')}
                                        className={styles.yearSlider}
                                        aria-label="End Year Slider"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.sourceFilter}>
                        <label className={styles.filterLabel}>Energy Sources:</label>
                        <div className={styles.sourceButtons}>
                            {ENERGY_SOURCES.map(source => (
                                <button
                                    key={source}
                                    className={`${styles.sourceButton} ${activeSources.includes(source) ? styles.active : ''}`}
                                    onClick={() => handleSourceToggle(source)}
                                >
                                    {source}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.visualizationArea}>
                    <div className={styles.yearDisplay}>
                        {getYearLabel(startYear)} <span>&mdash;</span> {getYearLabel(endYear)}
                    </div>
                    <p className={styles.filteredSourcesDisplay}>
                            {filteredData.sources.length > 0 
                                ? filteredData.sources.join(', ')
                                : 'No energy sources selected.'
                            }
                    </p>
                </div>
            </div>    
        </div>
    );
};

export default PhGreenEnergy;
