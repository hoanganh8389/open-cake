# Open CRM · 40 — Reduction: từ bizcity-twin-crm xuống open-crm

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — census thô 2026-11-17: 43 bảng, 63 mục includes/ ⇒ giữ / bỏ / sang add-on. Chạy lại bằng công cụ ở P0 trước khi xoá gì. -->

Theo R-REDUCTION-AUDIT: **Census → Cut → Prove → Record**. Bảng dưới là census thô (đọc tên thư mục / bảng); P0 phải chạy công cụ census (nơi gọi, route, hook, dữ liệu thật trên site) trước khi cắt.

**Cách làm:** khởi tạo repo mới **sạch** (không kéo lịch sử), chỉ chép vào phần "Giữ". Repo cũ `open-crm` đóng băng ở thẻ `final-twin-crm` để tra cứu; phần "Add-on" tách thành plugin nhỏ khi có người cần.

## 1. Bảng (43 của `modules.twin-crm` + 14 của lõi)

| Nhóm | Bảng | Quyết |
|---|---|---|
| Sổ hội thoại | contacts · contact_inboxes · inboxes · conversations · messages · attachments · inbox_members | **Giữ** (`crm-ledger@1`, dùng chung) |
| Nhãn | labels · conversation_labels | **Thay** bằng sổ + `ocrm_contact_state.tags`; dữ liệu cũ nhập một lần (migrator) |
| Gửi hàng loạt | crm_broadcasts · crm_broadcast_recipients · cg_broadcasts · cg_broadcast_recipients | **Thay** bằng `ocrm_broadcasts` + `ocrm_broadcast_targets`; nhập lượt đang chờ, lượt cũ chỉ đọc |
| Đội | teams · team_members | **Bỏ** — `inbox_members` + vai WordPress đủ cho đội nhỏ (Q-OC-4) |
| Macro / mẫu tin | macros | **Giữ ý, bỏ bảng** — mẫu tin là option |
| Giờ làm việc | working_hours | **Bỏ bảng** — option |
| Bán hàng | leads · opportunities · opportunity_lines · accounts · products · product_categories | **Sang Open Kiot / add-on** |
| Tiền, giấy tờ | invoices · invoice_lines · invoice_payments · contracts · contract_lines · documents | **Sang Open Kế Toán** (giấy tờ đẩy về khách bằng `document.pushed`) |
| Công việc | tasks · notes_doc · pipeline_deadlines · applied_slas · sla_policies · assignment_policies · inbox_assignment_policies | **Sang add-on "Đội & quy trình"** hoặc bizcity-automation; việc đẩy từ cell = sự việc `task.pushed` |
| Tự động | automation_rules · email_event_rules | **Bỏ** — tự động hoá = bizcity-automation (đã chốt PHASE-0.96) |
| Email | email_accounts · email_threads · email_messages · gmail_smtp_accounts | **Sang add-on** (Open CRM là Zalo trước) |
| Chiến dịch | campaigns · campaign_visits | **Sang add-on marketing** |
| Sau bán (Woo) | order_recap_log · order_csat · shipment_status_log | **Sang Open Kiot** (sự việc `kiot.order.*` kéo nhắc chăm sóc) |
| Báo cáo | reporting_events · reporting_event_rollups | **Thay** bằng sổ + dẫn xuất |
| Khác | audit_log · admin_chat_audit · admin_chat_grants · chat_magic_links · submissions · activities · custom_attribute_definitions · archive_receipts | audit = sổ; magic link / chat quản trị ⇒ Zalo Brain (PHASE-0.156 Q156-3); submissions / activities ⇒ add-on lead capture; thuộc tính tuỳ chỉnh ⇒ JSON trên contact |

## 2. Thư mục `includes/` (63 mục)

| Quyết | Mục |
|---|---|
| **Giữ → viết lại gọn** thành `modules/inbox`, `modules/broadcast`, `modules/contacts`, kernel | `inbox` · `broadcast` · `announce` · `macros` · `attributes` · `audit` · `class-rest-controller.php` · `class-repository-ext.php` · `class-admin-menu.php` · `class-contact-transfer.php` · `class-conversation-identity-resolver.php` · `class-assignment-manager.php` (chỉ phần gán người phụ trách) |
| **Sang add-on "Đội & quy trình"** | `pipeline` · `sla` · `service` · `class-pipeline-*` · `class-kanban-manager.php` · `class-task-*` · `class-customer-pipeline.php` · `class-staff-*` · `class-team-insights.php` · `class-leader-member-rest.php` · `class-customer-360-team-view.php` · `class-personal-quota-rest.php` · `training` |
| **Sang Open Kế Toán / Open Kiot** | `invoicing` · `woo` · `class-order-adapter.php` · `class-fulfillment-adapter.php` · `class-crm-order-identity-metabox.php` |
| **Sang add-on marketing / lead** | `campaigns` · `marketing` · `lead-capture` · `print-ads` · `email` · `email-automation` · `class-submissions-*` · `class-crm-lead-score.php` · `class-attribution-backfill.php` · `class-email-send-log.php` |
| **Bỏ** (đã có nơi khác hoặc là chẩn đoán) | `ai-usage` (Zalo Brain đo) · `kg` · `context` (Zalo Brain) · `class-guru-*` (Agent Guru ở Zalo Brain) · `class-sprint-diagnostic*.php` · `class-crm-ingest-notif.php` · `class-scheduler-adapter*.php` (lịch = Zalo Brain scheduler qua MCP) · `admin-chat` (Zalo Brain) · `reports` (thay bằng sổ) · `bridges` · `class-inbox-to-crm-bridge.php` (thay bằng connector) · `class-db-installer-ext.php` (thay bằng platform) · `class-crm-export.php` (P3: xuất CSV từ sổ) |
| **Đọc thêm trước khi quyết** | `admin` · `class-service-templates.php` · `class-scheduler-adapter-contact-birthday.php` (nhắc sinh nhật = gửi hàng loạt hẹn giờ?) |

`apps/` (activity, documents, location, notes, ops, shift_schedule, stage) — **không mang sang**; giai đoạn khách = `contact.stage_changed`.

## 3. Đo trước / sau (ghi vào `evidence/` ở P4)

| Đo | twin-crm hiện tại | open-crm đích |
|---|---|---|
| Bảng (chạy cùng Zalo Brain) | 43 | 5 |
| Mục `includes/` / file PHP | 63 mục | ≤ 40 file PHP |
| Route REST | đo ở P0 | ≤ 25 |
| Menu chính | đo ở P0 | 4: Hộp thư · Gửi hàng loạt · Danh bạ · Kết nối mở rộng (+ Cài đặt) |
| Plugin bật được khi không có Zalo Brain | không | có |
