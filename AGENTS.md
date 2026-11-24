# AGENTS.md — open-cake

<!-- [2026-11-24 Claude Opus 5.5] INIT — nếp làm việc kế thừa open-ketoan AGENTS.md; luật cấp trên là BIZCITY OPEN CANON. -->

Đọc theo thứ tự: [docs/canon/BIZCITY-OPEN-CANON-v1.md](docs/canon/BIZCITY-OPEN-CANON-v1.md) → [docs/00-CANON.md](docs/00-CANON.md) → ADR-0001 → phase đang mở.

## Bốn câu không được quên

1. **`contact_id` là trục.** Không bảng nào khoá theo id kênh.
2. **Không ghép người theo tên.** Chỉ ghép khi có `proof`.
3. **Kênh sống ở Cell.** Repo này không có cookie, token, khoá E2EE, không gọi LLM.
4. **Một bản mã, mỗi site một database.** Không rẽ nhánh `if multi` trong nghiệp vụ.

## Nếp

- **R-FLOW:** claim việc ở `docs/phases/CLAIMS.md` trước khi code. Trùng phạm vi ⇒ dừng, hỏi.
- **R-SIG:** mọi sửa đổi chức năng mang dấu `[YYYY-MM-DD HH:MM AM/PM Johnny Chu - Chu Hoàng Anh] <CODE> — …` (giờ máy thật, không ghi tên agent, không sửa dấu cũ).
- **R-LEAN-4:** Contract → Code → Test → Record. Mỗi màn ≤ 4 bước, 4 trạng thái.
- **Khung mã:** như open-ketoan — `apps/api`, `apps/web`, `packages/*`, `modules/*`, `db/migrations/*.sql` (SQL là sự thật), `tests/conformance/selfcheck.mjs`. File < 200 dòng, kebab-case, định danh tiếng Anh, chú thích tiếng Việt.
- **Module mới:** chỉ trong `modules/<key>/`; không đụng `packages/*`.
- **Trước khi nói xong:** `npm run typecheck`, `npm test`, `node tests/conformance/selfcheck.mjs --strict`.
- **Bản quyền:** mỗi file mã mới bắt đầu bằng `// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.`
- **Số liệu:** chưa có nguồn hiện "—" kèm lý do. Không "Đã kết nối" giả.

## Hai bản song song

Plugin WordPress `open-crm` và `open-cake` **không** chung database, bảng, route. Chung: tên sản phẩm, token UI, luật, hợp đồng. Mỗi phase ghi rõ "áp dụng cho: WP · cake · cả hai".
