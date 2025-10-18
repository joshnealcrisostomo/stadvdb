import React, { useState, useEffect, useRef } from 'react'; 
import styles from '../css/energyMix.module.css';

const MIN_YEAR = 1990;
const MAX_YEAR = 2020;
const COUNTRIES = [
    'Philippines', 'Japan', 'China', 'USA', 'Germany', 
    'India', 'Australia', 'Brazil', 'Canada', 'France', 
    'South Korea', 'UK', 'Indonesia', 'Thailand', 'Vietnam'
];

const EnergyMix = () => {
    const [yearRange, setYearRange] = useState([MIN_YEAR, MAX_YEAR]);
    const [showCountryPopup, setShowCountryPopup] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [startYear, endYear] = yearRange;

    const sliderFillRef = useRef(null);

    useEffect(() => {
        if (sliderFillRef.current) {
            const range = MAX_YEAR - MIN_YEAR;
            const startPercent = ((startYear - MIN_YEAR) / range) * 100;
            const endPercent = ((endYear - MIN_YEAR) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear]);


    const toggleCountryPopup = () => setShowCountryPopup(!showCountryPopup);

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    const handleCountryChange = (country) => {
        setSelectedCountries(prev =>
        prev.includes(country)
            ? prev.filter(c => c !== country)
            : [...prev, country]
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Energy Mix Comparison of Countries</h1>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.content}>
                <div className={styles.filterTab}>
                    <div className={styles.yearFilter}>
                        <label className={styles.filterLabel}>Select Year Range:</label>
                        <div className={styles.sliderAndDisplay}>
                            <div className={styles.sliderContainer}>
                                <div ref={sliderFillRef} className={styles.sliderFill}></div>
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

                    <div className={styles.countryFilter}>
                        <span>Countries: </span>
                        <button className={styles.countryButton} onClick={toggleCountryPopup}>
                            Select Countries
                        </button>
                    </div>
                </div>

                <div className={styles.visualizationArea}>
                    <div className={styles.yearDisplay}>
                        {startYear} <span>&mdash;</span> {endYear}
                    </div>
                    {selectedCountries.length > 0 ? (
                        <p className={styles.filteredSourcesDisplay}>
                            Selected Countries: {selectedCountries.join(', ')}
                        </p>
                    ) : (
                        <p className={styles.filteredSourcesDisplay}>No countries selected.</p>
                    )}
                    <div className={styles.separator}></div>
                </div>
            </div>

            {showCountryPopup && (
                <div className={styles.modalOverlay} onClick={toggleCountryPopup}>
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2>Select Countries</h2>
                        <div className={styles.countryList}>
                            {COUNTRIES.map((country) => (
                                <label key={country} className={styles.countryItem}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCountries.includes(country)}
                                        onChange={() => handleCountryChange(country)}
                                    />
                                    {country}
                                </label>
                            ))}
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.closeButton} onClick={toggleCountryPopup}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnergyMix;