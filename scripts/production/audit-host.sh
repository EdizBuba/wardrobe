#!/usr/bin/env bash
# Read-only audit. Do not print environment variables, authorized keys or credentials.
set -eu
cat /etc/os-release
id
sudo -n true
uname -r
nproc
free -h
df -h
sudo ss -lntup
systemctl --no-pager --type=service --state=running
sudo /usr/sbin/sshd -T | sed -n '/^port /p;/^permitrootlogin /p;/^passwordauthentication /p;/^pubkeyauthentication /p;/^kbdinteractiveauthentication /p'
if command -v ufw >/dev/null; then sudo ufw status verbose; fi
if command -v docker >/dev/null; then
  sudo docker version
  sudo docker compose version
  sudo docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
fi
apt list --upgradable 2>/dev/null
if [[ -f /var/run/reboot-required ]]; then echo 'A reboot is required.'; fi
