# ADR-0004 — Độc lập trước, sẵn ánh xạ: open-cake có danh mục riêng theo chuẩn open-ketoan

<!-- [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] ADR-0004 — chủ (2026-11-24): "open-cake đồng bộ chủ yếu contact (partner id bên okt), item id, tenant id… làm sau, nhưng phải ưu tiên standalone giống Deplao, open-pos-backend: sản phẩm hàng hoá, danh mục, bảng giá phải độc lập nhưng ready chuẩn cho tình huống ánh xạ được từ open-ketoan về sau vẫn dùng chuẩn". -->

**Trạng thái:** Chấp nhận (chủ dự án, 2026-11-24) · **Áp dụng cho:** cake · **Sửa:** R-CAKE-SIB-1, R-CAKE-SIB-3 ở 00-CANON; canon open-hub §3 (lên 1.3.0) · **Mẫu theo:** open-ketoan `RULE-OPEN-POS-CONNECTION.md` (R-OKT-CONN-1…12), open-pos-backend PHASE-001 (`16-CHUAN-HANG-HOA-OPEN-POS-OPEN-KETOAN.md` H-1…H-18)

## Bối cảnh

- Canon 1.2 và 00-CANON 0.2 viết "Cake không có bảng khách / hàng / đơn riêng; tham chiếu Kế Toán". Đúng khi có Kế Toán, nhưng làm Cake **không chạy được một mình** — trái hướng sản phẩm (Deplao chạy một mình; open-pos-backend chạy một mình).
- open-pos-backend đã giải bài này: **mỗi đơn vị chọn nguồn danh mục `local` | `ketoan`**; `local` là chế độ **đầy đủ**; `ketoan` biến bảng cục bộ thành **bản sao chỉ đọc** cho cột kế toán, kéo một chiều, chỉ đẩy mã mới; dữ liệu nhập ở `local` đã theo **chuẩn H-1…H-18** nên chuyển sang `ketoan` lúc nào cũng khớp.
- open-ketoan: `item_id` ULID bất biến, mã ở `item_codes` có hiệu lực, giá gồm VAT ở `product_prices (price_list_code, sku, unit)`, đối tượng công nợ `partners.code` (khách lẻ dùng số điện thoại; vãng lai `KHACH-LE`); **gửi mã, lưu định danh** (R-MD-2); không đồng bộ hai chiều (R-MD-1).

## Quyết định

1. **Cake chạy một mình đầy đủ**: có danh mục hàng (`catalog_items`), mã / mã vạch (`catalog_item_codes`), đơn vị tính (`catalog_item_units`), nhóm (`catalog_categories`), bảng giá (`catalog_price_lists`, `catalog_prices`) **của riêng nó**, cùng khách (`contacts`, đã có).
2. **Hình dữ liệu đúng chuẩn open-ketoan ngay từ đầu**: `item_id` là ULID 26 ký tự (cùng khuôn `items.item_id`); mã theo H-1…H-5; tên ≤ 50 (H-7); đúng một ĐVT tỉ lệ 1, ≤ 10 ĐVT, tên ĐVT từ 40 tên chuẩn đúng hoa thường (H-8, H-9); thuế bán `KCT · 0 · 5 · 8 · 10 · KKKN` (H-11…H-13); giá gồm VAT, 2 số lẻ (H-14); mã được thay bằng đóng / mở dòng mã (giữ `item_id`). Luật mức **E** chặn ngay ở hợp đồng zod; mức **W** trả về dạng cảnh báo `CAT-*`.
3. **Nguồn danh mục theo đơn vị**: `catalog_source = local | ketoan` (setting `bizcity.cake.catalog_source`). `local` (mặc định): Cake là chủ. `ketoan`: cột kế toán (mã, tên, ĐVT, thuế, giá, nhóm) chỉ đọc qua **một cổng ghi** (`catalogWriteGate`) — chặn ở mọi trạng thái kết nối; cột vận hành của Cake (tên hiển thị, đang bán trong CRM, thứ tự, nhãn CRM) vẫn sửa được.
4. **Cột ánh xạ chung** trên mọi bảng đồng bộ: `source (local|ketoan)`, `ext_id` (vd `items.item_id` / `partners.code`), `ext_synced_at`, `ext_hash`, `push_status (local|sent|accepted|rejected)`, `push_error`. Liên kết đơn vị: `tenant_links (okt_tenant_id đọc từ health của khoá, không gõ tay; branch_code; external_ref = opencake:<site>)`.
5. **Đồng bộ (làm sau, PHASE-010)**: kéo một chiều `GET /api/v1/catalog/feed/{meta,products,prices}` theo con trỏ; upsert theo `item_id`, lùi về SKU; mã mới tạo ở Cake khi đang `ketoan` thì đẩy `PUT /catalog/products/:sku?new=1` với `Idempotency-Key = opencake:<site>:p:<item_id>:v<n>`; chuyển `local → ketoan`: khớp SKU → barcode → gắn `item_id`, mã không khớp thì đẩy, rồi kéo đủ + đối soát (đếm + băm SKU · giá · thuế), kế toán thắng; `ketoan → local`: dữ liệu ở lại thành của Cake. **Không hai chiều.**
6. **Khách ↔ đối tượng công nợ**: mã đối tượng gửi sang Kế Toán = số điện thoại đã xác minh (khớp open-pos); không có thì `CAKE-<contact_id>`; vãng lai `KHACH-LE`. Lưu trong `contact_links (app ketoan, kind partner, ref_code, ref_id)`.
7. Cake vẫn **không nộp sổ kế toán** (R-CAKE-SIB-2 giữ nguyên) — báo giá, yêu cầu đặt hàng là chứng từ nghiệp vụ; tiền đi qua POS / Kế Toán.

## Hệ quả

- Được: Cake bán / chăm sóc được ngay ở một site trắng (golden case "khách hỏi giá trong chat → báo giá từ bảng giá Cake"); khi nối Kế Toán không phải sửa dữ liệu — chỉ gắn `item_id`, `partner code`, `tenant_id`.
- Trả giá: thêm 6 bảng danh mục + bảng liên kết đơn vị; phải giữ khuôn bám open-ketoan (khi Kế Toán đổi chuẩn ⇒ test hợp đồng báo lệch).
- Canon: luật "một sự thật có một chủ" được làm rõ — **chủ thay đổi theo `catalog_source`**, không bao giờ hai chủ cùng lúc (R-OKT-CONN-4).
