# [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-6 — ảnh API (và job db-migrate dùng chung ảnh): build contracts + api, chạy node --conditions=cake-dist.
#   @bizcity/platform cài từ GitHub Release v0.2.0 (không cần token). Test tích hợp DB chạy ở CI / máy dev (cần Postgres), không chạy trong build ảnh.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/care-kernel/package.json packages/care-kernel/
COPY packages/ui-kit/package.json packages/ui-kit/
COPY packages/action-client/package.json packages/action-client/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm run api:build

FROM node:22-alpine
WORKDIR /app
# [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — mã commit vào mọi dòng log (trường commit, R-LOG-5): docker compose build với BIZCITY_GIT_SHA=$(git rev-parse HEAD).
ARG BIZCITY_GIT_SHA=
ENV NODE_ENV=production PORT=8120 CAKE_MIGRATIONS_DIR=/app/db/migrations BIZCITY_GIT_SHA=${BIZCITY_GIT_SHA}
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/contracts/package.json packages/contracts/
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/care-kernel/package.json packages/care-kernel/
COPY --from=build /app/packages/care-kernel/dist packages/care-kernel/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY db/migrations db/migrations
RUN mkdir -p /app/logs && chown node:node /app/logs
WORKDIR /app/apps/api
USER node
EXPOSE 8120
LABEL org.opencontainers.image.title="open-cake-api" \
      org.opencontainers.image.source="https://github.com/hoanganh8389/open-cake" \
      org.opencontainers.image.licenses="GPL-2.0-or-later"
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8120/api/v1/system/health || exit 1
CMD ["node", "--conditions=cake-dist", "dist/server.js"]
