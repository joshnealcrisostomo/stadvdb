#!/bin/bash
set -e

echo "Running replication init script..."

# Create replication user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='replicator') THEN
        CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'replica_pass';
    END IF;
END
\$\$;
EOSQL

# Allow replication connections from any container
echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

# Optional: set WAL settings (primary only)
echo "wal_level = replica" >> "$PGDATA/postgresql.conf"
echo "max_wal_senders = 3" >> "$PGDATA/postgresql.conf"
echo "wal_keep_size = 256MB" >> "$PGDATA/postgresql.conf"
echo "hot_standby = on" >> "$PGDATA/postgresql.conf"

echo "Replication init script completed."
