# syntax=docker/dockerfile:1
#
# Production image (see docs/operations/deploy.md). Two targets:
#   runner   the site itself: Next.js standalone server, no dev tooling (default)
#   tools    dependencies, Prisma CLI and tsx: runs `prisma migrate deploy` before
#            every start, and one-off scripts (node_modules/.bin/tsx scripts/...)
# Build: docker compose -f docker-compose.prod.yml build

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
# OpenSSL for the Prisma query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.8.1 && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS build
# NEXT_PUBLIC_* values are compiled into the bundle, so they are build arguments.
ARG NEXT_PUBLIC_SITE_URL=https://ccinno.center
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY . .
ENV NODE_ENV=production NEXT_STANDALONE=1
# Caps the compiler's heap so a small server (or Docker VM) is not exhausted.
RUN pnpm exec prisma generate && NODE_OPTIONS=--max-old-space-size=3072 pnpm exec next build

# ---------------------------------------------------------------------------
# Migrations and admin scripts need the Prisma CLI and tsx, not the built site.
FROM deps AS tools
COPY tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN pnpm exec prisma generate
ENV NODE_ENV=production
USER node
# Binaries directly: `pnpm exec` would try to prune devDependencies under NODE_ENV=production.
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/app/storage
RUN npm uninstall -g pnpm && mkdir -p /app/storage && chown node:node /app/storage
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
