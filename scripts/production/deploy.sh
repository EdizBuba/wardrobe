#!/usr/bin/env bash
set -Eeuo pipefail
source /opt/containers/wardrobe/scripts/common.sh
[[ $# == 1 && $1 =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected one full Git commit SHA.' >&2; exit 2; }
release=$1
exec 9>/run/lock/wardrobe.lock
flock -w 600 9
umask 077
export APP_VERSION=$release
export APP_IMAGE=ghcr.io/edizbuba/wardrobe MIGRATION_IMAGE=ghcr.io/edizbuba/wardrobe-migrate
compose config --quiet
# Both application and migration images must come from this release.
compose pull app migrate
for image in "ghcr.io/edizbuba/wardrobe:$release" "ghcr.io/edizbuba/wardrobe-migrate:$release"; do
  revision=$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ $revision == "$release" ]] || { echo 'Image revision does not match requested release.' >&2; exit 1; }
done
previous=''
if [[ -f current-release ]]; then previous=$(cat current-release); fi
if [[ -n $previous && ! $previous =~ ^[0-9a-f]{40}$ ]]; then echo 'Invalid previous release.' >&2; exit 1; fi
new_schema=$(docker image inspect "$MIGRATION_IMAGE:$release" --format '{{index .Config.Labels "io.wardrobe.migrations"}}')
[[ $new_schema =~ ^[0-9a-f]{64}$ ]] || { echo 'Missing migration manifest digest.' >&2; exit 1; }
old_schema=''
if [[ -n $previous ]]; then
  old_schema=$(docker image inspect "$MIGRATION_IMAGE:$previous" --format '{{index .Config.Labels "io.wardrobe.migrations"}}')
fi
if [[ $new_schema != "$old_schema" ]]; then
  approval="/etc/wardrobe/migration-approvals/$release"
  [[ -f $approval && ! -L $approval && $(stat -c %u "$approval") == 0 && $(stat -c %a "$approval") == 600 ]] || {
    echo 'Migration changes require a root-owned approval after SQL review and recovery planning.' >&2; exit 1;
  }
fi
compose up -d --wait postgres
# Backup owns the same lock; release it before invoking backup, then verify state.
# Even the initial database is backed up before its first migration.
flock -u 9
APP_VERSION=${previous:-$release} /opt/containers/wardrobe/scripts/backup.sh
flock -w 600 9
actual_previous=''
if [[ -f current-release ]]; then actual_previous=$(cat current-release); fi
[[ $actual_previous == "$previous" ]] || { echo 'Another release was deployed; retry.' >&2; exit 1; }
restore_previous() {
  if [[ -n $previous ]]; then
    echo 'Restoring previous application image; database migrations are not undone.' >&2
    APP_VERSION=$previous compose up -d --no-deps --wait --wait-timeout 120 app || true
  fi
}
trap restore_previous ERR
compose stop -t 30 app
# Only expand/contract migrations compatible with the previous release are allowed.
# Review migration SQL before publishing; destructive changes require maintenance approval.
compose run --rm -T migrate
compose up -d --no-deps --wait --wait-timeout 180 app
compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
printf '%s\n' "$release" > current-release.tmp
mv current-release.tmp current-release
trap - ERR
echo "Deployed release: $release"
