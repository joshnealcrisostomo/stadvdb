#!/bin/sh
set -e

echo "Running replication init script..."

REPL_PASS=${REPL_PASS:-replica_pass}

while [ ! -f "$PGDATA/pg_hba.conf" ]; do
    echo "Waiting for Postgres to create pg_hba.conf..."
    sleep 1
done
# Create replication user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='replicator') THEN
        CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD '$REPL_PASS';
    END IF;
END
\$\$;
EOSQL

# Allow replication connections
grep -qxF "host replication replicator 0.0.0.0/0 md5" "$PGDATA/pg_hba.conf" || \
echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

# Set WAL settings
grep -qxF "wal_level = replica" "$PGDATA/postgresql.conf" || echo "wal_level = replica" >> "$PGDATA/postgresql.conf"
grep -qxF "max_wal_senders = 3" "$PGDATA/postgresql.conf" || echo "max_wal_senders = 3" >> "$PGDATA/postgresql.conf"
grep -qxF "wal_keep_size = 256MB" "$PGDATA/postgresql.conf" || echo "wal_keep_size = 256MB" >> "$PGDATA/postgresql.conf"
grep -qxF "hot_standby = on" "$PGDATA/postgresql.conf" || echo "hot_standby = on" >> "$PGDATA/postgresql.conf"

echo "Replication init script completed."
