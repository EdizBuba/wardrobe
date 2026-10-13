#!/usr/bin/env bash
# CI-only disposable infrastructure. These credentials are public test fixtures.
set -Eeuo pipefail
[[ $# == 1 && $1 =~ ^[0-9a-f]{40}$ ]] || exit 2
sha=$1
cleanup() {
  docker rm -f wardrobe-smoke-app wardrobe-smoke-db >/dev/null 2>&1 || true
  docker network rm wardrobe-smoke >/dev/null 2>&1 || true
  docker volume rm wardrobe-smoke-media wardrobe-smoke-cache >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create wardrobe-smoke >/dev/null
docker run -d --name wardrobe-smoke-db --network wardrobe-smoke --network-alias postgres -e POSTGRES_USER=wardrobe -e POSTGRES_DB=wardrobe -e POSTGRES_PASSWORD=ci-only-test postgres:18 >/dev/null
ready=false
for ((i=0; i<60; i++)); do
  if docker exec wardrobe-smoke-db pg_isready -U wardrobe -d wardrobe >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
$ready || { echo 'Smoke database startup failed.' >&2; exit 1; }
database=postgresql://wardrobe:ci-only-test@postgres:5432/wardrobe
docker run --rm --network wardrobe-smoke -e "DATABASE_URL=$database" "ghcr.io/edizbuba/wardrobe-migrate:$sha"
docker run -d --name wardrobe-smoke-app --network wardrobe-smoke -p 127.0.0.1:3100:3000 --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /tmp:rw,noexec,nosuid,size=64m,uid=1000,gid=1000 --mount type=volume,source=wardrobe-smoke-media,target=/app/media --mount type=volume,source=wardrobe-smoke-cache,target=/app/.next/cache -e "DATABASE_URL=$database" -e BETTER_AUTH_SECRET=ci-only-container-smoke-secret-at-least-32-characters -e BETTER_AUTH_URL=https://wardrobe.example.invalid -e EMAIL_PROVIDER=smtp -e SMTP_URL=smtps://smtp.example.invalid:465 -e EMAIL_FROM=smoke@example.invalid "ghcr.io/edizbuba/wardrobe:$sha" >/dev/null
healthy=false
for ((i=0; i<90; i++)); do
  if curl --fail --silent http://127.0.0.1:3100/api/health >/dev/null; then healthy=true; break; fi
  sleep 2
done
if ! $healthy; then docker logs --tail=100 wardrobe-smoke-app; exit 1; fi
curl --fail --silent http://127.0.0.1:3100/login >/dev/null
[[ $(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3100/api/v1/locations) == 401 ]]
docker exec wardrobe-smoke-app node -e 'require("sharp")({create:{width:2,height:2,channels:3,background:"#ffffff"}}).webp().toBuffer().then(()=>console.log("Sharp native WebP smoke passed")).catch(()=>process.exit(1))'
echo 'Standalone container, migrations, private API and Sharp smoke passed.'
