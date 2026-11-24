# open-cake · 15 — Danh mục năng lực, action, và lớp dữ liệu mềm

<!-- [2026-11-24 03:04 PM Johnny Chu - Chu Hoàng Anh] ARCH-REUSE — áp R-CANON-14 (chuẩn tái sử dụng năng lực) và R-CANON-15 (trục cứng + lớp mềm kiểu WordPress) của canon open-hub vào open-cake: danh mục năng lực cake.*, action, record_type, khoá meta ban đầu. -->

> **Chuẩn gốc:** [CHUAN-TAI-SU-DUNG-NANG-LUC](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/CHUAN-TAI-SU-DUNG-NANG-LUC.md) · [CHUAN-DU-LIEU-TRUC-VA-LOP-MEM](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/CHUAN-DU-LIEU-TRUC-VA-LOP-MEM.md)
> **Luật:** mỗi chức năng = **một action**; REST, MCP, React (`useAction`), sự kiện sinh từ action. Trước khi thêm action / bảng / màn: tra bảng dưới (bậc 0) rồi bậc 1–3.

## 1. Năng lực công bố (`GET /api/v1/system/capabilities`)

| Năng lực | Trạng thái | Action đứng sau | Ai dùng |
|---|---|---|---|
| `cake.touch.ingest` | planned (005–006) | `cake.touch.submit` (nội bộ, chỉ ingress) | Hub |
| `cake.contact.resolve` | planned (005) | `cake.contact.resolve` | POS, Kế Toán, Twin Brain |
| `cake.contact.read` | planned (005) | `cake.contact.get`, `cake.contact.timeline`, `cake.contact.lookup` | mọi app, MCP R0 |
| `cake.contact.merge` | planned (005) | `cake.contact.merge`, `cake.contact.unmerge` | người (quyền cao) |
| `cake.contact.link` | planned (010) | `cake.contact.link`, `cake.contact.partner_create` | POS, Kế Toán |
| `cake.message.send` | planned (006) | `cake.message.send`, `cake.message.draft` | web, MCP R1 / R2 |
| `cake.comment.reply` | planned (008) | `cake.comment.reply`, `cake.comment.private_reply` | web, MCP R2 |
| `cake.conversation.manage` | planned (007) | `cake.conversation.assign`, `.tag`, `.stage`, `.mark_read` | web, MCP R1 |
| `cake.channel.manage` | planned (006–009) | `cake.channel.connect_start`, `.status`, `.test`, `.disconnect` | web (owner) |
| `cake.broadcast` | planned (011) | `broadcast.campaign.*` (module) | web |
| `cake.document.order_request` | planned (010) | `cake.order_request.create`, `.submit` | web, MCP R1 |
| `cake.flex` | planned (002) | `core.meta.get/set`, `core.user_meta.get/set`, `core.records.*` | mọi module |

Mỗi action khai `expose: { rest, mcp, ui }`; không có route / tool / hook nào viết tay ngoài danh sách này (SC-REUSE-1..3).

## 2. Bảng nào cứng, bảng nào mềm

| Lớp | Bảng (open-cake) |
|---|---|
| **Trục cứng** | `contacts` · `contact_identities` · `contact_links` · `channel_accounts` · `conversations` · `touch_events` · `touch_event_versions` · `touch_ledger` · `messages` · `contact_state` · `business_documents` · `document_links` |
| **Hạ tầng chung** | `tenants` · `users` · `api_keys` · `audit_logs` · `action_requests` · `event_outbox`… (chép open-ketoan) |
| **Lớp mềm (platform)** | `setting_values` (options) · `user_meta` · `entity_meta` · `record_types` · `records` |
| **Module** | `mod_broadcast.*` · `mod_tasks.*` · `mod_reports.*` (khi cần bảng riêng thật) |

## 3. `record_type` khởi đầu (thay cho bảng riêng nhỏ)

| `key` | Thay cho (bản WP) | Trường chính (`schema`) | Liên kết | Màn |
|---|---|---|---|---|
| `cake.quick_reply` | `bizcity_crm_macros` | `title`, `body`, `shortcut`, `channels[]` | — | `RecordTypeScreen` + thanh công cụ hộp thư |
| `cake.saved_bank` | `order-adapter/saved-banks` | `bank`, `account_no` (*pii*), `holder` | — | chèn vào ô soạn |
| `cake.label` | `bizcity_crm_labels` | `name`, `color_token`, `icon` | — | danh sách nhãn (gắn nhãn vẫn là touch `kind=tag`) |
| `cake.reply_script` | kịch bản trả lời tay | `title`, `steps[]` | — | sheet trong hộp thư |
| `cake.form` | form thu thập khách trên web | `fields[]`, `channel_account_id` | — | nhúng web; mỗi lần gửi = touch `web` |
| `cake.note_template` | mẫu ghi chú | `title`, `body` | — | Contact 360 |

Ngưỡng thăng cấp (R-DATA-9) theo dõi ở chẩn đoán L2; `cake.label` có thể phải thành bảng thật nếu báo cáo theo nhãn JOIN thường xuyên — khi đó làm phase thăng cấp.

## 4. Khoá meta khởi đầu (registry)

| Registry | `key` | Gắn vào | Kiểu | Ghi |
|---|---|---|---|---|
| entity_meta | `cake.contact.birthday` | `contact` | date | *pii*, `indexed` (lọc sinh nhật ở Danh bạ) |
| entity_meta | `cake.contact.gender` | `contact` | enum | `indexed` |
| entity_meta | `cake.contact.source` | `contact` | string | nguồn biết đến |
| entity_meta | `cake.contact.size` | `contact` | string | ví dụ ngành thời trang |
| entity_meta | `cake.conversation.pinned_note` | `conversation` | string | |
| user_meta | `cake.inbox.filters` | user | json (zod) | bộ lọc lưu |
| user_meta | `cake.contacts.columns` | user | string[] | cột hiện |
| user_meta | `cake.reply.signature` | user | string | chữ ký trả lời |
| options | `bizcity.cake.send_cap_per_hour` | tenant · channel_account | int | Send Guard (R-CAKE-SEND-1) |
| options | `bizcity.cake.send_hours` | tenant | json | giờ được gửi |
| options | `bizcity.cake.upload_max_mb` | tenant | int | |
| options | `bizcity.cake.unmerge_window_days` | tenant | int (30) | |

**Không** vào lớp mềm: số điện thoại / email (là danh tính → `contact_identities`), nhãn đang gắn (là touch), người phụ trách (là `assign` touch + `contact_state`), trạng thái giao tin (`messages.delivery`).

## 5. Khuôn màn dùng cho cake

| Màn | Khuôn |
|---|---|
| Danh bạ | `ListScreen` |
| Contact 360 | `DetailScreen` (tab: dòng thời gian · danh tính · đơn / công nợ · ghi chú) |
| Tin nhắn nhanh, nhãn, mẫu ghi chú, form | `RecordTypeScreen` (tự sinh) |
| Công việc | `BoardScreen` |
| Mọi thao tác ghi | `FormSheet` từ zod input của action |
| Hộp thư | màn riêng (3 cột, realtime) — lý do: không khuôn nào phủ được |
