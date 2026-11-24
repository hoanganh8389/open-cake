# BIZCITY OPEN CANON v1 — nguyên tắc chung đứng giữa các repo

<!-- [2026-11-24 Claude Opus 5.5] CANON-V1 — chủ (2026-11-24): "plugin WP và open-cake song song, không va nhau, nhưng đều có những rule, nguyên tắc chung nằm giữa các repo với nhau. Đứng vai system builder + CMO + CEO + COO." Bản nháp 1.0, chờ chủ duyệt. Đích đến lâu dài: repo `open-hub` (trang bizcity.vn) hoặc repo riêng `bizcity-canon`; mỗi repo con chỉ giữ một liên kết tới đây ở dòng đầu `docs/00-CANON.md`. -->

> **Phiên bản:** 1.0 nháp · 2026-11-24 · © 2026 Johnny Chu (Chu Hoàng Anh) / BizCity · GPL-2.0-or-later cho mã, nhãn hiệu theo TRADEMARK.md
> **Áp dụng cho:** `open-ketoan` · `open-pos` · `open-pos-backend` · `open-ketoan-bridge` · `bizcity-open-kiot` · `open-cake` (web) · `open-crm` (plugin WordPress) · `zalo-hub` (Cell) · `twin-brain` / `bizcity-twin-ai` (Zalo Brain) · `bizcity-llm-router` (Hub 1API) · `bizcity-open-setup` · `bizcity-automation` · `bizcity-twin-notebook` · `open-hub`.
> **Thứ bậc:** Canon này > `docs/00-CANON.md` của từng repo > luật `R-*` của repo > phase. Luật thấp mâu thuẫn luật cao ⇒ sửa luật thấp.

## 0. Lời hứa với thị trường (CEO · CMO)

Trang chủ nói: **"Cả doanh nghiệp trên một bộ mã nguồn mở — cần gì bật nấy: không mua thêm phần mềm, không nối API, không nhập liệu hai lần."** Mỗi chữ viết tay trên trang (MISA, KiotViet, Pancake, sổ kho Excel, Haravan, chatbot thuê bao, Zapier, Notion, HRM thuê bao…) là một phần mềm khách đang **trả tiền riêng, nhập liệu riêng**.

Lời hứa đó dịch sang kỹ thuật thành **ba điều khách kiểm được**, và là **tiêu chí nghiệm thu của mọi repo**:

| Khách nghe | Kỹ thuật phải giữ | Kiểm bằng |
|---|---|---|
| **Không nhập hai lần** | một sự thật có **một chủ**; app khác chỉ **tham chiếu** bằng ID, không sao chép bảng | grep bảng trùng tên / trùng vai giữa repo = 0 |
| **Không nối API** | app nói chuyện bằng **hợp đồng có phiên bản** đã có sẵn trong hệ; khách không cấu hình endpoint | bật app = chọn site, không có ô "URL / token" cho app anh em |
| **Không mua thêm** | mọi app cùng **một site, một bản cài, một tài khoản, một khoá `biz-…`** | open-setup cấp mọi app của một site bằng một lệnh |

**Nhãn trạng thái trên trang chủ là lời hứa**: `Đang chạy` chỉ khi repo qua golden case + DoD; `Sắp ra mắt` khi có phase + mockup; `Cộng đồng làm` khi có khung + hợp đồng nhưng chưa có mã. Marketing không được chạy trước nghiệm thu (R-CANON-10).

## 1. Bản đồ sản phẩm và trục của từng app (System builder)

```text
                    ┌───────────────────────────┐
                    │   Cell Zalo Brain (não)   │  điều phối · AI · kịch bản · skill · phiên kênh
                    └────────────┬──────────────┘
                 MCP có xác nhận │ webhook HMAC   (Cell không là chủ dữ liệu nào)
   ┌──────────┬──────────┬───────┴───────┬──────────┬──────────┬──────────┐
   │ Open Kế  │ Open POS │ Open Cake     │ Open     │ Open     │ Open     │
   │ Toán     │ / Kiot   │ (CRM)         │ Inventory│ Notebook │ Automation│
   │ trục:    │ trục:    │ trục:         │ trục:    │ trục:    │ trục:    │
   │ bút toán │ giao dịch│ contact_id    │ lô / vận │ tri thức │ quy trình│
   │ Nợ = Có  │ ba chân  │ + sổ chạm     │ động     │          │          │
   └──────────┴──────────┴───────────────┴──────────┴──────────┴──────────┘
                         bizcity-llm-router (Hub 1API: khoá, gói, định tuyến, audit)
                         bizcity-open-setup (cấp site: một site = một database mỗi app)
```

**R-CANON-1 · Một app, một trục.** Mỗi Open App có đúng **một sổ chỉ thêm** là trái tim và **một ID trục**. Kế toán: `entry` cân Nợ = Có. POS/Kiot: giao dịch ba chân. **Cake: `contact_id` và sổ chạm khách.** Inventory: lô và dòng vận động. Notebook: ghi chú có nguồn. Automation: lượt chạy quy trình. **Không app nào giữ trục của app khác**: CRM không giữ công nợ, kế toán không giữ hội thoại, POS không giữ hồ sơ khách.

**R-CANON-2 · Cell là não, không phải chủ dữ liệu.** Cell giữ phiên kênh (Zalo, Facebook…), mô hình AI, kịch bản, skill. Cell **ghi** vào app chỉ qua MCP có `confirm_token`; app **không gọi LLM**; Hub là cửa thương mại và khoá, **không** cầm cookie / token kênh / khoá E2EE.

## 2. Năm nguyên tắc sổ — bất khả xâm phạm ở mọi app

Nâng từ bốn điều của open-ketoan lên cấp hệ sinh thái. Mọi repo có sổ phải chứng minh bằng `selfcheck`:

| | Nguyên tắc | Kế toán | Cake | POS |
|---|---|---|---|---|
| **P1** | **Không sự việc, không dòng sổ.** Mọi dòng truy ngược được `event_id`, nguồn, phiên bản | chứng từ → bút toán | touch → dòng sổ chạm | giao dịch → dòng sổ bán lẻ |
| **P2** | **Sổ chỉ thêm.** Sửa = dòng đảo + dòng mới; `UPDATE/DELETE` bị trigger chặn | ✓ | ✓ | ✓ |
| **P3** | **Một cửa.** `submit…In(source, doc_key, version)`: cùng version ⇒ `unchanged`, cũ hơn ⇒ 409, mới hơn ⇒ đảo rồi ghi | `submitDocumentIn` | `submitTouchIn` | `Kernel::submit` |
| **P4** | **Nguồn gửi mã, không gửi quyết định.** Module gửi `docType / reasonCode / channel / external_id`; lõi quyết định tài khoản / contact / giá vốn | module không ghi số TK | Cell không ghi `contact_id` | POS không ghi bút toán |
| **P5** | **ID bất biến, mã có phiên bản.** ULID không dùng lại; merge = `merged_into`, không xoá; cross-app chỉ tham chiếu bằng ID canonical | `partner_id`, `item_id` | `contact_id`, `identity_id` | `txn_id` |

## 3. Danh tính xuyên app — ai là chủ của ai

| ID | Chủ | Ai tham chiếu | Luật ghép |
|---|---|---|---|
| `site_id` / tên miền | **open-setup registry** + control DB của từng app | mọi app, Hub | một site = một doanh nghiệp / chuỗi = một database **mỗi app** (`kt_<slug>`, `cake_<slug>`…); cùng `slug` |
| `tenant_id` | app (trong site) | app | đơn vị / chi nhánh; RLS FORCE; **không nhận từ input** |
| `contact_id` | **Open Cake** | Kế toán (`partner.contact_ref`), POS (`customer_ref`), Cell | Cake là **chủ con người**; app khác không có bảng khách riêng |
| `partner_id` | **Open Kế Toán** | Cake (`dims.partner_ref`), POS | kế toán là **chủ đối tượng công nợ**; Cake gọi `core.partner.upsert` khi khách phát sinh tiền |
| `item_id` | **Open Kế Toán** (item master) | POS, Inventory, Cake (gợi ý trong chat) | một danh mục hàng cho cả hệ |
| `channel_account_id` / identity kênh | **Cell** giữ phiên; **Cake** giữ ánh xạ identity → contact | Cell, Hub | Cake không cầm cookie; Cell không biết `contact_id` |
| khoá `biz-…` | **bizcity-llm-router** | mọi app, open-setup | chỉ cảnh báo, **không dừng sổ** (D039-17) |

**R-CANON-3 · Không ghép theo tên.** Hai danh tính chỉ thành một người khi có **bằng chứng** (số điện thoại, email, handshake kênh, chủ xác nhận), có `proof`, tách lại được.

## 4. Hợp đồng — cách duy nhất để hai repo nói chuyện

**R-CANON-4.** Giữa hai repo chỉ có: (a) REST có hợp đồng `bizcity_<x>@MAJOR` (SemVer trong file), (b) sự kiện qua outbox → webhook ký HMAC, (c) MCP. **Cấm** đọc database chéo, `require` file chéo, gọi provider chéo.

| Hợp đồng | Chủ | Người dùng |
|---|---|---|
| `bizcity_site_provisioning@1` | open-ketoan (PHASE-039) | open-setup, **open-cake (cùng hợp đồng, thêm `product`)** |
| `bizcity_module@1` · `bizcity_ledger_intake@1` · `bizcity_master_data@1` · `bizcity_mcp@1` | open-ketoan | mọi module, Cell |
| `unified-touch@1` · `channel-command@1` | **open-cake** | Cell, Hub, plugin WP (khi chuyển) |
| `zalo-hub-bridge@1.x` · `crm-ledger@1` · `zalo-brain-extension@1` | zalo-hub / Zalo Brain | plugin WP hiện tại — **đóng băng**, chỉ vá |
| `okt` (open-pos ⇄ open-ketoan) | open-ketoan-bridge | open-pos |

Đổi hợp đồng ⇒ sửa **repo chủ trước**, bump MAJOR nếu phá, kèm validator + fixture; repo dùng chỉ nâng khi `selfcheck` xanh.

## 5. Hình dáng chuẩn của một Open App (System builder · COO)

**R-CANON-5 · Một bản mã, mỗi site một database, chạy web.** Khuôn là open-ketoan:

```text
<app>/
├── apps/api (Fastify · /api/v1 · /mcp · /_sites/v1)   apps/web (React · Vite)
├── packages/{contracts, platform, <trục>-kernel, module-sdk, ui-kit, cli}
├── modules/<key>/bizcity.module.json   (schema mod_<key>, tenant_id + RLS FORCE, đọc qua bizcity_read.*)
├── db/migrations/*.sql (SQL là sự thật)   tests/conformance/selfcheck.mjs (baseline ratchet)
├── docker/  (api · web · nginx · db-migrate)   infrastructure/ (giám sát, backup — config, không import)
└── docs/00-CANON.md → dòng 1 trỏ về BIZCITY-OPEN-CANON · rules/ · contracts/ · adr/ · phases/ · CLAIMS.md
```

- `SITE_MODE=single|multi` **một đường mã**; control DB; Database Router theo `Host`; JWT có `sid`; thiếu ngữ cảnh ⇒ `SITE_CONTEXT_MISSING`; cổng `schema_version`; xoá mềm 30 ngày; vai trò PostgreSQL riêng từng site.
- `packages/platform` là **gói chung** của hệ (hôm nay fork có `UPSTREAM.md`; đích: gói `@bizcity/platform` một nguồn — ADR riêng).
- **Không Electron, không bản cài máy khách.** Bản WordPress là **lớp nhúng** được phép (iframe / SSO HMAC), không phải bản thứ hai của lõi.

**R-CANON-6 · Vận hành một VPS.** Mọi app chạy được cạnh nhau trên một máy (Docker, cổng riêng, `network_mode: host` có chủ ý); nâng cấp **từng site** (template trước, backup trước, site lỗi bị chặn riêng); kill-switch theo **kênh** và theo **site**; không `systemctl restart docker`, không đụng tường lửa (Imunify360).

## 6. Hai bản song song — plugin WordPress và open-cake (COO)

**R-CANON-7.** Khi một sản phẩm có hai bản (WP plugin `open-crm` và web `open-cake`):

| Chung | Riêng |
|---|---|
| tên sản phẩm "Open CRM", token giao diện (PHASE-002), 13 màn Deplao, luật R-OC-*, canon này, hợp đồng với Cell/Hub, mã lỗi 4 trường | database, tên bảng (`bizcity_crm_*`/`ocrm_*` ≠ `cake` schema), route (`bizcity-crm/v1` ≠ `/api/v1`), repo, changelog |

- Không chia sẻ database, không bảng trùng tên, không đọc chéo. Chuyển dữ liệu = **phase riêng** có hợp đồng backfill (`crm-ledger@1` → `unified-touch@1`).
- Mỗi phase / ADR ghi rõ **"áp dụng cho: WP · cake · cả hai"**. Luật sinh ở bản nào cũng phải nộp về canon nếu là luật chung.
- Bản WP **đóng băng tính năng** sau khi open-cake qua golden case; chỉ vá lỗi và bảo mật.

## 7. Nếp làm việc chung (mọi repo)

| Mã | Nếp |
|---|---|
| **R-SIG** | mọi sửa đổi chức năng mang dấu `[YYYY-MM-DD HH:MM AM/PM Johnny Chu - Chu Hoàng Anh] <CODE> — …` theo giờ máy; không ghi tên agent; không sửa dấu cũ |
| **R-FLOW** | nhận việc bằng `docs/phases/CLAIMS.md` trước khi code; trùng phạm vi ⇒ dừng; claim hết hạn sau 3 ngày |
| **R-LEAN-4** | mọi việc ≤ 4 bước (Contract → Code → Test → Record); mọi màn ≤ 4 bước; mọi màn 4 trạng thái (tải · trống · lỗi · không quyền) |
| **R-ERR** | lỗi 4 trường `{code, message, hint, help_code}` + `trace_id`; không lỗi 500 trần |
| **R-PHASE** | `PHASE-NNN-TEN/README.md` (mục tiêu một câu · ngoài phạm vi · sự thật đọc mã có `file:line` · quyết định D · câu hỏi Q · đợt W · xong khi · rủi ro) + `40-MASTER-CHECKLIST.md` + `evidence/` |
| **R-LICENSE** | GPL-2.0-or-later + `TRADEMARK.md` BizCity; mỗi file mã mới có dòng bản quyền; code dẫn xuất AGPL (vd bridge fbchat-v2) phải ở **repo công khai riêng** |
| **R-LANG** | tài liệu tiếng Việt, định danh tiếng Anh, chú thích tiếng Việt |
| **R-NO-FAKE** | số liệu chưa có nguồn hiện "—" kèm lý do; không "Đã kết nối" giả; không `Connected` chỉ vì HTTP 200 |
| **R-SECRET** | cookie / token kênh / khoá E2EE chỉ ở Cell vault; không vào DB app, log, outbox, ảnh chụp |

## 8. Nghiệm thu chung của toàn hệ (CEO ký)

| Mã | Hệ đạt khi |
|---|---|
| **DOD-SYS-1** | một site do open-setup cấp có **đủ app bật được** bằng một tài khoản, một khoá `biz-…` |
| **DOD-SYS-2** | khách từ comment Facebook → chat → đơn POS → hoá đơn kế toán: **một `contact_id`, một `partner_id`, một `item_id`**, không nhập lại |
| **DOD-SYS-3** | `selfcheck --strict` xanh ở mọi repo có sổ (P1–P5, RLS, outbox cùng giao dịch) |
| **DOD-SYS-4** | site A không thấy site B ở **mọi app** (sid chéo ⇒ 401, Host lạ ⇒ 404) |
| **DOD-SYS-5** | nâng cấp một app không dừng app khác; sổ không dừng vì bản quyền |
| **DOD-SYS-6** | trang chủ `Đang chạy` ⇔ repo có DoD PASS + golden case evidence |

**R-CANON-10 · Nhãn phải khớp nghiệm thu.** `open-hub` chỉ đổi nhãn một app khi repo đó có `evidence/` tương ứng.

## 9. Đổi canon

Mỗi thay đổi canon = một PR vào repo chủ canon, bump phiên bản, ghi "repo nào phải sửa gì" (§5 kiểu open-ketoan "sửa X ⇒ sửa Y"), chủ dự án duyệt. Repo con không tự sửa bản sao; chỉ cập nhật liên kết + phiên bản.
