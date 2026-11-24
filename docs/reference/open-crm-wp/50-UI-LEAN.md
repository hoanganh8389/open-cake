# Open CRM · 50 — Giao diện gọn

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — UI lean: brandbook BizCity đen xám trắng đỏ điểm nhấn, chữ to, 4 menu, theo mẫu Kho tri thức. -->

Mockup: [mockups/open-crm-mockup.html](mockups/open-crm-mockup.html) — duyệt trước khi code.

Chủ: *"Lean về UI UX, ít chức năng thừa, tập trung chính vào chat, broadcast. Các icon, màu mè không cần thiết bỏ … đen xám trắng đỏ (đỏ chỉ điểm nhấn ít). Font chữ to, rõ ràng, button dễ dùng, dễ nhấn. Đơn giản giống core/vault."*

## 1. Token (R-BRANDBOOK, không thêm màu)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ink` | `#1a1a1a` | chữ, nút phụ đang chọn |
| `--mute` | `#6b6b6b` | chữ phụ, thời gian |
| `--line` | `#e6e6e6` | viền |
| `--bg` / `--glass` | `#f7f7f7` / `#ffffff` | nền / thẻ |
| `--acc` | `#d0021b` | **chỉ**: nút chính của màn, mục menu đang chọn, chấm "chưa đọc" |
| `--acc50` | `#fff1f2` | nền mục đang chọn |
| `--zalo` | theo brandbook | chỉ khi nói về Zalo |
| trạng thái `--ok / --warn` | theo brandbook | chỉ cho trạng thái (đã gửi / lỗi), không trang trí |

Chữ: hệ thống; thân 16 px, phụ 14 px, tiêu đề 20–22 px. Nút: cao ≥ 44 px, chữ 15 px đậm vừa. Bo góc 10–14 px. Không gradient, không bóng màu, không emoji. Biểu tượng chỉ khi chữ không đủ (gửi, đính kèm, tìm) — tối đa 1 biểu tượng mỗi nút.

## 2. Bốn màn (R-LEAN-4)

| Menu | Màn | Bố cục |
|---|---|---|
| **Hộp thư** | danh sách hội thoại · khung chat · cột khách | 3 cột như Kho tri thức (cây trái · nội dung · thông tin phải). Lọc: Tất cả · Chưa trả lời · Của tôi · theo số Zalo (chip). Khung chat: tin to, ô soạn cao 3 dòng, nút **Gửi** đỏ. Cột phải: tên, số, thẻ, ghi chú, "Hỏi trợ lý" (chỉ khi có Zalo Brain) |
| **Gửi hàng loạt** | danh sách lượt · tạo lượt (sheet 3 bước) | Bước 1 chọn người nhận (thẻ / nhóm / dán danh sách) → Bước 2 soạn (chữ + ảnh + tệp, xem trước) → Bước 3 giờ gửi + số Zalo gửi; Send Guard hiện trần còn lại hôm nay. Chi tiết lượt: tiến độ đã gửi / lỗi / chờ |
| **Danh bạ** | bảng khách | tìm, lọc thẻ, giai đoạn; bấm dòng ⇒ sheet hồ sơ khách (thông tin + dòng sổ chăm sóc) |
| **Kết nối mở rộng** | thẻ kênh | Zalo (của Open CRM hoặc của Zalo Brain) · Facebook / Google "Cần Zalo Brain" |
| Cài đặt (nhỏ, cuối menu) | 1 trang | khoá BizCity, số Zalo, trần gửi, giờ gửi, người dùng |

## 3. Mỗi màn có

Đang tải (khung xám, không spinner xoay giữa màn) · Trống (một câu + một nút làm gì tiếp) · Lỗi (4 trường, nút "Thử lại") · Không có quyền. Điện thoại: một cột, danh sách → chat → thông tin là ba màn trượt, URL đổi theo.

## 4. Không làm

Bảng điều khiển nhiều biểu đồ · kanban · màu theo giai đoạn · avatar màu ngẫu nhiên · biểu tượng cho từng menu · huy hiệu nhấp nháy · tooltip giải thích thay cho chữ rõ ràng.
