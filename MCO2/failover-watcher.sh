#!/bin/bash
set -e

PRIMARY_HOST=$1    # e.g., db
PGDATA=$2         # e.g., /var/lib/postgresql/data
REPL_USER=${REPL_USER:-replicator}
REPL_PASS=${REPL_PASS:-replica_pass}

echo "$(date) - Starting failover watcher. Monitoring primary: $PRIMARY_HOST"

while true; do
    # Check if primary is alive
    if ! pg_isready -h "$PRIMARY_HOST" -U postgres > /dev/null 2>&1; then
        echo "$(date) - Primary $PRIMARY_HOST is down. Promoting standby..."

        # Promote the standby to primary
        export PGPASSWORD=$REPL_PASS
        pg_ctl -D "$PGDATA" promote

        echo "$(date) - Standby promoted successfully."
        exit 0
    fi
    sleep 5
done
