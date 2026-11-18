#!/usr/bin/env bash
#
# Deploy the personal site to the Raspberry Pi.
#
#   ./docker/deploy.sh              # sync + build + start
#   ./docker/deploy.sh --no-start   # sync + build only
#   ./docker/deploy.sh --push-env   # also copy local .env to the Pi
#   PI_HOST=pi ./docker/deploy.sh   # different ssh host
#
# Requires: ssh access to the Pi, plus docker and the compose plugin on it.

set -euo pipefail

PI_HOST="${PI_HOST:-pi-remote}"
REMOTE_DIR="${REMOTE_DIR:-~/apps/personal-page}"
SITE_URL="${SITE_URL:-https://matthewcheng.net}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

START=1
PUSH_ENV=0
for arg in "$@"; do
    case "${arg}" in
        --no-start) START=0 ;;
        --push-env) PUSH_ENV=1 ;;
        -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
        *) echo "unknown option: ${arg}" >&2; exit 64 ;;
    esac
done

info() { printf '\033[1;36m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$1" >&2; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$1" >&2; exit 1; }

# --- preflight -------------------------------------------------------------

info "Checking ssh access to '${PI_HOST}'"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${PI_HOST}" true \
    || die "cannot ssh to '${PI_HOST}'. Set PI_HOST or fix your ~/.ssh/config."

ssh "${PI_HOST}" 'command -v docker >/dev/null && docker compose version >/dev/null' \
    || die "docker + compose plugin are not available on ${PI_HOST}"

ssh "${PI_HOST}" 'docker network inspect edge >/dev/null 2>&1' \
    || die "the 'edge' docker network doesn't exist on ${PI_HOST} (is proxy-manager running?)"

info "Building locally first to catch errors before touching the Pi"
(cd "${LOCAL_DIR}" && npm run lint && npm run build) \
    || die "local lint/build failed; fix it before deploying"

# --- sync ------------------------------------------------------------------

info "Syncing to ${PI_HOST}:${REMOTE_DIR}"
ssh "${PI_HOST}" "mkdir -p ${REMOTE_DIR}"
rsync -az --delete \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude 'data/' \
    --exclude '.DS_Store' \
    "${LOCAL_DIR}/" "${PI_HOST}:${REMOTE_DIR}/"

if [[ "${PUSH_ENV}" == 1 ]]; then
    [[ -f "${LOCAL_DIR}/.env" ]] || die "--push-env given but no .env in ${LOCAL_DIR}"
    info "Copying .env (mode 600)"
    scp -q "${LOCAL_DIR}/.env" "${PI_HOST}:${REMOTE_DIR}/.env"
    ssh "${PI_HOST}" "chmod 600 ${REMOTE_DIR}/.env"
fi

# --- build / start ---------------------------------------------------------

if [[ "${START}" == 1 ]]; then
    info "Building and starting the container on the Pi (first build takes a few minutes)"
    ssh "${PI_HOST}" "cd ${REMOTE_DIR}/docker && docker compose up -d --build --remove-orphans"
else
    info "Building only (--no-start)"
    ssh "${PI_HOST}" "cd ${REMOTE_DIR}/docker && docker compose build"
    exit 0
fi

# --- verify ----------------------------------------------------------------

info "Waiting for the container to answer on :3000"
ok=0
for _ in $(seq 1 30); do
    if ssh "${PI_HOST}" "docker exec personal-page node -e \"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"" 2>/dev/null; then
        ok=1; break
    fi
    sleep 2
done
[[ "${ok}" == 1 ]] || { ssh "${PI_HOST}" "docker logs --tail 50 personal-page" >&2; die "container didn't come up healthy"; }

info "Container is up. Checking ${SITE_URL} through proxy-manager"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${SITE_URL}/" || true)"
if [[ "${code}" == 200 ]]; then
    info "Live: ${SITE_URL} (HTTP 200)"
else
    warn "${SITE_URL} returned HTTP ${code:-none}. The container is fine; check the DNS record and the proxy route."
fi
