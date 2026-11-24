# PHASE-017 · Đối chiếu `bizcity_spine@1-draft` và kế hoạch làm gọn (chờ chủ duyệt mockup)
<!-- [2026-11-24 05:28 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — chủ (2026-11-24): "giao diện lean, gọn, không rối, code base cũng vậy; đối chiếu chuẩn bizcity-platform; research kỹ, mockup shots xem trước". Nguồn: bizcity-platform 6622e16 (SPINE-1: docs/standard/BIZCITY-SPINE-v1.md, schema/spine, tools/spine-check.mjs). -->

## 1. Đối chiếu với `bizcity_spine@1-draft`

| # | Chuẩn SPINE nói | PHASE-017 đang làm | Xử lý |
|---|---|---|---|
| S1 | Trục **item / uom / branch** do open-ketoan làm chủ; app khác **không bịa `id`** (R-SPINE-1); danh mục cục bộ dùng **khoá cục bộ** `local` + `code`, ràng buộc muộn (R-SPINE-9) | `itemId` ULID do Cake tự sinh, cột `ext_id` chờ gắn | Khớp về bản chất. Thêm luật: **`itemId` của Cake là khoá cục bộ**, trên dây gửi `ItemRef {local:"cake:item:<itemId>", code}` cho tới khi có `ext_id`, sau đó `{id: ext_id}`. Không bao giờ gửi `itemId` của Cake ở ô `id`. |
| S2 | Bản sao: cột tối thiểu `id chủ · code_at · source · source_version · synced_at`; **cột cục bộ ở lớp mềm** `entity_meta` namespace `<app>.` (R-SPINE-5, R-SPINE-10) | khối `MasterSync` (`ext_id, ext_synced_at, ext_hash, push_status`); 4 cột vận hành (`display_name, is_sellable_in_crm, image_url, description`) nằm thẳng trong `catalog_items` | Thêm `ext_version` (đối chiếu digest `{id, version}`). **Chuyển 4 cột vận hành sang `entity_meta` `cake.item.*`** — bảng hàng chỉ còn cột theo chuẩn Kế Toán; gọn hơn và đúng R-CANON-15. |
| S3 | `tenant` trên dây = **slug** `^[a-z][a-z0-9-]{1,30}$`; `tenant_id` bigint của Kế Toán **không lộ ra dây** | `TenantLink.oktTenantId` | Đổi thành `tenant` (slug, ví dụ `hoa-mai`) + `branchCode` theo khuôn `^[A-Z0-9_.-]{1,20}$`. |
| S4 | Manifest `bizcity.app.json` ở gốc repo; kiểm `spine-check --manifest` | **đã có** (PR #1 SPINE, spine-check ĐẠT): owns `contact, touch, document` · uses `tenant, user, item, partner` · replica `item` — **chưa khai danh mục cục bộ** | Khi duyệt: thêm `uom` vào `uses` / `replica`, thêm `local: [item, uom]`, `reconcile: [RC-SPINE-item]`; sửa `notes` mã đối tượng theo Q-017-2. Chạy lại spine-check. |
| S5 | **`uom` trên dây ASCII** `^[A-Za-z0-9_.-]{1,20}$` — vector coi `"cái"` là **sai** | 40 tên ĐVT chuẩn có dấu (`Cái`, `Hộp`…) — open-ketoan `product_units.unit` và open-pos H-9 đều lưu có dấu | **Lệch trong chính chuẩn SPINE** (không phải lỗi Cake): dữ liệu thật của chủ (open-ketoan) là `Cái`. Đề xuất sửa SPINE: `uom` = tên ĐVT của chủ (Unicode, ≤ 20, không khoảng trắng đầu / cuối) hoặc thêm `uom_code` ASCII bên cạnh tên. Cake giữ nguyên 40 tên có dấu tới khi chốt. **Q-017-1.** |
| S6 | Bảng SPINE §2 ghi "open-cake dùng `CAKE-<contact_id>`" làm `partner.code` | R-CAKE-MASTER-5 (ADR-0004): **số điện thoại đã xác minh** trước (khớp open-pos), không có mới `CAKE-<contact_id>` | Hai tài liệu lệch. Đề xuất SPINE theo ADR-0004 để một khách mua ở quầy và nhắn qua Fanpage **không thành hai đối tượng công nợ**. **Q-017-2.** |
| S7 | `user` = `sub` `wp:<id>` | chưa đụng (PHASE-004) | Ghi vào PHASE-004. |
| S8 | `doc_ref` `<module>.<loại>:<id>` | báo giá / yêu cầu đặt hàng chưa có | Khi có (PHASE-010): `cake.quote:<ULID>`, `cake.order_request:<ULID>`. |

## 2. Làm gọn (lean) — giao diện

| Trước (bản build 17:10) | Sau (mockup) | Lý do |
|---|---|---|
| 2 tab Hàng hoá / Bảng giá, cùng hiện giá công ty ở cả hai | **Một màn "Hàng hoá"**, giá sửa ngay trên dòng; tab Bảng giá **chỉ hiện khi có ≥ 2 bảng giá** | bỏ trùng; 1 shop nhỏ chỉ có 1 bảng giá |
| Chip nhóm + cột "Nguồn" mỗi dòng + khung ghi chú xanh to + thanh trạng thái | ô chọn nhóm; nguồn là **một huy hiệu** cạnh tiêu đề, chỉ khi Kế Toán giữ; bỏ cột Nguồn, bỏ thanh trạng thái | nguồn là của cả đơn vị, không của từng dòng |
| Cảnh báo `CAT-*` dạng huy hiệu chữ mã | một biểu tượng ⚠ cạnh tên, di chuột xem câu tiếng Việt | mã kỹ thuật không phải việc của nhân viên bán hàng |
| Form thêm 1 cột dài, nhiều dòng giải thích | 6 ô, lưới 2–3 cột, **một dòng** gợi ý chuẩn, lỗi đỏ ngay dưới ô | ngắn, đọc một lượt |
| Sheet sửa: tiêu đề = tên hàng | "Sửa hàng" (R-WEB-6: động từ + đối tượng); sheet mở theo URL (R-WEB-2) | đúng luật web |
| Kế Toán giữ: nút mờ + ghi chú dài | không có nút Thêm; cột **"Bán trong CRM"** là thứ duy nhất sửa được, bật / tắt ngay | chỉ hiện việc làm được |
| — | **Gửi giá trong chat**: nút thẻ giá cạnh ⚡; tìm hàng → **chèn chữ vào ô soạn**, nhân viên sửa rồi gửi | không thêm kiểu tin, không thêm API — dùng lại `cake.catalog_item.list` + `cake.catalog_price.list` |
| — | **Cài đặt › Nguồn danh mục**: 2 lựa chọn, "Lấy từ Kế Toán" khoá kèm lý do; mã đơn vị `tenant` slug + `branch_code` | chỗ duy nhất đổi nguồn |

## 3. Làm gọn — mã

- `Catalog.tsx` 230 dòng > 200 (R-WEB-14) ⇒ tách `screens/catalog/{index, item-table, item-sheet, price-cell}.tsx`, mỗi file < 120 dòng.
- Bỏ `PriceListTab` riêng khi chỉ có 1 bảng giá; `PriceCell` dùng chung cho bảng hàng và tab bảng giá.
- `PricePicker` (chat) đặt cạnh `QuickReplies` cùng một khuôn popover — tách `QuickReplies` ra file riêng, `InboxChat` gọn lại.
- Cột vận hành sang `entity_meta` (S2) ⇒ `ItemSchema` bớt 4 trường, `OPERATIONAL_ITEM_FIELDS` thành danh sách khoá meta trong registry (đã có `cake.contact.real_name` làm mẫu); `catalogWriteGate` chỉ còn một danh sách cột.
- Không thêm phụ thuộc mới.

## 4. Mockup

`evidence/build-shots/mockup-*.png` (nguồn: `mockup/index.html`, dùng `tokens.css` / `chat.css` thật):

| Ảnh | Màn |
|---|---|
| `mockup-hang-hoa.png` | Hàng hoá — một màn, sửa giá trên dòng, ⚠ thiếu chuẩn |
| `mockup-them-hang.png` | Thêm hàng — 6 ô, lỗi trùng tên ngay dưới ô |
| `mockup-ke-toan-giu.png` | Danh mục do Kế Toán giữ — chỉ bật / tắt "Bán trong CRM" |
| `mockup-gui-gia.png` | Gửi giá trong chat — chọn hàng, chèn vào ô soạn |
| `mockup-nguon.png` | Cài đặt › Nguồn danh mục + mã đơn vị |

## 5. Câu hỏi chờ chủ

- **Q-017-1** `uom` trên dây: sửa SPINE cho nhận tên ĐVT có dấu của Kế Toán (đề xuất), hay thêm `uom_code` ASCII?
- **Q-017-2** `partner.code` từ Cake: số điện thoại đã xác minh trước (đề xuất, khớp open-pos) hay luôn `CAKE-<contact_id>` như bảng SPINE?
- **Q-017-3** Duyệt 5 mockup để code.
