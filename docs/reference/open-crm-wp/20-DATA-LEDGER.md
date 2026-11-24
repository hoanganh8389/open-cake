# Open CRM · 20 — Dữ liệu: ít bảng, sổ là trái tim

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — 7 bảng sổ hội thoại dùng chung (crm-ledger@1) + 5 bảng riêng ocrm_*. -->

## 1. Hai nhóm bảng

| Nhóm | Bảng | Chủ |
|---|---|---|
| **Sổ hội thoại** — hợp đồng `crm-ledger@1`, tên giữ nguyên để site cũ không mất dữ liệu | `bizcity_crm_contacts` · `bizcity_crm_contact_inboxes` · `bizcity_crm_inboxes` · `bizcity_crm_conversations` · `bizcity_crm_messages` · `bizcity_crm_attachments` · `bizcity_crm_inbox_members` | Zalo Brain khi có; Open CRM khi không (30-STANDALONE-INSTALL) |
| **Sổ chăm sóc** — của riêng Open CRM | 5 bảng `bizcity_ocrm_*` dưới đây | luôn là Open CRM |

Tổng: **12 bảng khi chạy một mình, 5 bảng khi chạy cùng Zalo Brain** (so với 43 + 14 hiện nay).

## 2. Năm bảng riêng

| Bảng | Vai | Cột chính | Ghi |
|---|---|---|---|
| `ocrm_events` | sự việc đã nhận | `id`, `source`, `doc_key`, `type`, `version`, `payload` (JSON), `status`, `received_at`, `actor` · UNIQUE `(source, doc_key)` | chỉ Event Gateway; không DELETE; phiên bản cũ đi vào dòng sổ đảo |
| `ocrm_ledger` | sổ chăm sóc | `id`, `event_id` (NOT NULL), `contact_id`, `inbox_id`, `conversation_id`, `kind`, `direction`, `qty` (+1 / −1 khi đảo), `is_reversal`, `reverses_id`, `dims` (JSON: nhân viên, chiến dịch, thẻ), `at` · UNIQUE `reverses_id` | chỉ thêm |
| `ocrm_contact_state` | dẫn xuất — một dòng mỗi khách | `contact_id` PK, `stage`, `tags` (JSON), `last_in_at`, `last_out_at`, `unanswered`, `owner_user_id`, `rev` | dựng lại được từ `ocrm_ledger`; thay cho bảng `labels` / `conversation_labels` cũ |
| `ocrm_broadcasts` | lượt gửi hàng loạt | `id`, `title`, `inbox_ids` (JSON), `body`, `media` (JSON), `schedule` (JSON), `status`, `created_by`, `stats` (JSON, dẫn xuất) | người nhận và kết quả nằm ở bảng dưới + sổ |
| `ocrm_broadcast_targets` | người nhận một lượt | `broadcast_id`, `contact_id`, `inbox_id`, `status`, `attempts`, `sent_at`, `error_code` · UNIQUE `(broadcast_id, contact_id)` | hàng chờ của Send Guard; trạng thái cuối cũng ghi sổ |
| ~~`ocrm_outbox`~~ | Q-OC-3 | | đề xuất: cột `dispatched_at` + `dispatch_attempts` trên `ocrm_events` thay bảng outbox riêng ⇒ **5 bảng**. Nếu đồng bộ ba dự án cần thứ tự / nhiều đích ⇒ tách bảng (6) |

## 3. Vì sao không cần thêm bảng

| Nhu cầu | Đặt ở đâu |
|---|---|
| Thẻ, giai đoạn, người phụ trách | sổ (`contact.tagged`…) + dẫn xuất `ocrm_contact_state` |
| Ghi chú, việc, giấy tờ đẩy từ cell | sổ (`contact.note_added`, `task.pushed`, `document.pushed`); nội dung lớn ⇒ Kho tri thức của Zalo Brain hoặc file đính kèm |
| Báo cáo | đọc sổ + dẫn xuất; site đếm (số nguyên), không model nào cộng |
| Cấu hình (trần gửi, giờ gửi) | option không autoload, theo blog |
| Mẫu tin | option / post type sẵn có của WordPress |
| Nhật ký kỹ thuật | JSONL (không vào CSDL) |

## 4. Sổ có "cân" không?

Kế toán cân Nợ = Có; bán lẻ cân ba chân. Sổ chăm sóc cân theo **lượt**:

```text
Σ broadcast.target_* (sent + failed + cancelled)  =  số người nhận đã xếp hàng
Σ qty (dòng thường + dòng đảo) của một khách     =  số lần chạm khách còn hiệu lực
unanswered (dẫn xuất)                            =  dựng lại từ dòng vào / ra sau cùng
```

Bộ kiểm `tests/conformance/` chạy ba đẳng thức này trên dữ liệu thử và trên `wp ocrm verify` (chỉ đọc) ở site thật.
