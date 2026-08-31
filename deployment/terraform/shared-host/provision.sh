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
set -euxo pipefail
exec > >(tee -a /var/log/shared-host-provision.log) 2>&1

export DEBIAN_FRONTEND=noninteractive

: "${APPS_JSON:?APPS_JSON is required}"
: "${DEPLOY_PUBLIC_KEY:?DEPLOY_PUBLIC_KEY is required}"
: "${ACME_EMAIL:=robinnagpal.tiet@gmail.com}"

apt-get update -y
apt-get install -y \
  apt-transport-https ca-certificates curl debian-archive-keyring debian-keyring \
  gnupg jq rsync

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
Environment=PORT=$port
ExecStart=/usr/bin/node /srv/$app/current/index.js
Restart=always
RestartSec=3

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
{
  echo "# Managed by provision.sh — change deployment/terraform/shared-host/variables.tf."
  echo "{"
  echo "  email $ACME_EMAIL"
  echo "}"
  echo
  echo "# Liveness on a port the Lightsail firewall does not expose, so \"is the"
  echo "# host up\" can be answered without depending on a certificate."
  echo ":8080 {"
  echo "  respond \"shared-host ok\" 200"
  echo "}"

  for app in $apps; do
    host="$(jq -r --arg a "$app" '.[$a].api_host' <<<"$APPS_JSON")"
    port="$(jq -r --arg a "$app" '.[$a].port' <<<"$APPS_JSON")"
    echo
    echo "$host {"
    echo "  encode zstd gzip"
    echo "  reverse_proxy 127.0.0.1:$port"
    echo "}"
  done
} >/etc/caddy/Caddyfile

caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy

for app in $apps; do
  systemctl enable "$app-api.service"
  # Fails harmlessly before the first deploy: ConditionPathExists skips it.
  systemctl start "$app-api.service" || true
done

echo "shared-host provisioned: $(tr '\n' ' ' <<<"$apps")"
