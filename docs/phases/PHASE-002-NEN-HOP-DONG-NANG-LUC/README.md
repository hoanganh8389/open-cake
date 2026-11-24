# PHASE-002 — Nền hợp đồng & năng lực (contracts-first)
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — chủ (2026-11-24): "phase này cần tập trung làm open-cake foundation framework contract và hình thành UI/UX trước, làm open-ketoan sau". -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** 🟡 đang làm · **Phụ thuộc:** 001 (kiến trúc) — **không** phụ thuộc open-ketoan, không phụ thuộc backend
> **Mục tiêu:** mọi hình dữ liệu, mọi năng lực (action), mọi mã lỗi, mọi khoá lớp mềm của open-cake được **khai bằng zod một chỗ** (`packages/contracts`), có fixture và test — để giao diện (PHASE-003), backend (007+), MCP và Cell cùng dựa vào **một** nguồn.
> **Ngoài phạm vi:** bảng SQL, Fastify, DB, Docker (PHASE-016 / 007), mọi việc trong open-ketoan.

## Vì sao làm trước

Canon R-CANON-14: một năng lực = một action ⇒ REST + MCP + React + sự kiện. Khai **action + schema trước** thì UI dựng ngay trên dữ liệu giả lập đúng hợp đồng, backend về sau chỉ việc hiện thực đúng các action đã có — không ai phải đoán hình dữ liệu (bài học C-5 bản WP: REST trả trường khác tên ⇒ màn trống không lỗi).

## Đầu ra

| # | Việc | Ở |
|---|---|---|
| S002-1 | Monorepo tối thiểu: npm workspaces, TypeScript strict, vitest | gốc repo |
| S002-2 | **Hợp đồng nền** (bản đầu, sẽ chuyển sang `@bizcity/contracts`): phong bì API `bizcity_api@1`, mã lỗi chung + lý do `CAKE_*`, khuôn sự kiện `bizcity_event@1`, phân trang số + con trỏ | `packages/contracts/src/base/` |
| S002-3 | **Khung năng lực**: `defineActionSpec({id, input, output, permission, risk, idempotent, emits, expose})` + danh mục năng lực `cake.*` | `packages/contracts/src/base/action.ts`, `src/cake/actions.ts` |
| S002-4 | **Trục contact**: kiểu ID (ULID có nhãn), `channel`, `scope`, identity, contact, conversation, message, touch, `contact_state` | `packages/contracts/src/cake/` |
| S002-5 | **Ba hợp đồng cake**: `bizcity_touch@1`, `bizcity_channel_command@1`, `bizcity_contact@1` (zod khớp file `docs/contracts/*.md`) | `packages/contracts/src/cake/` |
| S002-6 | **Registry lớp mềm**: khoá `entity_meta` / `user_meta` / `options` + `record_type` khởi đầu (`cake.quick_reply`, `cake.label`, `cake.saved_bank`…) | `packages/contracts/src/flex/` |
| S002-7 | **Fixture** cho mỗi hợp đồng + bộ dữ liệu mẫu "Shop Hoa Mai" (từ bản mẫu giao diện) đều qua zod | `packages/contracts/fixtures/` |
| S002-8 | Test: mọi fixture hợp lệ; ca sai (thiếu `scope`, `channel: "facebook"` trơn, ghép theo tên) bị từ chối; không hai action trùng `id` / `expose.rest` (SC-REUSE-4) | `packages/contracts/test/` |

## Xong khi

`npm test` xanh; `npm run typecheck` 0 lỗi; mỗi năng lực trong [15-CAPABILITIES](../../architecture/15-CAPABILITIES-AND-FLEX-DATA.md) có một action spec; mỗi hợp đồng trong `docs/contracts/` có schema zod + fixture; PHASE-003 import được `@open-cake/contracts` để dựng màn.
