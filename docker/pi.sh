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

PI_HOST="${PI_HOST:-pi-remote}"
REMOTE_DIR="${REMOTE_DIR:-~/apps/personal-page}"
CONTAINER="personal-page"

cmd="${1:-shell}"
[[ $# -gt 0 ]] && shift

case "${cmd}" in
    shell)   exec ssh -t "${PI_HOST}" "cd ${REMOTE_DIR} 2>/dev/null || cd ~; exec \$SHELL -l" ;;
    logs)    exec ssh -t "${PI_HOST}" "docker logs -f --tail 100 ${CONTAINER}" ;;
    status)  exec ssh "${PI_HOST}" "docker ps -a --filter name=^${CONTAINER}\$ --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" ;;
    restart) exec ssh "${PI_HOST}" "docker restart ${CONTAINER}" ;;
    stop)    exec ssh "${PI_HOST}" "cd ${REMOTE_DIR}/docker && docker compose down" ;;
    exec)    exec ssh -t "${PI_HOST}" "docker exec -it ${CONTAINER} sh" ;;
    run)     [[ $# -gt 0 ]] || { echo "usage: $0 run <command>" >&2; exit 64; }
             exec ssh -t "${PI_HOST}" "cd ${REMOTE_DIR} && $*" ;;
    -h|--help|help) sed -n '2,13p' "$0" ;;
    *) echo "unknown command: ${cmd} (try --help)" >&2; exit 64 ;;
esac
