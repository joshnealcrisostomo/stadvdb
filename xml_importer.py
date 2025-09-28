# In terminal, do "pip install mysql-connector-python"

# Files use in MySQL:
#   - API_EG.ELC.RNEW.ZS_DS2_en_xml_v2_864940.xml
#   - observed_seasonal_cycle_clean.csv
#   - Power Generation by Fuel Source_utf8.csv

import xml.etree.ElementTree as ET
import mysql.connector

# DB connection configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "stadvdb",
    "password": "admin123",
    "database": "energy" 
}

XML_FILE = "API_EG.ELC.RNEW.ZS_DS2_en_xml_v2_864940.xml"
TARGET_TABLE = "renewable_electricity"

def import_xml_to_mysql():
    print("Connecting to MySQL Database...")
    
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return
    
    sql = (f"INSERT INTO {TARGET_TABLE} "
           "(countryName, countryCode, indicatorName, indicatorCode, dataYear, dataValue) "
           "VALUES (%s, %s, %s, %s, %s, %s)")
    
    try:
        print(f"Parsing XML file: {XML_FILE}...")
        tree = ET.parse(XML_FILE)
        root = tree.getroot()
        
        insert_ctr = 0
        
        # Iterate over every <record> tag in the XML
        for record in root.findall('./data/record'):
            data = {}
            # Iterate over every <field> tag within the <record>
            for field in record.findall('field'):
                field_name = field.get('name')
                field_key = field.get('key')
                field_value = field.text

                # Map the XML fields to the database columns
                if field_name == 'Country or Area':
                    data['countryName'] = field_value
                    data['countryCode'] = field_key
                elif field_name == 'Item':
                    data['indicatorName'] = field_value
                    data['indicatorCode'] = field_key
                elif field_name == 'Year':
                    data['dataYear'] = field_value
                elif field_name == 'Value':
                    # Use None if value is empty/null in XML
                    data['dataValue'] = field_value if field_value else None

            # Tuple for insertion
            values = (
                data.get('countryName'),
                data.get('countryCode'),
                data.get('indicatorName'),
                data.get('indicatorCode'),
                data.get('dataYear'),
                data.get('dataValue')
            )

            # Insertion
            cursor.execute(sql, values)
            insert_ctr += 1
        
        # Commit transaction to save the data to the database
        connection.commit()
        print(f"\n✅ Successfully imported {insert_ctr} records into the '{TARGET_TABLE}' table.")

    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        connection.rollback()
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()
            print("MySQL connection closed.")

if __name__ == "__main__":
    import_xml_to_mysql()