# Open CRM — Master checklist giao diện mới (OC-UI)

<!-- [2026-11-23 09:50 PM Johnny Chu - Chu Hoàng Anh] OC-UI — chủ: "tôi hài lòng chỗ docs/phases/evidence/mockup-shots/ … đảm bảo UI UX mới của open-crm sẽ như vậy 100%. Lập checklist, chia phase và code như vậy." ⇒ nguồn trạng thái duy nhất cho việc đưa bản mẫu vào mã thật. -->

> **Chuẩn đích:** 11 ảnh ở [evidence/mockup-shots/](evidence/mockup-shots/) (chủ duyệt 2026-11-23). **Bằng chứng mã thật:** 11 ảnh ở [evidence/build-shots/](evidence/build-shots/) — chụp từ bản build thật `assets/dist/inbox-app.js` bằng [frontend/dev/oc-preview.html](../../frontend/dev/oc-preview.html) (REST giả lập theo số liệu bản mẫu).
> **Ký hiệu:** ☑ xong + có ảnh build · ◐ giao diện xong, còn nguồn dữ liệu / chức năng · ☐ chưa · ⏸ chờ chủ / chờ plugin khác.

## 1. Cách mã được tổ chức

| Phần | Ở đâu | Ghi |
|---|---|---|
| Giao diện mới | `frontend/src/oc/` (App, core, ui, deplao, tokens.css, chat.css, catalog, screens/×11) | chép nguyên từ `docs/phases/mockups/src/` rồi nối dữ liệu thật; cùng token, cùng class ⇒ giống ảnh duyệt |
| Khoanh CSS | `frontend/postcss.config.js` plugin `oc-scope` | mọi rule trong `src/oc/*.css` thành `.oc-app …` ⇒ không rò sang giao diện cũ, wp-admin, theme |
| Chọn giao diện | `frontend/src/main.jsx` | `BOOT.oc.ui === 'oc'` ⇒ giao diện mới; `?ui=classic`, option `bizcity_crm_ui = classic`, hoặc PHP cũ (chưa có `BOOT.oc`) ⇒ giao diện cũ. Deploy JS trước hay PHP trước đều không vỡ |
| Cấu hình boot | `includes/class-admin-menu.php` khoá `oc` | `ui`, `host` (standalone / with-zalo-brain), `caps` (zaloBrain, automation, aiSuggest), `urls`, `version`, `userName` |
| REST mới | `includes/rest/class-oc-rest.php` → `GET bizcity-crm/v1/oc/contacts` | chỉ đọc 3 bảng sổ hội thoại; phân trang, lọc nhãn / giới tính / sinh nhật, đếm cho tab; quyền = quyền đọc hộp thư + Inbox_Access |
| Nạp REST | `bootstrap.php` | `require` bọc `is_readable` (N7) |
| Xem trước khi dev | `frontend/dev/oc-preview.html` | nạp bản build thật + REST giả lập; tắt IndexedDB (file://) |

## 2. Từng màn: ảnh duyệt ↔ ảnh build

| # | Màn | Ảnh duyệt | Ảnh build | Dữ liệu thật | Giao diện | Chức năng còn thiếu | Phase |
|---|---|---|---|---|---|---|---|
| 1 | Khung (rail + thanh tiêu đề) | mọi ảnh | mọi ảnh | `inboxes`, `conversations` (đếm chưa đọc mỗi số) | ☑ | ☰ thu gọn danh sách qua URL `?list=0` ☑; giao diện tối ☐ | 003 |
| 2 | Hộp thư | [mockup](evidence/mockup-shots/inbox.png) | [build](evidence/build-shots/inbox.png) | `conversations`, `messages`, `labels`, `conversations/{id}/labels`, `messages` POST, `composer-image`, `contacts/{id}` | ☑ | dải **Gợi ý AI** chỉ hiện khi `caps.aiSuggest` (cần REST gợi ý — OC-006.5); tin nhắn nhanh, ngân hàng, nhãn dán / emoji, chú thích ảnh ☑; 5 nút còn "sắp có" (video, ghi âm, định dạng, danh thiếp, thêm) | 006 |
| 3 | Danh bạ | [mockup](evidence/mockup-shots/contacts.png) | [build](evidence/build-shots/contacts.png) | `oc/contacts` (mới), `labels`, `broadcasts` (đếm tab) | ☑ | gắn nhãn hàng loạt ☑, Xuất CSV ☑; tab Lời mời / Lịch sử: trạng thái trống có lý do ☐ | 005 |
| 4 | Chiến dịch | [mockup](evidence/mockup-shots/campaigns.png) | [build](evidence/build-shots/campaigns.png) | `broadcasts`, `broadcasts/{id}`, `/progress`, `/recipients`, POST create / send / pause / cancel | ☑ | biến thể 2, gộp ảnh + chữ, ảnh đính kèm ☐; Send Guard hiện trần còn lại theo số ☐ (cần REST quota) | 007 |
| 5 | Tổng quan tài khoản | [mockup](evidence/mockup-shots/dashboard.png) | [build](evidence/build-shots/dashboard.png) | `inboxes` | ☑ | thêm số + QR + kết nối lại + ngắt kết nối ngay tại chỗ ☑; kéo thả thứ tự ☐ | 004 |
| 6 | Báo cáo | [mockup](evidence/mockup-shots/reports.png) | [build](evidence/build-shots/reports.png) | `reports/message`, `oc/contacts` (đếm), `broadcasts`, `conversations` | ◐ | biểu đồ gửi / nhận ☑; Lời mời KB, Kịch bản chạy, AI requests = "—" kèm lý do ☐; 7 tab phụ ☐ | 008 |
| 7 | Nhân viên | [mockup](evidence/mockup-shots/settings.png) | [build](evidence/build-shots/settings-employees.png) | `crm-staff`, create / suspend / reactivate | ◐ | giao số Zalo ☑, đang đăng nhập ☑, tab Kết nối ☑; mục được dùng theo người ☑; "xem như nhân viên" ☐ | 009 |
| 8 | Công việc nội bộ | [mockup](evidence/mockup-shots/tasks.png) | [build](evidence/build-shots/tasks.png) | `crm-tasks` list / create / update / delete, `crm-staff` | ◐ | tab Lịch / Note / Nhân sự / Báo cáo ☑; lọc hạn chót ☑; sheet sửa việc ☑; lọc dự án + nhãn nguồn ☑ (OC-010.3) | 010 |
| 9 | Kết nối mở rộng | [mockup](evidence/mockup-shots/integrations.png) | [build](evidence/build-shots/integrations.png) | `caps`, `oc/connectors` | ◐ | thẻ + sheet khoá + kiểm tra ☑ (đợt 8); webhook vào Casso / SePay ☑ (đợt 9); còn self-check (OC-011.4) | 011 |
| 10 | Kịch bản tự động (canvas ⇒ repo open-workflow, D001-10) | [mockup](evidence/mockup-shots/workflow.png) | [build](evidence/build-shots/workflow.png) | `caps.automation` | ⏸ | **khác ảnh duyệt có chủ ý**: canvas + trợ lý thiết kế là của bizcity-automation; chưa có hợp đồng `mountBuilder()` ⇒ màn hiện danh mục kích hoạt / hành động + nút mở trình dựng, không vẽ canvas giả | 012 |
| 11 | Ứng dụng, API & Webhook | [mockup](evidence/mockup-shots/apps.png) | [build](evidence/build-shots/apps-apps.png) | `oc/addons`, `wp/v2/users/me/application-passwords`, `oc/connectors` | ◐ | ứng dụng (chỉ đọc) ☑, khoá API ☑, webhook vào ☑ (đợt 10); còn chỗ gắn add-on, giới hạn quyền theo khoá, webhook ra | 013 |
| 12 | Internet & Đám mây · Trần gửi | [mockup](evidence/mockup-shots/settings.png) | (trong Cài đặt) | URL site | ◐ | driver R2 / Drive + sao lưu ☐; trang lưu Send Guard ☐ (đang hiện mức mặc định, ô khoá) | 014, 015 |
| 13 | Bốn trạng thái + bộ thành phần | [mockup](evidence/mockup-shots/states.png) | [build](evidence/build-shots/states.png) | — | ☑ | — | 002 |

**Không bịa số:** mọi chỗ chưa có nguồn hiện "—" hoặc "Chưa kết nối" kèm lý do. Danh mục POS / ứng dụng / khoá API trong bản mẫu là ví dụ — mã thật đã bỏ trạng thái "Đã kết nối" giả.

## 3. Checklist theo phase (chỉ phần giao diện mới)

### Đã làm 2026-11-23

| Mã | Việc | TT |
|---|---|---|
| OC-002.2 | Token + bộ thành phần vào `frontend/src/oc/` (giữ nguyên bản duyệt), khoanh CSS `.oc-app` | ☑ build PASS, CSS kiểm `.oc-app .btn.pri{…}` |
| OC-003.2 | Khung mới: thanh tiêu đề, rail (số Zalo thật + đếm chưa đọc + thêm số + 6 mục + launcher Công việc), đường dẫn `#/màn/phụ?k=v`, đổi đường dẫn cũ `#tab=…` sang màn mới | ☑ |
| OC-003.5 | Chọn giao diện mới / cũ (`BOOT.oc.ui`, `?ui=classic`, option); PHP cũ ⇒ giao diện cũ | ☑ |
| OC-004.1 | Tổng quan tài khoản trên `inboxes` | ☑ |
| OC-005.1 | REST `oc/contacts` + màn Danh bạ (lọc, sắp xếp, phân trang 200/trang, chọn, Xuất CSV, sheet hồ sơ) | ☑ `php -l` PASS |
| OC-006.1 | Hộp thư 2 cột + thông tin bật tắt, nhãn bật tắt trên hội thoại, gửi chữ / 👍 / ảnh / tệp, cuộn tới tin mới, 4 trạng thái | ☑ |
| OC-007.1 | Chiến dịch: danh sách, chi tiết (KPI, tiến độ, nội dung, người nhận), bắt đầu / tạm dừng / tiếp tục / huỷ, tạo 3 bước (nháp) | ☑ |
| OC-008.1 | Báo cáo: 8 KPI, 2 biểu đồ, theo nhãn | ◐ |
| OC-009.1 | Nhân viên: danh sách theo nhóm, KPI, thêm, tạm dừng / bật lại | ◐ |
| OC-010.1 | Kanban 5 cột trên `crm-tasks`, kéo thả, thêm việc | ◐ |
| OC-011.0 | Kết nối mở rộng: danh mục + cổng "Cần Zalo Brain / Automation" theo `caps` | ◐ |
| OC-016.0 | Trang xem trước bản build + 11 ảnh bằng chứng | ☑ |

### Đã làm 2026-11-23 (đợt 2)

<!-- [2026-11-23 10:30 PM Johnny Chu - Chu Hoàng Anh] OC-UI đợt 2 — chủ: "ok tiếp". -->

| Mã | Việc | TT |
|---|---|---|
| OC-006.6a | Thanh công cụ chat: **Tin nhắn nhanh** (danh sách macro → chạy cho hội thoại, `POST macros/{id}/run`), **Tài khoản ngân hàng** (`order-adapter/saved-banks` → chèn vào ô soạn), **Nhãn dán / emoji** (bảng 20 biểu tượng, cũng mở từ 😊) | ☑ |
| OC-006.7 | Ảnh kèm chú thích ngắn ⇒ chú thích đỏ đậm giữa thẻ như ảnh duyệt | ☑ |
| OC-005.2a | Danh bạ: chọn nhiều ⇒ **Gắn nhãn (N)** ⇒ sheet chọn nhãn ⇒ `POST conversations/bulk-label` | ☑ |
| OC-008.2a | `reports/message` thêm `series_split` (gửi / nhận theo ngày) + `today_sent` / `today_received` (không đổi trường cũ) ⇒ biểu đồ 2 đường + "301 gửi · 383 nhận" như ảnh duyệt | ☑ `php -l` PASS |
| OC-009.2 | REST `GET/POST oc/staff-inboxes` (đọc / đặt số Zalo của một người qua `Team_Manager` add / remove, chỉ dòng `is_active = 1`; đang đăng nhập = có phiên WordPress) ⇒ cột "N TK", KPI "Đang đăng nhập", tab Kết nối, sheet **Giao số Zalo** | ☑ |

Ảnh build cập nhật: [reports](evidence/build-shots/reports.png) · [settings-employees](evidence/build-shots/settings-employees.png) · [inbox](evidence/build-shots/inbox.png).

### Đã làm 2026-11-23 (đợt 3)

<!-- [2026-11-23 11:55 PM Johnny Chu - Chu Hoàng Anh] OC-006.4 — thêm / kết nối lại / ngắt số Zalo qua cell hub ngay trong Open CRM. -->

| Mã | Việc | TT |
|---|---|---|
| OC-006.4 | Sheet **Thêm tài khoản Zalo** 3 bước trong Open CRM: ① kiểm khoá API (`crm-phones/providers`, lý do rõ khi chưa dùng được + nút mở trang khoá API) ② số điện thoại + tên + người phụ trách (`POST crm-phones`, số trùng ⇒ dùng lại tài khoản cũ) ③ QR (`crm-phones/{id}/qr`, poll `qr-status` 3 giây, đếm 60 giây, hết hạn ⇒ Tạo mã mới) ⇒ **Đã kết nối** ⇒ Mở hộp thư. Thẻ "Kết nối lại" vào thẳng bước ③; **Ngắt kết nối** gọi `DELETE crm-phones/{id}?mode=disconnect` (giữ dữ liệu) | ☑ ảnh [add-account-phone](evidence/build-shots/add-account-phone.png) · [add-account-qr](evidence/build-shots/add-account-qr.png) |

### Đã làm 2026-11-24 (đợt 4)

<!-- [2026-11-24 12:10 AM Johnny Chu - Chu Hoàng Anh] OC-UI đợt 4 — chủ: "code tiếp". -->

| Mã | Việc | TT |
|---|---|---|
| OC-003.3 | `twinUrl` chỉ phát khi có Zalo Brain (giao diện cũ — Sổ tài liệu — mới đọc; không Zalo Brain ⇒ `''`, không đường dẫn chết `/twin/`); bỏ chữ TwinShell trong chú thích `/crm/` | ☑ `php -l` PASS |
| OC-009.3 | **Mục được dùng** theo người: user meta `ocrm_user_modules` (chưa đặt = mọi mục; quản lý luôn mọi mục; ít nhất 1 mục ⇒ lỗi OC-STAFF-03 nếu rỗng). REST `POST oc/staff-modules`, `GET oc/staff-inboxes` thêm `modules`. BOOT `oc.modules` + `oc.canManageStaff`. Rail ẩn mục / số Zalo / nút thêm số theo quyền; mở mục không được dùng ⇒ trạng thái **khoá** + nút "Mở mục được dùng". Nhân viên: cột "N/9 mục", sheet chọn mục. Là ẩn giao diện — dữ liệu vẫn theo số Zalo được giao | ☑ ảnh [settings-employees](evidence/build-shots/settings-employees.png) · [staff-modules-rail](evidence/build-shots/staff-modules-rail.png) · [staff-modules-denied](evidence/build-shots/staff-modules-denied.png) |

Xem trước người bị giới hạn: `frontend/dev/oc-preview.html?modules=inbox,tasks`.

### Đã làm 2026-11-24 (đợt 5)

<!-- [2026-11-24 12:40 AM Johnny Chu - Chu Hoàng Anh] OC-010.2 — chủ: "ok tiếp". -->

| Mã | Việc | TT |
|---|---|---|
| OC-010.2a | REST `crm-tasks` trả thêm `assignee_name`, `created_by`, `created_by_name` (chỉ thêm khoá). **Sửa lỗi:** thẻ việc trước đây đọc `assignee_name` mà REST không có ⇒ trên site thật không hiện người làm. PUT `due_date: ''` ⇒ NULL (xoá được hạn, không lỗi MySQL strict) | ☑ `php -l` PASS |
| OC-010.2b | Lọc hạn chót (quá hạn / hôm nay / 7 ngày tới / chưa có hạn); sheet việc đầy đủ (tên, hạn, ưu tiên, người làm từ `crm-staff`, ghi chú, xoá); bấm thẻ ⇒ sửa; kéo vào Hoàn thành ⇒ `completed = 1` (có ngày xong cho Báo cáo); tab trên URL `#/tasks?tab=cal`, mở thẳng việc `#/tasks?task=12` | ☑ [tasks](evidence/build-shots/tasks.png) · [tasks-edit](evidence/build-shots/tasks-edit.png) |
| OC-010.2c | **Lịch** tháng theo hạn chót (việc xong gạch ngang, quá hạn đỏ, đếm việc chưa có hạn) · **Note** = ghi chú trên từng việc, tìm được · **Nhân sự** = tải việc theo người (4 cột, quá hạn, tỉ lệ xong) · **Báo cáo** = 4 KPI + tạo mới / hoàn thành 7 ngày + việc mở theo ưu tiên. Cùng bộ lọc phía trên | ☑ [cal](evidence/build-shots/tasks-cal.png) · [note](evidence/build-shots/tasks-note.png) · [hr](evidence/build-shots/tasks-hr.png) · [rep](evidence/build-shots/tasks-rep.png) |

### Đã làm 2026-11-24 (đợt 6)

<!-- [2026-11-24 01:20 AM Johnny Chu - Chu Hoàng Anh] OC-010.3 — chủ: "Thêm hai cột vào lõi." -->

| Mã | Việc | TT |
|---|---|---|
| OC-010.3a | `crm_tasks` thêm `project VARCHAR(120) NULL` (+ chỉ mục `idx_project`) và `source VARCHAR(32) NULL`. DDL của bảng này nằm ở `includes/class-db-installer-ext.php` (lõi chỉ giữ tên bảng; lượt dbDelta của lõi chạy DDL này — D96-5) ⇒ sửa ở đó: thêm vào `CREATE TABLE` + `migrate_oc_010()` chỉ THÊM, có kiểm cột / chỉ mục, chạy lại vô hại. `BIZCITY_CRM_EXT_DB_VERSION` 1.2.0 → **1.3.0** ⇒ site cũ tự nâng một lần (khoá 15 phút như cũ) | ☑ `php -l` PASS |
| OC-010.3b | Nguồn tạo việc: `manual` (REST `crm-tasks`, mặc định) · `cell` (trợ lý gửi `source: 'cell'`) · `automation` · `pipeline` (nhắc theo bước bán hàng) · `care` (nhắc chăm sóc khách) · `chat_session` (bản ghi phiên chat). Việc cũ = NULL, không đoán ngược. Nguồn không sửa được qua PUT. Chưa chạy migration ⇒ không ghi cột mới, insert không lỗi | ☑ |
| OC-010.3c | REST: GET `?project=Tên` / `?project=__none__`; POST nhận `project`, `source`; PUT đổi / bỏ `project`; phản hồi có `project`, `source`. Màn: ô **Tất cả dự án** mở (danh sách dự án + "Chưa có dự án"), ô Dự án trong sheet (gõ mới hoặc chọn có sẵn; đang lọc dự án thì việc mới tự gán), nhãn trên thẻ: dự án · từ trợ lý / từ kịch bản / nhắc bán hàng / nhắc chăm sóc | ☑ [tasks](evidence/build-shots/tasks.png) · [tasks-edit](evidence/build-shots/tasks-edit.png) |

### Đã làm 2026-11-24 (đợt 7)

<!-- [2026-11-24 01:50 AM Johnny Chu - Chu Hoàng Anh] OC-006.4b — chủ: "tiếp". -->

| Mã | Việc | TT |
|---|---|---|
| OC-006.4b-1 | Bước ① sheet **Thêm tài khoản Zalo**: dán khoá API ngay tại chỗ → **Lưu và kiểm tra** → tự kiểm lại `crm-phones/providers` → hợp lệ thì sang bước ②. Không ghi option trực tiếp: gọi REST chủ khoá `POST bizcity-twinchat/v1/settings/api-gateway { api_key }` (core/bizcity-llm — cùng kiểm định dạng `biz-…`, cùng xoá cache như trang cài đặt; cache quyền Hub khoá theo băm khoá nên khoá mới đọc lại ngay). Hiện khoá hiện tại đã che; báo riêng ca **mượn khoá site chính** (Zalo cell hub chỉ đọc khoá riêng của website). Người không có quyền quản trị khoá ⇒ lời nhắn + nút mở trang khoá như cũ. BOOT `oc.keyUrl`, `oc.canManageKey` (cùng cổng quyền của route lõi) | ☑ [add-account-key](evidence/build-shots/add-account-key.png) |

Xem trước: `frontend/dev/oc-preview.html?nokey=1#/dashboard?add=1`. Chưa kiểm trên site thật: phản hồi lỗi 400 `fields.api_key` của route lõi đọc từ mã PHP.

Ghi chú OC-006.4b phần còn lại: Hub hiện chỉ có `history/groups` + `history/group` (đọc lịch sử nhóm, thử nghiệm — `class-zalo-personal-hub-client.php`), **chưa có** route đồng bộ tin từ điện thoại ⇒ chờ Hub.

### Đã làm 2026-11-24 (đợt 8)

<!-- [2026-11-24 Johnny Chu - Chu Hoàng Anh] OC-011.1 + OC-011.2 — chủ: "tiếp nhé". -->

| Mã | Việc | TT |
|---|---|---|
| OC-011.1 | Danh sách kết nối `connectors/<key>/connector.json` (schema `ocrm-connector@1`, 14 nền tảng: Open Kiot, KiotViet, Haravan, Sapo, Nhanh.vn, Pancake POS, Open Kế Toán, Casso, SePay, GHN, GHTK, Viettel Post, Telegram, Email SMTP) — thêm nền tảng = thêm một file. Khoá ở option theo blog `ocrm_connectors` (autoload no); ô `secret` mã hoá AES-256-GCM, REST không trả lại, chỉ 4 ký tự cuối; không có openssl ⇒ từ chối lưu. Lớp `BizCity_OCRM_Connectors` (`includes/connectors/class-oc-connectors.php`), REST quyền `manage_options`: `GET oc/connectors`, `POST oc/connectors/{key}` (ô secret trống = giữ cũ; lưu xong tự kiểm), `POST …/{key}/check`, `DELETE …/{key}`. Đã chạy thử PHP với WP giả lập: đọc 14 file, thiếu ô ⇒ 400 `fields`, URL phải https, khoá trong option là `v1:…` (không có chữ thô), để trống giữ khoá, danh sách không lộ khoá, gỡ ⇒ mất dòng | ☑ |
| OC-011.2 | Màn **Kết nối mở rộng** lấy thẻ từ REST; trạng thái thật: *Chưa kết nối* · *Đã lưu · chưa kiểm được* (nền tảng chưa có đường kiểm) · *Đã kết nối* (kiểm thành công, có giờ) · *Khoá bị từ chối* (kèm lý do). Sheet **Kết nối {tên}** mở theo `?conn=key`: 1–4 ô theo json, **Lưu và kiểm tra** / **Kiểm tra lại** / **Gỡ kết nối** (hỏi lại ngay trong chân sheet, không `confirm`). Huy hiệu đầu trang đổi "Đang nhận webhook" (giả) ⇒ **Chưa nhận webhook** cho tới 011.3. REST lỗi / không phải quản trị ⇒ danh mục tĩnh, trạng thái "—" + lý do | ☑ [integrations](evidence/build-shots/integrations.png) · [casso](evidence/build-shots/integrations-casso.png) · [sepay lỗi](evidence/build-shots/integrations-sepay.png) |

Đường kiểm có ở 4 nền tảng (Casso `v2/userInfo`, SePay `bankaccounts/list`, GHN `master-data/province`, Telegram `getMe`) — lấy theo tài liệu công khai, **chưa chạy với khoá thật**. 10 nền tảng còn lại `check: null` ⇒ giao diện nói "chưa kiểm được", không bao giờ "Đã kết nối". Xem trước: `frontend/dev/oc-preview.html#/integrations?conn=casso` (bản json cho trang xem trước: `frontend/dev/oc-connectors.js`, sinh lại bằng `node frontend/dev/gen-oc-connectors.cjs` khi sửa `connectors/`).

### Đã làm 2026-11-24 (đợt 9)

<!-- [2026-11-24 Johnny Chu - Chu Hoàng Anh] OC-011.3 — chủ: "đồng ý" (chỉ tạo bảng ocrm_events + webhook Casso / SePay). -->

| Mã | Việc | TT |
|---|---|---|
| OC-011.3 | Bảng **`bizcity_ocrm_events`** (đúng 20-DATA-LEDGER §2: `source, doc_key, type, version, payload, status, received_at, actor`, UNIQUE `(source, doc_key)`) — `migrate_oc_011` qua dbDelta, ext db **1.4.0**. Một cửa ghi `BizCity_OCRM_Events::submit()` (`includes/kernel/class-ocrm-events.php`): `INSERT IGNORE`, không UPDATE / DELETE; gửi lại cùng mã ⇒ không thêm dòng; cùng mã khác nội dung ⇒ **không ghi đè**, trả `changed` (dòng đảo chờ sổ `ocrm_ledger`); dòng mới ⇒ `do_action( 'bizcity_ocrm_event' )` cho Automation nghe. Route công khai `POST bizcity-crm/v1/webhook/{casso|sepay}`: bắt buộc khoá bảo mật (Casso header `Secure-Token` = ô *Khoá bảo mật webhook*; SePay `Authorization: Apikey …` = ô mới `webhook_key`), so `hash_equals`; chưa đặt khoá / thiếu / sai ⇒ 401 kèm lý do; bảng chưa có ⇒ 503 (nền tảng tự gửi lại); mỗi giao dịch ⇒ `payment.received` / `payment.sent` (tiền ra), khoá tự nhiên = mã giao dịch. Sheet hiện địa chỉ webhook + nút **Chép**, nhắc khi chưa đặt khoá, số giao dịch đã nhận + 5 giao dịch gần nhất; huy hiệu đầu trang: *Đã nhận webhook · giờ* / *Chờ webhook đầu tiên* / *Chưa nhận webhook*. Chạy thử PHP với `$wpdb` giả: 3 ca 401, đúng khoá ghi 1, gửi lại 0 (trùng), Casso danh sách 2 + đối tượng 1, khuôn lạ 400, nền tảng chưa có bộ đọc 404, sự kiện bắn đúng 5 lần cho 5 dòng | ☑ [casso](evidence/build-shots/integrations-casso.png) · [sepay chưa đặt khoá](evidence/build-shots/integrations-sepay.png) |

Chưa kiểm: khuôn webhook Casso / SePay và tên header lấy theo tài liệu công khai, **chưa nhận webhook thật**; Casso bản chữ ký HMAC (`X-Casso-Signature`) chưa hỗ trợ — dùng kiểu Secure-Token. Máy chủ chặn header `Authorization` (một số Apache / CGI) thì SePay báo OC-HOOK-04 kèm gợi ý.

### Đã làm 2026-11-24 (đợt 10)

<!-- [2026-11-24 Johnny Chu - Chu Hoàng Anh] OC-013.1 + OC-013.2 — chủ: "tiếp". -->

| Mã | Việc | TT |
|---|---|---|
| OC-013.1 | **Ứng dụng** = plugin đang bật (blog + toàn mạng) có `module.json` ở gốc với `"schema": "ocrm-addon@1"` (module.json việc khác bị bỏ qua; thiếu key / trùng key ⇒ báo dưới lưới). REST `GET oc/addons` (`includes/rest/class-oc-apps-rest.php`, manage_options). Thẻ: tên, tác giả · phiên bản, kiểu chạy, chỗ gắn, quyền xin — ghi rõ "chỗ gắn chưa hiện ở bản này". Nút **Phát triển ứng dụng** ⇒ sheet mẫu module.json; **Cài ứng dụng** ⇒ trang tải plugin của WP (chỉ người có quyền cài). Add-on mẫu `examples/ocrm-addon-hello` | ☑ [apps](evidence/build-shots/apps-apps.png) |
| OC-013.2 | **Khoá API** = Application Passwords của WordPress, gọi thẳng REST lõi `wp/v2/users/me/application-passwords` (không thêm bảng / option); lọc theo `app_id` cố định của Open CRM nên không hiện / không đụng khoá của ứng dụng khác. Bảng: tên · tạo lúc · dùng lần cuối + IP · **Thu hồi** (hỏi lại tại chỗ). **Tạo khoá** ⇒ sheet hiện khoá một lần + lệnh `curl -u` thử ngay. WP tắt (site chưa HTTPS) ⇒ nói lý do. BOOT thêm `appPasswords`, `appPwdHttps`, `userLogin`, `restRoot`, `pluginUpload`. Khoá mang quyền của tài khoản — **chưa** giới hạn quyền riêng theo khoá (OC-AUTH-03 còn lại) | ☑ [api](evidence/build-shots/apps-api.png) |
| OC-013.4a | Màn 3 thẻ theo URL (`?tab=`); bỏ địa chỉ giả `hub/inbound`, `webhook/payment` và huy hiệu "Nhận + gửi"; **Webhook › Nhận vào** lấy thật từ `oc/connectors` (bấm ⇒ sheet kết nối); **Gửi ra** nói thật "chưa có" | ☑ [webhook](evidence/build-shots/apps-webhook.png) |

Ghi chú OC-010.3 (đợt 6) — còn ngoài Open CRM: hiện **chưa có** chỗ nào ở Zalo Brain / Automation tạo việc (đã tìm `crm-tasks` + insert bảng) ⇒ nhãn "từ trợ lý" sẽ hiện khi cell gọi `POST bizcity-crm/v1/crm-tasks` kèm `source: 'cell'` (hợp đồng đã sẵn).
Ghi chú kiểm thử: Chrome headless với `--virtual-time-budget` không chạy lại `useEffect` sau khi dữ liệu về ⇒ mở việc theo `?task=` được suy ra thẳng từ URL, không qua effect.

### Còn lại để đạt 100 % (theo thứ tự làm)

| Mã | Việc | Cần | Phase |
|---|---|---|---|
| ~~OC-003.1~~ | ~~Chạy khi không có Zalo Brain~~ — **huỷ** (chủ 2026-11-23: dùng được = khoá API + QR qua cell hub; PHASE-001 §9 D001-1 sửa). Menu wp-admin riêng "Open CRM" khi có Zalo Brain vẫn là việc của 003 | — | 003 |
| ~~OC-003.3~~ | ~~Bỏ `twinUrl` + tham chiếu TwinShell trong PHP~~ — ☑ đợt 4 | — | 003 |
| OC-006.4b | ~~Dán khoá API ngay trong sheet~~ ☑ đợt 7 · còn: **đồng bộ tin từ điện thoại** (nút 📱 trên thanh tiêu đề đang trỏ `#/inbox/sync`) | route đồng bộ của Hub | 006 |
| OC-006.5 | REST gợi ý trả lời (cell) + bật `bizcity_ocrm_ai_suggest_enabled` ⇒ dải Gợi ý AI 3 thẻ như ảnh | Zalo Brain | 006 |
| OC-006.6b | 5 nút công cụ còn lại: video, ghi âm, định dạng chữ, danh thiếp (gửi danh thiếp Zalo), "Thêm" | gửi video / voice qua Hub cần kiểm `composer-image` nhận gì | 006 |
| OC-005.2b | Lời mời kết bạn · Lịch sử sổ chăm sóc | Hub (kết bạn), sổ `ocrm_ledger` | 005 |
| OC-007.2 | REST quota Send Guard + trang lưu trần / giờ gửi | kernel Send Guard | 007, 015 |
| OC-008.2b | Nguồn KPI Kịch bản chạy (Automation), AI requests (Zalo Brain), Lời mời KB (Hub) | REST của plugin khác | 008 |
| ~~OC-009.3~~ | ~~"Mục được dùng" theo người + ẩn mục trên rail~~ — ☑ đợt 4 · còn "xem như nhân viên" (OC-009.4) | — | 009 |
| ~~OC-010.2~~ | ~~Lịch, ghi chú, báo cáo việc~~ — ☑ đợt 5 | — | 010 |
| ~~OC-010.3~~ | ~~Cột `project` + `source` trong `crm_tasks`~~ — ☑ đợt 6 (chủ: thêm vào lõi) | — | 010 |
| OC-011.4 | ~~Registry + sheet khoá~~ ☑ đợt 8 · ~~webhook vào Casso / SePay~~ ☑ đợt 9 · còn: self-check (file json hỏng, bảng thiếu, header Authorization bị chặn) + bộ đọc webhook POS (KiotViet, Haravan…) khi có nhu cầu | — | 011 |
| ~~OC-012.1~~ | Canvas kịch bản — **chuyển sang repo open-workflow (bizcity-automation)**, làm sau (D001-10). Open CRM giữ màn danh mục + nút mở trình dựng | — | 012 |
| OC-013.3 | ~~Registry add-on~~ ☑ · ~~khoá API~~ ☑ đợt 10 · còn: **webhook ra** (cần chốt Q-OC-3: bảng hàng chờ gửi riêng cho nhiều URL), chỗ gắn add-on (`page`, `chat_panel`, `composer_button`), giới hạn quyền theo khoá (OC-AUTH-03) | chốt Q-OC-3 | 013 |
| OC-014.1 | Driver R2 / Drive + sao lưu theo giờ | — | 014 |
| OC-016.1 | Self-check trình duyệt `docs/tools/open-crm-ui-selfcheck.js` trên site thật (đếm phần tử từng màn so với ảnh duyệt) + bốn ca kích hoạt | site thử | 016 |

## 3b. Chủ chốt 2026-11-23 (tối)

<!-- [2026-11-23 11:10 PM Johnny Chu - Chu Hoàng Anh] OC-UI — chủ chốt: không chạy khi thiếu kết nối cell hub; canvas kịch bản sang repo open-workflow; các câu hỏi còn lại theo đề xuất. -->

Không làm chế độ chạy khi chưa kết nối (dùng được = khoá API + QR qua cell hub) · canvas kịch bản làm ở repo open-workflow · Q001-1 xanh, Q001-2 đổi slug ở 016, Q001-3 Kanban trong plugin. Chi tiết: [PHASE-001 §9](PHASE-001-DINH-VI-OPEN-CRM/README.md).

## 4. Deploy (chưa upload)

Upload theo thứ tự nào cũng được (main.jsx giữ giao diện cũ khi PHP chưa có `BOOT.oc`):

| File | Loại |
|---|---|
| `assets/dist/inbox-app.js`, `assets/dist/inbox-app.css` | build mới |
| `includes/class-admin-menu.php` | sửa (khoá `oc` trong BOOT: thêm `modules`, `canManageStaff`, `keyUrl`, `canManageKey`, `appPasswords`, `appPwdHttps`, `userLogin`, `restRoot`, `pluginUpload`; `twinUrl` chỉ khi có Zalo Brain) |
| `bizcity-twin-crm.php` | sửa (chỉ chú thích — OC-003.3) |
| `includes/class-rest-controller.php` | sửa (`reports/message` thêm `series_split`, `today_sent`, `today_received`; PUT `crm-tasks` hạn rỗng ⇒ NULL) |
| `includes/rest/class-crm-spine-rest-ext.php` | sửa (`shape_crm_task` thêm `assignee_name`, `created_by`, `created_by_name`, `project`, `source`; nhắc chăm sóc ghi `source = care`) |
| `includes/class-db-installer-ext.php` | sửa (`crm_tasks.project` + `source`, `migrate_oc_010`) |
| `bizcity-twin-crm.php` | sửa (`BIZCITY_CRM_EXT_DB_VERSION` 1.3.0) — **phải upload cùng installer**, nếu không migration không chạy |
| `includes/class-inbox-to-crm-bridge.php`, `includes/class-pipeline-stage-service.php` | sửa (ghi `source` = `chat_session` / `pipeline`) |
| `bootstrap.php` | sửa (nạp REST mới, bọc `is_readable`) |
| `includes/rest/class-oc-rest.php` | **mới** (`oc/contacts`, `oc/staff-inboxes`, `oc/staff-modules`) |
| `includes/connectors/class-oc-connectors.php` | **mới** (`oc/connectors` — OC-011.1; `webhook/{key}` — OC-011.3) |
| `includes/kernel/class-ocrm-events.php` | **mới** (bảng `bizcity_ocrm_events` + `submit()` — OC-011.3) |
| `includes/rest/class-oc-apps-rest.php` | **mới** (`oc/addons` — OC-013.1) |
| `examples/ocrm-addon-hello/` | **mới** — add-on mẫu, không tự bật |
| `includes/class-db-installer-ext.php` + `bizcity-twin-crm.php` | sửa (`migrate_oc_011`, ext db **1.4.0**) — **upload cùng nhau**, nếu không bảng không được tạo và webhook trả 503 |
| `connectors/` (README + 14 thư mục `connector.json`) | **mới** — thiếu thư mục này thì màn hiện danh mục tĩnh "—" |

Kiểm sau deploy: mở `/crm/` ⇒ khung mới; `/crm/?ui=classic` ⇒ giao diện cũ; Danh bạ gọi `GET /wp-json/bizcity-crm/v1/oc/contacts` trả `ok:true`; Console không lỗi.
Quay lại giao diện cũ cho cả site: `wp option update bizcity_crm_ui classic`.

**Chưa kiểm trên site thật:** hình dạng phản hồi REST được đọc từ mã PHP (`shape_conversation`, `shape_message`, broadcast, crm-staff, crm-tasks). Trường nào khác tên sẽ hiện trống chứ không lỗi; ghi lại ở đây khi kiểm.
