#!/usr/bin/env bash
#
# Quick SSH helpers for the personal site on the Pi.
#
#   ./docker/pi.sh             # open a shell in the app folder on the Pi
#   ./docker/pi.sh logs        # follow container logs (Ctrl+C to stop)
#   ./docker/pi.sh status      # container status + health
#   ./docker/pi.sh restart     # restart the container
#   ./docker/pi.sh stop        # stop it (docker compose down; data volume kept)
#   ./docker/pi.sh exec        # open a shell inside the running container
#   ./docker/pi.sh run <cmd>   # run any command in the app folder on the Pi
#
# PI_HOST / REMOTE_DIR override the defaults, same as deploy.sh.

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
# The dashboard's auto-update renames the container (goproxy-personal-page-N),
# so find it by its proxy label instead of a fixed name.
FIND='$(docker ps -aq --filter label=proxy.service=personal-page | head -n1)'

PI_HOST="$(pick_host)" || { echo "cannot reach the Pi via pi, pi-lan or pi-remote" >&2; exit 1; }

cmd="${1:-shell}"
[[ $# -gt 0 ]] && shift

case "${cmd}" in
    shell)   exec ssh -t "${PI_HOST}" "cd ${REMOTE_DIR} 2>/dev/null || cd ~; exec \$SHELL -l" ;;
    logs)    exec ssh -t "${PI_HOST}" "docker logs -f --tail 100 ${FIND}" ;;
    status)  exec ssh "${PI_HOST}" "docker ps -a --filter label=proxy.service=personal-page --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" ;;
    restart) exec ssh "${PI_HOST}" "docker restart ${FIND}" ;;
    stop)    exec ssh "${PI_HOST}" "cd ${REMOTE_DIR}/docker && docker compose down; docker rm -f \$(docker ps -aq --filter label=proxy.service=personal-page) 2>/dev/null; true" ;;
    exec)    exec ssh -t "${PI_HOST}" "docker exec -it ${FIND} sh" ;;
    run)     [[ $# -gt 0 ]] || { echo "usage: $0 run <command>" >&2; exit 64; }
             exec ssh -t "${PI_HOST}" "cd ${REMOTE_DIR} && $*" ;;
    -h|--help|help) sed -n '2,13p' "$0" ;;
    *) echo "unknown command: ${cmd} (try --help)" >&2; exit 64 ;;
esac
