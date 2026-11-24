# PHASE-017 — Danh mục độc lập, sẵn ánh xạ: hàng hoá · nhóm · ĐVT · bảng giá theo chuẩn open-ketoan
<!-- [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — chủ (2026-11-24): "ưu tiên standalone giống Deplao, open-pos-backend: sản phẩm hàng hoá, danh mục, bảng giá phải độc lập nhưng ready chuẩn cho tình huống ánh xạ được từ open-ketoan về sau". Đồng bộ contact / item / tenant làm sau (PHASE-010). -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☑ 2026-11-24 (trừ tab nhiều bảng giá — làm khi có bảng giá thứ hai) · **Phụ thuộc:** 002 (nền hợp đồng), [ADR-0004](../../adr/ADR-0004-doc-lap-truoc-san-anh-xa.md)
> **Mục tiêu:** Cake chạy một mình với danh mục hàng / nhóm / ĐVT / bảng giá của riêng nó, dữ liệu nhập vào luôn đúng chuẩn open-ketoan (H-1…H-18) để sau này gắn `item_id`, mã đối tượng, `tenant_id` mà không phải sửa dữ liệu.
> **Ngoài phạm vi:** kéo / đẩy với Kế Toán (PHASE-010), tồn kho, đơn hàng, giá theo nhóm khách.

## Đầu ra

| # | Việc | TT |
|---|---|---|
| S017-1 | `packages/contracts/src/catalog/standard.ts` — chuẩn H-*: 40 tên ĐVT, mã thuế, SKU (H-1…H-5), tên ≤ 50, giá 2 số lẻ, bộ ĐVT (một tỉ lệ 1, ≤ 10, không trùng); cảnh báo mức W `CAT-*` | ☑ |
| S017-2 | `catalog/entities.ts` — hàng, mã có hiệu lực, nhóm 3 cấp, bảng giá, dòng giá; khối ánh xạ `MasterSync` chung; `tenant_links`; **một cổng ghi** `catalogWriteGate` | ☑ |
| S017-3 | `catalog/actions.ts` — 9 action `cake.catalog_*` (REST + MCP đọc + UI), quyền `cake:catalog-xem · lap · sua · gia`; lý do `CAKE_CATALOG_READONLY`, `CAKE_SKU_TAKEN`, `CAKE_ITEM_NAME_TAKEN` | ☑ |
| S017-4 | Bộ giả lập `handlers-catalog.ts` + hàng mẫu Shop Hoa Mai; test chuẩn H-* và cổng ghi | ☑ |
| S017-5 | Migration `db/migrations/0102_catalog.sql`: `catalog_categories`, `catalog_items`, `catalog_item_codes`, `catalog_item_units`, `catalog_price_lists`, `catalog_prices`, `tenant_links`, `contact_links` + RLS FORCE; kiểm trên Postgres 16 | ☑ 7 ràng buộc sai bị chặn (giá sai ĐVT, trùng tên, SKU thường, hai ĐVT gốc, hai bảng giá công ty, nguồn ketoan thiếu liên kết, SKU cấp lại), RLS tách đơn vị |
| S017-6 | Màn **Hàng hoá** (danh sách, tạo / sửa theo chuẩn, cảnh báo `CAT-*`, nhãn "Lấy từ Kế Toán" khi chỉ đọc) và **Bảng giá** trong `apps/web` + ảnh build | ☑ 4 ảnh [evidence/build-shots](evidence/build-shots/): `catalog-items`, `catalog-prices`, `catalog-ketoan` (?catalog=ketoan — khoá cột kế toán), `catalog-empty` |
| S017-7 | Gửi giá trong chat: nút thẻ giá cạnh ⚡, tìm hàng "Bán trong CRM" có giá → chèn câu báo giá vào ô soạn (`composer-panels.tsx`, không thêm kiểu tin / API) | ☑ ảnh `inbox-price-picker`, `inbox-price-inserted` |
| S017-8 | Đối chiếu SPINE 1.1 + làm gọn ([20-DOI-CHIEU-SPINE-VA-LEAN.md](20-DOI-CHIEU-SPINE-VA-LEAN.md)): cột riêng sang lớp mềm `cake.item.*`, `itemRefOf`, tenant slug, `ext_version`, tạo hàng kèm giá một lần gọi, `bizcity.app.json` khai `local/replica [item, uom]`; màn Hàng hoá một màn + Cài đặt › Nguồn danh mục; bizcity-platform PR #2 | ☑ 64 test, spine-check ĐẠT, 8 ảnh build |

## Quyết định

- D017-1: Nguồn danh mục theo đơn vị `local | ketoan`; mặc định `local` (ADR-0004 §3).
- D017-2: Luật mức E chặn ở zod (cửa vào), mức W trả cảnh báo — giống open-pos-backend.
- D017-3: Khoá là `item_id` (ULID); SKU chỉ là mã hiện hành, đổi bằng đóng / mở dòng mã.
- D017-4: Mã đối tượng công nợ = SĐT đã xác minh → `CAKE-<contact_id>` → `KHACH-LE` (R-CAKE-MASTER-5).

## Xong khi

Một site trắng tạo được nhóm, hàng, ĐVT, giá và báo giá trong chat mà không cần Kế Toán; mọi hàng tạo ra qua được bộ kiểm chuẩn H-*; đặt `catalog_source = ketoan` thì cột kế toán bị chặn ở cả API giả lập lẫn giao diện; test + typecheck xanh.

## Rủi ro

- Kế Toán đổi chuẩn hàng ⇒ hợp đồng lệch. Giảm: test hợp đồng bám bảng H-*, đọc lại `16-CHUAN-HANG-HOA` của open-pos khi nâng.
- Hai chủ cùng lúc ⇒ cấm bằng một cổng ghi duy nhất (R-CAKE-MASTER-3).
