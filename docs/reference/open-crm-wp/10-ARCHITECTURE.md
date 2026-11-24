# Open CRM · 10 — Kiến trúc và cấu trúc thư mục

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — kiến trúc kernel/platform/modules theo mẫu Open Kiot; luồng sự việc; MCP; đồng bộ ba dự án. -->

## 1. Sơ đồ

```text
BIZCITY OPEN CRM  (một plugin WordPress, một MySQL/MariaDB của WordPress, mỗi blog một kho dữ liệu)
│
├── Care Kernel
│   ├── Event Gateway        một cửa submit(): kiểm khuôn · khoá tự nhiên · phiên bản · chống trùng
│   ├── Care Ledger          sổ chỉ thêm · dòng đảo · dẫn xuất cùng giao dịch
│   ├── Send Guard           trần gửi / số / ngày · giờ gửi · danh sách không nhận · hàng chờ
│   ├── Outbox               sự việc ra ngoài · phát lại không trùng
│   └── Contracts            JSON schema + DDL crm-ledger@1 + mã lỗi OC-*
│
├── Platform                 cài bảng · migrator · REST bizcity-crm/v1 · quyền · phát hiện Zalo Brain
│
├── Modules (lõi phát hành)  inbox (chat) · broadcast (gửi hàng loạt) · contacts (danh bạ + thẻ)
│
├── Connectors               zalo-hub (tự nhận tin khi KHÔNG có Zalo Brain) · twin-brain (nghe hook lõi khi CÓ)
│
└── Integrations             Zalo Brain / cell (MCP) · Open Kế Toán · Open Kiot (REST + outbox)
```

## 2. Cấu trúc thư mục chuẩn (framework contract cho cộng đồng)

```text
bizcity-open-crm/
├── bizcity-open-crm.php          header plugin, hằng số, nạp bootstrap — không logic
├── uninstall.php                 không xoá dữ liệu trừ khi chủ bật cờ
├── kernel/                       Care Kernel (chỉ kernel ghi sổ)
│   ├── bootstrap.php
│   ├── class-ocrm-kernel.php     submit(), read actions
│   ├── class-ocrm-ledger.php
│   ├── class-ocrm-send-guard.php
│   ├── class-ocrm-outbox.php
│   └── errors.php                mã OC-* (code/message/hint/help_code)
├── platform/
│   ├── class-ocrm-install.php    tạo bảng theo luật 30-STANDALONE-INSTALL
│   ├── class-ocrm-migrator.php
│   ├── class-ocrm-rest.php       bizcity-crm/v1
│   ├── class-ocrm-host.php       phát hiện Zalo Brain, chọn connector
│   └── class-ocrm-caps.php
├── connectors/
│   ├── zalo-hub/                 cầu Zalo Hub (zalo-hub-bridge/1.0)
│   └── twin-brain/               nghe bizcity_crm_message_ingested, gửi qua Outbound_Dispatcher lõi
├── modules/
│   ├── inbox/      { module.json, class-*.php, rest.php }
│   ├── broadcast/
│   └── contacts/
├── mcp/
│   └── manifest.json             zalo-brain-extension@1.1: tool, mức rủi ro, schema
├── contracts/
│   ├── crm-ledger-v1.sql.php     BẢN SAO byte-giống của Zalo Brain
│   ├── events/*.schema.json      khuôn từng loại sự việc
│   └── openapi.json
├── db/changelog/open-crm.json    R-DCL
├── frontend/src  → assets/dist   một SPA nhỏ (React), chữ to, ít màu
├── docs/                         00-CANON · rules/ · adr/ · contracts/ · phases/
├── tests/                        unit + conformance (kiểm luật R-OC-*)
├── bin/                          validate-*.mjs (DDL sync, boundary, schema)
├── AGENTS.md · CLAUDE.md · CONTRIBUTING.md · SECURITY.md · LICENSE · CHANGELOG.md
└── zalo-brain.json               khai báo add-on cho Zalo Brain (tuỳ chọn)
```

Module mới của cộng đồng = một thư mục `modules/<key>/` có `module.json` (key, phiên bản, loại sự việc nộp, quyền cần, bảng riêng nếu có). Kernel đọc `module.json`, không đọc mã module.

## 3. Luồng một tin nhắn

```text
khách nhắn Zalo
  ├─ CÓ Zalo Brain:  cell → Hub → Channel Gateway → sổ hội thoại (lõi) → do_action('bizcity_crm_message_ingested')
  │                    → connectors/twin-brain → Kernel::submit( message.received )
  └─ KHÔNG:          Hub → POST /bizcity-crm/v1/hub/inbound (ký HMAC) → connectors/zalo-hub
                       → ghi sổ hội thoại (bảng của Open CRM) → Kernel::submit( message.received )
Kernel: kiểm khuôn → (source, doc_key) đã có? → ocrm_events → ocrm_ledger → ocrm_contact_state → ocrm_outbox
```

Trả lời của nhân viên đi ngược: `inbox` → `Kernel::submit( message.send_requested )` → Send Guard → connector gửi → `message.sent` / `message.failed`.

## 4. Loại sự việc ban đầu (v0.1)

| `type` | Nguồn | Dòng sổ |
|---|---|---|
| `message.received` · `message.sent` · `message.failed` | connector | chạm khách (vào / ra) |
| `broadcast.created` · `broadcast.target_sent` · `broadcast.target_failed` · `broadcast.cancelled` | module broadcast | mỗi người nhận một dòng |
| `contact.tagged` · `contact.untagged` · `contact.stage_changed` · `contact.note_added` | module contacts / cell | thay đổi trạng thái chăm sóc |
| `task.pushed` · `document.pushed` | cell (MCP) / Open Kế Toán / Open Kiot | việc / giấy tờ gắn vào khách |

## 5. MCP — Zalo Brain dùng Open CRM

Khai ở `mcp/manifest.json`, Zalo Brain nạp qua `zalo-brain-extension@1.1` khi có mặt. Cell gọi; site kiểm quyền theo người (principal) ở nguồn.

| Tool | Mức | Việc |
|---|---|---|
| `crm.contacts.search` | R0 | tìm khách theo tên / số / thẻ |
| `crm.conversation.read` | R0 | đọc N tin gần nhất của một hội thoại |
| `crm.report.care_summary` | R0 | số tin vào / ra, khách chưa trả lời, theo số Zalo / ngày (đọc dẫn xuất, site đếm) |
| `crm.contact.tag` · `crm.contact.note` | R1 | gắn thẻ, ghi chú |
| `crm.task.push` · `crm.document.push` | R1 | đẩy việc / giấy tờ vào khách |
| `crm.broadcast.draft` | R1 | soạn lượt gửi (chưa gửi) |
| `crm.broadcast.send` | R2 | gửi — chủ duyệt bằng mã |

## 6. Đồng bộ ba dự án

Không ai đọc CSDL của ai. Mỗi bên phát sự việc qua outbox, bên kia nhận qua REST có hợp đồng.

| Từ → Tới | Sự việc | Dùng để |
|---|---|---|
| Open Kiot → Open CRM | `kiot.order.committed` · `kiot.order.refunded` | nhắc chăm sóc sau mua, thẻ "đã mua" |
| Open Kế Toán → Open CRM | `ketoan.debt.due` · `ketoan.invoice.issued` | nhắc công nợ, gửi giấy tờ |
| Open CRM → hai bên | `crm.contact.upserted` | một khách, nhiều hệ: khoá chung `(sdt_chuan, zalo_uid)` |

Khoá khách chung và hợp đồng sự việc ghi ở `contracts/events/`. Đồng bộ là **tuỳ chọn** — mỗi dự án chạy đủ một mình.
