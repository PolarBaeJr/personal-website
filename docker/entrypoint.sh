#!/bin/sh
# Container entrypoint. Fails fast if the data volume isn't writable, seeds
# the résumé DB from resumes/*.tex for any type without a tex version (a
# no-op on later boots), then hands off to the CMD (next start).
set -eu

if [ ! -w /data ]; then
    echo "entrypoint: /data is not writable by $(id -u); check the volume" >&2
    exit 1
fi

mkdir -p "$(dirname "${RESUME_DB:-/data/resume.db}")"
node --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
    /app/scripts/seed-resume.ts \
    || echo "entrypoint: résumé seed failed; the app seeds on first API or PDF request" >&2

exec "$@"
