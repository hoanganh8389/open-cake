# Open CRM · 30 — Bật một mình hay bật cùng Zalo Brain

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — ma trận 4 ca kích hoạt, luật ai tạo bảng, connector tự chọn, Facebook = mở rộng qua Zalo Brain. -->

Chủ: *"hai plugin này có thể active, chạy, install db mà ko liên quan đến nhau … Nếu hệ thống phát hiện có cài twin-brain thì cần hiểu core channel gateway có các bảng gì rồi để tạo thêm, hoặc nếu ko có thì chủ động."*

## 1. Phát hiện Zalo Brain (một chỗ: `platform/class-ocrm-host.php`)

```php
// Zalo Brain có mặt và sổ hội thoại của nó đã sẵn sàng?
$brain = defined( 'BIZCITY_TWIN_AI_VERSION' )
	&& class_exists( 'BizCity_Schema_Registry' )
	&& BizCity_Schema_Registry::owner_of( 'bizcity_crm_contacts' ) === 'core.crm';
```

Kết quả cache theo request (static) — **không** lưu option (bật / tắt Zalo Brain phải có hiệu lực ngay lần tải sau). Hàm `owner_of()` chưa có ở Zalo Brain ⇒ thêm ở PHASE-0.156 W2; tới lúc đó dùng `defined( 'BIZCITY_CRM_SPINE_LOADED' )`.

## 2. Ai tạo bảng

| Bảng | Có Zalo Brain | Không có |
|---|---|---|
| 7 bảng sổ hội thoại (`crm-ledger@1`) | **không tạo** — Zalo Brain là chủ | tạo từ `contracts/crm-ledger-v1.sql.php` (bản sao byte-giống) |
| 5 bảng `ocrm_*` | tạo | tạo |

Changelog `db/changelog/open-crm.json` khai 7 bảng sổ với `"owner_when_core_present": "core.crm"` để validator của cả hai bên không báo hai chủ.

Kích hoạt: `register_activation_hook` → `OCRM_Install::run()` — chỉ blog hiện tại; multisite thì mỗi site tự cài khi admin mở lần đầu (không DDL hàng loạt trong một request).

## 3. Bốn ca

| Ca | Điều xảy ra | Kiểm |
|---|---|---|
| **A. Chỉ Open CRM** | tạo 12 bảng; connector `zalo-hub`; menu có "Kết nối Zalo" | site trắng, `wp plugin activate` không lỗi; `/crm/` hiện hộp thư trống |
| **B. Zalo Brain có trước** | tạo 5 bảng; connector `twin-brain`; hội thoại cũ hiện ngay | số hội thoại = `SELECT COUNT(*)` bảng lõi |
| **C. Open CRM trước, Zalo Brain sau** | Zalo Brain chạy `dbDelta` cùng DDL ⇒ không đổi gì, ghi "adopted"; Open CRM chuyển sang connector `twin-brain`, **tắt** cầu Hub của mình (không nhận trùng tin) | đếm dòng trước = sau; một tin thử vào đúng một lần |
| **D. Tắt Zalo Brain** | Open CRM vẫn đọc được bảng (vẫn còn trong CSDL); quay về connector `zalo-hub` nếu đã cấu hình khoá, không thì hiện "Kết nối Zalo" | không fatal, không 500 |

Tắt / gỡ plugin **không xoá bảng** (`uninstall.php` chỉ xoá khi chủ bật cờ "xoá dữ liệu khi gỡ").

## 4. Connector Zalo khi chạy một mình

Open CRM không chạy Zalo trong PHP. Nó nối tới **Zalo Hub** (dịch vụ của BizCity, nơi các số Zalo đăng nhập) bằng khoá API của site:

1. Admin dán khoá BizCity (một khoá = một license) → kiểm kết nối.
2. Đăng nhập số Zalo bằng QR (QR do Hub cấp, hiện trong sheet).
3. Hub đẩy tin vào `POST /wp-json/bizcity-crm/v1/hub/inbound` (ký HMAC, chống phát lại bằng `doc_key`); Open CRM gửi tin qua Hub.

Không có AI trả lời ở chế độ này (R-OC-BRAIN-1). Muốn trợ lý tự trả lời ⇒ bật Zalo Brain.

## 5. Facebook và kênh khác = "Kết nối mở rộng"

Chủ: *"Nếu user muốn kết nối thêm facebook, khuyến nghị và có menu mở kết nối mở rộng yêu cầu active thêm plugin twin-brain để kết nối composio."*

- Menu **"Kết nối mở rộng"** luôn có. Không có Zalo Brain ⇒ mỗi thẻ (Facebook Fanpage, Messenger, Google…) hiện trạng thái **"Cần Zalo Brain"** + nút **"Cài Zalo Brain"** (mở trang plugin) + một câu vì sao: *"Facebook kết nối qua Composio của Zalo Brain; trợ lý trả lời và ghi sổ cho bạn."*
- Có Zalo Brain ⇒ thẻ mở thẳng trang "Kết nối mở rộng" của Zalo Brain (`/gateway/#/tools`), không có form thứ hai trong Open CRM (R-BOTSTUDIO: một nơi cấu hình).
- Tin Facebook về sau vẫn vào cùng hộp thư (cùng sổ hội thoại, `platform = facebook`).
