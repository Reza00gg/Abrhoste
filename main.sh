#!/usr/bin/env bash
# LenuMoviz VPS installer/runner.
# Run from the extracted bundle with: sudo ./main.sh
set -Eeuo pipefail
IFS=$'\n\t'

APP_NAME="${APP_NAME:-lenumoviz}"
DOMAIN="${DOMAIN:-lnupro.space}"
PORT="${PORT:-3000}"
INSTALL_DIR="${INSTALL_DIR:-/opt/${APP_NAME}}"
ENV_DIR="${ENV_DIR:-/etc/${APP_NAME}}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/${APP_NAME}.env}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_ARCHIVE="${PAYLOAD_ARCHIVE:-${SCRIPT_DIR}/lenumoviz-app.zip}"
STAGE_DIR=""
BACKUP_DIR=""
HTTPS_READY=0

package_manager_busy() {
  local locks=(
    /var/lib/dpkg/lock-frontend
    /var/lib/dpkg/lock
    /var/cache/apt/archives/lock
  )
  if command -v fuser >/dev/null 2>&1; then
    fuser -s "${locks[@]}" 2>/dev/null
    return $?
  fi
  pgrep -x apt-get >/dev/null 2>&1 || pgrep -x dpkg >/dev/null 2>&1
}

wait_for_package_manager() {
  local attempt=0
  while package_manager_busy; do
    attempt=$((attempt + 1))
    if (( attempt == 1 )); then
      log "Another apt/dpkg process is active; waiting without touching the lock..."
    fi
    if (( attempt >= 180 )); then
      die "apt/dpkg is still busy after 6 minutes. Do not remove the lock file; finish or stop the package operation from the VPS console, then rerun."
    fi
    sleep 2
  done
}

apt_run() {
  local attempt=1
  local exit_code=0
  while (( attempt <= 5 )); do
    wait_for_package_manager
    if apt-get "$@"; then
      return 0
    else
      exit_code=$?
    fi
    if (( attempt == 5 )); then return "${exit_code}"; fi
    warn "apt command failed (attempt ${attempt}/5); waiting and retrying safely..."
    sleep 5
    attempt=$((attempt + 1))
  done
  return "${exit_code}"
}

log() { printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '\n[WARN] %s\n' "$*" >&2; }
die() { printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }
cleanup() {
  local exit_code=$?
  trap - ERR
  if [[ -n "${STAGE_DIR}" && -d "${STAGE_DIR}" ]]; then
    rm -rf -- "${STAGE_DIR}"
  fi
  exit "${exit_code}"
}
trap cleanup EXIT
trap 'die "Installation failed at line ${LINENO}. Check the message above."' ERR

[[ "${EUID}" -eq 0 ]] || die "Run this file as root: sudo ./main.sh"
[[ -f /etc/os-release ]] || die "A Debian/Ubuntu based VPS is required."
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ;;
  *) die "Unsupported Linux distribution: ${ID:-unknown}." ;;
esac

# Load an existing protected environment file, or collect the minimum values once.
if [[ -f "${ENV_FILE}" ]]; then
  log "Loading protected environment: ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

DOMAIN="${DOMAIN:-lnupro.space}"
PORT="${PORT:-3000}"
DATABASE_URL="${DATABASE_URL:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

if [[ -z "${DATABASE_URL}" ]]; then
  [[ -t 0 ]] || die "DATABASE_URL is missing and the script is running non-interactively."
  read -r -p "Neon DATABASE_URL: " DATABASE_URL
fi
if [[ -z "${ADMIN_USERNAME}" ]]; then
  read -r -p "Admin username [user]: " ADMIN_USERNAME
  ADMIN_USERNAME="${ADMIN_USERNAME:-user}"
fi
if [[ -z "${ADMIN_PASSWORD}" ]]; then
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  printf '\n'
fi
if [[ -z "${CERTBOT_EMAIL}" && -t 0 ]]; then
  read -r -p "Certbot email (optional; leave empty for HTTP only): " CERTBOT_EMAIL
fi
[[ -n "${DATABASE_URL}" ]] || die "DATABASE_URL cannot be empty."
[[ -n "${ADMIN_USERNAME}" && -n "${ADMIN_PASSWORD}" ]] || die "Admin credentials cannot be empty."
[[ "${DOMAIN}" != *'/'* && "${DOMAIN}" != *' '* ]] || die "DOMAIN must be a hostname only."
[[ "${PORT}" =~ ^[0-9]+$ ]] || die "PORT must be numeric."

log "Start"
log "Installing required system packages..."
export DEBIAN_FRONTEND=noninteractive
wait_for_package_manager
dpkg --configure -a
apt_run update
apt_run install -y ca-certificates curl unzip nginx

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
fi
if (( node_major < 22 )); then
  log "Installing Node.js 22..."
  wait_for_package_manager
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt_run install -y nodejs
fi
command -v node >/dev/null 2>&1 || die "Node.js installation failed."
command -v npm >/dev/null 2>&1 || die "npm installation failed."
log "Node $(node --version), npm $(npm --version)"

log "Saving protected environment..."
install -d -m 700 "${ENV_DIR}"
{
  printf 'NODE_ENV=production\n'
  printf 'HOST=127.0.0.1\n'
  printf 'PORT=%q\n' "${PORT}"
  printf 'DOMAIN=%q\n' "${DOMAIN}"
  printf 'DATABASE_URL=%q\n' "${DATABASE_URL}"
  printf 'ADMIN_USERNAME=%q\n' "${ADMIN_USERNAME}"
  printf 'ADMIN_PASSWORD=%q\n' "${ADMIN_PASSWORD}"
  printf 'CERTBOT_EMAIL=%q\n' "${CERTBOT_EMAIL}"
} > "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

log "Extracting project payload..."
PAYLOAD_ROOT="$(mktemp -d -p /tmp lenumoviz-payload.XXXXXX)"
if [[ -f "${PAYLOAD_ARCHIVE}" ]]; then
  unzip -q -o "${PAYLOAD_ARCHIVE}" -d "${PAYLOAD_ROOT}"
  SOURCE_DIR="$(find "${PAYLOAD_ROOT}" -type f -name package.json -not -path '*/node_modules/*' -print -quit | xargs -r dirname)"
  [[ -n "${SOURCE_DIR}" && -f "${SOURCE_DIR}/server.mjs" ]] || die "The payload does not contain the LenuMoviz Node runtime."
else
  SOURCE_DIR="${SCRIPT_DIR}"
  [[ -f "${SOURCE_DIR}/package.json" && -f "${SOURCE_DIR}/server.mjs" ]] || die "No payload archive or project root was found."
fi

STAGE_DIR="${INSTALL_DIR}.stage.$$"
rm -rf -- "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}"
cp -a "${SOURCE_DIR}/." "${STAGE_DIR}/"
# Never copy local credentials or generated dependencies/builds into the install.
rm -rf "${STAGE_DIR}/node_modules" "${STAGE_DIR}/dist" "${STAGE_DIR}/.vercel" "${STAGE_DIR}/.nuxt" "${STAGE_DIR}/.output"
find "${STAGE_DIR}" -type f \( -name '.env' -o -name '.env.*' \) -not -name '.env.example' -delete

if [[ -d "${INSTALL_DIR}" ]]; then
  BACKUP_DIR="${INSTALL_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
  log "Backing up the previous install to ${BACKUP_DIR}"
  mv -- "${INSTALL_DIR}" "${BACKUP_DIR}"
fi
mv -- "${STAGE_DIR}" "${INSTALL_DIR}"
STAGE_DIR=""
cd "${INSTALL_DIR}"

log "Installing npm dependencies (including build tools)..."
# NODE_ENV=production would omit Vite because it is a devDependency. Install
# devDependencies explicitly for the build, then prune them after the build.
env NODE_ENV=development npm_config_production=false npm ci --include=dev --no-audit --no-fund
[[ -x "${INSTALL_DIR}/node_modules/.bin/vite" ]] || die "Vite was not installed; the build toolchain is incomplete."

log "Applying Neon schema and admin seed..."
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a
npm run migrate

log "Building production assets..."
npm run build
[[ -f "${INSTALL_DIR}/dist/index.html" ]] || die "Production build did not create dist/index.html."

log "Removing build-only dependencies..."
env NODE_ENV=production npm prune --omit=dev --no-audit --no-fund

log "Installing and starting PM2..."
command -v pm2 >/dev/null 2>&1 || npm install --global pm2 --no-audit --no-fund
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
HOST=127.0.0.1 PORT="${PORT}" NODE_ENV=production DOMAIN="${DOMAIN}" pm2 start server.mjs --name "${APP_NAME}" --cwd "${INSTALL_DIR}" --time --update-env
pm2 save
# Register PM2 for automatic restart after a VPS reboot.
pm2 startup systemd -u root --hp /root >/tmp/${APP_NAME}-pm2-startup.log 2>&1 || true
systemctl enable pm2-root >/dev/null 2>&1 || true

log "Configuring Nginx for ${DOMAIN}..."
cat > "/etc/nginx/sites-available/${APP_NAME}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
ln -sfn "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  HTTPS_READY=1
fi
if [[ -n "${CERTBOT_EMAIL}" ]]; then
  log "Installing HTTPS certificate with Certbot..."
  apt_run install -y certbot python3-certbot-nginx
  if certbot --nginx --non-interactive --agree-tos --redirect --email "${CERTBOT_EMAIL}" -d "${DOMAIN}"; then
    HTTPS_READY=1
  else
    warn "Certbot could not issue the certificate. The HTTP site is still available; fix DNS/ports and rerun."
  fi
elif (( HTTPS_READY == 0 )); then
  warn "CERTBOT_EMAIL is empty; HTTPS was not requested. Set it in ${ENV_FILE} and rerun for TLS."
fi

log "Checking the Node service..."
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "http://127.0.0.1:${PORT}/api/health" | grep -q '"ok":true'; then
    healthy=1
    break
  fi
  sleep 1
done
(( healthy == 1 )) || { pm2 logs "${APP_NAME}" --lines 40 --nostream || true; die "The local health check failed."; }

log "Installation complete"
if (( HTTPS_READY == 1 )); then
  SITE_SCHEME="https"
else
  SITE_SCHEME="http"
fi
printf '\nSite: %s://%s\nAPI:  %s://%s/api\nPM2:  pm2 status %s\nEnv:  %s\n' "${SITE_SCHEME}" "${DOMAIN}" "${SITE_SCHEME}" "${DOMAIN}" "${APP_NAME}" "${ENV_FILE}"
if (( HTTPS_READY == 0 )); then
  printf 'HTTPS: not configured yet (set CERTBOT_EMAIL and rerun after DNS is ready)\n'
fi
if [[ -n "${BACKUP_DIR}" ]]; then printf 'Backup: %s\n' "${BACKUP_DIR}"; fi
