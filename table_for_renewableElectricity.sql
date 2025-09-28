CREATE TABLE renewable_electricity (
    countryName VARCHAR(255),
    countryCode CHAR(3),
    indicatorName VARCHAR(255),
    indicatorCode VARCHAR(50),
    dataYear SMALLINT,
    dataValue DECIMAL(15, 6),
    -- Optional: Add a primary key and indexes for performance
    PRIMARY KEY (countryCode, dataYear)
);