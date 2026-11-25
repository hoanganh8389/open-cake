# PHASE-016 — Khung chạy trên `@bizcity/platform`: API / DB / Docker / CI / quan sát (trước là PHASE-002 + PHASE-003)
<!-- [2026-11-24 03:10 PM Johnny Chu - Chu Hoàng Anh] PLATFORM-SPLIT — chủ chốt: gói chung, không fork; lớp mềm bản đầu ở cake. -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — chủ (2026-11-24): nền hợp đồng + UI/UX làm trước (PHASE-002, 003 mới); khung chạy và quan sát dời xuống đây, dựng trên bizcity-platform (bản sao chỉ đọc từ open-ketoan, tổng quát hoá trong repo gói chung — open-ketoan không đổi). Nội dung quan sát ở 10-QUAN-SAT.md. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake (khuôn phase open-ketoan). -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ◐ · **Phụ thuộc:** 002, 003 · gói chung `bizcity-platform` dựng từ bản sao chỉ đọc của open-ketoan ([ADR-0003](../../adr/ADR-0003-nen-hop-dong-va-ui-truoc.md)) — open-ketoan không phải đổi
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** `docker compose up` ra một API + web rỗng đúng khuôn open-ketoan (một site ngầm định), CI xanh, selfcheck chạy được — chưa có nghiệp vụ.
> **Ngoài phạm vi:** bảng care-kernel (005), giao diện thật (007), nhiều site (014).

## Tiến độ

<!-- [2026-11-24 06:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — bắt đầu theo thứ tự P2b (platform) → apps/api của cake; mỗi bước một PR ở bizcity-platform. -->

| Bước | Ở đâu | Gỡ điểm chặn | TT |
|---|---|---|---|
| **P2b-1** trình chạy migration chung: nhiều nguồn (`sources`), trùng tên ⇒ dừng, cổng `hooks`; phần riêng Kế Toán tách ra `migrate-ketoan-legacy.ts` | bizcity-platform [PR #4](https://github.com/hoanganh8389/bizcity-platform/pull/4) | #2 `adoptBaseline` | ☑ đã merge 2026-11-24 (5 test trên Postgres thật) |
| **S016-2b (DB)** `0103_flex.sql`: `user_meta`, `entity_meta` (có `item`, 3 chỉ mục khoá indexed), `record_types`, `records` + RLS FORCE | open-cake | — | ☑ áp bằng trình chạy P2b-1: 0101–0103 một lần, chạy lại 0; 4 ca sai bị chặn; truy vấn meta dùng chỉ mục |
| **P2b-2** migration nền `0001_platform_nen_tang.sql` (26 bảng nền + 16 hàm, RLS FORCE) gom từ open-ketoan 6ad77b6, bỏ phần kế toán; `PLATFORM_MIGRATIONS_DIR` | bizcity-platform [PR #5](https://github.com/hoanganh8389/bizcity-platform/pull/5) | #4 bảng nền rải trong migration Kế Toán | ☑ đã merge 2026-11-24 (48 bảng cùng cake; 6 test) |
| **P2b-3** cổng vai / quyền / phạm vi khoá (`registerRoles`, `registerApiScopes`): nền chỉ `owner` + 12 quyền nền; vai và 6 quyền kế toán thành `ketoanAuthzPreset()`; migration `0002` nới ràng buộc tên vai | bizcity-platform [PR #6](https://github.com/hoanganh8389/bizcity-platform/pull/6) | #3 quyền viết cứng theo kế toán | ☑ đã merge 2026-11-24 — có trong **v0.2.0** |
| **P2b-4** `AppDatabase`: app gắn bảng vào kiểu `Database` bằng gộp khai báo, dùng thẳng `db` chung | bizcity-platform [PR #7](https://github.com/hoanganh8389/bizcity-platform/pull/7) | #1 `Database` cố định | ☑ đã merge 2026-11-24 — có trong **v0.2.0** |
| **P2b-5** phát hành 0.2.0 bằng tệp `.tgz` trên GitHub Release (chủ chốt: giữ tên `@bizcity/*`); `tools/dong-goi.mjs`, `release.yml`, `ci.yml` | bizcity-platform [PR #8](https://github.com/hoanganh8389/bizcity-platform/pull/8) | — | ☑ đã merge 2026-11-24 — có trong **v0.2.0** |
| **S016-1/5/6** `apps/api` trên v0.2.0: route sinh từ 32 action spec (ép kiểu query, kiểm vào + ra, idempotency qua `action_requests`, lỗi `CAKE_REASONS`); **9 action danh mục chạy Postgres** (`catalog.ts`), 23 action còn lại 501 `CAKE_NOT_ON_SERVER`; `AppDatabase` 8 bảng; health / ready (cổng lược đồ); compose `db · db-migrate · api · web`, nginx `/api`; web `?api=mix` | open-cake | — | ◐ danh mục ☑ — 5 test tích hợp (`createHttpClient` của web → API thật → Postgres), end-to-end giao diện trong Docker: 4 ảnh [evidence/build-shots](evidence/build-shots/) `api-*`; còn: đăng nhập (004), `PgCareRepo` (005), quan sát, CI (Actions bị khoá) |

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
