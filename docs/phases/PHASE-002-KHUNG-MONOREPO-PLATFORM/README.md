# PHASE-002 — Khung monorepo: platform fork, API / web rỗng, Docker, CI, selfcheck
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake (khuôn phase open-ketoan). -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 001 (D018-1, Q-1 chốt fork)
> **Mục tiêu:** `docker compose up` ra một API + web rỗng đúng khuôn open-ketoan (một site ngầm định), CI xanh, selfcheck chạy được — chưa có nghiệp vụ.
> **Ngoài phạm vi:** bảng care-kernel (005), giao diện thật (007), nhiều site (014).

## Đầu ra

| # | Việc | Gốc open-ketoan |
|---|---|---|
| S002-1 | npm workspaces `apps/{api,web}`, `packages/{contracts,platform,care-kernel,module-sdk,ui-kit,cli}`, `modules/`; Node ≥ 22.12, TS strict | root `package.json` |
| S002-2 | fork `packages/platform`, `module-sdk`, `ui-kit`, `cli` + `UPSTREAM.md` (commit 6ad77b6, danh sách file, phần đã đổi); `scripts/so-upstream.mjs` báo trôi | `packages/*` |
| S002-3 | `db/migrations/0001…` nền tảng: tenants, users, roles, api_keys, audit_logs, action_requests, setting_values, **user_meta, entity_meta, record_types, records (lớp mềm R-CANON-15 + registry)**, event_outbox / deliveries / consumptions, mcp_confirm_tokens, business_documents / versions / links / attachments, diagnostic_runs + RLS FORCE | 0001, 0035–0041, 0045, 0158 |
| S002-4 | ngữ cảnh site ở chế độ một site (`SITE_MODE=single`, Database Router một pool) — cùng đường mã với multi (R-SITE-5) | PHASE-039 B1 |
| S002-5 | `/api/v1/system/health`, `/health/ready`, `/capabilities`; phong bì + `Errors.*` | `bizcity_api@1` |
| S002-6 | `docker/{api,web}.Dockerfile`, `nginx.conf`, `docker-compose.yml` (db, db-migrate, api, web, redis profile), `.env.example` | docker/ |
| S002-7 | CI: guard (`kiem-chuan.sh` + H-CAKE-*), typecheck, test (`cake_test`), migrate-upgrade, conformance | .github/workflows |
| S002-8 | `tests/conformance/selfcheck.mjs` + `baseline.json` rỗng; SC-CAKE-6/7/8 tĩnh | tests/conformance |
| S002-9 | scripts: `so-tiep-theo.mjs`, `nhan-viec.mjs`, `ky-dau.mjs`, `lay-log.sh`, `kiem-nang-cap.sh` | scripts/ |

## Xong khi

`docker compose up -d` ⇒ `/health/ready` 200; `npm run typecheck && npm test` xanh; `selfcheck --strict` PASS; CI xanh trên PR đầu; `UPSTREAM.md` ghi commit gốc.

## Rủi ro

Fork trôi khỏi open-ketoan ⇒ `so-upstream.mjs` chạy hằng tuần; mọi sửa trong `packages/platform` ghi vào `UPSTREAM.md`.
