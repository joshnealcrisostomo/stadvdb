import React from 'react';
import { useNavigate } from 'react-router-dom';

const Statistics = () => {
    const navigate = useNavigate();

    const handleCardClick = (path) => {
        navigate(path);
    };

    const baseCardStyles = [
        "flex-1",
        "rounded-xl",
        "shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        "p-5",
        "min-h-[350px]",
        "transition-[box-shadow,transform,border-color] duration-400 ease-in-out",
        "border border-transparent",
        "bg-cover bg-center",
        "flex items-center justify-center text-center",
        "cursor-pointer",
        "hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]",
        "hover:-translate-y-[5px] hover:scale-[1.02]",
        "hover:border-[#5A6ACF]" 
    ].join(" ");

    const sectionTitleStyles = "font-sans text-white text-[26px] [text-shadow:2px_2px_4px_rgba(0,0,0,0.7)] z-10";

    return (
        <div className="h-screen flex flex-col font-sans bg-[#fafafa] p-10 pt-0">
            <div className="flex-grow flex flex-col gap-5 mt-5">
                <div className="flex gap-5">
                    <div 
                        className={`${baseCardStyles} bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url('../assets/1.png')]`}
                        onClick={() => handleCardClick('/energyMix')}
                    >
                        <h3 className={sectionTitleStyles}>Energy Mix Comparison of Countries</h3>
                        <div className="hidden"></div>
                    </div>

                    <div 
                        className={`${baseCardStyles} bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url('../assets/4.png')]`}
                        onClick={() => handleCardClick('/phGreenEnergy')}
                    >
                        <h3 className={sectionTitleStyles}>Philippines' Green Energy Generation (in GWh) & Average Mean Surface Temperature</h3>     
                        <div className="hidden"></div>
                    </div>
                </div>

                <div className="flex gap-5">
                    <div 
                        className={`${baseCardStyles} bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url('../assets/5.png')]`}
                        onClick={() => handleCardClick('/phTotalEnergy')}
                    >
                        <h3 className={sectionTitleStyles}>Philippines’ Total Energy Generation and Mix Composition</h3>
                        <div className="hidden"></div>
                    </div>

                    <div 
                        className={`${baseCardStyles} bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url('../assets/2.png')]`}
                        onClick={() => handleCardClick('/renewVsNon')}
                    >
                        <h3 className={sectionTitleStyles}>Renewable vs Non-Renewable Energy Generation in the Philippines</h3>
                        <div className="hidden"></div>
                    </div>

                    <div 
                        className={`${baseCardStyles} bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url('../assets/3.png')]`}
                        onClick={() => handleCardClick('/nonRenew')}
                    >
                        <h3 className={sectionTitleStyles}>Non-Renewable Energy Sources Generation between different countries</h3>
                        <div className="hidden"></div>
                    </div>
                </div>
            </div>      
        </div>
    );
};

export default Statistics;