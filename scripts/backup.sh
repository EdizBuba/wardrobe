#!/bin/sh
set -eu
# Run from the deployment directory. Set BACKUP_DIR to a protected directory.
backup_dir="${BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
# Stop writers before both snapshots; restart even when a backup command fails.
docker compose -f compose.production.yaml stop app
trap 'docker compose -f compose.production.yaml start app' EXIT
docker compose -f compose.production.yaml exec -T postgres pg_dump -U wardrobe -d wardrobe -Fc > "$backup_dir/database-$stamp.dump"
docker compose -f compose.production.yaml run --rm --no-deps --user root --entrypoint tar app -C /app/media -czf - . > "$backup_dir/media-$stamp.tar.gz"
docker compose -f compose.production.yaml start app
trap - EXIT
printf 'Backup complete: %s\n' "$stamp"
