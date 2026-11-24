# open-cake · 20 — Trục dữ liệu: Contact 360 nối với Master Data, Document, Accounting Events

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-SPINE — bảng care-kernel, resolver danh tính, nối bốn trục theo canon §3; sửa: không root_document_id, chuỗi qua document_links. -->

> **Canon:** [§3 Bốn trục](../canon/BIZCITY-OPEN-CANON-v1.md#3-bốn-trục-dữ-liệu-xuyên-suốt-architect). Open-cake là **chủ** trục Contact 360; **người dùng** của ba trục còn lại.

## 1. Bảng lõi (schema `public`, mỗi bảng `tenant_id` + RLS FORCE + `COMMENT ON` tiếng Việt)

Quy ước cột theo `bizcity_data@1` / R-DB-*: `id bigint generated always as identity` cho khoá nội bộ; ULID `text` cho ID trục công khai; `created_at, created_by, updated_at, updated_by`; không xoá cứng (`archived_at`); cột cá nhân khai `pii`.

### 1.1 Trục người

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `contacts` | `contact_id text` ULID **PK**, `tenant_id`, `kind person\|org`, `display_name`, `status active\|merged\|archived`, `merged_into text NULL`, `merged_at`, `merge_event_id` | `merged_into` ⇒ `status = merged`; không DELETE (trigger); ID không dùng lại |
| `contact_identities` | `identity_id bigint`, `contact_id`, `channel` (enum §2), `scope text` (`global` · `page:<id>` · `account:<channel_account_id>` · `group:<id>` · `comment:<page_id>`), `external_id text` (*pii*), `display_name`, `confidence proven\|asserted\|guessed`, `proof jsonb {kind, event_id?, user_id?, note?}`, `valid_from`, `valid_to NULL` | `UNIQUE (tenant_id, channel, scope, external_id) WHERE valid_to IS NULL`; đổi = đóng dòng + mở dòng, cùng giao dịch; trigger cấm UPDATE ngoài `valid_to` |
| `contact_links` | `contact_id`, `app` (`ketoan`·`pos`·`kiot`), `kind partner\|customer`, `ref_code` (vd `CAKE-01J…`), `ref_id` (partner_id), `linked_at`, `link_event_id` | `UNIQUE (tenant_id, app, kind, contact_id)`; một chiều (canon §3.4) |

### 1.2 Trục kênh và hội thoại

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `channel_accounts` | `channel_account_id text` ULID, `channel`, `kind personal\|page\|group\|oa`, `external_account_id`, `label`, `owner_user_id`, `cell_ref`, `status` (sự thật từ Cell), `capabilities jsonb`, `connected_at`, `tested_at` | `UNIQUE (tenant_id, channel, external_account_id)`; **không** cột cookie / token |
| `conversations` | `conversation_id text` ULID, `channel_account_id`, `external_thread_id`, `contact_id`, `kind dm\|comment_thread\|group_thread`, `anchor jsonb {post_id, comment_id, parent_id}`, `last_in_at`, `last_out_at`, `window_until` (Page 24 h), `assignee_user_id` | `UNIQUE (tenant_id, channel_account_id, external_thread_id)`; đổi `contact_id` chỉ qua MERGE / RELINK |

### 1.3 Một cửa và sổ

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `touch_events` | `event_id uuid` v7, `source` (`cell:<id>` · `user:<id>` · `mcp:<client>` · `system`), `doc_key`, `version int`, `type`, `payload jsonb` (đã che bí mật), `actor jsonb`, `correlation_id`, `trace_id`, `received_at`, `status accepted\|unchanged\|rejected` | `UNIQUE (tenant_id, source, doc_key)`; payload bất biến; phiên bản cũ ⇒ `touch_event_versions` |
| `touch_event_versions` | `event_id`, `version`, `payload`, `archived_at` | chỉ thêm |
| `touch_ledger` | `touch_id bigint`, `event_id NOT NULL`, `contact_id NOT NULL`, `conversation_id`, `channel_account_id`, `channel`, `kind` (§3), `direction in\|out\|none`, `qty smallint ±1`, `is_reversal`, `reverses_id UNIQUE NULL`, `dims jsonb {user_id, campaign_id, tag, stage, doc_ref}`, `at` | **trigger chặn UPDATE / DELETE / TRUNCATE** (chép `0006_goc_so_cai.sql:640-682`); mỗi dòng đảo tối đa một lần |
| `messages` | `message_id text` ULID, `touch_id`, `conversation_id`, `external_message_id`, `body text` (*pii*), `attachments jsonb` (ref có TTL), `e2ee bool`, `delivery accepted\|sent\|delivered\|read\|failed\|unknown`, `delivery_at` | `UNIQUE (tenant_id, conversation_id, external_message_id)`; `delivery` chỉ đổi qua sự kiện `delivery.updated` |
| `contact_state` | `contact_id` PK, `stage`, `tags text[]`, `owner_user_id`, `last_in_at`, `last_out_at`, `unanswered`, `channels jsonb` (đếm theo kênh), `rev` | dẫn xuất, cập nhật **cùng giao dịch** với `touch_ledger`; `bizcity cake rebuild-state` dựng lại |

### 1.4 Hạ tầng chung (chép migration open-ketoan, đổi số)

`tenants` · `users` · `user_role_assignments` · `tenant_roles` · `tenant_role_rules` · `api_keys` · `audit_logs` (hash-chain) · `action_requests` · `mcp_confirm_tokens` · `event_outbox` · `event_deliveries` · `event_consumptions` · `setting_values` · `business_documents` · `document_versions` · `document_links` · `document_attachments` · `diagnostic_runs`.

**Mười một bảng care-kernel + hạ tầng chung.** Pipeline, việc, chiến dịch, báo cáo = module (`mod_<key>`).

## 2. Kênh (enum `channel`)

| `channel` | Nguồn | `scope` của danh tính khách | API |
|---|---|---|---|
| `zalo_personal` | zca-js ở Cell | `global` (Zalo UID) | không chính thức |
| `zalo_oa` | Zalo OA ở Cell | `oa:<oa_id>` (user id theo OA) | chính thức |
| `facebook_personal` | fbchat-v2 bridge ở Cell (WP PHASE-017) | `global` (FB UID) | không chính thức |
| `facebook_page` | Meta webhook `messages` | `page:<page_id>` (PSID) | chính thức, cửa sổ 24 h |
| `facebook_comment` | Meta webhook `feed` | `comment:<page_id>` (`from.id`) | chính thức, private reply 7 ngày |
| `facebook_group` | Meta webhook `group_feed` | `group:<group_id>` (`from.id`) | chính thức (tình trạng 2026 cần kiểm) |
| `phone` · `email` · `tax_code` · `bank_account` | nhân viên / form / Kế Toán | `global` | — |
| `web` | form, webchat | `site` | — |

## 3. Loại touch (`touch_ledger.kind`)

`message` · `comment` · `reaction` · `call` · `note` · `tag` · `stage` · `assign` · `merge` · `identity` · `document` (gắn `doc_ref` app khác) · `task` (từ module / Twin Brain) · `broadcast_target`.

Sự kiện ra (outbox, `bizcity_event@1`, tiền tố `bizcity.cake.`): `touch.recorded` · `contact.created` · `contact.merged` · `contact.unmerged` · `identity.linked` · `message.requested` · `message.delivery_changed` · `contact.partner_linked`. `data` chỉ có mã và số, **không** nội dung tin, không số điện thoại (STD-EVT).

## 4. Resolver danh tính (`care-kernel/identity/resolve.ts`)

```text
vào: (channel, scope, external_id, hints{phone?, email?, tax_code?, private_reply_of?})
 1. identity còn hiệu lực?                                   → contact_id
 2. hint có bằng chứng:
    a. phone / email / tax_code trùng identity proven        → GHÉP (proof = event_id, kind = phone|email|tax_code)
    b. private_reply_of = comment_id mà Cake đã gửi private reply, tin Page đầu tiên trong thread đó
                                                             → GHÉP comment ↔ PSID (proof kind = fb_private_reply)
 3. không bằng chứng                                         → TẠO contact, identity asserted
 4. gợi ý (cùng tên + cùng ảnh + cùng Page / số) chỉ để màn hiện; người có cake:contacts-gop bấm Ghép
```

- **MERGE B → A:** đóng mọi identity của B, mở lại trỏ A; `conversations.contact_id = A`; `contacts.B.status = merged, merged_into = A`; một dòng `touch_ledger kind=merge`. **Không sửa dòng sổ cũ**; view `bizcity_read.touches_by_contact` giải `merged_into`.
- **UNMERGE** trong 30 ngày = sự kiện đảo của merge (`reverses_id`), identity về như cũ.
- Không bao giờ ghép `facebook_personal` UID với PSID chỉ vì cùng tên.

## 5. Nối với Master Data (open-ketoan)

| Khi | Cake làm | Kế Toán làm |
|---|---|---|
| nhân viên bấm "Tạo khách công nợ" hoặc POS yêu cầu | `PUT /api/v1/partners/CAKE-<contact_id>` `{name, kind: customer, phone?, taxCode?}` (khoá API site, `catalog:write`) → lưu `contact_links` | tạo `partner_id`, phát `bizcity.masterdata.partner.changed` |
| Kế Toán đổi tên / mã số thuế | nghe sự kiện → **chỉ** cập nhật `ref_id` / cờ, không chép tên ngược | giữ sự thật |
| Kế Toán ngưng đối tượng (`catalog_tombstones`) | gắn cờ trên liên kết; contact **vẫn sống** | — |
| hiện công nợ trong Contact 360 | `GET /api/v1/partners/:code/balances` (đọc, cache ≤ 5 phút, R-CACHE) | — |

## 6. Nối với Document và Accounting Events

```text
Contact 360 ──(touch kind=document)──► cake.order_request:01J…   (business_documents của cake, nhóm trạng thái draft→done)
                                            │ document_links role=source (ghi ở POS)
                                            ▼
                                       pos.order:8812 ──► pos ledger intake: docKey pos:shop1:sale:8812
                                            │                          │ bizcity_ledger_intake@1
                                            ▼                          ▼
                                       pos.delivery:…            accounting_events (ketoan) → entry
```

- Cake tạo **`cake.order_request`** (khách chốt trong chat) và **`cake.quote`** — chứng từ nghiệp vụ, **không** nộp sổ.
- POS / Kiot nhận `order_request` (REST hoặc MCP nháp) và ghi `document_links (pos.order → cake.order_request, role source)`.
- Cake nghe sự kiện POS (`pos.order.*` qua webhook) để ghi touch `kind=document` với `dims.doc_ref` ⇒ Contact 360 thấy đơn, giao hàng, hoá đơn **bằng tham chiếu**, không sao chép.
- Đối chiếu 3 chiều (Twin Brain, canon §5): `cake.order_request` ⇄ `pos.delivery` ⇄ thu tiền ketoan; lệch ⇒ finding `CAKE-DOC-*`.

## 7. Bất biến kiểm bằng `selfcheck` (SC-CAKE-*)

| Mã | Kiểm |
|---|---|
| SC-CAKE-1 | trigger chỉ-thêm có trên `touch_ledger`, `touch_events`, `touch_event_versions`, `audit_logs` |
| SC-CAKE-2 | mọi `touch_ledger` có `event_id` tồn tại; mọi `reverses_id` trỏ dòng cùng `contact_id` gốc |
| SC-CAKE-3 | không hai identity hiệu lực cùng `(channel, scope, external_id)` |
| SC-CAKE-4 | không MERGE nào có `proof.kind = name` |
| SC-CAKE-5 | `contact_state` = dựng lại từ sổ (so `rev` + đếm) |
| SC-CAKE-6 | không bảng nào có cột tên `cookie`, `access_token`, `page_token`, `e2ee_key` |
| SC-CAKE-7 | mọi bảng có `tenant_id` + RLS FORCE |
| SC-CAKE-8 | không route nào nhận `tenantId` / `siteId` từ body / query |
