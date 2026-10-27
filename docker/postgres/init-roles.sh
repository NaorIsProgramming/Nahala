#!/bin/bash
# Runs only when the data volume is empty. The official Postgres image
# skips /docker-entrypoint-initdb.d once the volume already holds a cluster.
# A later password or privilege change needs a new migration, not an edit here.
#
# Passwords are passed into psql as quoted variables (:'name'). They are not
# written into this file and are not concatenated into SQL text.

set -euo pipefail

: "${NAHALA_APP_PASSWORD:?NAHALA_APP_PASSWORD is required}"
: "${NAHALA_MIGRATOR_PASSWORD:?NAHALA_MIGRATOR_PASSWORD is required}"

# \getenv reads the container environment into a psql variable. :'name'
# then passes it as a quoted literal. The values are not process arguments.
psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  <<'SQL'
\getenv app_password NAHALA_APP_PASSWORD
\getenv migrator_password NAHALA_MIGRATOR_PASSWORD
CREATE ROLE nahala_migrator WITH LOGIN NOSUPERUSER PASSWORD :'migrator_password';
CREATE ROLE nahala_app WITH LOGIN NOSUPERUSER PASSWORD :'app_password';
CREATE DATABASE nahala OWNER nahala_migrator;
SQL

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname nahala \
  <<'SQL'
ALTER SCHEMA public OWNER TO nahala_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO nahala_migrator;
GRANT USAGE ON SCHEMA public TO nahala_app;

REVOKE ALL ON DATABASE nahala FROM PUBLIC;
GRANT CONNECT ON DATABASE nahala TO nahala_migrator;
GRANT CONNECT ON DATABASE nahala TO nahala_app;

-- Default privileges apply to the role that creates the object. The
-- migrator creates tables later; the app role only gets row access.
ALTER DEFAULT PRIVILEGES FOR ROLE nahala_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nahala_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nahala_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nahala_app;
SQL
