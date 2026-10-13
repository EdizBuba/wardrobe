#!/usr/bin/env bash
# Non-destructive drill: a temporary database, no ports, no production volume writes.
set -Eeuo pipefail
source /opt/containers/wardrobe/scripts/common.sh
[[ $# == 1 && $1 =~ ^20[0-9]{6}T[0-9]{6}Z$ ]] || { echo 'Expected a completed backup timestamp.' >&2; exit 2; }
snapshot="$DEPLOY_DIR/backups/$1"
[[ -f $snapshot/COMPLETE && ! -L $snapshot ]] || { echo 'Incomplete or missing backup.' >&2; exit 1; }
(cd "$snapshot"; sha256sum -c SHA256SUMS)
tar -tzf "$snapshot/media.tar.gz" >/dev/null
name="wardrobe-restore-check-$(date +%s)-$$"
umask 077
password_file=$(mktemp /run/wardrobe-restore-password.XXXXXX)
openssl rand -hex 32 > "$password_file"
docker volume create "$name" >/dev/null
cleanup() {
  # Names are generated locally with a fixed prefix, never taken from user input.
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name" >/dev/null 2>&1 || true
  rm -f -- "$password_file"
}
trap cleanup EXIT
docker run -d --name "$name" --network none --mount "type=volume,source=$name,target=/var/lib/postgresql" --mount "type=bind,source=$password_file,target=/run/secrets/postgres-password,readonly" -e POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password -e POSTGRES_USER=wardrobe -e POSTGRES_DB=wardrobe postgres:18 >/dev/null
ready=false
for ((i=0; i<60; i++)); do
  if docker exec "$name" pg_isready -U wardrobe -d wardrobe >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
$ready || { echo 'Restore database did not start.' >&2; exit 1; }
docker exec -i "$name" pg_restore -U wardrobe -d wardrobe --exit-on-error --no-owner < "$snapshot/database.dump"
docker exec "$name" psql -U wardrobe -d wardrobe -Atc 'SELECT count(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';'
docker exec "$name" mkdir -p /restore-media
docker exec -i "$name" tar -xzf - -C /restore-media < "$snapshot/media.tar.gz"
docker exec "$name" sh -c 'find /restore-media -type f -exec sha256sum {} + >/dev/null; find /restore-media -type f | wc -l'
echo 'Database restoration and media archive checks succeeded in isolation.'
echo 'This verifies a local backup; download and test an offsite snapshot separately.'
