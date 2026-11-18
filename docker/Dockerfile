# Personal site (Next.js 16): Raspberry Pi image.
#
# Built by docker/docker-compose.yml with the repo root as context:
#   cd docker && docker compose up -d --build

# ---- build -------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
 && npm prune --omit=dev

# ---- run ---------------------------------------------------------------
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Only what `next start` needs at runtime.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/content ./content
COPY --from=build /app/next.config.ts ./next.config.ts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# /data holds runtime state (the résumé SQLite DB, from phase 2) on a volume.
RUN mkdir -p /data && chown node:node /data && chmod +x /usr/local/bin/entrypoint.sh
USER node

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npx", "next", "start"]
