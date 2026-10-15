#!/usr/bin/env bash
# Docker's iptables backend processes these rules before its published-port rules.
# Never flush Docker/UFW chains or disable forwarding needed by container networks.
set -Eeuo pipefail
[[ $EUID == 0 ]] || { echo 'Run through sudo.' >&2; exit 1; }
chain=WARDROBE-EDGE
mode=apply
interface=''
while (($#)); do
  case $1 in
    --remove) mode=remove; shift ;;
    --interface) [[ $# -ge 2 ]] || exit 2; interface=$2; shift 2 ;;
    *) echo 'Usage: docker-firewall.sh [--remove] [--interface interface]' >&2; exit 2 ;;
  esac
done
interfaces=()
if [[ -n $interface ]]; then
  interfaces+=("$interface")
else
  mapfile -t interfaces < <({ ip -4 route show default; ip -6 route show default; } |
    awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' | sort -u)
fi
if [[ $mode == apply ]]; then
  ((${#interfaces[@]})) || { echo 'No external interface found; refusing an empty policy.' >&2; exit 1; }
  for interface in "${interfaces[@]}"; do
    [[ $interface =~ ^[a-zA-Z0-9_.:-]+$ ]] || exit 2
    ip link show dev "$interface" >/dev/null
  done
fi
for family in iptables ip6tables; do
  command -v "$family" >/dev/null
  if [[ $mode == remove ]]; then
    while "$family" -w 10 -C DOCKER-USER -j "$chain" 2>/dev/null; do
      "$family" -w 10 -D DOCKER-USER -j "$chain"
    done
    if "$family" -w 10 -S "$chain" >/dev/null 2>&1; then
      "$family" -w 10 -F "$chain"
      "$family" -w 10 -X "$chain"
    fi
    continue
  fi
  # Refuse unsupported backends rather than claiming a policy was installed.
  "$family" -w 10 -S DOCKER-USER >/dev/null
  policy=$(mktemp /run/wardrobe-firewall.XXXXXX)
  trap 'rm -f -- "$policy"' EXIT
  {
    printf '*filter\n:%s - [0:0]\n-F %s\n' "$chain" "$chain"
    printf -- '-A %s -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN\n' "$chain"
    for interface in "${interfaces[@]}"; do
      # DNAT has already happened: match original host ports, not container ports.
      for port in 80 443; do
        printf -- '-A %s -i %s -p tcp -m conntrack --ctdir ORIGINAL --ctorigdstport %s -j RETURN\n' "$chain" "$interface" "$port"
      done
      printf -- '-A %s -i %s -j DROP\n' "$chain" "$interface"
    done
    printf -- '-A %s -j RETURN\nCOMMIT\n' "$chain"
  } > "$policy"
  # One transaction replaces only our own chain, avoiding a gap on reload.
  "$family-restore" -w 10 --noflush --test < "$policy"
  "$family-restore" -w 10 --noflush < "$policy"
  rm -f -- "$policy"
  trap - EXIT
  if ! "$family" -w 10 -C DOCKER-USER -j "$chain" 2>/dev/null; then
    "$family" -w 10 -I DOCKER-USER 1 -j "$chain"
  fi
  # Docker may leave the IPv6 hook empty while only IPv4 bridges exist.
  if ! "$family" -w 10 -C FORWARD -j DOCKER-USER 2>/dev/null; then
    "$family" -w 10 -I FORWARD 1 -j DOCKER-USER
  fi
done
echo "Docker ingress policy $mode completed (IPv4 and IPv6)."
