import React, { useState, useEffect, useMemo, useRef } from 'react'; // NEW: Import useRef
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

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const MIN_YEAR = 1990;
const MAX_YEAR = 2020;
const ENERGY_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];
const RENEWABLE_SOURCES = ['Hydro', 'Solar', 'Wind', 'Biomass', 'Geothermal'];
const getYearLabel = (value) => String(value);

const API_BASE_URL = 'http://localhost:5000/api/green-energy-vs-weather';

const SOURCE_COLORS = {
    'Hydro': 'rgba(0, 123, 255, 0.8)',
    'Solar': 'rgba(255, 193, 7, 0.8)',
    'Wind': 'rgba(40, 167, 69, 0.8)',
    'Biomass': 'rgba(108, 117, 125, 0.8)',
    'Geothermal': 'rgba(220, 53, 69, 0.8)',
    'Avg. Temp (°C)': 'rgb(255, 99, 132)',
};

const sampleChartData = {
    years: Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i),
    temperature: [
        25.0, 26.5, 25.8, 27.2, 26.1, 28.0, 27.5, 26.3, 27.8, 26.9, 27.9,
        25.2, 26.8, 25.5, 27.0, 26.4, 28.2, 27.1, 26.0, 27.6, 26.7, 27.7,
        25.4, 26.9, 25.7, 27.3, 26.2, 28.1, 27.3, 26.6, 27.4
    ],
    energy: {
        'Hydro': [ { x: 1990, y: 10100 }, { x: 1995, y: 8000 }, { x: 2000, y: 10000 }, { x: 2002, y: 5000 }, { x: 2004, y: 8000 }, { x: 2006, y: 11000 }, { x: 2008, y: 7500 }, { x: 2010, y: 9800 }, { x: 2015, y: 9200 }, { x: 2020, y: 9500 } ],
        'Solar': [ { x: 1990, y: 10 }, { x: 2000, y: 50 }, { x: 2003, y: 150 }, { x: 2006, y: 400 }, { x: 2008, y: 900 }, { x: 2010, y: 1500 }, { x: 2015, y: 2500 }, { x: 2020, y: 4000 } ],
        'Wind': [ { x: 1990, y: 5 }, { x: 2000, y: 20 }, { x: 2004, y: 250 }, { x: 2007, y: 600 }, { x: 2010, y: 1200 }, { x: 2015, y: 1800 }, { x: 2020, y: 2200 } ],
        'Biomass': [ { x: 1990, y: 100 }, { x: 2000, y: 200 }, { x: 2005, y: 350 }, { x: 2010, y: 500 }, { x: 2015, y: 700 }, { x: 2020, y: 900 } ],
        'Geothermal': [ { x: 1990, y: 9000 }, { x: 2000, y: 10500 }, { x: 2005, y: 8500 }, { x: 2010, y: 9500 }, { x: 2015, y: 9800 }, { x: 2020, y: 10200 } ],
    },
};

const USE_SAMPLE_DATA = true;

const PhGreenEnergy = () => {
    const [yearRange, setYearRange] = useState([MIN_YEAR, MAX_YEAR]);
    const [startYear, endYear] = yearRange;
    const [activeSources, setActiveSources] = useState(RENEWABLE_SOURCES);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const sliderFillRef = useRef(null);

    const activeRenewableSources = useMemo(() => 
        activeSources.filter(source => RENEWABLE_SOURCES.includes(source)),
        [activeSources]
    );

    // --- Data Fetching Effect ---
    useEffect(() => {
        const fetchData = async () => {
            if (USE_SAMPLE_DATA) {
                setChartData(sampleChartData);
                return;
            }

            if (activeRenewableSources.length === 0) {
                setChartData(null);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            const params = new URLSearchParams({
                startYear,
                endYear,
                sources: activeRenewableSources.join(',')
            }).toString();

            try {
                const response = await fetch(`${API_BASE_URL}?${params}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setChartData(data);
            } catch (e) {
                console.error("Fetch error:", e);
                setError("Failed to fetch data from the server.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startYear, endYear, activeRenewableSources]);

    // NEW: Effect to update the slider fill style
    useEffect(() => {
        if (sliderFillRef.current) {
            const range = MAX_YEAR - MIN_YEAR;
            const startPercent = ((startYear - MIN_YEAR) / range) * 100;
            const endPercent = ((endYear - MIN_YEAR) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear]);

    // --- Chart Data Transformation (Memoized) ---
    const chartConfig = useMemo(() => {
        if (!chartData) {
            return { datasets: [], labels: [] };
        }

        const { years, temperature, energy } = chartData;
        const startIndex = years.findIndex(y => y >= startYear);
        const endIndex = years.findLastIndex(y => y <= endYear);
        const filteredYears = years.slice(startIndex, endIndex + 1);
        const filteredTempData = temperature.slice(startIndex, endIndex + 1);

        const temperatureDataset = {
            type: 'line',
            label: 'Avg. Temp (°C)',
            data: filteredTempData.map((temp, index) => ({ x: filteredYears[index], y: temp })),
            borderColor: SOURCE_COLORS['Avg. Temp (°C)'],
            backgroundColor: SOURCE_COLORS['Avg. Temp (°C)'].replace(')', ', 0.5)'),
            yAxisID: 'y_temp',
            tension: 0.4,
            fill: false,
            pointRadius: 3,
        };

        const energyDatasets = activeSources
            .filter(source => energy[source])
            .map(source => ({
                type: 'scatter',
                label: `${source} Gen. (GWh)`,
                data: energy[source].filter(point => point.x >= startYear && point.x <= endYear),
                borderColor: SOURCE_COLORS[source],
                backgroundColor: SOURCE_COLORS[source].replace('0.8', '0.4'),
                yAxisID: 'y_gen',
                pointRadius: 5,
                showLine: true,
            }));

        return {
            labels: filteredYears.map(String),
            datasets: [temperatureDataset, ...energyDatasets],
        };
    }, [chartData, startYear, endYear, activeSources]);


    // --- Chart Options ---
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'top', 
                labels: { usePointStyle: true },
                // UPDATED: Set onClick to null to disable legend item clicks
                onClick: null,
            },
            title: { display: true, text: `Energy Generation vs. Temperature (${startYear} - ${endYear})` },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            x: {
                title: { display: true, text: 'Year' },
                type: 'linear',
                min: startYear,
                max: endYear,
                ticks: {
                    stepSize: Math.ceil((endYear - startYear) / 10),
                    callback: (value) => Number.isInteger(value) ? value : null,
                }
            },
            y_gen: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Energy Generation (GWh)', color: '#007bff' },
                beginAtZero: true,
            },
            y_temp: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Avg. Temperature (°C)', color: '#dc3545' },
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

    // --- Handlers ---
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

    // --- Render Logic ---
    let visualizationContent;
    if (isLoading) {
        visualizationContent = <p>Loading data...</p>;
    } else if (error) {
        visualizationContent = <p className={styles.error}>Error: {error}</p>;
    } else if (activeRenewableSources.length === 0) {
         visualizationContent = <p className={styles.info}>Select at least one renewable source to see its correlation with weather.</p>;
    } else if (chartData) {
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
                                    <div ref={sliderFillRef} className={styles.sliderFill}></div>
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={startYear} step="1" onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} aria-label="Start Year Slider" />
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={endYear} step="1" onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} aria-label="End Year Slider" />
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
                </div>

                <div className={styles.visualizationArea}>
                    <div className={styles.yearDisplay}>
                        {getYearLabel(startYear)} <span>&mdash;</span> {getYearLabel(endYear)}
                    </div>
                    <p className={styles.filteredSourcesDisplay}>
                        {activeSources.length > 0 ? activeSources.join(', ') : 'No energy sources selected.'}
                    </p>
                    <div className={styles.separator}></div>
                    {visualizationContent}
                </div>
            </div>    
        </div>
    );
};

export default PhGreenEnergy;