#!/bin/sh
set -eu
# Compatibility entry point. The installed script resolves the active image SHA,
# handles consistent snapshots, retention and optional encrypted offsite storage.
exec /opt/containers/wardrobe/scripts/backup.sh "$@"
