#!/usr/bin/env bash
set -euo pipefail
umask 077

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ "${1:-}" != --fixture-child ]]; then
  pg_bin="${E2E_PG_BIN:-$(pg_config --bindir 2>/dev/null || true)}"
  if [[ ! -x "$pg_bin/initdb" ]] && command -v brew >/dev/null; then
    pg_bin="$(brew --prefix postgresql@17 2>/dev/null)/bin"
  fi
  [[ -x "$pg_bin/initdb" ]] || { echo 'Set E2E_PG_BIN to a local PostgreSQL bin directory.' >&2; exit 1; }
  [[ -x "$repo/node_modules/.bin/playwright" ]] || { echo 'Run npm ci first.' >&2; exit 1; }
  fixture="$(mktemp -d "/tmp/mythoria-playwright.XXXXXX")"
  printf 'Playwright fixture artifacts: %s\n' "$fixture"
  if [[ "$(uname -s)" == Darwin ]]; then
    browser_cache="$HOME/Library/Caches/ms-playwright"
  else
    browser_cache="${XDG_CACHE_HOME:-$HOME/.cache}/ms-playwright"
  fi
  exec env -i LC_ALL=C PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$browser_cache}" PATH="$PATH" HOME="$fixture" E2E_PG_BIN="$pg_bin" \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" \
    RUN_ANALYTICS_NETWORK_AUDIT="${RUN_ANALYTICS_NETWORK_AUDIT:-0}" \
    NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID="${NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID:-}" \
    bash "$0" --fixture-child "$fixture" "$@"
fi
shift
fixture="$1"
shift

cd "$fixture"
mkdir -p socket
rsync -a --exclude='__pycache__' --exclude='.auth' --exclude='.env*' --exclude='.venv' "$repo"/{src,scripts,public,tests} .
cp "$repo"/{package.json,package-lock.json,public-asset-aliases.json,next.config.ts,postcss.config.mjs,tailwind.config.ts,tsconfig.json,env.manifest.ts,playwright.config.ts,drizzle.config.ts,jest.setup.ts} .
# Reserve distinct loopback ports, then require both local listeners to start successfully.
select_port() {
  node -e 'const server = require("node:net").createServer().listen(0,"127.0.0.1",()=>{ console.log(server.address().port); server.close(); })'
}
DB_PORT="$(select_port)"
PORT="$(select_port)"
while [[ "$PORT" == "$DB_PORT" ]]; do PORT="$(select_port)"; done
export DB_PORT PORT
export DB_NAME=mythoria_playwright DB_USER=fixture DB_PASSWORD=local-fixture DB_HOST=127.0.0.1
export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
export PLAYWRIGHT_BASE_URL="http://localhost:$PORT" HOSTNAME=localhost
if [[ "${RUN_ANALYTICS_NETWORK_AUDIT:-0}" == 1 ]]; then
  if [[ ! "${NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID:-}" =~ ^G-[A-Z0-9]+$ ||
    "$NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID" == G-86D0QFW197 ]]; then
    echo 'The network audit requires a separate test measurement ID.' >&2
    exit 1
  fi
  export NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN="$PLAYWRIGHT_BASE_URL"
  export NEXT_PUBLIC_BASE_URL="$PLAYWRIGHT_BASE_URL" NEXT_PUBLIC_GA_DEBUG=true
fi
export NEXT_TELEMETRY_DISABLED=1 CLERK_TELEMETRY_DISABLED=1
export PLAYWRIGHT_CLERK_FIXTURE=1 PLAYWRIGHT_CLERK_TICKET_AUTH=1 REFRESH_AUTH=1
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_$(printf 'clerk.fixture.invalid$' | base64 | tr -d '=')"
export CLERK_SECRET_KEY=sk_live_fixture CLERK_E2E_EMAIL=author@fixture.invalid
export SURVEY_LINK_SECRET=fixture-survey-secret-not-for-production MCP_E2E_BEARER_TOKEN=oat_browser_fixture
export PREMIUM_BOOK_GENERATION_ENABLED=true PREMIUM_BOOK_BUCKET=premium-book-fixture-no-storage
export PLAYWRIGHT_PREMIUM_STORAGE_DIR="$fixture/premium-storage"
export PREMIUM_SQUARE_PRINT_APPROVAL=manual:playwright-fixture
export PRINT_PROOF_BUCKET=print-fixture-no-storage PRINT_INTERNAL_AUDIENCE="$PLAYWRIGHT_BASE_URL"
export PRINT_ADMIN_SERVICE_ACCOUNT=admin@fixture.invalid PRINT_SCHEDULER_SERVICE_ACCOUNT=scheduler@fixture.invalid
export ADMIN_API_URL=https://admin-print.fixture.invalid ADMIN_API_KEY=print-admin-fixture
export STORY_GENERATION_WORKFLOW_API_KEY=print-sgw-fixture NOTIFICATION_ENGINE_API_KEY=print-notification-fixture

cleanup() {
  if [[ -n "${app_pid:-}" ]]; then kill "$app_pid" 2>/dev/null || true; fi
  if [[ -n "${db_started:-}" ]]; then "$E2E_PG_BIN/pg_ctl" -D "$fixture/pgdata" -m fast -w stop; fi
  rm -rf "$fixture"/pgdata "$fixture"/node_modules "$fixture"/.next/cache "$fixture"/.next/standalone
  rm -f "$fixture"/clerk-session.txt "$fixture"/survey.log "$fixture"/tests/playwright/.auth/user.json
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Keep dependency paths inside the fixture so Next.js can trace the standalone build.
rsync -a "$repo/node_modules/" node_modules/

fixture_scripts="$fixture/scripts/playwright-fixture"
"$E2E_PG_BIN/initdb" --no-locale -E UTF8 --auth-local=trust --auth-host=scram-sha-256 \
  --pwfile=<(printf '%s\n' "$DB_PASSWORD") -U "$DB_USER" -D "$fixture/pgdata" > postgres-init.log
"$E2E_PG_BIN/pg_ctl" -D "$fixture/pgdata" -l "$fixture/postgres.log" \
  -o "-h 127.0.0.1 -k $fixture/socket -p $DB_PORT" -w start
db_started=1
"$E2E_PG_BIN/createdb" -h "$fixture/socket" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
export NODE_OPTIONS="--require=$fixture_scripts/network.cjs"
npm run db:push -- --config=drizzle.config.ts --force > db-schema.log 2>&1
"$E2E_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$fixture/socket" -p "$DB_PORT" -U "$DB_USER" \
  -d "$DB_NAME" -f "$fixture_scripts/seed.sql" > database-seed.log
node "$fixture_scripts/premium-book.cjs" > premium-book.sql
"$E2E_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$fixture/socket" -p "$DB_PORT" -U "$DB_USER" \
  -d "$DB_NAME" -f premium-book.sql >> database-seed.log
npm run surveys:publish -- --apply > survey-publish.log 2>&1
npm run surveys:local-test -- --email "$CLERK_E2E_EMAIL" --survey activation_no_story --apply > survey.log 2>&1
export E2E_SURVEY_TOKEN="$(sed -n 's@^Open: .*/survey/@@p' survey.log)"
[[ -n "$E2E_SURVEY_TOKEN" ]]
node --disable-warning=DEP0040 node_modules/next/dist/bin/next build --webpack > build.log 2>&1
cp -R public .next/standalone/
cp -R .next/static .next/standalone/.next/

node "$fixture_scripts/session.cjs"
export CLERK_JWT_KEY="$(cat clerk-public.pem)" CLERK_FIXTURE_SESSION="$(cat clerk-session.txt)"
export NODE_OPTIONS="$NODE_OPTIONS --require=$fixture_scripts/clerk-backend.cjs"
export NODE_OPTIONS="$NODE_OPTIONS --require=$fixture_scripts/premium-storage.cjs"
export NODE_OPTIONS="$NODE_OPTIONS --require=$fixture_scripts/print-admin.cjs"
node .next/standalone/server.js > server.log 2>&1 &
app_pid=$!
for attempt in {1..20}; do
  kill -0 "$app_pid"
  if curl --noproxy '*' -fs --max-time 2 "$PLAYWRIGHT_BASE_URL/robots.txt" >/dev/null; then break; fi
  sleep 1
done
curl --noproxy '*' -fsS --max-time 2 "$PLAYWRIGHT_BASE_URL/robots.txt" >/dev/null
node node_modules/.bin/playwright test --workers=3 "$@"
