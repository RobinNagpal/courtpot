#!/usr/bin/env bash
# Provisions the shared application host: Node, Caddy, a `deploy` user, and one
# systemd service plus one Caddy site per application.
#
# Terraform prepends the three variables below and passes the result as the
# instance's user_data, so this runs once at first boot. It is also written to
# be re-runnable by hand, which is how an application should be added or a port
# changed — editing user_data instead would recreate the instance:
#
#   ssh ubuntu@<static-ip> 'sudo APPS_JSON='\''{"foo":{"port":7073,"api_host":"api.foo.com"}}'\'' \
#     DEPLOY_PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)" bash -s' < provision.sh
#
# Anything it writes is derived entirely from APPS_JSON, so a re-run converges.
#
# Each APPS_JSON entry needs `port` and `api_host`. Everything else is optional,
# and an entry that sets none of it renders exactly the unit and Caddy site it
# always did:
#
#   redirect_hosts    hostnames that 308 to https://<api_host>{uri}, e.g. www
#   on_demand_suffix  serve every single-label subdomain of this domain too, with
#                     a certificate Caddy obtains at the first TLS handshake for
#                     that name (on-demand TLS). Caddy asks itself, over
#                     loopback, whether the name is allowed — see "ask" below.
#   node_heap_mb      NODE_OPTIONS=--max-old-space-size for this service
#   memory_max        systemd MemoryMax for this service (e.g. "1200M"), so one
#                     application cannot push the others into the OOM killer
#
# Re-running it on a live host reloads Caddy rather than restarting it, so the
# applications already being served do not drop connections.
set -euxo pipefail
exec > >(tee -a /var/log/shared-host-provision.log) 2>&1

export DEBIAN_FRONTEND=noninteractive

: "${APPS_JSON:?APPS_JSON is required}"
: "${DEPLOY_PUBLIC_KEY:?DEPLOY_PUBLIC_KEY is required}"
: "${ACME_EMAIL:=robinnagpal.tiet@gmail.com}"
: "${SWAP_SIZE:=2G}"

apt-get update -y
apt-get install -y \
  apt-transport-https ca-certificates curl debian-archive-keyring debian-keyring \
  gnupg jq rsync

# --- Swap ------------------------------------------------------------------
# A cushion, not capacity: 4 GB is shared by every application on the host, and
# a Next.js server's footprint spikes during a burst of renders. Swap turns a
# brief spike into slowness instead of the kernel OOM killer picking a victim —
# which could be an application that did nothing wrong. Low swappiness keeps
# steady-state memory in RAM. Idempotent: an existing /swapfile is left alone.
if [[ ! -f /swapfile ]]; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon --show=NAME --noheadings | grep -qx /swapfile || swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
echo 'vm.swappiness=10' >/etc/sysctl.d/99-shared-host-swap.conf
sysctl -p /etc/sysctl.d/99-shared-host-swap.conf

# --- Node ------------------------------------------------------------------
# 22.x to match the runtime the bundles are built for (esbuild --target=node22).
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# --- Caddy -----------------------------------------------------------------
# Terminates TLS for every api.<domain> with a Let's Encrypt certificate it
# renews itself, and routes by hostname to the right application's port.
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

# --- deploy user -----------------------------------------------------------
# Both projects' GitHub Actions log in as this user. It owns /srv and its own
# environment files, and sudo lets it restart its own services and nothing else.
id -u deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG systemd-journal deploy   # read its own service logs without sudo

install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$DEPLOY_PUBLIC_KEY" >/home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# Keys only. The Lightsail Ubuntu image already defaults to this; stating it in
# a drop-in that sorts before cloud-init's means a future image cannot quietly
# re-enable password login (sshd takes the first value it obtains for a key).
printf 'PasswordAuthentication no\nPermitRootLogin no\n' \
  >/etc/ssh/sshd_config.d/00-shared-host.conf
systemctl reload ssh 2>/dev/null || systemctl reload sshd

apps="$(jq -r 'keys[]' <<<"$APPS_JSON")"

# --- one systemd service per application -----------------------------------
for app in $apps; do
  port="$(jq -r --arg a "$app" '.[$a].port' <<<"$APPS_JSON")"
  node_heap_mb="$(jq -r --arg a "$app" '.[$a].node_heap_mb // empty' <<<"$APPS_JSON")"
  memory_max="$(jq -r --arg a "$app" '.[$a].memory_max // empty' <<<"$APPS_JSON")"

  # Optional lines, each with its own leading newline, so an application that
  # sets neither renders the same unit it always has.
  heap_line=""
  [[ -z "$node_heap_mb" ]] || heap_line=$'\n'"Environment=NODE_OPTIONS=--max-old-space-size=$node_heap_mb"
  memory_line=""
  [[ -z "$memory_max" ]] || memory_line=$'\n'"MemoryMax=$memory_max"

  install -d -m 755 -o deploy -g deploy "/srv/$app" "/srv/$app/current"

  # Written by the project's deploy workflow from its GitHub secrets. Created
  # empty so a re-run never clobbers a key that is already in place.
  [[ -f "/etc/$app-api.env" ]] || install -m 600 -o deploy -g deploy /dev/null "/etc/$app-api.env"

  cat >"/etc/systemd/system/$app-api.service" <<UNIT
[Unit]
Description=$app API
After=network-online.target
Wants=network-online.target
# Skipped rather than crash-looped on a host that has been provisioned but
# whose first deploy has not run yet.
ConditionPathExists=/srv/$app/current/index.js

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/srv/$app/current
EnvironmentFile=/etc/$app-api.env
# Listed after EnvironmentFile so the unit wins: the port is what pairs this
# service with its Caddy site, and an env file must not be able to drift from it.
Environment=NODE_ENV=production
Environment=PORT=$port$heap_line
ExecStart=/usr/bin/node /srv/$app/current/index.js
Restart=always
RestartSec=3$memory_line

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=full
ProtectHome=yes

[Install]
WantedBy=multi-user.target
UNIT
done

systemctl daemon-reload

# --- sudo: restarting its own services, and nothing else --------------------
{
  echo "# Managed by provision.sh."
  for app in $apps; do
    echo "deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart $app-api, /usr/bin/systemctl start $app-api, /usr/bin/systemctl stop $app-api"
  done
} >/etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy
visudo -cf /etc/sudoers.d/deploy

# --- Caddy sites ------------------------------------------------------------
# Applications that serve every subdomain of a domain, and the suffix for each.
on_demand_apps="$(jq -r 'to_entries[] | select((.value.on_demand_suffix // "") != "") | .key' <<<"$APPS_JSON")"
for app in $on_demand_apps; do
  suffix="$(jq -r --arg a "$app" '.[$a].on_demand_suffix' <<<"$APPS_JSON")"
  # It is interpolated into a regular expression and a site address below.
  [[ "$suffix" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] \
    || { echo "on_demand_suffix for $app is not a domain name: $suffix" >&2; exit 1; }
done

{
  echo "# Managed by provision.sh — change deployment/terraform/shared-host/variables.tf."
  echo "{"
  echo "  email $ACME_EMAIL"
  if [[ -n "$on_demand_apps" ]]; then
    echo
    echo "  # A certificate for a wildcard site is obtained per name, at that name's"
    echo "  # first handshake, and only if the ask endpoint below answers 2xx."
    echo "  on_demand_tls {"
    echo "    ask http://127.0.0.1:5555/check"
    echo "  }"
  fi
  echo "}"
  echo
  echo "# Liveness on a port the Lightsail firewall does not expose, so \"is the"
  echo "# host up\" can be answered without depending on a certificate."
  echo ":8080 {"
  echo "  respond \"shared-host ok\" 200"
  echo "}"

  if [[ -n "$on_demand_apps" ]]; then
    echo
    echo "# The on-demand TLS ask endpoint, answered by Caddy itself on loopback (the"
    echo "# firewall does not expose 5555 either). Approves exactly one DNS label"
    echo "# under an application's on_demand_suffix — a.example.com, never"
    echo "# a.b.example.com or anything outside it — so the certificates Caddy will"
    echo "# request are bounded to names the wildcard record actually routes here."
    echo "http://127.0.0.1:5555 {"
    echo "  bind 127.0.0.1"
    for app in $on_demand_apps; do
      suffix="$(jq -r --arg a "$app" '.[$a].on_demand_suffix' <<<"$APPS_JSON")"
      echo "  @$app expression \`{query.domain}.matches('^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?[.]${suffix//./[.]}\$')\`"
      echo "  handle @$app {"
      echo "    respond 200"
      echo "  }"
    done
    echo "  handle {"
    echo "    respond 403"
    echo "  }"
    echo "}"
  fi

  for app in $apps; do
    host="$(jq -r --arg a "$app" '.[$a].api_host' <<<"$APPS_JSON")"
    port="$(jq -r --arg a "$app" '.[$a].port' <<<"$APPS_JSON")"
    echo
    echo "$host {"
    echo "  encode zstd gzip"
    echo "  reverse_proxy 127.0.0.1:$port"
    echo "}"

    for redirect_host in $(jq -r --arg a "$app" '(.[$a].redirect_hosts // [])[]' <<<"$APPS_JSON"); do
      echo
      echo "$redirect_host {"
      echo "  redir https://$host{uri} 308"
      echo "}"
    done

    suffix="$(jq -r --arg a "$app" '.[$a].on_demand_suffix // empty' <<<"$APPS_JSON")"
    if [[ -n "$suffix" ]]; then
      # Exact hostnames above outrank this wildcard, so the apex and any
      # redirect host keep their own blocks and certificates.
      echo
      echo "*.$suffix {"
      echo "  tls {"
      echo "    on_demand"
      echo "  }"
      echo "  encode zstd gzip"
      echo "  reverse_proxy 127.0.0.1:$port"
      echo "}"
    fi
  done
} >/etc/caddy/Caddyfile

caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
systemctl enable caddy
# Reload, not restart, when Caddy is already serving: a re-run to add an
# application must not drop the connections of the ones already here. A
# reload swaps the config in place and keeps every certificate it holds.
if systemctl is-active --quiet caddy; then
  systemctl reload caddy
else
  systemctl restart caddy
fi

for app in $apps; do
  systemctl enable "$app-api.service"
  # Fails harmlessly before the first deploy: ConditionPathExists skips it.
  systemctl start "$app-api.service" || true
done

echo "shared-host provisioned: $(tr '\n' ' ' <<<"$apps")"
