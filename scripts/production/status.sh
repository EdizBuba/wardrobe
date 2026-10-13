#!/usr/bin/env bash
set -Eeuo pipefail
source /opt/containers/wardrobe/scripts/common.sh
echo "Status: $(date -u +%FT%TZ)"
uptime
free -h
df -h / /var/lib/docker
compose ps
docker stats --no-stream --format '{{.Name}} CPU={{.CPUPerc}} memory={{.MemUsage}}'
curl --fail --silent --show-error --max-time 15 https://wardrobe.ediz-buba.com/api/health
echo
used=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
((used < 85)) || { echo 'ALERT: root filesystem exceeds 85%.' >&2; exit 1; }
latest=$(find "$DEPLOY_DIR/backups" -mindepth 2 -maxdepth 2 -name COMPLETE -mmin -1560 -print -quit)
[[ -n $latest ]] || { echo 'ALERT: no completed backup within 26 hours.' >&2; exit 1; }
