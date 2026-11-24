#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."
fixture="$(mktemp -d /tmp/mythoria-growth.XXXXXX)"
pg_bin="${GROWTH_FIXTURE_PG_BIN:-$(pg_config --bindir)}"
port="$(node -e 'const s=require("node:net").createServer().listen(0,"127.0.0.1",()=>{ console.log(s.address().port); s.close(); });')"
cleanup() {
  if [[ -f "$fixture/pgdata/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$fixture/pgdata" -m fast -w stop; fi
}
trap cleanup EXIT
"$pg_bin/initdb" --no-locale -E UTF8 -A trust -U fixture -D "$fixture/pgdata" > "$fixture/init.log"
"$pg_bin/pg_ctl" -D "$fixture/pgdata" -l "$fixture/postgres.log" -o "-h 127.0.0.1 -k $fixture -p $port" -w start
export DB_HOST=127.0.0.1 DB_NAME=mythoria_growth_isolated_test DB_USER=fixture DB_PASSWORD=fixture DB_PORT="$port"
export GROWTH_MEASUREMENT_V2_ENABLED=true NODE_ENV=development
unset DATABASE_URL NEXT_PHASE
"$pg_bin/createdb" -h "$fixture" -p "$port" -U "$DB_USER" "$DB_NAME"
if [[ -n "${GROWTH_MIGRATION_BASE:-}" ]]; then
  repo="$PWD"
  mkdir "$fixture/baseline"
  git archive "$GROWTH_MIGRATION_BASE" | tar -x -C "$fixture/baseline"
  ln -s "$repo/node_modules" "$fixture/baseline/node_modules"
  (
    cd "$fixture/baseline"
    DRIZZLE_ENV_FILE="$fixture/no-env" npm run db:push -- --force
  ) > "$fixture/schema.log" 2>&1
  "$pg_bin/psql" -X -v ON_ERROR_STOP=1 --single-transaction -h "$fixture" -p "$port" -U "$DB_USER" -d "$DB_NAME" \
    -f drizzle/0053_analytics_privacy_growth_v2.sql > "$fixture/migration.log"
else
  DRIZZLE_ENV_FILE="$fixture/no-env" npm run db:push -- --force > "$fixture/schema.log" 2>&1
fi
node --import tsx scripts/analytics/growth-v2-fixture.ts
"$pg_bin/psql" -X -At -v ON_ERROR_STOP=1 -h "$fixture" -p "$port" -U "$DB_USER" -d "$DB_NAME" \
  -v from='2020-01-01T00:00:00Z' -v cutoff='2100-01-01T00:00:00Z' -v timezone='Europe/Lisbon' \
  -f scripts/analytics/growth-v2.sql > "$fixture/report.txt"
rg -q '^first_option_opened\|document\|1$' "$fixture/report.txt"
rg -q '^[a-f0-9]{12}\|EUR\|1\|1700\|500\|0\|1200$' "$fixture/report.txt"
rg -q '^\|payment\|completed\|7$' "$fixture/report.txt"
cat "$fixture/report.txt"
printf 'Fixture logs: %s\n' "$fixture"
