#!/usr/bin/env sh
# Smoke test of the image, as Render runs it (ADR 0009, rules 1, 3, 4 and 5): build it, run it on a
# custom PORT in Production against a plain postgres:17, check /health and that the migrations ran,
# then stop the database and check /health still answers. Run from the repo root: sh api/smoke-test.sh
set -eu

PORT=8123
NETWORK=mtf-smoke
DB=mtf-smoke-db
API=mtf-smoke-api
IMAGE=mtf-api:smoke

cleanup() {
  docker rm -f "$API" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

echo "== Building the image"
docker build -t "$IMAGE" api

echo "== Starting postgres:17"
docker network create "$NETWORK" >/dev/null
docker run -d --name "$DB" --network "$NETWORK" \
  -e POSTGRES_USER=mtf -e POSTGRES_PASSWORD=mtf -e POSTGRES_DB=mtf \
  postgres:17 >/dev/null
for i in $(seq 1 30); do
  docker exec "$DB" pg_isready -U mtf -d mtf >/dev/null 2>&1 && break
  [ "$i" -eq 30 ] && { echo "Postgres did not start" >&2; exit 1; }
  sleep 1
done

echo "== Starting the API on PORT=$PORT, in Production, with every setting set"
docker run -d --name "$API" --network "$NETWORK" -p "$PORT:$PORT" \
  -e PORT="$PORT" \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e "ConnectionStrings__DefaultConnection=Host=$DB;Port=5432;Database=mtf;Username=mtf;Password=mtf" \
  -e Jwt__Key=smoke-test-signing-key-at-least-32-chars \
  -e App__FrontendUrl=https://mtf.zynis.com.ar \
  -e App__ApiUrl=https://api.mtf.zynis.com.ar \
  -e Cors__AllowedOrigins__0=https://mtf.zynis.com.ar \
  -e Google__ClientId=smoke-client-id \
  -e Google__ClientSecret=smoke-client-secret \
  -e RESEND_API_KEY=re_smoke_key \
  -e "Email__From=MTF By Zynis <no-reply@zynis.com.ar>" \
  "$IMAGE" >/dev/null

health() {
  curl -fsS --retry 30 --retry-all-errors --retry-delay 1 "http://localhost:$PORT/health"
  echo
}

echo "== /health with the database up"
health || { docker logs "$API"; exit 1; }

echo "== Migrations applied"
migrations=$(docker exec "$DB" psql -U mtf -d mtf -tAc 'SELECT count(*) FROM "__EFMigrationsHistory"')
echo "$migrations migration(s)"
[ "$migrations" -gt 0 ] || { echo "No migrations in __EFMigrationsHistory" >&2; exit 1; }

echo "== /health with the database stopped"
docker stop "$DB" >/dev/null
health || { docker logs "$API"; exit 1; }

echo "== Smoke test passed"
