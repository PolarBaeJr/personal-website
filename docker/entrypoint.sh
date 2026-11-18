#!/bin/sh
# Container entrypoint. Fails fast if the data volume isn't writable, then
# hands off to the CMD (next start). Phase 2 will seed the résumé DB here.
set -eu

if [ ! -w /data ]; then
    echo "entrypoint: /data is not writable by $(id -u); check the volume" >&2
    exit 1
fi

exec "$@"
