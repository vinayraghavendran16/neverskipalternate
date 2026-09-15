#!/bin/sh
set -eu
: "${AUDIT_DATABASE_URL:?Set AUDIT_DATABASE_URL to an empty disposable PostgreSQL database}"
: "${CONFIRM_DISPOSABLE_DATABASE:?Set CONFIRM_DISPOSABLE_DATABASE=yes after verifying this is disposable}"
if [ "$CONFIRM_DISPOSABLE_DATABASE" != "yes" ]; then
  echo "Refusing to modify a database that was not explicitly confirmed disposable." >&2
  exit 2
fi
existing_tables=$(psql "$AUDIT_DATABASE_URL" -X -Atqc "select count(*) from pg_catalog.pg_tables where schemaname not in ('pg_catalog','information_schema')")
if [ "$existing_tables" != "0" ]; then
  echo "Refusing to run against a non-empty database." >&2
  exit 2
fi
psql "$AUDIT_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/database/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql "$AUDIT_DATABASE_URL" -X -v ON_ERROR_STOP=1 -1 -f "$migration"
done
psql "$AUDIT_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/database/regression.sql
