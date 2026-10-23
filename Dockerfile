# Multi-stage build: the final image holds production dependencies only and runs as a non-root user.

FROM node:24.21.0-alpine3.24 AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Production dependencies only.
FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile

# Every dependency, to build the site.
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY astro.config.mjs tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:24.21.0-alpine3.24 AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    UPLOADS_DIR=/data/uploads
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Node runs these files directly (it strips the types), so they are copied as they are.
COPY src/server ./src/server
COPY drizzle ./drizzle
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/server/start.ts"]
