# BIZCITY OPEN CANON v1 — nguyên tắc chung đứng giữa các repo

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] CANON-V1 — chủ (2026-11-24): "plugin WP và open-cake song song, không va nhau, nhưng đều có những rule, nguyên tắc chung nằm giữa các repo với nhau. Đứng vai system builder + CMO + CEO + COO." Bản nháp 1.0, chờ chủ duyệt. Đích đến lâu dài: repo `open-hub` (trang bizcity.vn) hoặc repo riêng `bizcity-canon`; mỗi repo con chỉ giữ một liên kết tới đây ở dòng đầu `docs/00-CANON.md`. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] CANON-V1.1 — chủ (2026-11-24): bốn trục dữ liệu xuyên suốt (master data · document · accounting events · contact 360), lớp kiểm chứng Twin Brain, mô hình kinh doanh per-agent; chuẩn REST nội bộ, React, quan sát (Prometheus · Grafana · Loki · Tempo · Redis tuỳ chọn) dùng chung; tên hợp đồng theo `bizcity_<x>@MAJOR` của open-ketoan. -->

> **Phiên bản:** 1.1.0-draft · 2026-11-24 · © 2026 Johnny Chu (Chu Hoàng Anh) / BizCity · GPL-2.0-or-later cho mã, nhãn hiệu theo TRADEMARK.md
> **Khẩu hiệu:** *Own your code. Own your data. Let agents run your operations.*
> **Áp dụng cho:** `open-ketoan` · `open-pos` · `open-pos-backend` · `open-ketoan-bridge` · `bizcity-open-kiot` · `open-cake` (web) · `open-crm` (plugin WordPress) · `zalo-hub` (Cell) · `twin-brain` / `bizcity-twin-ai` (Zalo Brain / Twin Brain) · `bizcity-llm-router` (Hub 1API) · `bizcity-open-setup` · `bizcity-automation` · `bizcity-twin-notebook` · `open-hub`.
> **Thứ bậc:** Canon này > `docs/00-CANON.md` của từng repo > luật `R-*` của repo > phase. Luật thấp mâu thuẫn luật cao ⇒ sửa luật thấp. **Nguồn luật kỹ thuật gốc** là open-ketoan (`docs/00-CANON.md`, `docs/rules/RULE-*.md`, `docs/contracts/`); canon này **không chép lại**, chỉ nâng luật lên cấp hệ sinh thái và chỉ chỗ.

## 0. Vì sao có canon này (CEO)

Ngành phần mềm doanh nghiệp đang đổi từ **tính tiền theo người dùng** sang **hạ tầng cho agent làm việc**. Ứng dụng CRUD + business logic không còn là hào luỹ; hào luỹ là **dữ liệu đúng, ranh giới rõ, luật kiểm chứng được** để agent chạy mà không phá. Developer chuyển từ viết code sang **viết spec, dựng hàng rào, kiểm chứng**.

Bizcity chọn: **mã nguồn mở toàn bộ** (không khoá khách vào nhà cung cấp, khách làm chủ 100 % dữ liệu) và kiếm tiền ở **chất xám**:

| Trụ doanh thu | Là gì | Canon bảo đảm gì để bán được |
|---|---|---|
| Domain Translator | ánh xạ nghiệp vụ bán hàng thật sang chuẩn kế toán VN, hoá đơn điện tử | một cửa ghi sổ, chính sách định khoản có phiên bản (open-ketoan) |
| System Architect & Setup | cài hạ tầng riêng, làm sạch dữ liệu cũ, nối thanh toán / vận chuyển / ngân hàng, dựng Twin Brain | một bản mã nhiều site, open-setup, hợp đồng có phiên bản |
| Managed & Compliance Retainer | giám sát, cập nhật luật thuế, kiểm toán an toàn | quan sát chuẩn (§8), selfcheck, bằng chứng hash-chain |
| Custom Agent & Advisory | agent riêng theo bài toán chuỗi | MCP chuẩn, lớp kiểm chứng (§5) |

## 1. Lời hứa với thị trường (CMO)

Trang chủ: **"Cả doanh nghiệp trên một bộ mã nguồn mở — cần gì bật nấy: không mua thêm phần mềm, không nối API, không nhập liệu hai lần."** Mỗi chữ viết tay (MISA, KiotViet, Pancake, sổ kho Excel, Haravan, chatbot thuê bao, Zapier, Notion, HRM thuê bao…) là một phần mềm khách đang trả tiền và nhập liệu riêng. Lời hứa thành **tiêu chí nghiệm thu của mọi repo**:

| Khách nghe | Kỹ thuật phải giữ | Kiểm bằng |
|---|---|---|
| **Không nhập hai lần** | một sự thật có **một chủ**; app khác **tham chiếu bằng ID**, không sao chép bảng (§3) | `H-MD-TABLE` của open-ketoan + bảng chủ §3 |
| **Không nối API** | app nói chuyện bằng **hợp đồng `bizcity_*@N` đã có trong hệ**; khách không gõ URL / token giữa hai app anh em | bật app = chọn site; không ô "URL / token" cho app anh em |
| **Không mua thêm** | một site, một bản cài, một đăng nhập, một khoá `biz-…` cho mọi app | open-setup cấp mọi app một site bằng một lệnh |

**R-CANON-10 · Nhãn phải khớp nghiệm thu.** `Đang chạy` ⇔ repo có DoD PASS + golden case `evidence/`; `Sắp ra mắt` ⇔ có phase + mockup; `Cộng đồng làm` ⇔ có khung + hợp đồng, chưa có mã. Marketing không chạy trước nghiệm thu.

## 2. Bản đồ hệ và trục của từng app (System builder)

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ TWIN BRAIN / Cell Zalo Brain — điều phối & kiểm chứng agent                       │
│  luật nghiệp vụ & thuế (đọc từ app) · hàng rào kiểm chứng · phát hiện bất thường │
│  phiên kênh (zca-js, fbchat-v2, Meta webhook) · AI · kịch bản · skill            │
└───────────▲──────────────────────────▲──────────────────────────▲────────────────┘
            │ MCP (đọc R0 / nháp R1 / gửi R2 có confirm) · webhook HMAC từ outbox
┌───────────┴──────────┐   ┌───────────┴──────────┐   ┌───────────┴──────────┐
│ OPEN CAKE (CRM)      │──►│ OPEN POS / KIOT      │──►│ OPEN KẾ TOÁN          │
│ trục: contact_id     │   │ trục: giao dịch 3 chân│  │ trục: bút toán Nợ=Có  │
│ sổ chạm khách        │   │ đơn · kho · giao hàng │   │ sổ cái · hoá đơn · thuế│
└───────────┬──────────┘   └───────────┬──────────┘   └───────────┬──────────┘
            └──────────────── BỐN TRỤC DỮ LIỆU (§3) ──────────────┘
   MASTER DATA (partner_id, item_id) · DOCUMENT (doc_ref + document_links)
   ACCOUNTING EVENTS (doc_key + version → entry) · CONTACT 360 (contact_id)
            │
 bizcity-llm-router (Hub 1API: khoá biz-…, gói, định tuyến, audit) · bizcity-open-setup (cấp site)
```

**R-CANON-1 · Một app, một trục.** Mỗi Open App có **một sổ chỉ thêm** và **một ID trục**, và không giữ trục của app khác. Kế toán: bút toán. POS / Kiot: giao dịch ba chân. **Cake: `contact_id` + sổ chạm khách.** Inventory: lô và dòng vận động (thuộc open-ketoan `bizcity_inventory@1`). Notebook: ghi chú có nguồn. Automation: lượt chạy.

**R-CANON-2 · Twin Brain là não, không là chủ dữ liệu.** Twin Brain / Cell giữ phiên kênh, mô hình AI, kịch bản, skill. Ghi vào app **chỉ qua MCP**, chỉ tạo **nháp / chờ duyệt**, có `confirm_token` (STD-MCP-1..10). App **không gọi LLM**. Hub là cửa thương mại và khoá, **không** cầm cookie / token kênh / khoá E2EE.

## 3. Bốn trục dữ liệu xuyên suốt (Architect)

Không có "root_document_id" hay "DOC-CHAT-xxx" tự đặt: hệ đã có chuẩn ở open-ketoan và **mọi app dùng đúng chuẩn đó**.

### 3.1 Trục MASTER DATA — chủ: open-ketoan

| ID | Hình | Hợp đồng | Luật |
|---|---|---|---|
| `partner_id` | bigint nội bộ; bên ngoài gửi **mã** `code` | `bizcity_master_data@1` (`PUT /api/v1/partners/:code`, `GET /partners`, `catalog_tombstones`) | R-MD-1 lõi giữ, **không đồng bộ hai chiều** · R-MD-2 ngoài gửi mã, trong lưu id · R-MD-4 đã dùng thì không xoá |
| `item_id` | ULID + `item_codes` có hiệu lực | `bizcity_item_master@1` | R-CONT-1 `item_id` suốt chuỗi; không tự tạo hàng từ chứng từ |
| thuế suất, đơn vị, combo | thuộc item | `bizcity_item_master@1`, `bizcity_combo@1` | thuế suất **gắn với hàng** ở lõi, app không tự tính |

**App khác không có bảng khách / hàng / chi nhánh riêng** (H-MD-TABLE). Cake giữ **con người** (§3.4), không giữ **đối tượng công nợ**.

### 3.2 Trục DOCUMENT — mỗi app, cùng chuẩn

| Thành phần | Chuẩn (open-ketoan) |
|---|---|
| ID chứng từ | `doc_ref = <module>.<loại>:<id>` bất biến (R-DOC-CONT-1); dùng làm `docKey` khi nộp sổ |
| Bảng | `business_documents` · `document_versions` · `document_links` · `document_attachments` (R-DOC-CONT-9: không thêm bảng lịch sử / liên kết khác) |
| Trạng thái | 6 nhóm `draft · pending · approved · in_progress · done · cancelled`; **done ≠ posted** (R-DOC-CONT-6) |
| Chuỗi | **không có root id**; chuỗi đi qua `document_links` với 9 vai `source · applies · uses · ledger · settles · reverses · replaces · attachesTo · adjusts`; `source` bắt buộc (R-DOC-CONT-4) |
| Hợp đồng | `bizcity_document@1`, `bizcity_lineage@1` (đọc vòng đời hàng) |

**R-CANON-11 · Chuỗi chứng từ xuyên app.** Liên kết sang app khác ghi `doc_ref` **của app kia** kèm `site` ngầm định (cùng site). Ví dụ golden: `cake.order_request:01J…` —`source`→ `pos.order:8812` —`ledger`→ `bizcity.ledger.entry` (`accounting_events.doc_key = pos:…:sale:8812`). Mỗi app chỉ ghi liên kết **xuất phát từ chứng từ của mình**.

### 3.3 Trục ACCOUNTING EVENTS — chủ: open-ketoan

| | |
|---|---|
| Cửa duy nhất | `bizcity_ledger_intake@1` (`POST /api/v1/documents/batch`, `/cancel`) hoặc `bizcity_connector@1` (lõi kéo) |
| Khoá | `accounting_events UNIQUE(tenant_id, doc_key)` + `version` chỉ tăng; `docKey = <nguồn>:<chi nhánh>:<loại>:<id>` |
| Ai được nộp | app **có sự thật tiền / hàng**: POS / Kiot (bán, thu, trả), Kế toán tự lập. **Cake không nộp sổ** (báo giá, cơ hội, chat **không** gửi — skill `build-business-app-with-open-ketoan`) |
| Nguồn gửi gì | **mã + số**, không gửi tài khoản Nợ / Có (bốn điều bất khả xâm phạm) |
| Đọc lại | `GET /api/v1/partners/:code/balances`, `/debt-items`, `documents/history` |

### 3.4 Trục CONTACT 360 — chủ: open-cake

| | |
|---|---|
| ID | `contact_id` ULID — **một người hoặc một tổ chức** doanh nghiệp tiếp xúc (khách, khách tiềm năng, nhà cung cấp, đối tác giao hàng, nhân viên khi là người được chăm sóc) |
| Danh tính | `contact_identities (channel, scope, external_id, confidence, proof, valid_from, valid_to)`: `zalo_uid`, `fb_psid` (scope Page), `fb_uid`, `comment_from_id`, `phone` (băm `sha256:` khi ra ngoài), `email`, `tax_code`, `bank_account` (băm) |
| Hợp đồng | `bizcity_contact@1` (đọc / tra / liên kết), `bizcity_touch@1` (Cell → Cake), `bizcity_channel_command@1` (Cake → Cell) |
| Nối với Master Data | khi khách phát sinh công nợ, Cake gọi `PUT /api/v1/partners/:code` với `code = CAKE-<contact_id>`; lưu `partner_ref {code, partner_id}`. **Một chiều**: tên / mã số thuế sau đó do Kế toán quản (R-MD-1); Cake chỉ nghe `bizcity.masterdata.partner.changed` để cập nhật liên kết |
| Ngược lại | đối tượng Kế toán tạo trước (nhà cung cấp) **không** tự sinh contact; chỉ khi có tiếp xúc (tin, gọi, comment) hoặc nhập tay có `proof = tax_code` |

**R-CANON-3 · Không ghép người theo tên.** Hai danh tính thành một người chỉ khi có **bằng chứng** (số điện thoại, email, mã số thuế, handshake kênh, người xác nhận), có `proof`, tách lại được.

### 3.5 Bảng chủ (ai giữ sự thật nào)

| Sự thật | Chủ | Người khác giữ |
|---|---|---|
| site, tên miền, database | open-setup + control DB của từng app | `site_id` |
| đơn vị (`tenant_id`), pháp nhân | app (trong site); pháp nhân thuộc **sổ** kế toán (ADR-0039) | — |
| người dùng, vai | mỗi app (cùng mô hình `bizcity_authorization@1`); SSO từ WordPress | — |
| con người, danh tính kênh | **open-cake** | `contact_ref` |
| đối tượng công nợ, hàng, thuế suất | **open-ketoan** | `partner_ref`, `item_ref` |
| đơn, giao hàng, tồn | **open-pos / kiot** (sổ bán lẻ), tồn kế toán ở open-ketoan | `order_ref` (`doc_ref`) |
| bút toán | **open-ketoan** | không ai |
| phiên kênh, cookie, token, khoá E2EE | **Cell** (vault) | không ai |
| khoá `biz-…`, gói | **bizcity-llm-router** | trạng thái cache ≤ 1 giờ |

## 4. Năm nguyên tắc sổ — bất khả xâm phạm ở mọi app có sổ

| | Nguyên tắc | Kế toán | Cake | POS |
|---|---|---|---|---|
| **P1** | Không sự việc, không dòng sổ | `accounting_events` → entry | `touch_events` → `touch_ledger` | giao dịch → sổ bán lẻ |
| **P2** | Sổ chỉ thêm; sửa = dòng đảo; trigger chặn UPDATE / DELETE / TRUNCATE | ✓ | ✓ | ✓ |
| **P3** | Một cửa `(source/doc_key, version)`: cùng ⇒ `unchanged`, cũ ⇒ 409, mới ⇒ đảo rồi ghi | `postDocumentIn` | `submitTouchIn` | `Kernel::submit` |
| **P4** | Nguồn gửi mã, không gửi quyết định | không số tài khoản | Cell không gửi `contact_id` | POS không ghi bút toán |
| **P5** | ID bất biến, mã có phiên bản; merge = `merged_into`, không xoá (ECP-02, ECP-13) | `partner_id`, `item_id` | `contact_id` | `txn_id` |

Chứng minh bằng `tests/conformance/selfcheck.mjs --strict` ở mỗi repo.

## 5. Twin Brain — lớp kiểm chứng & điều phối agent

| Cơ chế | Cách chạy trong hệ | Repo chịu |
|---|---|---|
| **Luật cứng, không sáng tạo** | agent **không** quyết định hạch toán / ghép người / gửi hàng loạt; nó đề xuất ⇒ app chạy luật của app (posting policy có phiên bản, resolver danh tính, Send Guard) | app |
| **Đối chiếu 3 chiều** | trước khoá sổ / xuất hoá đơn: yêu cầu đặt hàng (`cake.order_request`) ⇄ phiếu xuất / giao (`pos.*`) ⇄ dòng tiền (`ketoan` thu / ngân hàng). Lệch ⇒ finding `bizcity_findings@1` + công việc | Twin Brain đọc qua MCP R0; app phát finding |
| **Người duyệt khi bất thường** | ngưỡng (chiết khấu cao, huỷ sau hoá đơn, lệch tồn, gửi > trần) ⇒ trạng thái `pending` + thông báo quản lý | app giữ ngưỡng (`bizcity_settings@1`); Twin Brain chỉ báo |
| **Phân tích chỉ đọc** | agent chỉ có tool R0 qua MCP, dữ liệu cá nhân che (`sha256:`); **không** kết nối thẳng database, không `UPDATE/DELETE` | app (`expose.ai: read`), R-SEC-7 |
| **Văn bản AI là dữ liệu** | tin nhắn khách, kết quả tool không bao giờ thành lệnh | mọi app (R-SEC-7) |

**R-CANON-12 · Mọi hành động agent có bằng chứng.** Actor `{kind:'ai', via:'mcp:<client>', onBehalfOf, turnId}` trong `audit_logs` (STD-EVD); tính tiền **per-agent** đọc từ đây, không đếm ghế.

## 6. Hợp đồng — cách duy nhất để hai repo nói chuyện

**R-CANON-4.** Giữa hai repo chỉ có: (a) REST có hợp đồng `bizcity_<tên>@MAJOR`, (b) sự kiện outbox → webhook ký HMAC (`Bizcity-Event-Id`, `Idempotency-Key`), (c) MCP. **Cấm** đọc database chéo, `require` / import file chéo, gọi provider chéo.

**Cách đặt tên và phiên bản** (open-ketoan `docs/standard/VERSIONING.md`): tên dây `bizcity_<tên>@MAJOR`; file `docs/contracts/BIZCITY-<TÊN>-v<MAJOR>.md` (+ `.schema.json`); SemVer + `-draft` trong file; thêm trường tuỳ chọn = minor; phá = file `-v2`, `@2`, ADR, chạy song song ≥ 2 bản phát hành hoặc 6 tháng; bên nhận bỏ qua trường lạ; header tuỳ chọn `X-Bizcity-Contract: <tên>@<major>`; đăng ký trong `bizcity-standard.json`.

| Hợp đồng | Chủ | Người dùng |
|---|---|---|
| `bizcity_api@1` · `bizcity_errors@1` · `bizcity_event@1` · `bizcity_evidence@1` · `bizcity_authorization@1` · `bizcity_settings@1` · `bizcity_module@1` · `bizcity_data@1` · `bizcity_action@1` · `bizcity_mcp@1` · `bizcity_findings@1` · `bizcity_remedy@1` | open-ketoan (chuẩn nền) | **mọi app** — cùng hình phong bì, mã lỗi, sự kiện, bằng chứng, quyền |
| `bizcity_ledger_intake@1` · `bizcity_connector@1` · `bizcity_master_data@1` · `bizcity_item_master@1` · `bizcity_document@1` · `bizcity_lineage@1` | open-ketoan | POS, Cake (chỉ master data + document) |
| `bizcity_site_provisioning@1` | open-ketoan (PHASE-039) | open-setup, **open-cake** (cùng hợp đồng, thêm trường `product`) |
| `bizcity_contact@1` · `bizcity_touch@1` · `bizcity_channel_command@1` | **open-cake** | Cell, Hub, Twin Brain, POS (tra khách) |
| `zalo-hub-bridge@1.x` · `crm-ledger@1` · `zalo-brain-extension@1` · `connect-setup@1` | zalo-hub / Zalo Brain | plugin WP — **đóng băng** tên cũ; hợp đồng mới phải theo `bizcity_*` |

## 7. Hình dáng chuẩn của một Open App

**R-CANON-5 · Một bản mã, mỗi site một database, chạy web.** Khuôn là open-ketoan:

```text
<app>/
├── apps/api   Fastify 5 · fastify-type-provider-zod · /api/v1 · /mcp · /_sites/v1 · /metrics
├── apps/web   React 18 · Vite · react-query · react-router · ErrorBoundary
├── packages/{contracts, platform, <trục>-kernel, module-sdk, ui-kit, cli}
├── modules/<key>/bizcity.module.json   (schema mod_<key>, tenant_id + RLS FORCE, đọc qua bizcity_read.*)
├── db/migrations/NNNN_mo_ta.sql (SQL là sự thật, Kysely truy vấn)   tests/conformance/selfcheck.mjs
├── docker/ (api · web nginx · db-migrate)   infrastructure/{monitoring, backup}   scripts/
└── docs/00-CANON.md → dòng 1 trỏ về canon này · rules/ · contracts/ · adr/ · phases/ · CLAIMS.md · ops/
```

- Node ≥ 22, TypeScript, npm workspaces, PostgreSQL 16, Kysely (R-DB-16), SQL migration chỉ thêm (R-DB-1), API chạy vai không siêu người dùng (R-SEC-6).
- `SITE_MODE=single|multi` **một đường mã** (R-SITE-5); control DB; Database Router theo `Host`; JWT `sid`; thiếu ngữ cảnh ⇒ `SITE_CONTEXT_MISSING`; cổng `schema_version` ⇒ 503; xoá mềm 30 ngày; vai PostgreSQL riêng từng site; khoá bản quyền **không bao giờ** chặn sổ (R-SITE-13).
- `packages/platform` là **gói chung của hệ**: hôm nay fork có `UPSTREAM.md` (commit gốc + diff); đích là `@bizcity/platform` một nguồn (ADR riêng).
- **Không Electron, không bản cài máy khách.** WordPress chỉ là **lớp nhúng** (iframe + SSO HMAC `wp-sso`), không phải bản thứ hai của lõi.

## 8. Chuẩn dùng chung: REST nội bộ, React, quan sát

Chi tiết sống ở mỗi repo (open-cake: `docs/architecture/70-API-REST.md`, `80-REACT.md`, `30-OBSERVABILITY.md`); canon chỉ giữ **điểm không được lệch**:

| Chủ đề | Không được lệch |
|---|---|
| **REST** | phong bì `{ok:true,data,meta?}` / `{ok:false,error:{code,message,details?,requestId,traceId?}}` (R-API-1, `bizcity_api@1`); mã lỗi chuẩn (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, IDEMPOTENCY_CONFLICT, RATE_LIMITED, NOT_READY…); lý do cụ thể ở `details.reason` có tiền tố chủ (`CAKE_…`); zod ở cửa, schema chung trong `packages/contracts` (R-API-3); `requirePermission` mọi route (R-TEN-3); ghi ngoài idempotent (`Idempotency-Key` 8–128 ký tự, R-API-9); `/api/v1` ổn định, phá ⇒ `/api/v2` (R-API-7); không lộ nội bộ (R-API-12); `X-Request-Id` vào / ra |
| **React** | React 18 + Vite + react-query + react-router; module chỉ import `@bizcity/ui-kit` (facade); URL là nguồn vị trí; 4 trạng thái mỗi màn; thao tác ghi qua sheet; `ErrorBoundary` gửi `POST /system/client-errors` với `errFp`, ≤ 10 lỗi / phút (R-LOG-10); lỗi hiện `code/message/hint` + `requestId` sao chép được; quyền kiểm bằng `useCan` nhưng **server mới là cửa** |
| **Log** | pino JSON stdout; mỗi dòng có `service, version, commit, site, tenant, reqId, traceId`; `evt = bizcity.<miền>.<việc>`; `msg` tiếng Việt; không PII / bí mật / payload (R-LOG-4, R-SEC-10); `REDACT_PATHS`; file cố định `logs/<svc>/<ngày>.log` 30 ngày (PHASE-038) |
| **Metric** | Prometheus, tiền tố `bizcity_`; `bizcity_http_*`, `bizcity_db_*`, `bizcity_outbox_*`, `bizcity_actions_total`, `bizcity_mcp_tool_calls_total`, `bizcity_build_info`; app thêm `bizcity_<app>_*`; **không** nhãn nhiều giá trị (không `contact_id`, `tenant`, `user`) (R-OBS-4, H-METRIC-LABEL) |
| **Trace** | OpenTelemetry SDK → otel-collector (tail sampling) → **Tempo**; W3C `traceparent` truyền qua Cell → Hub → app → outbox → webhook; `traceId` trong log và lỗi |
| **Hạ tầng quan sát** | Prometheus + Alertmanager + **Grafana** + **Loki** (promtail) + **Tempo** + postgres-exporter + node-exporter + cadvisor (`infrastructure/monitoring/`, file compose riêng) |
| **Redis** | **tuỳ chọn, không bao giờ là nguồn sự thật** (R-CACHE-6, R-OUTBOX-6): chỉ bộ đệm danh mục chậm đổi (TTL ≤ 5 phút, khoá có `site + tenant + config_version`), giới hạn tốc độ mềm, phát realtime giữa nhiều bản API. Redis chết ⇒ hệ chạy chậm hơn, **không sai** |
| **Sức khoẻ** | `/api/v1/system/health` (version, kernel, standard), `/health/ready` (503 `NOT_READY`), `/system/diagnostics` (L0–L3, R-DIAG-1..9), `/metrics` có `METRICS_TOKEN` |

## 9. Người dùng, quyền, bằng chứng — mọi app một mô hình

- Quyền `<module>:<việc>` (màn: `<module>:<chức-năng>-<xem|lap|sua|xoa|huy|duyet|bo-duyet|xuat>`); đăng ký cùng PR; vai hệ thống + vai riêng của đơn vị; **từ chối luôn thắng** (`bizcity_authorization@1`).
- Người dùng **không xoá**, chỉ `is_active=false`, giữ lịch sử; chủ cuối cùng không gỡ được.
- JWT `{sub, tid, sid, role, name, sv, perms?}`; thu hồi qua `session_version` / `authz_version`; khoá API băm, hiện một lần, theo một đơn vị, có phạm vi; **khoá API và AI không bao giờ nhận quyền `risk: high`**.
- Mỗi hành động ghi đúng **một** bản ghi bằng chứng hash-chain trong `audit_logs` (STD-EVD-1..10), PII lưu `sha256:`, giữ 10 năm; `meta.receipt` trả về người gọi.
- SSO từ WordPress: vé HMAC ≤ 5 phút; người lạ vào với vai thấp nhất; chỉ nhận quyền đã biết (R-TEN-9).

## 10. Hai bản song song — plugin WordPress và open-cake (COO)

**R-CANON-7.** Khi một sản phẩm có hai bản (WP plugin `open-crm` và web `open-cake`):

| Chung | Riêng |
|---|---|
| tên sản phẩm "Open CRM", token giao diện, 13 màn Deplao (ảnh duyệt 2026-11-23), luật R-OC-* / R-CAKE-*, canon này, hợp đồng với Cell / Hub, mã lỗi | database, bảng (`bizcity_crm_*` / `ocrm_*` ≠ schema của cake), route (`bizcity-crm/v1` ≠ `/api/v1`), repo, changelog |

- Không chia database, không bảng trùng tên, không đọc chéo. Chuyển dữ liệu = **phase riêng** có hợp đồng backfill (`crm-ledger@1` → `bizcity_touch@1`).
- Mỗi phase / ADR ghi **"áp dụng cho: WP · cake · cả hai"**. Luật chung sinh ở bản nào cũng nộp về canon.
- Bản WP **đóng băng tính năng** khi open-cake qua golden case; chỉ vá lỗi và bảo mật.

## 11. Vận hành (COO)

**R-CANON-6 · Một VPS chạy cả hệ.** Mỗi app một compose project, cổng riêng; nâng cấp **từng site** (template trước, sao lưu trước, site lỗi bị chặn riêng — R-SITE-8..10); kill-switch theo **kênh** và **site**; không `systemctl restart docker`, không đụng tường lửa (Imunify360); sao lưu `pg_dump` hằng ngày giữ 14 bản, PITR, thử khôi phục hằng tuần (R-BAK-1..6).

## 12. Nếp làm việc chung

| Mã | Nếp | Gốc |
|---|---|---|
| **R-SIG** | mọi sửa đổi chức năng mang dấu `[YYYY-MM-DD HH:MM AM/PM Johnny Chu - Chu Hoàng Anh] <CODE> — …` theo **giờ máy thật**; **không bao giờ** ghi tên agent hay model; không sửa dấu cũ | R-SIG-1..8 |
| **R-FLOW** | claim ở `docs/phases/CLAIMS.md` trên main trước khi code; một phạm vi một người; nhánh ≤ 1 ngày; trả claim trong cùng PR | R-FLOW-1..10 |
| **R-REV** | chỉ qua PR; lỗi gặp hai lần thành luật; không "dọn" sổ; không trả mặc định cho tra cứu tiền | R-REV-1..16 |
| **R-QG** | CI xanh; test đi qua cửa thật; mỗi test một đơn vị; DB test tên có `test` | R-QG-1..10 |
| **R-LEAN-4** | việc ≤ 4 bước (Contract → Code → Test → Record); màn ≤ 4 bước, 4 trạng thái | Zalo Brain |
| **R-PHASE** | `PHASE-NNN-TEN/README.md` (Việc lộ trình · mục tiêu một câu · ngoài phạm vi · hiện trạng đọc mã có `file:line` · D · Q · W · xong khi · rủi ro) + `40-MASTER-CHECKLIST.md` (S<nnn>-n, bằng chứng T<nnn>-n) + `evidence/` + `70-REFLECT` khi xong | open-ketoan phases README |
| **R-LICENSE** | GPL-2.0-or-later + `TRADEMARK.md`; mỗi file mã mới có dòng bản quyền; mã dẫn xuất AGPL (vd bridge fbchat-v2) ở **repo công khai riêng** | R-LICENSE |
| **R-LANG** | định danh tiếng Anh; chú thích, thông báo, tài liệu tiếng Việt | AGENTS.md |
| **R-NO-FAKE** | chưa có nguồn hiện "—" + lý do; không "Đã kết nối" giả; không `Connected` chỉ vì HTTP 200 | R-BLOCK, R-DIAG-7 |
| **R-SECRET** | cookie / token kênh / khoá E2EE chỉ ở Cell vault; không vào DB app, log, outbox, ảnh chụp, issue | R-SEC-1, R-SEC-10 |

## 13. Nghiệm thu chung của toàn hệ (CEO ký)

| Mã | Hệ đạt khi |
|---|---|
| **DOD-SYS-1** | một site do open-setup cấp bật được đủ app bằng một tài khoản, một khoá `biz-…` |
| **DOD-SYS-2** | khách comment Facebook → chat → đơn POS → hoá đơn kế toán: **một `contact_id`, một `partner_id`, một `item_id`**, chuỗi `document_links` liền, không nhập lại |
| **DOD-SYS-3** | `selfcheck --strict` xanh ở mọi repo có sổ (P1–P5, RLS FORCE, outbox cùng giao dịch, R-LOG-1..4) |
| **DOD-SYS-4** | site A không thấy site B ở mọi app (`sid` chéo ⇒ 401, Host lạ ⇒ 404) |
| **DOD-SYS-5** | nâng cấp một app không dừng app khác; sổ không dừng vì bản quyền |
| **DOD-SYS-6** | một yêu cầu đi Cell → Hub → Cake → outbox → POS xem được **trọn một trace** trong Tempo, log nối bằng `traceId` trong Loki |
| **DOD-SYS-7** | trang chủ `Đang chạy` ⇔ repo có DoD PASS + golden case evidence |

## 14. Đổi canon

Mỗi thay đổi = PR vào repo chủ canon, bump phiên bản, mục "repo nào phải sửa gì", chủ dự án duyệt. Repo con không sửa bản sao; chỉ cập nhật liên kết + phiên bản.

## Changelog

- **1.1.0-draft** (2026-11-24): bốn trục dữ liệu; Twin Brain kiểm chứng; mô hình kinh doanh; chuẩn REST / React / quan sát / người dùng chung; tên hợp đồng `bizcity_*`; sửa: không có root document id, chuỗi theo `document_links`; R-SIG cấm tên agent.
- **1.0.0-draft** (2026-11-24): bản đầu.
