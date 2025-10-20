import React, { useState, useEffect, useRef } from 'react';
import styles from '../css/renewVsNon.module.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MIN_YEAR = 1990;
const MAX_YEAR = 2020;

const RenewVsNon = () => {
    const [yearRange, setYearRange] = useState([MIN_YEAR, MAX_YEAR]);
    const [startYear, endYear] = yearRange;
    const [aggregation, setAggregation] = useState('year');
    const [chartData, setChartData] = useState(null); // State for chart data

    const sliderFillRef = useRef(null);

    // Effect for updating the slider's visual fill
    useEffect(() => {
        if (sliderFillRef.current) {
            const range = MAX_YEAR - MIN_YEAR;
            const startPercent = ((startYear - MIN_YEAR) / range) * 100;
            const endPercent = ((endYear - MIN_YEAR) / range) * 100;
            sliderFillRef.current.style.left = `${startPercent}%`;
            sliderFillRef.current.style.width = `${endPercent - startPercent}%`;
        }
    }, [startYear, endYear]);

    // Effect for fetching data when filters change
    useEffect(() => {
        const fetchData = async () => {
            const params = new URLSearchParams({
                startYear,
                endYear,
                aggregation,
            });

            try {
                const response = await fetch(`http://localhost:5001/api/ph-renewable-vs-non?${params}`);
                const data = await response.json();

                if (data) {
                    const labels = data.map(d => d.period);
                    const renewableData = data.map(d => parseFloat(d.renewable_total));
                    const nonRenewableData = data.map(d => parseFloat(d.non_renewable_total));

                    setChartData({
                        labels,
                        datasets: [
                            {
                                label: 'Renewable',
                                data: renewableData,
                                backgroundColor: '#197640ff',
                            },
                            {
                                label: 'Non-Renewable',
                                data: nonRenewableData,
                                backgroundColor: '#8d8f8fff',
                            },
                        ],
                    });
                }
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            }
        };

        fetchData();
    }, [startYear, endYear, aggregation]);

    const handleYearChange = (e, type) => {
        const value = Number(e.target.value);
        if (type === 'start') {
            setYearRange([Math.min(value, endYear - 1), endYear]);
        } else {
            setYearRange([startYear, Math.max(value, startYear + 1)]);
        }
    };

    // Chart options with stacking enabled
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `Renewable vs. Non-Renewable Energy Generation in the Philippines in GWh (${startYear} - ${endYear})`,
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
                position: 'top',
            },
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Period'
                }
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Energy Generation (GWh)'
                }
            },
        },
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageTitle}>
                <h1>Renewable vs Non-Renewable Energy Generation in the Philippines</h1>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.content}>
                <div className={styles.filterTab}>
                    <div className={styles.yearFilter}>
                        <div className={styles.yearControlGroup}>
                            <label className={styles.filterLabel}>Year Range: {`${startYear} - ${endYear}`}</label>
                            <div className={styles.sliderAndDisplay}>
                                <div className={styles.sliderContainer}>
                                    <div ref={sliderFillRef} className={styles.sliderFill}></div>
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={startYear} step="1" onChange={(e) => handleYearChange(e, 'start')} className={styles.yearSlider} aria-label="Start Year Slider" />
                                    <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={endYear} step="1" onChange={(e) => handleYearChange(e, 'end')} className={styles.yearSlider} aria-label="End Year Slider" />
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
                        </div>
                    </div>
                </div>

                <div className={styles.visualizationArea}>
                    <div className={styles.chartContainer}>
                        {chartData ? (
                            <Bar options={chartOptions} data={chartData} />
                        ) : (
                            <p>Loading chart data...</p>
                        )}
                    </div>
                </div>

                <div className={styles.descriptionArea}>
                    <h3>Summary & Key Insights</h3>
                    <p>
                        This report provides a clear, side-by-side comparison of the Philippines' energy story, splitting it into two main chapters: <b>renewable</b> (the green part) and <b>non-renewable</b> (the gray part). 
                        As you look from left to right, you're watching the country's power needs grow over three decades. The total height of the bars shows that the Philippines is using more and more electricity each year. 
                        But the real story is in the balance between the green and gray. You can instantly see how the country's reliance on one type of energy has changed compared to the other. 
                        It helps answer big questions like: "As we've grown, have we leaned more on burning fossil fuels, or have we successfully invested in cleaner energy?" This direct comparison reveals the long-term energy strategy the country has actually followed, 
                        showing whether the growth in clean energy has kept pace with the much larger growth in demand.
                    </p>

                    <p>
                        Key findings (as of 2020):<br /><br />
                        <b>Total Energy Growth:</b> The total height of the stacked bars consistently increases from 1990 to 2020, indicating a significant and steady rise in the Philippines' overall electricity generation to meet growing demand.<br /><br />
                        <b>Domination of Non-Renewables:</b> The growth in energy generation is overwhelmingly driven by <b>non-renewable</b> sources (the gray section). This portion of the bar chart expands dramatically over the 30-year period.<br /><br />
                        <b>Stagnant Renewable Growth:</b> In contrast, the <b>renewable</b> generation (the green section) shows very little absolute growth. While it provided a substantial part of the energy in the early 1990s, its total output has remained relatively flat or increased only slightly over the decades.<br /><br />
                        <b>Shrinking Renewable Share:</b> The most critical insight is the change in the energy <i>mix</i>. Because non-renewable generation grew so rapidly while renewable generation stayed almost flat, the <i>percentage share</i> of renewables in the Philippines' total energy mix has significantly decreased. The country has become progressively more dependent on non-renewable sources to power its growth.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RenewVsNon;