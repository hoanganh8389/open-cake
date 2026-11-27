# open-cake · 50 — Triển khai: Docker, biến môi trường, nhiều site, phát hành

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-DEPLOY — khuôn docker-compose / Dockerfile / .env / CI của open-ketoan main 6ad77b6; cổng riêng để chạy cạnh Kế Toán và zalo-hub trên một VPS. -->

## 1. Compose

| Service | Ảnh | Ghi |
|---|---|---|
| `db` | `postgres:16-alpine` | volume `pgdata`; tạo vai `cake_app` (không siêu người dùng) ở init |
| `db-migrate` | ảnh `api`, `node dist/db/setup.js` | chạy một lần; `SITE_MODE=multi` ⇒ template trước rồi từng site (R-SITE-8) |
| `api` | `docker/api.Dockerfile` (node:22-alpine, tầng build → conformance → runtime, `NODE_OPTIONS=--enable-source-maps`) | cổng nội bộ 4200; healthcheck `/api/v1/system/health/ready` |
| `web` | `docker/web.Dockerfile` (nginx:1.27-alpine) | `${WEB_BIND:-127.0.0.1}:${WEB_PORT:-8110}:80`; proxy `/api/`, `/mcp`, `/ingress/`, `/_sites/`, `/metrics` (chặn ngoài) → `api:4200`; cho phép nhúng iframe wp-admin theo `FRAME_ANCESTORS` |
| `redis` | `redis:7-alpine`, **profile `redis`** | `docker compose --profile redis up -d` |

Compose project `cake` (khác `ketoan`, `zalo-hub`); log json-file 10m × 3; volume `appdata`, `logs` (`LOG_HOST_DIR`). Giám sát: `infrastructure/monitoring/docker-compose.monitoring.yml`; sao lưu: `infrastructure/backup/docker-compose.pitr.yml`.

## 2. Biến môi trường (`.env.example`, mỗi biến có mặc định an toàn)

| Nhóm | Biến |
|---|---|
| Xác thực | `JWT_SECRET` (bắt buộc ở production), `JWT_TTL_HOURS=12`, `CORS_ORIGINS`, `FRAME_ANCESTORS` |
| DB | `DB_PASSWORD`, `DB_APP_USER=cake_app`, `DB_APP_PASSWORD`, `DB_SET_ROLE`, `DATABASE_URL` |
| Nhiều site | `SITE_MODE=single`, `CONTROL_DATABASE_URL`, `SITE_TEMPLATE_DB=cake_template`, `SITE_SECRET_KEY`, `PROVISION_DATABASE_URL`, `SITE_ADMIN_HOST` |
| Hub / Cell | `HUB_BASE_URL`, `HUB_SERVICE_KEY_HASH`, `HUB_SIGNING_SECRET`, `INGRESS_MAX_BYTES=262144`, `INGRESS_SKEW_SECONDS=300` |
| App anh em | `KETOAN_BASE_URL`, `KETOAN_API_KEY` (theo site, lưu mã hoá trong `setting_values`; biến chỉ cho `SITE_MODE=single`), `POS_WEBHOOK_SECRET` |
| WordPress | `WP_SSO_SECRET`, `WP_SSO_TENANT`, `WP_SSO_LOGIN_URL`, `WP_ADMIN_URL` |
| Quan sát | `METRICS_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME=cake-api`, `OTEL_SDK_DISABLED`, `LOG_HOST_DIR`, `LOG_FILE_LEVEL=warn`, `LOKI_LABELDROP`, `GRAFANA_ADMIN_PASSWORD` |
| Redis | `REDIS_URL` (trống = tắt) |
| Module | `BIZCITY_MODULES_DIR`, `ENABLED_MODULES` |
| Seed | `SEED_TENANT_CODE`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `BIZCITY_SAMPLE` (dữ liệu mẫu shop) |
| Build | `BIZCITY_GIT_SHA` |

## 3. Cài nhanh (một site)

```bash
git clone https://github.com/hoanganh8389/open-cake && cd open-cake
cp .env.example .env    # đặt JWT_SECRET, DB_PASSWORD, DB_APP_PASSWORD
docker compose up -d && docker compose logs -f db-migrate
# mở http://127.0.0.1:8110/ — đăng nhập SEED_ADMIN_EMAIL
```

## 4. Nhiều site + open-setup

1. `SITE_MODE=multi`, `CONTROL_DATABASE_URL`, `SITE_ADMIN_HOST=admin.<miền>`; wildcard `*.<miền gốc>` proxy về `web`.
2. `node dist/cli/site.js key-create --label open-setup --ips <ip>` ⇒ khoá `prov_…`.
3. open-setup: thêm dòng URL cho `product = cake` (Q-2) ⇒ `POST /_sites/v1/sites {slug, domain, displayName, owner, externalRef, sample, product:"cake"}` ⇒ `202 {jobId}` ⇒ poll.
4. Hub: khi job `done`, open-setup (hoặc webhook site) báo Hub `site_domains.channel_ingress = https://<slug>.<miền>/ingress/v1` (Q-3).

## 5. Phát hành và nâng cấp (R-REL-1..11, R-SITE-8..10)

- Tag ký; `/system/health` trả `version, kernel, standard`; CHANGELOG ba phần (Standard / hợp đồng / kernel) + mục `[Chưa phát hành]`.
- Không migration xuống (R-REL-5); migration đã phát hành khoá bằng checksum (R-DB-15).
- Thứ tự nhiều site: build → test → sao lưu → migrate `cake_template` → migrate từng site (site lỗi ⇒ `migration_failed`, 503 `SITE_UPGRADING` riêng site đó) → đổi bản `api` → mọi site cùng mã.
- Ảnh có nhãn OCI + SBOM; tài liệu cần lúc chạy đóng trong ảnh.

## 6. CI (`.github/workflows/`)

| Job | Lệnh |
|---|---|
| guard | `bash scripts/kiem-chuan.sh` (grep H-*: H-LEDGER, H-TRIGGER-OFF, H-CROSS-MODULE, H-REPLY, H-SKIP, H-SECRET, H-MD-TABLE, H-METRIC-LABEL, H-CAKE-SECRET-COL, H-CAKE-NAME-MERGE) |
| typecheck | `pnpm run typecheck` (repo dùng pnpm 9 — `packageManager` trong package.json; PHASE-019 S019-1) |
| test | `npm test` trên PostgreSQL 16 dịch vụ, DB `cake_test` (vitest từ chối tên không có `test`) |
| migrate-upgrade | `scripts/kiem-nang-cap.sh <tag trước>` |
| conformance | `node tests/conformance/selfcheck.mjs --lane selfcheck --strict`; promtool / amtool / otelcol validate |
| contracts | kiểm fixture `docs/contracts/fixtures/*.json` khớp schema zod |
