# **Importing Dataset to local MySQL (updated)**

## _Clone the repository first_

---

## _MCO1 Steps 1 and 2 Procedure_

### **Create a new MySQL Connection**

    - Connection Name: STADVDB
    - Username: stadvdb
    - Password: admin123

### **Create the Databases (Schemas)**

    1. Run the 'Schemas.sql' file in MySQL.

### Dataset #1 (power_gen schema): `Power Generation by Fuel Source`

    1. Right-click "Tables"
    2. Click "Table Data Import Wizard"
    3. Choose the file 'Power_Generation_Clean.csv' from the cloned Repository
    4. Rename the table to 'power_generation'
    5. Finish the Import

### Dataset #2 (air_temp schema): `Average Mean Surface Air Temperature`

    1. Right-click "Tables"
    2. Click "Table Data Import Wizard"
    3. Choose the file 'observed_timeseries_clean.csv' from the cloned Repository
    4. Rename the table to 'renewable_electricity'
    5. Finish the Import

### Dataset #3 (renew_elect schema): `Renewable Electricity Data World Bank`

    1. Create a new table in MySQL by running the query file "table_for_renewableElectricity.sql" in MySQL
    2. Open VSCode
    3. In terminal, do "pip install mysql-connector-python python-dotenv"
    4. Duplicate the ".env.example" file and place the respective credentials
    5. Run the py file "xml_importer.py"

### Data Warehouse (data_warehouse schema): `MAIN DATA WAREHOUSE`

    1. Run the 'Data_Warehouse_Star_Schema.sql' file

## **For now, all the schemas have their designated table/s.**

## **Only the `data_warehouse` schema has empty tables because this is where ETL will be applied.**
