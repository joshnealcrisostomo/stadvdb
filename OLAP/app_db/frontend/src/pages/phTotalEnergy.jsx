import React, { useState, useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from '../css/phTotalEnergy.module.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE_URL = '/api';

// Data processing function
const processDataForChart = (apiData) => {
    if (!apiData || apiData.length === 0) {
        return { labels: [], datasets: [] };
    }

    const labels = apiData.map(d => d.period);
    
    // Define a specific color for each energy source with less vibrant tones
    const sourceColorMap = {
        coal: '#4F4F4F',       // Dark Gray (less harsh than black)
        oil: '#A9A9A9',        // Dark Gray (a lighter gray)
        natural_gas: '#F4A460',// Sandy Brown (muted orange)
        hydro: '#4682B4',       // Steel Blue (muted blue)
        geothermal: '#556B2F',  // Dark Olive Green (muted green)
        solar: '#F0E68C',       // Khaki (muted yellow)
        wind: '#B0C4DE',       // Light Steel Blue (muted light blue)
        biomass: '#8B4513',     // Saddle Brown (muted brown)
        nuclear: '#9370DB'      // Medium Purple (muted violet)
    };

    // Define the order and names of sources
    const sources = [
        { key: 'coal', name: 'Coal' },
        { key: 'oil', name: 'Oil' },
        { key: 'natural_gas', name: 'Natural Gas' },
        { key: 'hydro', name: 'Hydro' },
        { key: 'geothermal', name: 'Geothermal' },
        { key: 'solar', name: 'Solar' },
        { key: 'wind', name: 'Wind' },
        { key: 'biomass', name: 'Biomass' },
        { key: 'nuclear', name: 'Nuclear' }
    ];

    const datasets = sources
        .filter(source => apiData.some(d => parseFloat(d[source.key]) > 0)) // Only include sources with data
        .map(source => ({
            label: source.name,
            data: apiData.map(d => d[source.key] || 0),
            backgroundColor: sourceColorMap[source.key], // Assign color from the map
    }));

    return { labels, datasets };
};

const PhTotalEnergy = () => {
    const [dbYearBounds, setDbYearBounds] = useState({ min: 1990, max: 2024 });
    const [yearRange, setYearRange] = useState([]);
    const [startYear, endYear] = yearRange;
    const sliderFillRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the chart and aggregation
    const [aggregation, setAggregation] = useState('year');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [isChartLoading, setIsChartLoading] = useState(true);

    // Chart configuration
    const chartOptions = {
        plugins: {
            title: {
                display: true,
                text: `PH Energy Generation by Source in GWh (${startYear} - ${endYear})`,
                color: '#5A6ACF',
                font: {
                size: 23,
                family: 'Poppins, sans-serif'
                },
                padding: {
                    top: 30,
                    bottom: 20
                }
            },
            legend: {
                // Positioned the legend at the top, just below the title
                position: 'top',
            },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Time Period'
                }
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Energy Generation (GWh)'
                },
                beginAtZero: true
            }
        },
    };

    useEffect(() => {
        const min = 1990;
        const max = 2020;
        setDbYearBounds({ min, max });
        setYearRange([min, max]);
    }, []);
    
    // Fetch initial filter data (min/max years)
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/filters`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setDbYearBounds({ min: data.minYear, max: data.maxYear });
                setYearRange([data.minYear, data.maxYear]);
            } catch (e) {
                console.error("Fetch error for filters:", e);
                setError("Failed to load initial filter data. Please refresh the page.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchFilters();
    }, []);
    
    // Fetch chart data when filters change
    useEffect(() => {
        if (startYear > 0 && endYear > 0) {
            const fetchChartData = async () => {
                setIsChartLoading(true);
                try {
                    const params = new URLSearchParams({ startYear, endYear, aggregation });
                    const response = await fetch(`${API_BASE_URL}/ph-total-energy?${params}`);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const data = await response.json();
                    setChartData(processDataForChart(data));
                } catch (error) {
                    console.error("Failed to fetch chart data:", error);
                    setError("Could not load chart data.");
                } finally {
                    setIsChartLoading(false);
                }
            };
            fetchChartData();
        }
    }, [startYear, endYear, aggregation]);

    // Update slider fill effect
    useEffect(() => {
        if (sliderFillRef.current && dbYearBounds.max > dbYearBounds.min) {
            const range = dbYearBounds.max - dbYearBounds.min;
            const startPercent = ((startYear - dbYearBounds.min) / range) * 100;
            const endPercent = ((endYear - dbYearBounds.min) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear, dbYearBounds]);


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
                <h1>Philippines’ Total Energy Generation and Mix Composition</h1>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.content}>
                <div className={styles.filterTab}>
                    {isLoading ? (
                        <p>Loading filters...</p>
                    ) : error && !dbYearBounds.min ? (
                        <p className={styles.error}>{error}</p>
                    ) : dbYearBounds.min > 0 ? (
                        <>
                            <div className={styles.yearFilter}>
                                <div className={styles.yearControlGroup}>
                                    <label className={styles.filterLabel}>Year Range: {`${startYear} - ${endYear}`}</label>
                                    <div className={styles.sliderAndDisplay}>
                                        <div className={styles.sliderContainer}>
                                            <div ref={sliderFillRef} className={styles.sliderFill}></div>
                                            <input type="range" min={dbYearBounds.min} max={dbYearBounds.max} value={startYear} step="1" onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} aria-label="Start Year Slider" />
                                            <input type="range" min={dbYearBounds.min} max={dbYearBounds.max} value={endYear} step="1" onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} aria-label="End Year Slider" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.aggregationFilter}>
                                <label className={styles.filterLabel}>Group By:</label>
                                <div className={styles.sourceButtons}>
                                    <button onClick={() => setAggregation('year')} className={`${styles.sourceButton} ${aggregation === 'year' ? styles.active : ''}`}>Yearly</button>
                                    <button onClick={() => setAggregation('5-year')} className={`${styles.sourceButton} ${aggregation === '5-year' ? styles.active : ''}`}>5 Years</button>
                                    <button onClick={() => setAggregation('decade')} className={`${styles.sourceButton} ${aggregation === 'decade' ? styles.active : ''}`}>Decade</button>
                                    <button onClick={() => setAggregation('all-time')} className={`${styles.sourceButton} ${aggregation === 'all-time' ? styles.active : ''}`}>All-Time</button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                <div className={styles.visualizationArea}>
                    {isChartLoading ? (
                        <p>Loading chart...</p>
                    ) : chartData.labels.length > 0 ? (
                        <div className={styles.chartContainer}>
                            <Bar options={chartOptions} data={chartData} />
                        </div>
                    ) : (
                        <p>No data available for the selected period.</p>
                    )}

                    <p className={styles.disclaimerText}>
                        Note: Gaps in the line charts indicate that data was not recorded or reported for those specific years.
                    </p>
                </div>

                <div className={styles.descriptionArea}>
                    <h3>Summary & Insights</h3>
                    <p>
                        This report tells the visual story of the Philippines' energy journey over the last three decades. Imagine each bar as a snapshot of a single year, with the height of the bar showing the total amount of electricity the country produced. 
                        As you can see, the bars get progressively taller over time, which is a clear picture of a growing nation needing more and more power for its homes, schools, and industries. The real narrative, however, is in the colorful layers that make up each bar. 
                        Each color represents a different energy source, like <b>coal</b>, <b>geothermal</b>, or <b>solar</b>. By watching how the size and proportion of these colors change from year to year, you can see the country's energy story unfold. 
                        You can pinpoint which sources have been the long-standing workhorses, which ones are new players just starting to contribute, and how the overall energy "recipe" has shifted, revealing the nation's changing reliance on fossil fuels versus its embrace of cleaner, renewable alternatives.
                    </p>
                
                    <p>
                        Key findings (as of 2020):<br /><br />
                        <b>Massive Overall Growth:</b> There is a clear and steady increase in the total energy generated in the Philippines from 1990 to recent years. The total generation in 2021 appears to be roughly four to five times larger than it was in 1990.<br /><br />
                        <b>The Dominance of Coal:</b> The most significant trend is the dramatic rise of <b>coal</b> (the dark gray layer). In the early 1990s, it was a very small part of the mix, but it has expanded massively to become the single dominant source of energy, making up more than half of all generation in recent years.<br /><br />
                        <b>A Shift in Fossil Fuels:</b> In the early 1990s, <b>oil</b> (dark green) was a significant contributor. However, its use has been almost completely phased out. This gap was largely filled by <b>natural gas</b> (orange), which appears around 2002 and quickly grows to become the second-largest energy source for the country.<br /><br />
                        <b>Steady but Shrinking Share of Renewables:</b> <b>Geothermal</b> (light blue) and <b>Hydro</b> (dark blue) have been consistent and reliable energy producers for decades. However, their total output has remained relatively flat. Because the total energy demand grew so much, their <i>percentage share</i> of the overall mix has significantly decreased over time.<br /><br />
                        <b>Emerging Renewables:</b> Newer renewables like <b>Solar</b> (yellow), <b>Wind</b> (lightest blue), and <b>Biomass</b> (brown) are visible on the chart, but they only begin to appear in the last 10-15 years. As of the most recent data, they still make up a very small fraction of the Philippines' total energy generation.
                    </p>
                </div>

            </div>    
        </div>
    );
};

export default PhTotalEnergy;