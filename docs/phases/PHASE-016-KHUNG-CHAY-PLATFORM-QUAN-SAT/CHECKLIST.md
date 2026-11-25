# PHASE-016-KHUNG-CHAY-PLATFORM-QUAN-SAT — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S016-1 | npm workspaces `apps/{api,web}`, `packages/{contracts,platform,care-kernel,module-sdk,ui-kit,cli}`, `modules/`; Node ≥ 22.12, TS strict | ◐ |
| S016-2 | phụ thuộc `@bizcity/platform`, `@bizcity/contracts`, `@bizcity/module-sdk`, `@bizcity/ui-kit`, `@bizcity/cli`, `@bizcity/conformance` **theo phiên bản** (0.2.x) | ◐ |
| S016-2b | `packages/flex` = `@bizcity/flex` **bản đầu** lớp dữ liệu mềm: migration `user_meta`, `entity_meta`, `record_types`, `records` + registry + action `core.meta.*` | ◐ |
| S016-3 | `db/migrations/0001…` nền tảng: tenants, users, roles, api_keys, audit_logs, action_requests, setting_values, **user_meta, entity_meta, record_types, records (l | ☑ |
| S016-4 | ngữ cảnh site ở chế độ một site (`SITE_MODE=single`, Database Router một pool) — cùng đường mã với multi (R-SITE-5) | ☐ |
| S016-5 | `/api/v1/system/health`, `/health/ready`, `/capabilities`; phong bì + `Errors.*` | ◐ |
| S016-6 | `docker/{api,web}.Dockerfile`, `nginx.conf`, `docker-compose.yml` (db, db-migrate, api, web, redis profile), `.env.example` | ☑ |
| S016-7 | CI: guard (`kiem-chuan.sh` + H-CAKE-*), typecheck, test (`cake_test`), migrate-upgrade, conformance | ☐ |
| S016-8 | `tests/conformance/selfcheck.mjs` + `baseline.json` rỗng; SC-CAKE-6/7/8 tĩnh | ☑ |
| S016-9 | scripts: `so-tiep-theo.mjs`, `nhan-viec.mjs`, `ky-dau.mjs`, `lay-log.sh`, `kiem-nang-cap.sh` | ☐ |
| S016-Q1 | logger pino + REDACT_PATHS + khoá PII Cake + installProcessHandlers + tệp lỗi theo ngày ([10-QUAN-SAT](10-QUAN-SAT.md)) | ☑ |
| S016-Q2 | OTel: nhận / truyền `traceparent`, span HTTP · action · db, `traceId` vào log + lỗi | ☑ |
| S016-Q3 | `/metrics` (`METRICS_TOKEN`): `bizcity_*` của nền + `bizcity_cake_*` | ☑ |
| S016-Q4 | nối bộ giám sát chung của máy chủ (`infrastructure/monitoring`: đoạn scrape + OTLP) | ◐ |
| S016-Q5 | dashboard + cảnh báo Cake* + test cảnh báo (`promtool`) + sổ tay | ☐ |
| S016-Q6 | ErrorBoundary web + `POST /system/client-errors` | ☑ |
| S016-Q7 | `diagnostic_runs`, L0 / L1, `bizcity doctor --bundle` | ☐ |
