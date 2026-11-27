# Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
# [2026-11-24 04:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — ảnh web open-cake: build Vite (Node 22) → phục vụ tĩnh bằng nginx 1.27.
# Bản này chạy bộ giả lập (chưa có API — PHASE-016); cùng khuôn docker/web.Dockerfile của open-ketoan.

# [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — chép đủ package.json của mọi workspace (care-kernel, api) để npm ci khớp lockfile.
# [2026-11-27 10:15 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 S019-1 — pnpm (NC-002 Q-OC-6): cài theo pnpm-lock.yaml; kiểm + build như trước.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/care-kernel/package.json packages/care-kernel/
COPY packages/ui-kit/package.json packages/ui-kit/
COPY packages/action-client/package.json packages/action-client/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile
# [2026-11-27 10:15 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 S019-1 — sửa lỗi có sẵn: test authz-manifest đọc bizcity.authz.json ở gốc repo nhưng ảnh chưa chép tệp này ⇒ bước kiểm luôn trượt
COPY tsconfig.base.json vitest.config.ts bizcity.authz.json ./
COPY packages packages
COPY apps apps
# Kiểm trước khi đóng gói: hợp đồng + giả lập phải xanh, kiểu phải sạch.
RUN pnpm exec vitest run && pnpm run typecheck && pnpm run web:build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
LABEL org.opencontainers.image.title="open-cake-web" \
      org.opencontainers.image.source="https://github.com/hoanganh8389/open-cake" \
      org.opencontainers.image.licenses="GPL-2.0-or-later"
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
