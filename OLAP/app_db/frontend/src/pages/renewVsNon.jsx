import React, { useState, useEffect, useRef } from 'react'; 
import styles from '../css/renewVsNon.module.css';

const MIN_YEAR = 1990;
const MAX_YEAR = 2020;
const ENERGY_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal', 'Coal', 'Natural Gas', 'Oil-based'];
const RENEWABLE_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];
const NON_RENEWABLE_SOURCES = ['Coal', 'Natural Gas', 'Oil-based'];
const getYearLabel = (value) => String(value);

const RenewVsNon = () => {
    const [yearRange, setYearRange] = useState([MIN_YEAR, MAX_YEAR]);
    const [startYear, endYear] = yearRange;
    const [activeSources, setActiveSources] = useState(ENERGY_SOURCES);

    const sliderFillRef = useRef(null);

    const handleSourceToggle = (source) => {
        setActiveSources(prev =>
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
        );
    };

    useEffect(() => {
        if (sliderFillRef.current) {
            const range = MAX_YEAR - MIN_YEAR;
            const startPercent = ((startYear - MIN_YEAR) / range) * 100;
            const endPercent = ((endYear - MIN_YEAR) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear]);

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Trends in Renewable vs Non-Renewable Energy Sources in the Philippines</h1>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.content}>
                <div className={styles.filterTab}>
                    <div className={styles.yearFilter}>
                        <div className={styles.yearControlGroup}>
                            <label className={styles.filterLabel}>Select Year Range:</label>
                            <div className={styles.sliderAndDisplay}>
                                <div className={styles.sliderContainer}>
                                    <div ref={sliderFillRef} className={styles.sliderFill}></div>
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={startYear} step="1" onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} aria-label="Start Year Slider" />
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={endYear} step="1" onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} aria-label="End Year Slider" />
                                </div>
                            </div>
                        </div>                        
                    </div>

                    <div className={styles.sourceFilter}>
                        <label className={styles.filterLabel}>Renewable:</label>
                        <div className={styles.sourceButtons}>
                            {RENEWABLE_SOURCES.map(source => (
                                <button key={source} className={`${styles.sourceButton} ${activeSources.includes(source) ? styles.active : ''}`} onClick={() => handleSourceToggle(source)}>
                                    {source}
                                </button>
                            ))}
                        </div>
                    </div>    

                    <div className={styles.sourceFilter}>
                        <label className={styles.filterLabel}>Non-Renewable:</label>
                        <div className={styles.sourceButtons}>
                            {NON_RENEWABLE_SOURCES.map(source => (
                                <button key={source} className={`${styles.sourceButton} ${activeSources.includes(source) ? styles.active : ''}`} onClick={() => handleSourceToggle(source)}>
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
                        {activeSources.length > 0 ? activeSources.join(', ') : 'No energy sources selected.'}
                    </p>
                    <div className={styles.separator}></div>

                </div>
            </div>    
        </div>
    );
};

export default RenewVsNon;