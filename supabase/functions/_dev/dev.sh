#!/bin/bash
# Local test stack for EV's edge functions: Postgres 16 + PostgREST + a gateway that fakes Supabase auth/storage,
# the Meta Model API and SerpApi. No keys, no Docker. See README.md.
#   ./dev.sh setup            # once: init Postgres in $QB_DEV_DIR, apply prelude + migrations, fetch PostgREST
#   ./dev.sh start [mode]     # (re)start gateway + functions. mode: good|messy|garbage|slow|down (fake LLM behaviour)
#   ./dev.sh seed             # reset data: 4-member fellowship in Austin + 1 outsider
#   ./dev.sh loop [demo|llm]  # play a whole book + sequel, prints ok/FAIL
# Env: LLM_KEY= / SERP_KEY= (empty) simulate missing secrets; FORCE=1 sets DEMO_FORCE_PASS.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; FN="$(cd "$HERE/.." && pwd)"; ROOT="$(cd "$FN/../.." && pwd)"
DIR=${QB_DEV_DIR:-/var/lib/postgresql/qb-dev}; mkdir -p "$DIR"
DENO=${DENO:-deno}; PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
SECRET="local-test-secret-local-test-secret-123456"
q() { psql -h "$DIR" -p 54329 -U postgres -d qb -q "$@"; }
case "$1" in
  setup)
    chown postgres "$DIR" 2>/dev/null || true
    [ -d "$DIR/data" ] || su postgres -c "$PGBIN/initdb -D $DIR/data -A trust -U postgres" >/dev/null
    su postgres -c "$PGBIN/pg_ctl -D $DIR/data -o '-p 54329 -k $DIR' -l $DIR/pg.log start" || true; sleep 2
    psql -h "$DIR" -p 54329 -U postgres -qc "create database qb" || true
    q -f "$HERE/prelude.sql"; for f in "$ROOT"/supabase/migrations/*.sql; do q -f "$f"; done
    q -c "grant select on all tables in schema public to authenticated"
    [ -x "$DIR/postgrest" ] || (cd "$DIR" && curl -sSL https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz | tar xJ)
    printf 'db-uri = "postgres://postgres@/qb?host=%s&port=54329"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "%s"\nserver-port = 54330\n' "$DIR" "$SECRET" > "$DIR/pgrst.conf"
    echo "setup done" ;;
  start)
    for pid in $(pgrep -f "qb-dev-fn|$HERE/gateway.ts"); do kill $pid 2>/dev/null || true; done; sleep 1
    pgrep -f "postgrest $DIR/pgrst.conf" >/dev/null || (nohup "$DIR/postgrest" "$DIR/pgrst.conf" > "$DIR/pgrst.log" 2>&1 &)
    export JWT_SECRET=$SECRET FN_PORTS="generate-storyline=8101,submit-proof=8102,reroll-mission=8103"
    STORE_DIR="$DIR/store" LLM_MODE=${2:-good} nohup $DENO run -A "$HERE/gateway.ts" > "$DIR/gateway.log" 2>&1 &
    sleep 1.5; SRK=$(curl -s "http://127.0.0.1:54321/__sign?role=service_role")
    for kv in ${FN_PORTS//,/ }; do name=${kv%=*}; port=${kv#*=}
      SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=$SRK LLM_API_KEY=${LLM_KEY-fake} LLM_BASE_URL=http://127.0.0.1:54321/llm/v1 \
      SERPAPI_KEY=${SERP_KEY-fake} SERPAPI_BASE_URL=http://127.0.0.1:54321/serp DEMO_FORCE_PASS=${FORCE:-0} PORT=$port \
      nohup $DENO run -A "$HERE/launch.ts" "file://$FN/$name/index.ts" qb-dev-fn > "$DIR/fn-$name.log" 2>&1 &
    done; sleep 3; echo "started (logs in $DIR)" ;;
  seed) q -f "$HERE/seed.sql" 2>&1 | grep -v NOTICE || true ;;
  loop) $DENO run -A "$HERE/loop.ts" "${2:-demo}" ;;
  *) sed -n 2,9p "$0" ;;
esac
