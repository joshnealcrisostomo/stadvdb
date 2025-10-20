import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import styles from '../css/energyMix.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF', '#FFCD56',
    '#C9CBCF', '#3D6B5A', '#A33E3E', '#8D3DA3', '#3DA395', '#A3A13D',
    '#3D55A3', '#A33D8D', '#5A3DA3'
];

const ENERGY_SOURCES = ['Coal', 'Hydro', 'Natural Gas', 'Oil', 'Nuclear', 'Renewable'];
const DEFAULT_SOURCE = ['Coal', 'Renewable'];

const EnergyMix = () => {
    const [filterOptions, setFilterOptions] = useState({ countries: [], minYear: 1990, maxYear: 2022 });
    const [yearRange, setYearRange] = useState([1990, 2022]);
    const [showCountryPopup, setShowCountryPopup] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [chartData, setChartData] = useState({ datasets: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [activeSources, setActiveSources] = useState(DEFAULT_SOURCE);

    const { minYear, maxYear, countries } = filterOptions;
    const [startYear, endYear] = yearRange;
    const sliderFillRef = useRef(null);

    const MAX_COUNTRIES_SELECTED = 6;

    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/filters');
                if (!response.ok) throw new Error('Failed to load filter data');
                const data = await response.json();
                setFilterOptions({ countries: data.countries, minYear: data.minYear, maxYear: data.maxYear });
                setYearRange([data.minYear, data.maxYear]);
            } catch (error) {
                console.error("Failed to fetch filter data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFilterData();
    }, []);

    useEffect(() => {
        if (sliderFillRef.current && !isLoading) {
            const range = maxYear - minYear;
            if (range > 0) {
                const startPercent = ((startYear - minYear) / range) * 100;
                const endPercent = ((endYear - minYear) / range) * 100;
                sliderFillRef.current.style.left = `${startPercent}%`;
                sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
            }
        }
    }, [startYear, endYear, isLoading, minYear, maxYear]);

    useEffect(() => {
        const fetchChartData = async () => {
            if (selectedCountries.length === 0 || activeSources.length === 0) {
                setChartData({ datasets: [] });
                return;
            }
            setIsChartLoading(true);
            const params = new URLSearchParams({
                startYear, endYear,
                countries: selectedCountries.join(','),
                sources: activeSources.join(',')
            });
            try {
                const response = await fetch(`http://localhost:5000/api/energy-mix-comparison?${params}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                const datasets = Object.keys(data).map((key, index) => ({
                    label: key, data: data[key],
                    borderColor: CHART_COLORS[index % CHART_COLORS.length],
                    backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}80`,
                    fill: false, tension: 0.1, borderWidth: 2,
                }));
                setChartData({ datasets });
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
                setChartData({ datasets: [] });
            } finally {
                setIsChartLoading(false);
            }
        };
        if (!isLoading) fetchChartData();
    }, [startYear, endYear, selectedCountries, isLoading, activeSources]);

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    const handleCountryChange = (country) => {
        setSelectedCountries(prevSelected => {
            const isSelected = prevSelected.includes(country);
            if (isSelected) {
                return prevSelected.filter(c => c !== country);
            } else if (prevSelected.length < MAX_COUNTRIES_SELECTED) {
                return [...prevSelected, country];
            }
            return prevSelected;
        });
    };
    
    // --- NEW: Handler to deselect all countries ---
    const handleDeselectAllCountries = () => {
        setSelectedCountries([]);
    };

    const handleSourceToggle = (source) => {
        setActiveSources(prev =>
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
        );
    };

    const chartOptions = useMemo(() => {
        const getTitle = () => activeSources.length === 1 ? `${activeSources[0]} Energy Share (% of Total Electricity Output)` : 'Energy Source Share (% of Total Electricity Output)';
        const getYAxisTitle = () => activeSources.length === 1 ? `${activeSources[0]} Share` : 'Energy Share';
        return {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: getTitle(), font: { size: 16 } },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label || ''}: ${(context.parsed.y * 100).toFixed(2)}%` } }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Year' }, min: startYear, max: endYear },
                y: { title: { display: true, text: getYAxisTitle() }, ticks: { callback: (value) => `${(value * 100).toFixed(0)}%` }, beginAtZero: true }
            }
        };
    }, [activeSources, startYear, endYear]);

    if (isLoading) {
        return <div className={styles.container}><p style={{ textAlign: 'center' }}>Loading filter options...</p></div>;
    }

    return (
        <div className={styles.container}>
            {/* ... (rest of the component structure is the same) ... */}
            <div className={styles.pageTitle}><h1>Energy Mix Comparison of Countries</h1></div>
            <div className={styles.separator}></div>
            <div className={styles.content}>
                <div className={styles.filterTab}>
                    {/* Year Filter */}
                    <div className={styles.yearFilter}>
                        <label className={styles.filterLabel}>Select Year Range:</label>
                        <div className={styles.sliderAndDisplay}>
                            <div className={styles.sliderContainer}>
                                <div ref={sliderFillRef} className={styles.sliderFill}></div>
                                <input type="range" min={minYear} max={maxYear} value={startYear} onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} />
                                <input type="range" min={minYear} max={maxYear} value={endYear} onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} />
                            </div>
                        </div>
                    </div>
                    {/* Country Filter */}
                    <div className={styles.countryFilter}>
                        <span>Countries: </span>
                        <button className={styles.countryButton} onClick={() => setShowCountryPopup(true)}>Select Countries</button>
                    </div>
                    {/* Energy Source Filter */}
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
                    <div className={styles.yearDisplay}>{startYear} <span>&mdash;</span> {endYear}</div>
                    <div style={{ height: '500px', marginTop: '20px' }}>
                        {isChartLoading ? (<p style={{ textAlign: 'center' }}>Loading chart data...</p>)
                            : chartData.datasets.length > 0 ? (<Line options={chartOptions} data={chartData} />)
                                : (<p className={styles.filteredSourcesDisplay}>Select one or more countries and energy sources to visualize their data.</p>)}
                    </div>
                </div>
            </div>
            
            {showCountryPopup && (
                <div className={styles.modalOverlay} onClick={() => setShowCountryPopup(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2>Select Countries</h2>
                        <p className={styles.modalSubtitle}>
                            {selectedCountries.length} / {MAX_COUNTRIES_SELECTED} selected
                        </p>
                        <div className={styles.countryList}>
                            {countries.map((country) => {
                                const isChecked = selectedCountries.includes(country);
                                const isDisabled = !isChecked && selectedCountries.length >= MAX_COUNTRIES_SELECTED;
                                return (
                                    <label key={country} className={`${styles.countryItem} ${isDisabled ? styles.disabledLabel : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCountryChange(country)}
                                            disabled={isDisabled}
                                        />
                                        {country}
                                    </label>
                                );
                            })}
                        </div>

                        {/* --- MODIFIED: Modal Actions --- */}
                        <div className={styles.modalActions}>
                            <button className={styles.deselectButton} onClick={handleDeselectAllCountries}>Deselect All</button>
                            <button className={styles.closeButton} onClick={() => setShowCountryPopup(false)}>Close</button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default EnergyMix;