#!/usr/bin/env bash
# Reviewed Ubuntu 26.04 host controls; this does not upgrade packages or alter data.
set -Eeuo pipefail
[[ $EUID == 0 && $# == 0 ]] || { echo 'Run through sudo without arguments.' >&2; exit 1; }
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 26.04 ]] || { echo 'Reviewed for Ubuntu 26.04 only.' >&2; exit 1; }
root=$(realpath "$(dirname "${BASH_SOURCE[0]}")/../..")
for user in ubuntu wardrobe-deploy; do id "$user" >/dev/null; done
sshd -t
effective_ssh=$(sshd -T)
grep -qx 'pubkeyauthentication yes' <<< "$effective_ssh"
grep -qx 'passwordauthentication no' <<< "$effective_ssh"
recovery="/root/wardrobe-recovery/security-$(date -u +%Y%m%dT%H%M%SZ)-$$"
install -d -m 0700 "$recovery"
files=(/etc/ssh/sshd_config.d/00-wardrobe-access.conf /etc/fail2ban/jail.d/sshd.local
  /etc/sysctl.d/60-wardrobe-network.conf /etc/docker/daemon.json
  /usr/local/sbin/wardrobe-docker-firewall /etc/systemd/system/wardrobe-docker-firewall.service)
for file in "${files[@]}"; do
  if [[ -e $file ]]; then
    [[ -f $file && ! -L $file && $(stat -c %u "$file") == 0 ]] || { echo 'Untrusted host configuration.' >&2; exit 1; }
    install -d -m 0700 "$recovery$(dirname "$file")"
    cp -a "$file" "$recovery$file"
  fi
done
access=/etc/ssh/sshd_config.d/00-wardrobe-access.conf
cat > "$recovery/rollback-ssh.sh" <<EOF
#!/usr/bin/env bash
set -eu
if [[ ! -f $recovery/verified ]]; then
  if [[ -f $recovery$access ]]; then cp -a $recovery$access $access; else rm -f -- $access; fi
  /usr/sbin/sshd -t
  systemctl reload ssh
fi
EOF
chmod 0700 "$recovery/rollback-ssh.sh"
unit=wardrobe-access-recovery-$$
systemd-run --unit="$unit" --on-active=3m "$recovery/rollback-ssh.sh"
install -m 0644 "$root/infra/security/ssh-access.conf" "$access"
sshd -t
systemctl reload ssh
install -m 0644 "$root/infra/security/fail2ban-sshd.local" /etc/fail2ban/jail.d/sshd.local
if ! fail2ban-client -t; then
  cp -a "$recovery/etc/fail2ban/jail.d/sshd.local" /etc/fail2ban/jail.d/sshd.local
  exit 1
fi
fail2ban-client reload sshd
install -m 0644 "$root/infra/security/network.conf" /etc/sysctl.d/60-wardrobe-network.conf
sysctl -p /etc/sysctl.d/60-wardrobe-network.conf
install -m 0750 "$root/scripts/production/docker-firewall.sh" /usr/local/sbin/wardrobe-docker-firewall
install -m 0644 "$root/infra/systemd/wardrobe-docker-firewall.service" /etc/systemd/system/wardrobe-docker-firewall.service
systemctl daemon-reload
systemctl enable --now wardrobe-docker-firewall.service
python3 - <<'PY'
import json
import os
import tempfile
from pathlib import Path
path = Path('/etc/docker/daemon.json')
settings = json.loads(path.read_text()) if path.exists() else {}
settings['live-restore'] = True
fd, temporary = tempfile.mkstemp(prefix='daemon-', dir=path.parent)
with os.fdopen(fd, 'w') as output:
    json.dump(settings, output, indent=2)
    output.write('\n')
os.chmod(temporary, 0o600)
os.replace(temporary, path)
PY
if ! dockerd --validate --config-file=/etc/docker/daemon.json; then
  if [[ -f $recovery/etc/docker/daemon.json ]]; then
    cp -a "$recovery/etc/docker/daemon.json" /etc/docker/daemon.json
  else
    rm -f -- /etc/docker/daemon.json
  fi
  exit 1
fi
systemctl reload docker
docker info --format 'live_restore={{.LiveRestoreEnabled}}'
echo "Recovery directory: $recovery"
echo "SSH rollback timer: $unit.timer"
echo 'Before three minutes elapse, validate a NEW key-only SSH session and sudo.'
echo "Then touch $recovery/verified and stop $unit.timer."
