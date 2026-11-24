# Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
# [2026-11-24 04:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — ảnh web open-cake: build Vite (Node 22) → phục vụ tĩnh bằng nginx 1.27.
# Bản này chạy bộ giả lập (chưa có API — PHASE-016); cùng khuôn docker/web.Dockerfile của open-ketoan.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/ui-kit/package.json packages/ui-kit/
COPY packages/action-client/package.json packages/action-client/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json vitest.config.ts ./
COPY packages packages
COPY apps apps
# Kiểm trước khi đóng gói: hợp đồng + giả lập phải xanh, kiểu phải sạch.
RUN npx vitest run && npm run typecheck && npm run web:build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
LABEL org.opencontainers.image.title="open-cake-web" \
      org.opencontainers.image.source="https://github.com/hoanganh8389/open-cake" \
      org.opencontainers.image.licenses="GPL-2.0-or-later"
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
