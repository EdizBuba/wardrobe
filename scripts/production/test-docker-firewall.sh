#!/usr/bin/env bash
# Real packet checks in isolated network namespaces; no host rules/ports are changed.
set -Eeuo pipefail
[[ $EUID == 0 ]] || { echo 'Run through sudo.' >&2; exit 1; }
script=$(realpath "$(dirname "${BASH_SOURCE[0]}")/docker-firewall.sh")
prefix=wardrobe-fw-test-$$
router=$prefix-router
client=$prefix-client
app=$prefix-app
server_pid=''
client_pid=''
cleanup() {
  result=$?
  if ((result)); then
    for ns in "$router" "$client" "$app"; do
      ip -n "$ns" -6 addr show 2>/dev/null || true
      ip -n "$ns" -6 route show 2>/dev/null || true
    done
    ip netns exec "$router" ip6tables -nvL 2>/dev/null || true
    ip netns exec "$router" ip6tables -t nat -nvL 2>/dev/null || true
  fi
  for pid in "$server_pid" "$client_pid"; do [[ -z $pid ]] || kill "$pid" 2>/dev/null || true; done
  for ns in "$app" "$client" "$router"; do
    [[ $ns == "$prefix-"* ]] && ip netns del "$ns" 2>/dev/null || true
  done
}
trap cleanup EXIT
for ns in "$router" "$client" "$app"; do
  ip netns add "$ns"
  ip netns exec "$ns" sysctl -q -w net.ipv6.conf.all.disable_ipv6=0 net.ipv6.conf.default.disable_ipv6=0
  ip -n "$ns" link set lo up
done
ip -n "$router" link add wan type veth peer name client0 netns "$client"
ip -n "$router" link add lan type veth peer name app0 netns "$app"
ip -n "$router" addr add 10.253.0.1/24 dev wan
ip -n "$client" addr add 10.253.0.2/24 dev client0
ip -n "$router" addr add 10.254.0.1/24 dev lan
ip -n "$app" addr add 10.254.0.2/24 dev app0
ip -n "$router" -6 addr add fd42:253::1/64 dev wan nodad
ip -n "$client" -6 addr add fd42:253::2/64 dev client0 nodad
ip -n "$router" -6 addr add fd42:254::1/64 dev lan nodad
ip -n "$app" -6 addr add fd42:254::2/64 dev app0 nodad
ip -n "$router" link set wan up
ip -n "$router" link set lan up
ip -n "$client" link set client0 up
ip -n "$app" link set app0 up
ip -n "$router" route add default via 10.253.0.2
ip -n "$client" route add default via 10.253.0.1
ip -n "$app" route add default via 10.254.0.1
ip -n "$app" -6 route add default via fd42:254::1
ip -n "$client" -6 route add default via fd42:253::1
ip netns exec "$router" sysctl -q -w net.ipv4.ip_forward=1 net.ipv6.conf.all.forwarding=1
for family in iptables ip6tables; do
  ip netns exec "$router" "$family" -N DOCKER-USER
  ip netns exec "$router" "$family" -A FORWARD -j DOCKER-USER
  target=10.254.0.2:8000
  [[ $family == iptables ]] || target='[fd42:254::2]:8000'
  for port in 80 443 18080; do
    ip netns exec "$router" "$family" -t nat -A PREROUTING -i wan -p tcp --dport "$port" -j DNAT --to-destination "$target"
  done
done
# The servers return fixed bytes and expose no host files, even inside the fixture.
server='import http.server,socket
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200); self.end_headers(); self.wfile.write(b"firewall-fixture")
 def log_message(self,*args): pass
class Server(http.server.ThreadingHTTPServer):
 address_family=socket.AF_INET6
 def server_bind(self):
  self.socket.setsockopt(socket.IPPROTO_IPV6,socket.IPV6_V6ONLY,0)
  super().server_bind()
Server(("::",8000),Handler).serve_forever()'
ip netns exec "$app" python3 -c "$server" >/dev/null 2>&1 & server_pid=$!
ip netns exec "$client" python3 -c "$server" >/dev/null 2>&1 & client_pid=$!
http() { ip netns exec "$1" curl --noproxy '*' -g --fail --silent --show-error --max-time 2 "$2"; }
for ((i=0;i<20;i++)); do
  if http "$client" http://10.253.0.1:18080 >/dev/null 2>&1; then break; fi
  sleep 0.2
done
[[ $(http "$client" http://10.253.0.1:18080) == firewall-fixture ]]
# IPv6 neighbour discovery may finish after IPv4 is already ready.
for ((i=0;i<20;i++)); do
  if http "$client" 'http://[fd42:253::1]:18080' >/dev/null 2>&1; then break; fi
  sleep 0.2
done
[[ $(http "$client" 'http://[fd42:253::1]:18080') == firewall-fixture ]]
ip netns exec "$router" bash "$script" --interface wan
ip netns exec "$router" bash "$script" --interface wan
for address in 10.253.0.1 '[fd42:253::1]'; do
  for port in 80 443; do [[ $(http "$client" "http://$address:$port") == firewall-fixture ]]; done
  if http "$client" "http://$address:18080" >/dev/null 2>&1; then
    echo 'Unexpected external access to a forbidden published port.' >&2; exit 1
  fi
done
[[ $(http "$app" http://10.253.0.2:8000) == firewall-fixture ]]
[[ $(http "$app" 'http://[fd42:253::2]:8000') == firewall-fixture ]]
for family in iptables ip6tables; do
  count=$(ip netns exec "$router" "$family" -S DOCKER-USER | grep -c -- '-j WARDROBE-EDGE')
  [[ $count == 1 ]]
done
ip netns exec "$router" bash "$script" --remove
[[ $(http "$client" http://10.253.0.1:18080) == firewall-fixture ]]
[[ $(http "$client" 'http://[fd42:253::1]:18080') == firewall-fixture ]]
echo 'PASS: IPv4/IPv6 DNAT allows 80/443, blocks 18080, preserves outbound replies; reload is idempotent and removal restores the fixture.'
