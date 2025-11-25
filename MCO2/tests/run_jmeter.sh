# chmod +x tests/run_jmeter.sh

#!/bin/sh

LOCK_FILE="/results/tests_completed.lock"

# 1. Check if tests already ran
if [ -f "$LOCK_FILE" ]; then
    echo "✅ Load tests already completed. Skipping."
    exit 0
fi

echo "⏳ Waiting 10s for Backend to fully initialize..."
sleep 10

echo "🚀 Starting JMeter Load Tests..."

# Define the target host (Docker Service Name)
# We override the JMX 'Server Name' property dynamically using -J
TARGET_HOST="backend"
TARGET_PORT="5001"

# --- Test 1: Mixed Cart ---
echo ">> Running Mixed Cart Deadlock Test..."
jmeter -n -t /tests/mixed_cart_deadlock.jmx \
    -Jhostname=$TARGET_HOST -Jport=$TARGET_PORT \
    -l /results/mixed_cart.jtl -e -o /results/report_mixed_cart

# --- Test 2: Flash Sale ---
echo ">> Running Flash Sale Test..."
jmeter -n -t /tests/flash_sale_oltp_integrity.jmx \
    -Jhostname=$TARGET_HOST -Jport=$TARGET_PORT \
    -l /results/flash_sale.jtl -e -o /results/report_flash_sale

# --- Test 3: Batch Updates ---
echo ">> Running Batch Updates Test..."
jmeter -n -t /tests/real-batch-updates.jmx \
   -Jhostname=$TARGET_HOST -Jport=$TARGET_PORT \
   -l /results/batch_updates.jtl -e -o /results/report_batch_updates

# 4. Create Lock File
echo "✅ All tests finished. Reports generated in ./results folder."
touch "$LOCK_FILE"