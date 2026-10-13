#!/usr/bin/env bash
# Source from root-owned production scripts; never source the secrets file.
set -Eeuo pipefail
DEPLOY_DIR=/opt/containers/wardrobe
if [[ $EUID != 0 ]]; then echo 'Run through sudo.' >&2; exit 1; fi
cd "$DEPLOY_DIR"
[[ $(stat -c %u .) == 0 ]] || { echo 'Deployment directory must belong to root.' >&2; exit 1; }
directory_mode=$(stat -c %a .)
(( (8#$directory_mode & 022) == 0 )) || { echo 'Deployment directory is writable by another user.' >&2; exit 1; }
for file in .env compose.production.yaml; do
  [[ -f $file && ! -L $file && $(stat -c %u "$file") == 0 ]] || { echo 'Untrusted deployment configuration.' >&2; exit 1; }
  mode=$(stat -c %a "$file")
  (( (8#$mode & 022) == 0 )) || { echo 'Deployment configuration is writable by another user.' >&2; exit 1; }
done
[[ $(stat -c %a .env) == 600 ]] || { echo 'Secrets file must have mode 0600.' >&2; exit 1; }
if [[ -z ${APP_VERSION:-} && -f current-release ]]; then
  APP_VERSION=$(cat current-release)
  [[ $APP_VERSION =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid current release.' >&2; exit 1; }
  export APP_VERSION
fi
compose() { docker compose --env-file "$DEPLOY_DIR/.env" -f "$DEPLOY_DIR/compose.production.yaml" "$@"; }
