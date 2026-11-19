#!/usr/bin/env bash
#
# Deploy the personal site to the Raspberry Pi.
#
#   ./docker/deploy.sh              # sync + build + start
#   ./docker/deploy.sh --no-start   # sync + build only
#   ./docker/deploy.sh --push-env   # also copy local .env to the Pi
#   PI_HOST=pi ./docker/deploy.sh   # force one ssh host (default: first of pi, pi-lan, pi-remote that answers)
#
# Requires: ssh access to the Pi, plus docker and the compose plugin on it.
# The Pi's .env needs RESUME_API_TOKEN (and RESUME_PHONE, RESUME_ADDRESS for
# the private PDF); see .env.example. The first boot seeds the résumé DB and
# compiles its PDFs, so it is slower; later boots skip that.

set -euo pipefail

# Try each ssh route to the Pi (Tailscale, home LAN, public) and use the
# first that answers. PI_HOST pins one explicitly.
pick_host() {
    if [[ -n "${PI_HOST:-}" ]]; then echo "${PI_HOST}"; return; fi
    local h
    for h in pi pi-lan pi-remote; do
        if ssh -o BatchMode=yes -o ConnectTimeout=5 "${h}" true 2>/dev/null; then
            echo "${h}"; return
        fi
    done
    return 1
}
REMOTE_DIR="${REMOTE_DIR:-~/apps/personal-page}"
SITE_URL="${SITE_URL:-https://matthewcheng.net}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

START=1
PUSH_ENV=0
for arg in "$@"; do
    case "${arg}" in
        --no-start) START=0 ;;
        --push-env) PUSH_ENV=1 ;;
        -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
        *) echo "unknown option: ${arg}" >&2; exit 64 ;;
    esac
done

info() { printf '\033[1;36m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$1" >&2; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$1" >&2; exit 1; }

# --- preflight -------------------------------------------------------------

info "Finding a route to the Pi (pi, pi-lan, pi-remote)"
PI_HOST="$(pick_host)" \
    || die "cannot ssh to the Pi via pi, pi-lan or pi-remote. Set PI_HOST or fix ~/.ssh/config."
info "Using ssh host '${PI_HOST}'"

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

if ! ssh "${PI_HOST}" "grep -qE '^RESUME_API_TOKEN=.+' ${REMOTE_DIR}/.env 2>/dev/null"; then
    warn "${REMOTE_DIR}/.env on ${PI_HOST} has no RESUME_API_TOKEN; the résumé API will answer 503. Add it, or rerun with --push-env."
fi
if ! ssh "${PI_HOST}" "grep -qE '^RESUME_PHONE=.+' ${REMOTE_DIR}/.env 2>/dev/null && grep -qE '^RESUME_ADDRESS=.+' ${REMOTE_DIR}/.env 2>/dev/null"; then
    warn "${REMOTE_DIR}/.env on ${PI_HOST} lacks RESUME_PHONE or RESUME_ADDRESS; résumé updates through the API will answer 503."
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

# The first boot seeds and compiles the résumé PDFs before next starts.
info "Waiting for the container to answer on :3000"
ok=0
for _ in $(seq 1 90); do
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
