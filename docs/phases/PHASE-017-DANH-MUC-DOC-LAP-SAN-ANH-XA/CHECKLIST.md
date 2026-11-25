# PHASE-017-DANH-MUC-DOC-LAP-SAN-ANH-XA — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S017-1 | `packages/contracts/src/catalog/standard.ts` — chuẩn H-*: 40 tên ĐVT, mã thuế, SKU (H-1…H-5), tên ≤ 50, giá 2 số lẻ, bộ ĐVT (một tỉ lệ 1, ≤ 10, không trùng); cả | ☑ |
| S017-2 | `catalog/entities.ts` — hàng, mã có hiệu lực, nhóm 3 cấp, bảng giá, dòng giá; khối ánh xạ `MasterSync` chung; `tenant_links`; **một cổng ghi** `catalogWriteGate | ☑ |
| S017-3 | `catalog/actions.ts` — 9 action `cake.catalog_*` (REST + MCP đọc + UI), quyền `cake:catalog-xem · lap · sua · gia`; lý do `CAKE_CATALOG_READONLY`, `CAKE_SKU_TAK | ☑ |
| S017-4 | Bộ giả lập `handlers-catalog.ts` + hàng mẫu Shop Hoa Mai; test chuẩn H-* và cổng ghi | ☑ |
| S017-5 | Migration `db/migrations/0102_catalog.sql`: `catalog_categories`, `catalog_items`, `catalog_item_codes`, `catalog_item_units`, `catalog_price_lists`, `catalog_p | ☑ |
| S017-6 | Màn **Hàng hoá** (danh sách, tạo / sửa theo chuẩn, cảnh báo `CAT-*`, nhãn "Lấy từ Kế Toán" khi chỉ đọc) và **Bảng giá** trong `apps/web` + ảnh build | ☑ |
| S017-7 | Gửi giá trong chat: nút thẻ giá cạnh ⚡, tìm hàng "Bán trong CRM" có giá → chèn câu báo giá vào ô soạn (`composer-panels.tsx`, không thêm kiểu tin / API) | ☑ |
| S017-8 | Đối chiếu SPINE 1.1 + làm gọn ([20-DOI-CHIEU-SPINE-VA-LEAN.md](20-DOI-CHIEU-SPINE-VA-LEAN.md)): cột riêng sang lớp mềm `cake.item.*`, `itemRefOf`, tenant slug,  | ☑ |
