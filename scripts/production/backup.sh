#!/usr/bin/env bash
set -Eeuo pipefail
source /opt/containers/wardrobe/scripts/common.sh
mkdir -p /opt/containers/wardrobe/backups
chmod 700 /opt/containers/wardrobe/backups
exec 9>/run/lock/wardrobe.lock
flock -w 600 9
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot=$(mktemp -d "$DEPLOY_DIR/backups/incomplete-$stamp-XXXXXX")
running=$(compose ps --status running --services app)
restart_writer() { if [[ $running == app ]]; then compose start app >/dev/null; fi; }
trap restart_writer EXIT
if [[ $running == app ]]; then compose stop -t 30 app >/dev/null; fi
compose exec -T postgres pg_dump -U wardrobe -d wardrobe -Fc > "$snapshot/database.dump"
compose run --rm --no-deps -T --entrypoint tar app -C /app/media -czf - . > "$snapshot/media.tar.gz"
tar -tzf "$snapshot/media.tar.gz" >/dev/null
image=$(compose images -q app | head -n 1)
if [[ -n $image ]]; then
  docker image inspect "$image" --format '{{.Id}}' > "$snapshot/app-image.txt"
else
  printf 'Initial database snapshot before first application deployment\n' > "$snapshot/app-image.txt"
fi
(cd "$snapshot"; sha256sum database.dump media.tar.gz app-image.txt > SHA256SUMS)
touch "$snapshot/COMPLETE"
mv "$snapshot" "$DEPLOY_DIR/backups/$stamp"
restart_writer
trap - EXIT
echo "Local backup completed: $stamp"
# External repository credentials and password are installed separately, root-only.
if [[ -f /etc/wardrobe/restic.env ]]; then
  [[ ! -L /etc/wardrobe/restic.env && $(stat -c %u /etc/wardrobe/restic.env) == 0 && $(stat -c %a /etc/wardrobe/restic.env) == 600 ]] || {
    echo 'Untrusted restic configuration.' >&2; exit 1;
  }
  set -a
  source /etc/wardrobe/restic.env
  set +a
  restic backup --tag wardrobe "$DEPLOY_DIR/backups/$stamp" --quiet
  restic forget --tag wardrobe --group-by host,tags --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune --quiet
  echo "Encrypted offsite upload completed: $stamp (restore verification is separate)"
else
  echo 'WARNING: no offsite repository configured; local backup only.' >&2
fi
# Retain the seven newest complete local snapshots; never touch incomplete/unknown files.
mapfile -t snapshots < <(find "$DEPLOY_DIR/backups" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' | sort -r)
for ((i=7; i<${#snapshots[@]}; i++)); do
  candidate=${snapshots[$i]}
  if [[ ${candidate##*/} =~ ^20[0-9]{6}T[0-9]{6}Z$ && -f $candidate/COMPLETE && $(realpath "$candidate") == "$DEPLOY_DIR/backups/"* && ! -L $candidate ]]; then
    rm -rf -- "$candidate"
  fi
done
