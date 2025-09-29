-- Star Schema for Data Warehouse

USE data_warehouse;

-- DIMENSION TABLES

CREATE TABLE DIM_DATE (
    dateKey INT PRIMARY KEY AUTO_INCREMENT,
    calendarYear INT NOT NULL
);

CREATE TABLE DIM_GEO (
    geoKey INT PRIMARY KEY AUTO_INCREMENT,
    countryCode VARCHAR(3) NOT NULL,
    countryName VARCHAR(100) NOT NULL,
    regionGrp VARCHAR(50)
);

CREATE TABLE DIM_FUEL_SOURCE (
    fuelKey INT PRIMARY KEY AUTO_INCREMENT,
    fuelName VARCHAR(50) NOT NULL,
    isRenewable CHAR(1) CHECK (isRenewable IN ('Y','N')),
    energyCateg VARCHAR(20)
);

CREATE TABLE DIM_TEMP (
    tempKey INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    avgMeanTempDegC DECIMAL(4,2)
);

-- FACT TABLES

CREATE TABLE RENEWABLE_OUTPUT (
    dateKey INT NOT NULL,
    geoKey INT NOT NULL,
    tempKey INT NOT NULL,
    renewOutPct DECIMAL(17,15),
    PRIMARY KEY (dateKey, geoKey, tempKey),
    FOREIGN KEY (dateKey) REFERENCES DIM_DATE(dateKey),
    FOREIGN KEY (geoKey) REFERENCES DIM_GEO(geoKey),
    FOREIGN KEY (tempKey) REFERENCES DIM_TEMP(tempKey)
);

CREATE TABLE FUEL_GENERATION (
    dateKey INT NOT NULL,
    fuelKey INT NOT NULL,
    tempKey INT NOT NULL,
    powGenGWH INT,
    PRIMARY KEY (dateKey, fuelKey, tempKey),
    FOREIGN KEY (dateKey) REFERENCES DIM_DATE(dateKey),
    FOREIGN KEY (fuelKey) REFERENCES DIM_FUEL_SOURCE(fuelKey),
    FOREIGN KEY (tempKey) REFERENCES DIM_TEMP(tempKey)
);