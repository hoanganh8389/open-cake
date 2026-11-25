# PHASE-002-NEN-HOP-DONG-NANG-LUC — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S002-1 | Monorepo tối thiểu: npm workspaces, TypeScript strict, vitest | ☑ |
| S002-2 | **Hợp đồng nền** (bản đầu, sẽ chuyển sang `@bizcity/contracts`): phong bì API `bizcity_api@1`, mã lỗi chung + lý do `CAKE_*`, khuôn sự kiện `bizcity_event@1`, p | ☑ |
| S002-3 | **Khung năng lực**: `defineActionSpec({id, input, output, permission, risk, idempotent, emits, expose})` + danh mục năng lực `cake.*` | ☑ |
| S002-4 | **Trục contact**: kiểu ID (ULID có nhãn), `channel`, `scope`, identity, contact, conversation, message, touch, `contact_state` | ☑ |
| S002-5 | **Ba hợp đồng cake**: `bizcity_touch@1`, `bizcity_channel_command@1`, `bizcity_contact@1` (zod khớp file `docs/contracts/*.md`) | ☑ |
| S002-6 | **Registry lớp mềm**: khoá `entity_meta` / `user_meta` / `options` + `record_type` khởi đầu (`cake.quick_reply`, `cake.label`, `cake.saved_bank`…) | ☑ |
| S002-7 | **Fixture** cho mỗi hợp đồng + bộ dữ liệu mẫu "Shop Hoa Mai" (từ bản mẫu giao diện) đều qua zod | ☑ |
| S002-8 | Test: mọi fixture hợp lệ; ca sai (thiếu `scope`, `channel: "facebook"` trơn, ghép theo tên) bị từ chối; không hai action trùng `id` / `expose.rest` (SC-REUSE-4) | ☑ |
