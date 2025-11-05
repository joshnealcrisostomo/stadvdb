import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import styles from '../css/phGreenEnergy.module.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE_URL = '/api';
const ENERGY_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];
const RENEWABLE_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];

const SOURCE_COLORS = {
    'Hydro': 'rgba(0, 123, 255, 0.8)',
    'Solar': 'rgba(255, 193, 7, 0.8)',
    'Wind': 'rgba(40, 167, 69, 0.8)',
    'Biomass': 'rgba(139, 69, 19, 0.8)',
    'Geothermal': 'rgba(220, 53, 69, 0.8)',
    'Avg. Temp (°C)': 'rgba(108, 117, 125, 0.5)',
};

const PhGreenEnergy = () => {
    const [dbYearBounds, setDbYearBounds] = useState({ min: 0, max: 0 });
    const [yearRange, setYearRange] = useState([0, 0]);
    const [startYear, endYear] = yearRange;
    const [activeSources, setActiveSources] = useState(RENEWABLE_SOURCES);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summaryStats, setSummaryStats] = useState({ topYears: [], bottomYears: [] });
    const sliderFillRef = useRef(null);

    const activeRenewableSources = useMemo(() =>
        activeSources.filter(source => RENEWABLE_SOURCES.includes(source)),
        [activeSources]
    );

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
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        if (!startYear || !endYear) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const params = new URLSearchParams({ startYear, endYear, sources: activeRenewableSources.join(',') }).toString();

            try {
                const response = await fetch(`${API_BASE_URL}/green-energy-vs-weather?${params}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setChartData(data);

                setSummaryStats({
                    topYears: data.topYears || [],
                    bottomYears: data.bottomYears || []
                });

            } catch (e) {
                console.error("Fetch error:", e);
                setError("Failed to fetch data from the server.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startYear, endYear, activeRenewableSources]);

    useEffect(() => {
        if (sliderFillRef.current && dbYearBounds.max > dbYearBounds.min) {
            const range = dbYearBounds.max - dbYearBounds.min;
            const startPercent = ((startYear - dbYearBounds.min) / range) * 100;
            const endPercent = ((endYear - dbYearBounds.min) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear, dbYearBounds]);

    const chartConfig = useMemo(() => {
        if (!chartData || !chartData.years || chartData.years.length === 0) {
            return { datasets: [], labels: [] };
        }

        const { years, temperature, energy } = chartData;

        const temperatureDataset = {
            type: 'line',
            label: 'Avg. Temp (°C)',
            data: temperature.map((temp, index) => ({ x: years[index], y: temp })),
            borderColor: SOURCE_COLORS['Avg. Temp (°C)'],
            backgroundColor: SOURCE_COLORS['Avg. Temp (°C)'].replace(')', ', 0.5)'),
            yAxisID: 'y_temp',
            tension: 0.4,
            fill: false,
            pointRadius: 3,
        };

        const energyDatasets = activeSources
            .filter(source => energy[source] && energy[source].length > 0)
            .map(source => ({
                type: 'line',
                label: `${source} Gen. (GWh)`,
                data: energy[source],
                borderColor: SOURCE_COLORS[source],
                backgroundColor: SOURCE_COLORS[source].replace('0.8', '0.4'),
                yAxisID: 'y_gen',
                pointRadius: 4,
                showLine: true,
                tension: 0.1,
                fill: false,
            }));

        return {
            labels: years.map(String),
            datasets: [temperatureDataset, ...energyDatasets],
        };
    }, [chartData, activeSources]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true },
                onClick: null,
            },
            title: {
                display: true,
                text: `PH Green Energy Generation vs. Avg. Temperature (${startYear} - ${endYear})`,
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
            tooltip: {
                mode: 'nearest', 
                axis: 'x',       
                intersect: false,
            },
        },
        scales: {
            x: {
                title: { display: true, text: 'Year' },
                type: 'linear',
                min: startYear,
                max: endYear,
                ticks: {
                    callback: function(value) {
                        return value.toString();
                    },
                    maxTicksLimit: 100,
                    precision: 0 
                }
            },
            y_gen: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Energy Generation (GWh)', color: '#6b00a9ff' },
                beginAtZero: true,
                ticks: {
                    stepSize: 1000
                }
            },
            y_temp: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Avg. Temperature (°C)', color: 'rgba(108, 117, 125, 1)' },
                grid: { drawOnChartArea: false },
                suggestedMin: 24,
                suggestedMax: 30,
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    const handleSourceToggle = (source) => {
        setActiveSources(prev =>
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
        );
    };

    let visualizationContent;
    if (dbYearBounds.min === 0) {
        visualizationContent = <p>Loading filters...</p>;
    } else if (isLoading) {
        visualizationContent = <p>Loading chart data...</p>;
    } else if (error) {
        visualizationContent = <p className={styles.error}>Error: {error}</p>;
    } else if (activeRenewableSources.length === 0) {
        visualizationContent = <p className={styles.info}>Select at least one renewable source to see its correlation with weather.</p>;
    } else if (chartData && chartData.years.length > 0) {
        visualizationContent = (
            <div className={styles.chartContainer}>
                <Line data={chartConfig} options={chartOptions} />
            </div>
        );
    } else {
        visualizationContent = <p>No data available for the selected range and sources.</p>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Philippines' Green Energy Generation (in GWh) & Average Mean Surface Temperature</h1>
            </div>
            <div className={styles.separator}></div>
            <div className={styles.content}>
                <div className={styles.filterTab}>
                    {dbYearBounds.min > 0 && (
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

                            <div className={styles.sourceFilter}>
                                <label className={styles.filterLabel}>Energy Sources:</label>
                                <div className={styles.sourceButtons}>
                                    {ENERGY_SOURCES.map(source => (
                                        <button key={source} className={`${styles.sourceButton} ${activeSources.includes(source) ? styles.active : ''}`} onClick={() => handleSourceToggle(source)}>
                                            {source}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.visualizationArea}>
                    {visualizationContent}
                </div>

                <div className={styles.descriptionArea}>
                    <h3>Summary & Key Insights</h3>
                    <p>
                        The primary goal of this visualization is to analyze the historical relationship between the Philippines' green energy production and its average annual temperature from 1990 to 2021. 
                        By plotting various renewable energy sources (like Hydro, Geothermal, Solar, and Wind) against a climate indicator on a dual-axis chart, <strong>the aim is to visually identify long-term trends, patterns, and potential correlations that could inform future energy policy</strong>.
                    </p>

                    <p>
                        A key insight from the chart is the clear evolution of the nation's renewable energy strategy; for decades, energy generation was dominated by volatile hydropower and stable geothermal power, but a significant shift occurred around 2014, marked by the sharp, simultaneous rise of solar, wind, and biomass. 
                        This suggests a recent and aggressive diversification, although a simple visual correlation between rising temperatures and the output of any single energy source is not immediately evident.
                    </p>
                    <ul>
                        <li>
                            <strong>Dominant Sources:</strong> Historically, <strong>Hydro</strong> and <strong>Geothermal</strong> power have been the largest contributors to the country's renewable energy portfolio.
                        </li>
                        <li>
                            <strong>Emerging Sources:</strong> A significant upward trend in <strong>Solar</strong> and <strong>Wind</strong> energy generation is observable from the mid-2010s onwards, indicating recent investment and expansion in these sectors.
                        </li>
                        <li>
                            <strong>Temperature Correlation:</strong> While a direct, consistent correlation between annual temperature fluctuations and overall energy generation is not immediately apparent from the graph, the data provides a crucial baseline for more advanced statistical analysis.
                        </li>
                    </ul>
                </div>

                <div className={styles.statsContainer}>
                    <div className={styles.statsColumn}>
                        <h4>Highest Generation Years</h4>
                        <ol>
                            {summaryStats.topYears
                                .slice(0, 5) // Explicitly take the top 5
                                .map(item => (
                                    <li key={item.year}>
                                        <strong>{item.year}:</strong> {Math.round(item.totalGwh).toLocaleString()} GWh
                                    </li>
                                ))}
                        </ol>
                    </div>
                    <div className={styles.statsColumn}>
                        <h4>Lowest Generation Years</h4>
                        <ol>
                            {summaryStats.bottomYears
                                .filter(item => item.totalGwh > 0) // 1. Filter out the 0s
                                .slice(0, 5) // 2. THEN, take the first 5 from that non-zero list
                                .map(item => (
                                    <li key={item.year}>
                                        <strong>{item.year}:</strong> {Math.round(item.totalGwh).toLocaleString()} GWh
                                    </li>
                                ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhGreenEnergy;