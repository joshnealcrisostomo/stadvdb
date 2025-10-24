from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time

import requests
import json
import os

STATE_FILE = "last_update.json"

POWER_INDICATORS = [
    'EG.ELC.COAL.ZS', 'EG.ELC.HYRO.ZS', 'EG.ELC.NGAS.ZS',
    'EG.ELC.NUCL.ZS', 'EG.ELC.PETR.ZS', 'EG.ELC.RNEW.ZS'
]

TEMP_URL = "https://cckpapi.worldbank.org/api/v1/cru-x0.5_timeseries_tas_timeseries_annual_1901-2024_mean_historical_cru_ts4.09_mean/PHL?_format=json"

def get_latest_power_update():
    url = "https://data.gov.ph/index/public/resource/power-generation-by-fuel-source,-1990-2020/power-generation-by-fuel-source,-1990-2020/0okfrshp-s8xr-0ysb-xami-n8lhi22vxaxb"

    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options)

    driver.get(url)

    try:
        # Wait up to 10s for the "Updated at:" label to appear
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//label[contains(., 'Updated at:')]"))
        )

        # Once found, grab the date that follows it
        label_elem = driver.find_element(By.XPATH, "//label[contains(., 'Updated at:')]")
        date_elem = label_elem.find_element(By.XPATH, "following-sibling::label[@class='group-title']")
        updated_text = date_elem.text.strip()

        driver.quit()
        return updated_text

    except Exception as e:
        print(f"⚠️ Power dataset check failed: {e}")
        driver.save_screenshot("debug_power.png")
        driver.quit()
        return None

def get_latest_world_power_update():
    """Get the most recent available year across all power indicators."""
    latest_year = None
    for ind in POWER_INDICATORS:
        url = f"https://api.worldbank.org/v2/country/all/indicator/{ind}?format=json&per_page=1&page=1"
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            year = int(data[1][0]["date"])
            if not latest_year or year > latest_year:
                latest_year = year
        except (requests.exceptions.RequestException, KeyError, IndexError, ValueError) as e:
            print(f"⚠️ Skipping {ind}: {e}")
            continue
    return str(latest_year) if latest_year else None


def get_latest_temp_update():
    """Get latest year from temperature dataset (uses 'PHL' keys like '2024-07')."""
    try:
        r = requests.get(TEMP_URL, timeout=10)
        r.raise_for_status()
        data = r.json()
        years = [int(k.split("-")[0]) for k in data["data"]["PHL"].keys()]
        return str(max(years))
    except (requests.exceptions.RequestException, ValueError, KeyError) as e:
        print(f"⚠️ Temperature fetch failed: {e}")
        return None


def load_state():
    return json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def main():
    state = load_state()
    updated = False

    latest_power = get_latest_power_update()
    if latest_power and state.get("power") != latest_power:
        print(f"🔄 Power dataset updated: {state.get('power')} → {latest_power}")
        state["power"] = latest_power
        updated = True
        print("-" * 80)
        print('\n')
        print('\n')
        print("Please download the latest power dataset manually here:")
        print("https://data.gov.ph/index/public/resource/power-generation-by-fuel-source,-1990-2020/")
        print('\n')
        print('\n')
        print("-" * 80)
    else:
        print(f"✅ Power dataset up to date ({latest_power})")

    latest_world_power = get_latest_world_power_update()
    if latest_world_power and state.get("world_power") != latest_world_power:
        print(f"🔄 World Power dataset updated: {state.get('world_power')} → {latest_world_power}")
        state["world_power"] = latest_world_power
        updated = True
    else:
        print(f"✅ World Power dataset up to date ({latest_world_power})")

    latest_temp = get_latest_temp_update()
    if latest_temp and state.get("temperature") != latest_temp:
        print(f"🔄 Temperature dataset updated: {state.get('temperature')} → {latest_temp}")
        state["temperature"] = latest_temp
        updated = True
    else:
        print(f"✅ Temperature dataset up to date ({latest_temp})")

    if updated:
        print("🚀 Running ETL process...")
        os.system("python ETL_optimized.py") 
        save_state(state)
    else:
        print("No updates detected. ETL not triggered.")


if __name__ == "__main__":
    main()
