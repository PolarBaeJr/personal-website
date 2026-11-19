# Personal site (Next.js 16): Raspberry Pi image.
#
# Built by docker/docker-compose.yml with the repo root as context:
#   cd docker && docker compose up -d --build

# ---- tectonic ----------------------------------------------------------
# Pinned release binary (static musl build) for the target architecture.
FROM node:24-bookworm-slim AS tectonic
ARG TECTONIC_VERSION=0.17.0
ARG TARGETARCH
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN case "$TARGETARCH" in \
      arm64) T=aarch64-unknown-linux-musl; SHA=b10954a95404f3ab2328d2fa59a5ebab8e657f893fab096f98be8db7c0c979b8 ;; \
      amd64) T=x86_64-unknown-linux-musl;  SHA=8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7 ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac \
 && curl -fsSL -o /tmp/t.tgz "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${T}.tar.gz" \
 && echo "${SHA}  /tmp/t.tgz" | sha256sum -c - \
 && tar -xzf /tmp/t.tgz -C /usr/local/bin tectonic \
 && rm /tmp/t.tgz \
 && /usr/local/bin/tectonic --version

# ---- build -------------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
 && npm prune --omit=dev

# ---- run ---------------------------------------------------------------
FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    RESUME_DB=/data/resume.db \
    TECTONIC_CACHE_DIR=/opt/tectonic-cache

# tectonic downloads its bundle over HTTPS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=tectonic /usr/local/bin/tectonic /usr/local/bin/tectonic

# Only what `next start` needs at runtime, plus the résumé sources and the
# plain-node scripts (seed, import) with the store code they import.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/content ./content
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/resumes ./resumes
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib/resume-store ./src/lib/resume-store
COPY --from=build /app/src/lib/resume-types.ts ./src/lib/resume-types.ts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# /data holds runtime state (the résumé SQLite DB) on a volume.
RUN mkdir -p /data /opt/tectonic-cache \
 && chown node:node /data /opt/tectonic-cache \
 && chmod +x /usr/local/bin/entrypoint.sh
USER node

# Warm tectonic's bundle and format cache as the node user, so runtime
# compiles are fast and the cache stays writable by the app.
RUN mkdir /tmp/warm \
 && for t in accounting auditing finance tech general; do \
      tectonic -X compile --untrusted --outdir /tmp/warm "/app/resumes/$t.tex" || exit 1; \
    done \
 && rm -rf /tmp/warm

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npx", "next", "start"]
