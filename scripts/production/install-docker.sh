#!/usr/bin/env bash
# Run only after the host audit. Does not uninstall existing packages or reset data.
set -Eeuo pipefail
[[ $EUID == 0 ]] || { echo 'Run through sudo.' >&2; exit 1; }
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 26.04 ]] || { echo 'This installer was reviewed for Ubuntu 26.04 only.' >&2; exit 1; }
if command -v docker >/dev/null; then
  echo 'Docker already exists: audit its installation before upgrading.' >&2
  exit 1
fi
for package in docker.io docker-compose docker-compose-v2 podman-docker containerd runc; do
  if dpkg-query -W -f='${db:Status-Status}' "$package" 2>/dev/null | grep -qx installed; then
    echo "Conflicting package present: $package. No packages were removed." >&2
    exit 1
  fi
done
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error --location https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod 0644 /etc/apt/keyrings/docker.asc
codename=${UBUNTU_CODENAME:-$VERSION_CODENAME}
[[ $codename == resolute ]] || { echo 'Unexpected Ubuntu codename.' >&2; exit 1; }
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $codename
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker version
docker compose version
docker run --rm hello-world
# No user is added to the root-equivalent docker group.
