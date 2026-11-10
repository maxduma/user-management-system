# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).
ARG NODE_IMAGE=node:22-alpine

# ---------- base ----------
FROM ${NODE_IMAGE} AS base
# openssl is required by Prisma's schema engine (migrations) on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app

# ---------- dependencies (cached until a manifest or the lockfile changes) ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @ums/api --no-audit --no-fund

# ---------- build ----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @ums/api

# ---------- production dependencies only ----------
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @ums/api --omit=dev --no-audit --no-fund && npm cache clean --force

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    PATH=/app/node_modules/.bin:$PATH
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node packages/shared packages/shared
COPY --chown=node:node apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY --chown=node:node apps/api/prisma apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --chown=node:node apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/ready > /dev/null || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/server.js"]
