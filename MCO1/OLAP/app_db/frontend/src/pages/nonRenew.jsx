import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import styles from '../css/nonRenew.module.css';

const API_BASE_URL = '/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF', '#FFCD56'
];

const NON_RENEWABLE_SOURCES = {
    'Coal': 'coal',
    'Oil': 'oil',
    'Natural Gas': 'natural_gas',
    'Nuclear': 'nuclear'
};
const DEFAULT_SOURCES = Object.keys(NON_RENEWABLE_SOURCES);
const MAX_COUNTRIES_SELECTED = 6;

const NonRenew = () => {
    // State for filters and UI controls
    const [filterOptions, setFilterOptions] = useState({ countries: [], minYear: 1990, maxYear: 2022 });
    const [yearRange, setYearRange] = useState([1990, 2022]);
    const [showCountryPopup, setShowCountryPopup] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState(['Philippines']);
    const [activeSources, setActiveSources] = useState(DEFAULT_SOURCES);

    // State for faceted chart data and loading
    const [facetedChartData, setFacetedChartData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [countryColorMap, setCountryColorMap] = useState({});

    const { minYear, maxYear, countries } = filterOptions;
    const [startYear, endYear] = yearRange;
    const sliderFillRef = useRef(null);

    // Effect to fetch initial filter data
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/filters`);
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

    // Effect to manage country colors
    useEffect(() => {
        const newColorMap = selectedCountries.reduce((acc, country, index) => {
            acc[country] = CHART_COLORS[index % CHART_COLORS.length];
            return acc;
        }, {});
        setCountryColorMap(newColorMap);
    }, [selectedCountries]);


    // Effect to update slider fill
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

    // Effect to fetch and process data for small multiple charts
    useEffect(() => {
        const fetchChartData = async () => {
            if (selectedCountries.length === 0 || activeSources.length === 0) {
                setFacetedChartData({});
                return;
            }
            setIsChartLoading(true);
            const params = new URLSearchParams({
                startYear,
                endYear,
                countries: selectedCountries.join(','),
            });

            try {
                const response = await fetch(`${API_BASE_URL}/non-renewable-generation?${params}`);
                if (!response.ok) throw new Error('Failed to fetch chart data');
                const apiData = await response.json();
                
                const processedData = {};
                for (const key in apiData) {
                    const [country, source] = key.split(' - ');

                    if (!activeSources.includes(source)) {
                        continue;
                    }

                    if (!processedData[source]) {
                        processedData[source] = { datasets: [] };
                    }
                    
                    processedData[source].datasets.push({
                        label: country,
                        data: apiData[key], 
                        borderColor: countryColorMap[country],
                        backgroundColor: `${countryColorMap[country]}80`,
                        fill: false,
                        tension: 0.1,
                        borderWidth: 2,
                        spanGaps: false // MODIFICATION: Tell Chart.js to break lines on null
                    });
                }
                setFacetedChartData(processedData);

            } catch (error) {
                console.error("Failed to process chart data:", error);
                setFacetedChartData({});
            } finally {
                setIsChartLoading(false);
            }
        };

        if (!isLoading) fetchChartData();
    }, [startYear, endYear, selectedCountries, activeSources, isLoading, countryColorMap]);

    // Handlers for updating filter state
    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    const handleCountryChange = (country) => {
        setSelectedCountries(prev => {
            if (prev.includes(country)) return prev.filter(c => c !== country);
            if (prev.length < MAX_COUNTRIES_SELECTED) return [...prev, country];
            return prev;
        });
    };

    const handleDeselectAllCountries = () => setSelectedCountries([]);

    const handleSourceToggle = (source) => {
        setActiveSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
    };

    // MODIFICATION: Updated tooltip callback to handle null
    const generateChartOptions = () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        if (context.parsed.y === null) {
                            return `${context.dataset.label}: No Data`;
                        }
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: false },
                min: startYear,
                max: endYear,
                ticks: {
                    callback: value => value.toString(),
                    stepSize: Math.ceil((endYear - startYear) / 5)
                }
            },
            y: {
                title: { display: true, text: 'Generation Share' },
                ticks: { callback: (value) => `${value.toFixed(0)}%` },
                beginAtZero: true
            }
        }
    });


    if (isLoading) {
        return <div className={styles.container}><p style={{ textAlign: 'center' }}>Loading filter options...</p></div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Non-Renewable Energy Sources Generation between different countries</h1>
            </div>
            <div className={styles.separator}></div>
            <div className={styles.content}>
                <div className={styles.filterTab}>
                    <div className={styles.yearFilter}>
                        <label className={styles.filterLabel}>Year Range: {`${startYear} - ${endYear}`}</label>
                        <div className={styles.sliderContainer}>
                            <div ref={sliderFillRef} className={styles.sliderFill}></div>
                            <input type="range" min={minYear} max={maxYear} value={startYear} onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} />
                            <input type="range" min={minYear} max={maxYear} value={endYear} onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} />
                        </div>
                    </div>
                    <div className={styles.countryFilter}>
                        <span>Countries: </span>
                        <button className={styles.countryButton} onClick={() => setShowCountryPopup(true)}>Select Countries</button>
                    </div>
                    <div className={styles.sourceFilter}>
                        <label className={styles.filterLabel}>Energy Sources:</label>
                        <div className={styles.sourceButtons}>
                            {Object.keys(NON_RENEWABLE_SOURCES).map(source => (
                                <button key={source} className={`${styles.sourceButton} ${activeSources.includes(source) ? styles.active : ''}`} onClick={() => handleSourceToggle(source)}>
                                    {source}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.visualizationArea}>
                    <div className={styles.yearDisplay}>
                        <span>Non-Renewable Generation Comparison in %</span>
                        ({startYear} <span>&mdash;</span> {endYear})
                        {Object.keys(facetedChartData).length > 0 && !isChartLoading && (
                            <p className={styles.disclaimerText}>
                                Note: Gaps in the line charts indicate that data was not recorded or reported for those specific years.
                            </p>
                        )}
                    </div>

                    {selectedCountries.length > 0 && (
                        <div className={styles.sharedLegend}>
                            {/* ... (Legend content is unchanged) ... */}
                            {selectedCountries.map(country => (
                                <div key={country} className={styles.legendItem}>
                                    <span className={styles.legendColorBox} style={{ backgroundColor: countryColorMap[country] }}></span>
                                    <span className={styles.legendLabel}>{country}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {isChartLoading ? (<p style={{ textAlign: 'center' }}>Loading chart data...</p>)
                        : Object.keys(facetedChartData).length > 0 ? (
                            <div className={styles.chartGrid}>
                                {/* ... (Chart grid mapping is unchanged) ... */}
                                {activeSources.map(source => facetedChartData[source] && (
                                    <div key={source} className={styles.chartContainer}>
                                        <h3 className={styles.chartTitle}>{source}</h3>
                                        <div className={styles.chartWrapper}>
                                            <Line
                                                options={generateChartOptions()}
                                                data={facetedChartData[source]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.filteredSourcesDisplay}>Select countries and energy sources to see data. 📊</p>
                        )
                    }
                </div>

                <div className={styles.descriptionArea}>
                    {/* ... (Description content is unchanged) ... */}
                    <h3>Possible Insights to Gain</h3>
                    <p>
                        This report puts a spotlight on the fossil fuel chapter of a country's energy story. By separating sources like <b>coal</b>, <b>oil</b>, and <b>natural gas</b>, it allows you to follow the individual journey of each one. 
                        You can watch the rise and fall of these energy sources over time, seeing which one was the main character in the 90s versus today. 
                        The purpose is to move beyond the simple "renewable vs. non-renewable" debate and understand the specific choices and dependencies a country has when it comes to traditional power generation.
                    </p>
                
                    <p>
                        By using this view, you can uncover several key insights:
                        <ul>
                            <li>
                                <b>Identify the dominant fossil fuel</b> for any selected country and see how its reliance has changed over time.
                            </li>
                            <li>
                                <b>Pinpoint strategic shifts</b> by observing the exact years when a country began phasing out one source (like oil) in favor of another (like coal or natural gas).
                            </li>
                            <li>
                                <b>Compare different national paths</b> by selecting multiple countries to see who is doubling down on certain fossil fuels versus who is reducing their reliance.
                            </li>
                            <li>
                                <b>Understand economic and environmental context</b> by seeing a more detailed story of a country's energy choices and its resulting carbon emissions over the decades.
                            </li>
                        </ul>
                    </p>
                </div>             
            </div>

            {showCountryPopup && (
                <div className={styles.modalOverlay} onClick={() => setShowCountryPopup(false)}>
                    {/* ... (Modal content is unchanged) ... */}
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2>Select Countries</h2>
                        <p className={styles.modalSubtitle}>{selectedCountries.length} / {MAX_COUNTRIES_SELECTED} selected</p>
                        <div className={styles.countryList}>
                            {countries.map((country) => {
                                const isChecked = selectedCountries.includes(country);
                                const isDisabled = !isChecked && selectedCountries.length >= MAX_COUNTRIES_SELECTED;
                                return (
                                    <label key={country} className={`${styles.countryItem} ${isDisabled ? styles.disabledLabel : ''}`}>
                                        <input type="checkbox" checked={isChecked} onChange={() => handleCountryChange(country)} disabled={isDisabled} />
                                        {country}
                                    </label>
                                );
                            })}
                        </div>
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

export default NonRenew;