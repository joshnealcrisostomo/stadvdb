import mysql.connector
import pandas as pd
import os

csv_table_map = {
    "HO1Data-goDailySales.csv": "ho1data_go_dailysales",
    "HO1Data-goProducts.csv": "ho1data_go_products",
    "HO1Data-goRetailers.csv": "ho1data_go_retailers",
    "HO1Data-goMethods.csv": "ho1data_go_methods",
    "HO1Data-go_1k.csv": "ho1data_go_1k"
}

# Extract employees schema tables
def extract_table(table_name):
    conn = mysql.connector.connect(
        host="localhost",
        user="stadvdb",
        password="admin123",
        database="employees"  # Employees schema
    )
    query = f"SELECT * FROM {table_name};"
    df = pd.read_sql(query, conn)
    conn.close()
    return df

# Extract CSV file
def extract_from_csv(file_path):
    df = pd.read_csv(file_path, sep=";")

    # Drop columns that have no name (Unnamed or NaN)
    df = df.loc[:, df.columns.notna()]
    df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

    # Clean names
    df.columns = [
        col.strip().replace('"', '').lower().replace(" ", "_")
        for col in df.columns
    ]

    # Drop any columns with empty names after cleaning
    df = df.loc[:, df.columns != ""]

    # Convert date columns
    for col in df.columns:
        if "date" in col:
            df[col] = pd.to_datetime(df[col], dayfirst=True, errors="coerce").dt.strftime("%Y-%m-%d")

    return df


# Load data warehouse
# Load data warehouse
def load_table(df, table_name):
    conn = mysql.connector.connect(
        host="localhost",
        user="stadvdb",
        password="admin123",
        database="h01_dw"
    )
    cursor = conn.cursor()

    cursor.execute(f"TRUNCATE TABLE {table_name};")

    # Replace NaN with None (important!)
    df = df.where(pd.notnull(df), None)

    cols = ", ".join([col for col in df.columns if pd.notna(col) and col != ""])
    placeholders = ", ".join(["%s"] * len(df.columns))
    insert_stmt = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"

    print(f"DEBUG: INSERT INTO {table_name} ({cols}) VALUES (...)")
    print(f"DEBUG Shape: {df.shape}, First Row: {df.iloc[0].to_list()}")

    data = [tuple(row) for row in df.to_numpy()]
    cursor.executemany(insert_stmt, data)

    conn.commit()
    conn.close()
    print(f"✅ Loaded {len(df)} rows into {table_name}")


# ---------- Main ETL ----------
if __name__ == "__main__":
    # Tables in employees schema
    tables = ["employees", "departments", "dept_emp", "dept_manager", "salaries", "titles"]

    # Load data into data warehouse (h01_dw)
    for table in tables:
        print(f"Processing table: {table}")
        df = extract_table(table)
        load_table(df, table)

    # Convert date to MySQL-friendly format (YYYY-MM-DD)
    csv_folder = "../h01_dbs"
    for file, table in csv_table_map.items():
        file_path = os.path.join(csv_folder, file)
        if os.path.exists(file_path):
            print(f"Processing CSV: {file} -> {table}")
            csv_df = extract_from_csv(file_path)
            
            if table == "ho1data_go_dailysales":
                csv_df.rename(columns={"date": "dailysales_date"}, inplace=True)
                csv_df = csv_df[[
                    "retailer_code",
                    "product_number",
                    "order_method_code",
                    "dailysales_date",
                    "quantity",
                    "unit_price",
                    "unit_sale_price"
                ]]

            
            print(f"✅ Final columns for {table}: {list(csv_df.columns)}")
            print(f"Sample row:\n{csv_df.head(1)}\n")
            
            load_table(csv_df, table)
        else:
            print(f"⚠️ Warning: File {file} not found, skipping.")  

    print("✅ All tables from employees schema have been loaded into h01_dw!")
