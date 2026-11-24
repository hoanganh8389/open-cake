# PHASE-016 — Khung chạy trên `@bizcity/platform`: API / DB / Docker / CI / quan sát (trước là PHASE-002 + PHASE-003)
<!-- [2026-11-24 03:10 PM Johnny Chu - Chu Hoàng Anh] PLATFORM-SPLIT — chủ chốt: gói chung, không fork; lớp mềm bản đầu ở cake. -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — chủ (2026-11-24): nền hợp đồng + UI/UX làm trước (PHASE-002, 003 mới); khung chạy và quan sát dời xuống đây, dựng trên bizcity-platform (bản sao chỉ đọc từ open-ketoan, tổng quát hoá trong repo gói chung — open-ketoan không đổi). Nội dung quan sát ở 10-QUAN-SAT.md. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake (khuôn phase open-ketoan). -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 002, 003 · gói chung `bizcity-platform` dựng từ bản sao chỉ đọc của open-ketoan ([ADR-0003](../../adr/ADR-0003-nen-hop-dong-va-ui-truoc.md)) — open-ketoan không phải đổi
> **Mục tiêu:** `docker compose up` ra một API + web rỗng đúng khuôn open-ketoan (một site ngầm định), CI xanh, selfcheck chạy được — chưa có nghiệp vụ.
> **Ngoài phạm vi:** bảng care-kernel (005), giao diện thật (007), nhiều site (014).

## Đầu ra

| # | Việc | Gốc open-ketoan |
|---|---|---|
| S016-1 | npm workspaces `apps/{api,web}`, `packages/{contracts,platform,care-kernel,module-sdk,ui-kit,cli}`, `modules/`; Node ≥ 22.12, TS strict | root `package.json` |
| S016-2 | phụ thuộc `@bizcity/platform`, `@bizcity/contracts`, `@bizcity/module-sdk`, `@bizcity/ui-kit`, `@bizcity/cli`, `@bizcity/conformance` **theo phiên bản** (0.2.x); không chép mã; cake đăng ký nghiệp vụ qua cổng (`registerTouchSubmitter`, `registerCapabilities`, `registerErrorReasons`) | gói chung (P4) |
| S016-2b | `packages/flex` = `@bizcity/flex` **bản đầu** lớp dữ liệu mềm: migration `user_meta`, `entity_meta`, `record_types`, `records` + registry + action `core.meta.*`, `core.records.*` + `RecordTypeScreen` | canon R-CANON-15, D-PLAT-4 |
| S016-3 | `db/migrations/0001…` nền tảng: tenants, users, roles, api_keys, audit_logs, action_requests, setting_values, **user_meta, entity_meta, record_types, records (lớp mềm R-CANON-15 + registry)**, event_outbox / deliveries / consumptions, mcp_confirm_tokens, business_documents / versions / links / attachments, diagnostic_runs + RLS FORCE | 0001, 0035–0041, 0045, 0158 |
| S016-4 | ngữ cảnh site ở chế độ một site (`SITE_MODE=single`, Database Router một pool) — cùng đường mã với multi (R-SITE-5) | PHASE-039 B1 |
| S016-5 | `/api/v1/system/health`, `/health/ready`, `/capabilities`; phong bì + `Errors.*` | `bizcity_api@1` |
| S016-6 | `docker/{api,web}.Dockerfile`, `nginx.conf`, `docker-compose.yml` (db, db-migrate, api, web, redis profile), `.env.example` | docker/ |
| S016-7 | CI: guard (`kiem-chuan.sh` + H-CAKE-*), typecheck, test (`cake_test`), migrate-upgrade, conformance | .github/workflows |
| S016-8 | `tests/conformance/selfcheck.mjs` + `baseline.json` rỗng; SC-CAKE-6/7/8 tĩnh | tests/conformance |
| S016-9 | scripts: `so-tiep-theo.mjs`, `nhan-viec.mjs`, `ky-dau.mjs`, `lay-log.sh`, `kiem-nang-cap.sh` | scripts/ |

## Xong khi

`docker compose up -d` ⇒ `/health/ready` 200; `npm run typecheck && npm test` xanh; `selfcheck --strict` PASS; CI xanh trên PR đầu; cake chạy trên `@bizcity/platform` 0.2.x cài từ registry, không có mã platform chép trong repo; một `record_type` mẫu (`cake.quick_reply`) có màn CRUD tự sinh.

## Rủi ro

Gói chung chưa phát hành ⇒ PHASE-002 chờ; trong lúc chờ dùng `npm link` / workspace git tới nhánh tách, **không** chép mã. Cake cần sửa platform ⇒ PR vào repo gói chung (R-PLAT-3), không vá tại chỗ.
