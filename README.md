# **Importing Dataset to local MySQL**

## *Clone the Repository first*

### **Create a new MySQL Connection**
    - Connection Name: STADVDB
    - Username: stadvdb
    - Password: admin123

### **Create a Database**
    - Database name: energy

### Dataset #1: *Power Generation by Fuel Source*
    1. Right-click "Tables"
    2. Click "Table Data Import Wizard"
    3. Choose the file "Power Generation by Fuel Source_utf8.csv" from the cloned Repository
    4. Finish the Import

### Dataset #2: *Average Mean Surface Air Temperature*
    1. Right-click "Tables"
    2. Click "Table Data Import Wizard"
    3. Choose the file "observed_timeseries_clean.csv" from the cloned Repository
    4. Finish the Import

### Dataset #3: *Renewable Electricity Data World Bank*
    1. Create a new table in MySQL by running the query file "table_for_renewableElectricity.sql" in MySQL
    2. Open VSCode
    2. In terminal, do "pip install mysql-connector-python"
    3. Run the py file "xml_importer.py"

