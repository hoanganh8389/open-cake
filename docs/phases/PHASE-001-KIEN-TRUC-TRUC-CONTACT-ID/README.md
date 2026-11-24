# PHASE-001 — Kiến trúc open-cake: CRM Deplao trên khung open-ketoan, trục `contact_id` xuyên mọi kênh

<!-- [2026-11-24 Claude Opus 5.5] PHASE-018 — chủ (2026-11-24): "đóng tạm phase 17; nghiên cứu Phase 18 dựa trên kiến trúc, framework của repo open-ketoan, viết lại CRM Deplao lấy trọng tâm xuyên suốt lõi là trục contact id cho mọi nghiệp vụ dù đến từ mọi channel. Golden case: kết nối Facebook từ chat cá nhân, chat page, nhóm, comment. Automation / skill là việc của cell qua MCP. Không đi hướng đóng gói Electron như Deplao; đi hướng web online như open-ketoan, tiến tới kết hợp open-setup: multi db ⇒ one code base." -->
<!-- [2026-11-24 Claude Opus 5.5] PHASE-001 — bản chép từ bizcity-twin-crm/docs/phases/PHASE-018 (nguồn gốc nghiên cứu). Từ nay bản này là bản chủ; PHASE-018 bên plugin WP chỉ trỏ sang đây. Repo = open-cake (chủ chốt 2026-11-24, Q018-5 đóng). -->

> **Trạng thái:** ☐ nghiên cứu kiến trúc — chờ chủ chốt D018-1…14 và Q018-1…6. Chưa có repo, chưa có mã.
> **Mục tiêu (một câu):** Một **ứng dụng web** `open-cake` (TypeScript · Fastify · PostgreSQL · React) có hình dáng **giống hệt open-ketoan** — một bản mã, mỗi site một database, Frappe Site Manager (open-setup) cấp site — trong đó **`contact_id` là trục duy nhất**: mọi tin nhắn, bình luận, thẻ, việc, đơn, giấy tờ từ **bất kỳ kênh nào** đều rơi về một `contact_id`, ghi vào **sổ chạm khách chỉ thêm**, và chỉ vào qua **một cửa**.
> **Ngoài phạm vi:** AI trả lời / kịch bản / skill (việc của Cell qua MCP) · hoá đơn, công nợ (Open Kế Toán) · đơn hàng, thanh toán (Open Kiot / Open POS) · adapter kênh chạy trong CRM (kênh sống ở Cell / Hub) · Electron, bản cài máy khách · chuyển dữ liệu từ plugin WordPress hiện tại (phase sau).
> **Thay thế gì:** định vị "Open CRM = plugin WordPress" ở PHASE-001 **giữ nguyên cho bản đang chạy** (001–016); phase này mở **đích đến mới** là web độc lập. Hai bản sống song song cho tới khi có phase chuyển dữ liệu (Q018-6).

## 1. Sự thật đọc mã (2026-11-24)

### 1.1 open-ketoan — khung sẽ sao chép

Đọc bản local `d:\projects\open-ketoan-main` (2026-11-06, migration 0073) **và** GitHub `main` (migration 0181, có PHASE-039). Bản local **cũ**; mọi tham chiếu dưới đây là GitHub.

| Lớp | Ở đâu | Dùng lại cho open-crm |
|---|---|---|
| Monorepo | npm workspaces: `apps/api` (Fastify 5, Kysely, pg, zod, jose), `apps/web` (React 18, Vite, react-query), `packages/{contracts, platform, kernel, module-sdk, ui-kit, cli, vn-rulepacks}`, `modules/*`, `db/migrations/*.sql`, `tests/conformance/selfcheck.mjs`, `docker/`, `infrastructure/` | **Nguyên cây**, đổi `kernel` → `care-kernel`, bỏ `vn-rulepacks` |
| Một cửa ghi | `packages/kernel/src/index.ts:32-55` `postDocumentIn / submitDocumentIn`; `document.service.ts:9-23` lock(docKey) → cùng version = `unchanged` → cũ hơn = reject → đảo + lưu `accounting_event_versions` → post → emit | **Cùng thuật toán**, đổi tên: `submitTouchIn` |
| Khoá tự nhiên | `accounting_events UNIQUE(tenant_id, doc_key)` + `version` (`0005:546`); `action_requests UNIQUE(tenant_id, action_id, idem_key)` (`0035:21`) | `care_events UNIQUE(tenant_id, source, doc_key)` |
| Chỉ thêm | trigger cấm UPDATE/DELETE/TRUNCATE `ledger_lines…` (`0006:640-682`); đảo một lần qua UNIQUE `reverses_entry_id`; audit hash-chain (`0036`) | trigger y hệt trên `touch_ledger` |
| Outbox | `event_outbox` (uuid v7, `seq`, `dedupe_key`, cấm UPDATE) · `event_deliveries PK(consumer, event_id)` · `event_consumptions` (`0039:12-60`); runtime `platform/src/core/events.ts` `emitEvent` cùng giao dịch, `dispatchOnce` `SKIP LOCKED`, 8 lần / 5 s → 1 h, giữ 90 ngày; `defineSubscriber`; webhook HMAC cho app ngoài (`apps.ts`) | **Nguyên** |
| Đa đơn vị | `tenants` + RLS FORCE 84 bảng `bizcity_tenant_visible()` (`0041`); `set_config('bizcity.tenant_id')` khi mượn kết nối (`db/client.ts:33-48`); JWT `tid/sub/role/sv`, `X-Api-Key` một tenant; R-TEN-1 không nhận `tenantId` từ input | **Nguyên** |
| Nhiều CSDL | **PHASE-039** (W0 chốt 2026-11-21, D039-1…20): site = **database** riêng; `SITE_MODE=single\|multi` một đường mã; Site Registry trong `CONTROL_DATABASE_URL` (`sites, site_domains, site_jobs, site_backups, provision_keys`); Database Router `Host → site → pool` (≤ 4 kết nối / site, đóng sau 5 phút); JWT thêm `sid`; thiếu ngữ cảnh ⇒ `SITE_CONTEXT_MISSING`; `CREATE DATABASE kt_<slug> TEMPLATE kt_template`; cổng lược đồ `schema_version` ⇒ 503 `SITE_UPGRADING`; xoá mềm 30 ngày; vai trò `kt_<slug>_app` riêng (D039-19, owner hoãn D039-20); Provisioning API `/_sites/v1` chỉ trên `SITE_ADMIN_HOST`, khoá `prov_…`, `Idempotency-Key`; khoá `biz-…` chỉ cảnh báo (D039-17) | **Nguyên**, tiền tố `cake_<slug>`, `cake_template`, `cake_control` |
| Module | `bizcity.module.json` (`bizcity_module@1`), schema `mod_<key>` + vai trò `mod_<key>_rw` không có quyền bảng public, mọi bảng phải có `tenant_id` + RLS FORCE, đọc qua view `bizcity_read.*`, mount `/api/v1/m/<key>/` và `/app/<key>/` | **Nguyên** |
| Action / MCP | `defineAction / runAction` (`platform/src/core/actions.ts`); `POST /mcp` JSON-RPC không trạng thái, tool sinh từ action `expose.mcp`, ghi cần dry-run + `confirm_token` 900 s (`0037`) | **Nguyên** — đây là cửa cho Cell làm automation / skill |
| Web | Vite build tĩnh vào nginx, proxy `/api/`, `/mcp` → `api:4100`; cho phép nhúng iframe WordPress admin; `wp-sso.ts` vé HMAC ≤ 5 phút từ WP multisite | **Nguyên** |
| Danh mục đối tượng | `partners` (`0002:513-562`): `code, kind customer\|supplier\|…, phone, email, is_prospect…`; action `core.partner.upsert`; lộ trình 5.1 "Module CRM… chuyển thành khách → `core.partner.upsert`"; `docs/architecture/README.md:117` CRM "không chạm sổ"; `CHANNEL-GATEWAY-PORT.md:15` inbox / campaign / ZNS **không phải Core** | CRM **không** dùng `partners` làm trục; chỉ **tham chiếu** khi khách thành đối tượng công nợ (§4.6) |
| Luật / nếp | `docs/00-CANON.md` (trụ I–VIII, ECP-01…13, LEAN-1…7, 4 điều bất khả xâm phạm, R-*), `CONG-BO-KIEN-TRUC.md` (AP-1…7), AGENTS.md (R-FLOW claim trước khi code, R-SIG dấu `[YYYY-MM-DD HH:MM AM/PM Johnny Chu - Chu Hoàng Anh] <CODE> — …`, R-REV), khuôn phase (`README` + `00-MASTER-PLAN` + `40-MASTER-CHECKLIST` + `CLAIMS.md`), `selfcheck.mjs` có baseline ratchet | **Nguyên**, mã luật `R-OC-*` |

### 1.2 bizcity-open-setup — người cấp site

Frappe v15, app `bizcity_site_manager` (~700 dòng Python). **Không** tạo site Frappe cho khách, **không** chạm PostgreSQL (R-ROLE-3). Chỉ gọi Provisioning API của open-ketoan: `POST /_sites/v1/sites {slug, domain, displayName, owner, externalRef, sample}` → poll `GET /jobs/{id}` → `active`; suspend / resume / backup / delete / reset-password / license. DocType `Bizcity Ketoan Site` (slug, domain, status, site_id, schema_version, app_version, license_status), `Bizcity Provision Job`, `Bizcity Site Customer` (`external_ref` = WP user id). WordPress `bizcity-web` gọi Frappe bằng token `Bizcity Site Operator`. Tên miền gốc là cấu hình (`wildcard` / `cpanel`). **Không có một chữ nào về CRM / contact / Facebook.** ⇒ open-crm phải **nói đúng hợp đồng `bizcity_site_provisioning@1`** và open-setup cần thêm khái niệm *sản phẩm* (Q018-2).

### 1.3 Open CRM hiện tại (plugin WordPress, phases 001–016)

Đã có thiết kế lõi đúng hướng ở `docs/open-crm/`: kernel `OCRM_Kernel::submit()` một cửa, `ocrm_events UNIQUE(source, doc_key)`, `ocrm_ledger` chỉ thêm + dòng đảo, `ocrm_contact_state` dẫn xuất, Send Guard, outbox, luật R-OC-* (00-CANON 0.1). UI Deplao 13 màn đã vào mã thật (`frontend/src/oc/`, 40-MASTER-CHECKLIST). **Giữ lại toàn bộ ý tưởng; đổi nền** PHP/MySQL/WordPress ⇒ TypeScript/PostgreSQL/web. Trục hiện tại là **hội thoại + số Zalo** (`crm-ledger@1`: `bizcity_crm_contacts` gắn chặt inbox Zalo); phase này đặt **contact** lên trên kênh.

### 1.4 Deplao — chuẩn giao diện, không phải chuẩn kiến trúc

Electron, SQLite local, `DataSyncService` 70 bảng, tunnel boss ↔ nhân viên, AI key trong app, workflow builder trong app. Facebook: **chỉ Messenger cá nhân** qua bridge fbchat-v2 (`src/services/facebook/`: FacebookService, MQTTListener, ThreadManager, E2EE…); **không có** Page inbox, comment, Group. ⇒ Deplao cho ta **13 màn** (đã dịch ở PHASE-001 §4), **không** cho ta mô hình dữ liệu lẫn golden case Facebook.

### 1.5 Facebook — bốn mặt, bốn không gian định danh (Meta docs + fbchat-v2, 2026-11-24)

| Mặt | API | Định danh khách | Không gian | Cửa sổ gửi |
|---|---|---|---|---|
| Chat **cá nhân** (Messenger của tài khoản FB phụ) | **không chính thức** — bridge Go fbchat-v2 (PHASE-017) | FB user id, tên | theo người (toàn cục) | không có luật 24 h; rủi ro checkpoint |
| Chat **Page** | chính thức — webhook `messages`, `message_reads`, `messaging_postbacks`; Send API | **PSID** (page-scoped), tên / ảnh qua profile API | **theo Page**: cùng một người, hai Page ⇒ hai PSID | 24 h từ tin cuối của khách; ngoài: message tag |
| **Comment** bài Page | chính thức — webhook `feed` (`comment_id, post_id, parent_id, from.id, from.name, message`) | `from.id` — Meta **không nói** nó là PSID hay user id | chưa rõ (coi là riêng) | 1 **private reply** trong 7 ngày ⇒ mở thread Messenger ⇒ từ đó có PSID |
| Comment trong **Group** (bài do Page đăng) | chính thức — webhook `group_feed` (`group_id, comment_id, post_id, from.id, from.name`); tình trạng 2026 chưa xác nhận | `from.id` | chưa rõ | private reply nếu group cho phép |

Không tìm thấy API chính thức ghép PSID ↔ user id cá nhân ↔ `from.id`. **Hệ quả thiết kế:** mỗi mặt là **một danh tính riêng**; chỉ ghép khi có **bằng chứng** (số điện thoại / email trùng, private reply mở thread, chủ xác nhận). Đây chính là lý do `contact_id` phải tách khỏi mọi id kênh.

## 2. Bức tranh

```text
                 open-setup (Frappe Site Manager)         bizcity-llm-router (Hub 1API, khoá biz-…)
                        │ bizcity_site_provisioning@1              │ cell-link, MCP relay
                        ▼                                          ▼
┌───────────────────────────────── open-crm (một bản mã, web) ─────────────────────────────────┐
│  apps/web (React, 13 màn Deplao)      apps/api (Fastify)  /api/v1  /mcp  /_sites/v1          │
│  packages/platform  ← y hệt open-ketoan: auth · actions · events(outbox) · db(router) · RLS  │
│  packages/care-kernel  ← thay accounting-kernel:                                             │
│      contacts · contact_identities · channel_accounts · conversations                        │
│      care_events (một cửa)  →  touch_ledger (chỉ thêm)  →  contact_state (dẫn xuất)          │
│  packages/contracts   unified-touch@1 · channel-command@1 · contact-link@1 · bizcity_module@1 │
│  modules/  inbox · contacts · broadcast · tasks · (cộng đồng)                                 │
│  db: cake_control (registry)  ·  cake_template  ·  cake_<slug> × N                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ unified-touch@1 (ký, idempotent)              │ channel-command@1 (gửi, reply, private-reply)
          │                                               ▼
   ZaloHub Cell  ── zca-js (Zalo cá nhân) · fbchat-v2 bridge (FB cá nhân, PHASE-017) · Meta webhooks (Page / feed / group_feed) · Zalo OA
```

Ba đường **không** có: CRM → provider trực tiếp · CRM gọi LLM · module ghi thẳng `touch_ledger`.

## 3. Từ vựng

| Từ | Nghĩa trong open-crm |
|---|---|
| **Site** | một tên miền + một database `cake_<slug>` (một doanh nghiệp / một chuỗi). Do open-setup cấp |
| **Đơn vị** (`tenant_id`) | chi nhánh / đội trong site, RLS như open-ketoan. Site nhỏ có đúng một đơn vị |
| **Contact** (`contact_id`, ULID) | **một con người hoặc một tổ chức** mà doanh nghiệp chăm sóc. Không phải một số Zalo, không phải một PSID |
| **Identity** | một cách kênh gọi tên contact: `(channel, scope, external_id)`. Một contact nhiều identity; một identity đúng một contact tại một thời điểm |
| **Channel account** | tài khoản *của doanh nghiệp* trên kênh: số Zalo cá nhân, Zalo OA, FB cá nhân, FB Page, FB Group |
| **Conversation** | một luồng trên một channel account: `(channel_account_id, external_thread_id)`; trỏ về đúng một `contact_id` |
| **Touch** | một lần chạm khách: tin vào / ra, comment, reply, gắn thẻ, đổi giai đoạn, ghi chú, việc, giấy tờ. Mỗi touch là một dòng sổ |
| **Care event** | sự việc đã nhận ở cửa, có `(source, doc_key, version)`. Không event ⇒ không touch |

## 4. Thiết kế lõi

### 4.1 Bảng của care-kernel (schema `public`, mọi bảng `tenant_id` + RLS FORCE)

| Bảng | Vai | Cột chính | Luật |
|---|---|---|---|
| `contacts` | trục | `contact_id` ULID PK, `kind person\|org`, `display_name`, `status active\|merged\|archived`, `merged_into`, `created_at` | ID **không bao giờ** dùng lại (ECP-02); merge = `status=merged` + `merged_into`, không xoá |
| `contact_identities` | chìa khoá ghép | `identity_id`, `contact_id`, `channel` (`zalo_personal\|zalo_oa\|facebook_personal\|facebook_page\|facebook_group\|facebook_comment\|phone\|email\|web`), `scope` (vd `page:<page_id>`, `account:<acc_id>`, `global`), `external_id`, `display_name`, `confidence` (`proven\|asserted\|guessed`), `proof` (JSON: `kind`, `event_id`), `valid_from`, `valid_to` · UNIQUE `(tenant_id, channel, scope, external_id)` WHERE `valid_to IS NULL` | đổi contact của một identity = đóng dòng (`valid_to`) + mở dòng mới, cùng giao dịch, có `proof`. Không ghép theo tên |
| `channel_accounts` | tài khoản doanh nghiệp | `channel_account_id`, `channel`, `kind personal\|page\|group\|oa`, `external_account_id`, `label`, `owner_user_id`, `cell_ref` (id bên Cell), `status`, `capabilities` (JSON từ Cell) | CRM **không giữ** cookie / token / khoá; chỉ `cell_ref` |
| `conversations` | luồng | `conversation_id`, `channel_account_id`, `external_thread_id`, `contact_id`, `kind dm\|comment_thread\|group_thread`, `anchor` (JSON: `post_id`, `comment_id`), `last_in_at`, `last_out_at`, `window_until` (24 h Page) · UNIQUE `(tenant_id, channel_account_id, external_thread_id)` | đổi `contact_id` chỉ qua op MERGE / RELINK, ghi sổ |
| `care_events` | **một cửa** | `event_id` uuid v7, `source`, `doc_key`, `version`, `type`, `payload` JSONB, `actor`, `correlation_id`, `received_at`, `status` · UNIQUE `(tenant_id, source, doc_key)` | như `accounting_events`: cùng version ⇒ `unchanged`; nhỏ hơn ⇒ 409; lớn hơn ⇒ đảo dòng cũ, lưu `care_event_versions` |
| `touch_ledger` | **sổ chỉ thêm** | `touch_id`, `event_id` NOT NULL, `contact_id` NOT NULL, `conversation_id`, `channel_account_id`, `kind`, `direction in\|out\|none`, `qty ±1`, `is_reversal`, `reverses_id` UNIQUE, `dims` JSONB (nhân viên, chiến dịch, thẻ, giai đoạn), `at` | trigger cấm UPDATE/DELETE/TRUNCATE (chép `0006:640-682`); mọi báo cáo đọc từ đây |
| `messages` | nội dung | `message_id`, `touch_id`, `external_message_id`, `body`, `attachments` JSONB (ref có TTL, không khoá E2EE), `e2ee`, `delivery accepted\|sent\|delivered\|read\|failed\|unknown` | nội dung tách khỏi sổ; `delivery` chỉ đổi qua event `delivery.updated` |
| `contact_state` | dẫn xuất | `contact_id` PK, `stage`, `tags`, `owner_user_id`, `last_in_at`, `last_out_at`, `unanswered`, `channels` (JSON đếm theo kênh), `rev` | cập nhật cùng giao dịch với dòng sổ; `bizcity crm rebuild-state` dựng lại được |
| `event_outbox` · `event_deliveries` · `event_consumptions` · `action_requests` · `mcp_confirm_tokens` · `audit_log` | hạ tầng | chép nguyên từ open-ketoan `0035, 0036, 0037, 0039` | — |

**Mười bảng lõi.** Pipeline / SLA / hoá đơn / đơn hàng **không** vào lõi (module hoặc dự án khác).

### 4.2 Hợp đồng `unified-touch@1` (Cell / Hub → CRM) — thay cho `inbound_forward` của `zalo-hub-bridge`

```json
{
  "contract": "unified-touch@1",
  "event_id": "01J…",
  "type": "message.received",
  "occurred_at": "2026-11-24T08:00:00Z",
  "site_id": "crm_acme",
  "channel": "facebook_page",
  "channel_account": { "external_account_id": "1234567890", "kind": "page" },
  "thread": { "external_thread_id": "psid:2468", "kind": "dm", "anchor": null },
  "sender": { "external_id": "2468", "scope": "page:1234567890", "display_name": "Nguyễn Văn A" },
  "direction": "inbound",
  "content": { "type": "text", "text": "Còn hàng không shop?", "attachments": [] },
  "encryption": { "e2ee": false },
  "source": "cell:zalohub",
  "doc_key": "facebook_page|1234567890|psid:2468|m_abc123",
  "version": 1,
  "trace_id": "…"
}
```

- `type` ∈ `message.received · message.sent · delivery.updated · comment.received · comment.replied · reaction.added · account.status · history.sync.completed`. Cell chỉ phát loại nó **có trong `capabilities`**.
- `doc_key` = `channel|account|thread|external_message_id` — Cell tạo, CRM không tự tính lại. Thiếu id nguồn ⇒ Cell tạo surrogate + `confidence=guessed`.
- Comment: `thread.kind=comment_thread`, `anchor={post_id, comment_id, parent_id}`, `sender.scope="comment:<page_id>"` (vì Meta không nói `from.id` thuộc không gian nào — D018-8).
- `site_id` do **Hub tra từ khoá đã xác thực**, không tin payload. Ký HMAC + timestamp + nonce ở Hub → CRM (việc 017.H1 chuyển sang đây, bắt buộc ở web).
- Phản hồi CRM: `{status: unchanged|accepted|conflict, touch_id?, contact_id}` — Cell không cần biết contact.

### 4.3 Hợp đồng `channel-command@1` (CRM → Hub → Cell)

`message.send · comment.reply · comment.private_reply · thread.mark_read · history.sync` với `idempotency_key = crm:<touch_id>:send:<n>`, `channel_account_id`, `external_thread_id` hoặc `anchor`. Trạng thái trả về ba mức `accepted ≠ sent ≠ delivered`, hết giờ chờ ⇒ `unknown`, **không tự gửi lại** (giữ D017-6). Page quá 24 h ⇒ CRM từ chối trước khi gửi với lỗi `WINDOW_CLOSED` + gợi ý tag.

### 4.4 Resolver danh tính — luật ghép (R-OC-ID)

```text
touch đến với (channel, scope, external_id)
  1. tra contact_identities còn hiệu lực  → có  ⇒ contact_id, xong
  2. không có:
     a. phone / email trong payload (Zalo OA, form web, Page profile khi khách cho)  → khớp identity `phone|email` proven ⇒ GHÉP, proof = event_id, confidence = proven
     b. private reply: comment (anchor.comment_id) đã gửi private_reply, nay có tin Messenger đầu tiên trong thread mới mở từ đúng comment đó ⇒ GHÉP identity `facebook_comment` ↔ `facebook_page:PSID`, confidence = proven (Meta buộc thread này thuộc người comment)
     c. không bằng chứng ⇒ TẠO contact mới, identity confidence = asserted
  3. gợi ý "có thể là cùng người" (cùng tên + cùng ảnh + cùng Page) chỉ hiện ở màn, nhân viên bấm "Ghép" ⇒ op MERGE, proof = {kind: human, user_id}
```

- MERGE (ECP-06 continuity): contact B → A: mọi identity của B đóng `valid_to` + mở lại trỏ A; `conversations.contact_id` cập nhật; **`touch_ledger` không sửa** — báo cáo đọc qua `contacts.merged_into` (view `bizcity_read.touches_by_contact` giải merge). UNMERGE trong 30 ngày = op đảo, có sổ.
- Không bao giờ ghép giữa `facebook_personal` UID và PSID chỉ vì cùng tên (1.5).

### 4.5 Golden case Facebook — một người, bốn mặt, một `contact_id`

| Bước | Mặt | Điều gì xảy ra trong lõi |
|---|---|---|
| G1 | Khách comment "giá sao" dưới bài Page | `comment.received` ⇒ contact C1 mới, identity `(facebook_comment, comment:<page>, from.id)` asserted, conversation `comment_thread` anchor bài; touch `in` |
| G2 | Nhân viên bấm "Trả lời riêng" | `comment.private_reply` ⇒ touch `out`; conversation ghi `pending_private_reply` |
| G3 | Khách trả lời trong Messenger Page | `message.received` scope `page:<page>` PSID mới; resolver 2b ⇒ **ghép** vào C1 (proven); conversation `dm` mới cùng `contact_id`; `window_until = +24h` |
| G4 | Khách để lại số điện thoại | `contact.identity_asserted` (nhân viên gõ hoặc Cell trích) ⇒ identity `phone` proven |
| G5 | Tuần sau khách nhắn **Messenger cá nhân** của chủ shop (fbchat-v2, PHASE-017) | identity `(facebook_personal, account:<acc>, uid)` mới ⇒ 2c tạo C2; màn hiện gợi ý "cùng tên với C1" ⇒ nhân viên xác nhận ⇒ MERGE C2 → C1 |
| G6 | Khách comment trong **Group** của Page | `group_feed` ⇒ identity `(facebook_group, group:<gid>, from.id)`; nếu `from.id` trùng với identity comment Page (cùng scope-less id) ⇒ coi là **asserted**, không proven (Q018-4) |
| G7 | Màn Contact C1 | một dòng thời gian: comment → private reply → chat Page → chat cá nhân → comment group; đếm theo kênh từ `contact_state.channels` |
| G8 | Khách mua ⇒ chuyển thành khách công nợ | module `contacts` gọi Open Kế Toán `core.partner.upsert` qua REST + API key; lưu `partner_ref` trong `dims`; **không** sao chép bảng `partners` |

Xong G1–G8 trên site thử = **golden case PASS**.

### 4.6 Ranh giới với ba dự án anh em

| | Open CRM giữ | Không giữ, tham chiếu |
|---|---|---|
| Open Kế Toán | `contact_id`, touch | `partner_id` (công nợ), hoá đơn, sổ cái |
| Open Kiot / Open POS | gợi ý đơn trong chat (`document.pushed`) | đơn, thanh toán, kho |
| Cell (Zalo Brain) | MCP tools R0/R1/R2 (`contact.read`, `touch.list`, `message.draft`, `message.send` cần confirm) | AI, kịch bản, skill, phiên kênh |

### 4.7 Nhiều CSDL — chép PHASE-039, đổi tiền tố

`SITE_MODE single|multi` · `CONTROL_DATABASE_URL` (`cake_control`) · `SITE_TEMPLATE_DB=cake_template` · `SITE_ADMIN_HOST` · `/_sites/v1` cùng hợp đồng `bizcity_site_provisioning@1` · vai trò `cake_<slug>_app` · JWT `sid` · `SITE_CONTEXT_MISSING` · cổng `schema_version`. Khác duy nhất: Cell / Hub cần biết **tên miền site** để gửi `unified-touch` ⇒ registry thêm `site_domains.channel_ingress_url` do Hub đọc (Q018-3).

**"One code base" đi tới đâu:** bước 1 (phase này) open-crm là repo riêng **cùng khung**; bước 2 open-setup cấp cả hai sản phẩm; bước 3 (ngoài phase) nếu chủ muốn **một** tiến trình chạy cả kế toán và CRM thì `packages/platform` phải thành gói chung (Q018-1).

## 5. Deplao → open-crm: 13 màn giữ, dữ liệu đổi

Bảng dịch ở PHASE-001 §4 vẫn đúng cho giao diện. Đổi ở **rail**: không còn "mỗi số Zalo một hộp" mà là **"mỗi contact một dòng thời gian"**, lọc theo kênh / channel account. Mockup `docs/phases/mockups/src/screens/*.jsx` tái dùng; thêm màn **Contact 360** (dòng thời gian đa kênh + danh tính + nút Ghép / Tách) và màn **Kênh** (channel accounts: Zalo cá nhân · OA · FB cá nhân · FB Page · FB Group, mỗi thẻ 4 bước kết nối qua Hub, trạng thái lấy từ Cell).

## 6. Cấu trúc repo đề xuất

```text
open-crm/
├── apps/api        Fastify · /api/v1 · /mcp · /_sites/v1 · /ingress/v1 (unified-touch, ký HMAC)
├── apps/web        React · 13 màn Deplao + Contact 360 + Kênh
├── packages/contracts     zod: unified-touch@1 · channel-command@1 · contact-link@1 · care-event@1
├── packages/platform      ← fork có ghi nguồn từ open-ketoan (auth · actions · events · db router · RLS · settings)
├── packages/care-kernel   contacts · identities · resolver · submitTouchIn · ledger · state · merge
├── packages/module-sdk    ← fork
├── packages/ui-kit        ← fork + token Deplao (PHASE-002)
├── packages/cli           bizcity crm: site create|migrate|backup · rebuild-state · identity audit
├── modules/inbox · contacts · broadcast · tasks        (bizcity.module.json, mod_<key>)
├── db/migrations/0001…    SQL là nguồn sự thật; 0001 nền + RLS, 0002 care-kernel, 0003 outbox…
├── tests/conformance/selfcheck.mjs   SC-OC-*: ledger append-only · one door · identity unique · no merge by name · RLS FORCE · outbox tx
├── docker/  api · web · nginx · db-migrate
├── docs/00-CANON.md · rules/RULE-*.md · contracts/ · adr/ · phases/ · CLAIMS.md
└── AGENTS.md · CLAUDE.md · LICENSE (GPL-2.0-or-later) · TRADEMARK.md
```

## 7. Quyết định đề xuất (D018-*)

| Mã | Quyết định | Vì sao |
|---|---|---|
| **D018-1** | open-crm là **ứng dụng web** TypeScript · Fastify · PostgreSQL · React, **cùng khung open-ketoan**; không Electron, không PHP | chủ chốt; dùng lại platform, RLS, outbox, MCP, selfcheck đã chứng minh |
| **D018-2** | **`contact_id` là trục**; mọi bảng nghiệp vụ (`conversations`, `touch_ledger`, `contact_state`, module) tham chiếu `contact_id`, không tham chiếu id kênh | một người nhiều kênh; kênh đến rồi đi, contact ở lại |
| **D018-3** | **Danh tính tách khỏi contact** (`contact_identities` có `scope`, `confidence`, `proof`, `valid_from/to`) | PSID theo Page, UID cá nhân toàn cục, `from.id` chưa rõ — không thể là một cột |
| **D018-4** | **Không ghép theo tên.** Ghép tự động chỉ với bằng chứng `proven` (phone / email / private-reply handshake); còn lại nhân viên xác nhận | tránh gửi nhầm người; luật đã có ở ARCH §5.5 |
| **D018-5** | **Một cửa** `submitTouchIn` với `(source, doc_key, version)`; **sổ chỉ thêm** `touch_ledger` với trigger và dòng đảo; dẫn xuất cùng giao dịch | chép nguyên trụ I–IV của open-ketoan |
| **D018-6** | **Kênh sống ở Cell / Hub.** CRM không cầm cookie, token Page, khoá E2EE; chỉ nhận `unified-touch@1` đã ký và gửi `channel-command@1` | ARCH §2; PHASE-017 Z2/Z3 giữ nguyên vai Cell |
| **D018-7** | Thay `zalo-hub-bridge/inbound_forward` bằng `unified-touch@1` **cho open-crm web**; plugin WordPress hiện tại **không đổi** | hợp đồng mới cho nền mới, không phá site đang chạy |
| **D018-8** | Comment Facebook là identity **riêng** scope `comment:<page_id>`; chỉ nối với PSID qua private-reply handshake | Meta không khai không gian của `from.id` |
| **D018-9** | **Nhiều CSDL theo PHASE-039** y nguyên: site = database, `SITE_MODE`, control DB, Provisioning API cùng hợp đồng, xoá mềm, cổng lược đồ | open-setup cấp CRM mà không học hợp đồng mới |
| **D018-10** | Automation / skill / AI = **Cell qua MCP** (`/mcp` tool từ action `expose.mcp`, ghi cần `confirm_token`). CRM phát sự kiện ra webhook HMAC cho Cell | chủ chốt; R-OC-BRAIN-1 giữ |
| **D018-11** | Lõi **10 bảng** (§4.1). Pipeline, SLA, việc, chiến dịch = module `mod_<key>`; hoá đơn / đơn = dự án khác | LEAN-5 Progressive Complexity; census 43 → 5 của 0.156 không quay lại |
| **D018-12** | `partners` của Open Kế Toán **không** là trục CRM; contact ⇒ partner qua `core.partner.upsert` khi phát sinh công nợ, lưu `partner_ref` | open-ketoan `architecture/README.md:117`: CRM không chạm sổ |
| **D018-13** | Giữ **13 màn Deplao** + 2 màn mới (Contact 360, Kênh); token PHASE-002; R-LEAN-4 | đã duyệt ảnh 2026-11-23 |
| **D018-14** | Thứ tự: **W1 skeleton + care-kernel + selfcheck** → W2 ingress Zalo cá nhân (kênh đã có) → W3 FB Page + comment (API chính thức) → W4 FB cá nhân (mở lại PHASE-017) → W5 multi-site + open-setup → W6 Group + merge UI | thắng nhỏ, kênh chính thức trước kênh không chính thức |

## 8. Câu hỏi cho chủ (Q018-*)

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| Q018-1 | `packages/platform` lấy bằng cách nào? **A.** fork vào open-crm (nhanh, hai bản trôi). **B.** tách thành repo/gói `@bizcity/platform` dùng chung cho open-ketoan và open-crm (đúng "one code base", nhưng đụng open-ketoan K3) | **A ở W1**, ghi `UPSTREAM.md` commit gốc; mở ADR tách gói sau khi open-crm chạy được site đầu |
| Q018-2 | open-setup: thêm trường `product: ketoan\|crm` vào `Bizcity Ketoan Site` + Settings có hai `provisioning_url`, hay DocType riêng `Bizcity CRM Site`? | thêm `product` + bảng con URL theo sản phẩm; hợp đồng `bizcity_site_provisioning@1` **không đổi**, chỉ thêm `product` tuỳ chọn |
| Q018-3 | Hub tìm site CRM để gửi touch bằng gì: Hub giữ bảng `site → ingress_url` riêng, hay hỏi registry `/_sites/v1/sites/{id}` của CRM? | Hub giữ bảng riêng, cập nhật khi site `active` (webhook từ Provisioning job) — Hub không đọc control DB |
| Q018-4 | `from.id` của comment Page và comment Group trùng nhau có coi là cùng người không? | **asserted**, không proven, cho tới khi kiểm được trên Page thử |
| Q018-5 | ~~Tên repo~~ — **chốt 2026-11-24: repo web = `open-cake`**, plugin WP giữ tên `open-crm`, hai bản song song theo [canon §6](../../canon/BIZCITY-OPEN-CANON-v1.md) | — |
| Q018-6 | Dữ liệu site WordPress đang dùng Open CRM plugin: chuyển sang web khi nào, hay plugin WP sống mãi làm "bản nhúng"? | plugin WP chạy tới khi web qua golden case; phase chuyển dữ liệu riêng (`crm-ledger@1` → `unified-touch@1` backfill) |

## 9. Đợt việc (W)

| Đợt | Việc | Xong khi |
|---|---|---|
| **W0** | Chủ chốt D/Q; ADR-0001 open-crm "cùng khung open-ketoan, trục contact"; `docs/00-CANON.md` R-OC-* bản 1.0 | ADR được duyệt |
| **W1** | Repo skeleton (fork platform, module-sdk, ui-kit, cli, selfcheck); `db/migrations/0001–0004` (nền + RLS, care-kernel, outbox, mcp); `submitTouchIn`, resolver, merge; `selfcheck --strict` SC-OC-* xanh | `npm test` + `selfcheck` PASS trên DB test; chưa có kênh |
| **W2** | `/ingress/v1` nhận `unified-touch@1` ký HMAC; Cell zalo-hub phát `unified-touch` **song song** `inbound_forward` (cờ theo tenant); màn Hộp thư + Danh bạ + Contact 360 đọc sổ | một số Zalo thật ⇒ tin vào / ra hiện ở web, replay không trùng |
| **W3** | FB Page + comment qua API chính thức: Cell nhận webhook Meta, phát `comment.received`, `message.received` scope page; `comment.private_reply`; resolver 2b | G1–G4 PASS |
| **W4** | Mở lại PHASE-017 (fbchat-v2 bridge) phát `unified-touch` cho `facebook_personal` | G5 PASS |
| **W5** | `SITE_MODE=multi`, control DB, Provisioning API, open-setup thêm `product` | open-setup tạo site CRM, site A không thấy site B |
| **W6** | Group feed, màn Kênh đủ 5 thẻ, Ghép / Tách, báo cáo theo kênh, MCP tools R0–R2 | G6–G8 PASS; Cell gọi `/mcp` đọc contact và nháp tin |

## 10. Xong khi

Trên một site `cake_<slug>` do open-setup cấp, chạy cùng bản mã với một site khác:

1. Golden case G1–G8 PASS, có `evidence/golden-fb-<ngày>.md` (log che PSID một phần).
2. `selfcheck --strict`: sổ chỉ thêm, một cửa, identity duy nhất theo `(channel, scope, external_id)`, không ghép theo tên, RLS FORCE mọi bảng, outbox cùng giao dịch.
3. Phát lại 1 000 `unified-touch` trùng ⇒ 0 dòng sổ mới; đổi version một event ⇒ đúng một dòng đảo + một dòng mới.
4. `bizcity crm rebuild-state` dựng lại `contact_state` bằng đúng bản đang có.
5. Không có cookie / token / khoá nào trong database CRM, log API, hay payload outbox.
6. Site B không đọc được contact site A (test `sid` chéo ⇒ 401; Host lạ ⇒ 404).

## 11. Rủi ro

| Rủi ro | Giảm |
|---|---|
| Fork `platform` trôi khỏi open-ketoan | `UPSTREAM.md` + script so diff hàng tuần; ADR tách gói ở Q018-1 |
| Meta đổi webhook / Group API bị bỏ | Group ở W6 cuối; capability do Cell công bố, CRM không giả định |
| Hai bản Open CRM (WP + web) song song gây lẫn | tên repo tách (Q018-5); bảng phase README ghi rõ bản nào; không chia sẻ database |
| Ghép nhầm người | D018-4; UNMERGE 30 ngày; audit `proof` bắt buộc |
| `from.id` comment không ổn định | identity `asserted` + cho phép nhiều identity cùng contact; không dùng làm khoá gửi |
