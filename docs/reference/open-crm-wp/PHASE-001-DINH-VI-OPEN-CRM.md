# PHASE-001 — Định vị Open CRM: plugin độc lập, menu riêng, Deplao là chuẩn giao diện

<!-- [2026-11-23 07:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-001 — mở phase theo chỉ đạo của chủ 2026-11-23 (định vị + UI/UX theo Deplao, độc lập khỏi /twin/ và bizcity-twin-ai, không conflict khi cài cùng). -->

> **Trạng thái:** ◐ tài liệu + mockup — chờ chủ duyệt D001-1…9, trả lời Q001-1…4
> **Mục tiêu:** Một câu định vị, một bộ quyết định, một danh sách mã phải đổi — để 15 phase sau không hỏi lại "Open CRM là gì, đứng ở đâu, trông ra sao".
> **Luật chạm tới:** R-OC-BOUND-1/2 · R-OC-BRAIN-1 · R-OC-UI-1…5 (sửa UI-1) · R-LEAN-4 · R-ACTION-SHEET · R-ERROR-UX · R-DCL (một chủ một bảng) · R-REDUCTION-AUDIT
> **Phụ thuộc:** PHASE-0.96 (tách lần 1), PHASE-0.156 (CRM ra khỏi lõi, `crm-ledger@1`, kích hoạt không cần Zalo Brain), tài liệu khởi tạo [`../../open-crm/`](../../open-crm/README.md)
> **Mockup:** [../mockups/dist/open-crm-mockup.html](../mockups/dist/open-crm-mockup.html) (mọi màn)

## 1. Định vị (một đoạn)

**Open CRM** là plugin WordPress **tự đứng một mình**: cài, kích hoạt, tạo bảng, mở `/crm/` và dùng được — hộp thư nhiều số Zalo, danh bạ, gửi hàng loạt, báo cáo, đội — **không cần** `bizcity-twin-ai` (Zalo Brain / twin-brain). Giao diện lấy **Deplao** (ứng dụng desktop quản lý nhiều Zalo / Facebook / Telegram, `github.com/babyvibe/deplao-builder`, v26.10.x) làm **chuẩn bố cục và luồng**, đạt ≥ 90 % cho 13 màn chủ gửi, nhưng **ít màu hơn, chữ to hơn, nút dễ bấm hơn**. Khi cài thêm Zalo Brain, Open CRM **sáng thêm** các mục trợ lý AI, Facebook / Messenger / Telegram qua Composio — không trùng bảng, không trùng menu, không lỗi.

```text
      KHÔNG có Zalo Brain                          CÓ Zalo Brain (bizcity-twin-ai)
┌──────────────────────────────┐          ┌──────────────────────────────┬──────────────────────┐
│ Open CRM  /crm/  (menu riêng)│          │ Open CRM  /crm/  (menu riêng)│ Zalo Brain /gateway/ │
│  hộp thư · danh bạ · gửi HL  │          │  + Gợi ý AI · Hỏi trợ lý     │  cell · Agent Guru   │
│  báo cáo · đội · kịch bản(*) │          │  + Facebook/Messenger/Telegram│  Composio · Hub      │
│  12 bảng (7 sổ + 5 ocrm_*)   │          │  5 bảng ocrm_* · đọc 7 sổ lõi │ 7 sổ hội thoại (chủ) │
│  nhận tin: cầu Zalo Hub      │          │  nhận tin: hook lõi           │ Channel Gateway      │
└──────────────────────────────┘          └──────────────────────────────┴──────────────────────┘
(*) kịch bản = bizcity-automation, cũng là plugin tuỳ chọn; thiếu thì hiện thẻ "Cần Automation".
```

## 2. Đã tách bao nhiêu lần — đọc trước khi quyết (R-REDUCTION-AUDIT: không lặp lại việc cũ)

| Đợt | Khi | Làm gì | Còn lại gì cho phase này |
|---|---|---|---|
| **PHASE-0.40 CRM-DEPLAO-PARITY** (`bizcity-twin-ai/core/channel-gateway/docs/PHASE-0.40-…md`) | 2026-06-07 | Lấy Deplao v26.4.8 làm *feature benchmark*; 8 khoảng trống; bảng "dịch ngữ cảnh" desktop → WordPress (SQLite → MySQL, tunnel → multisite, POS → Woo, key local → gateway); R-ZONE tách Zone 1 (khách) / Zone 2 (admin bot) | Bảng dịch ngữ cảnh **vẫn đúng**, dùng lại nguyên (§4). Khi đó CRM còn là bundle trong twin-ai, UI dính TwinShell |
| **PHASE-0.96 ZALO-BRAIN-CRM-SPLIT** | 2026-10-09 | CRM thành plugin riêng `bizcity-twin-crm` trên "CRM spine" của lõi; bỏ AI replier PHP, rule engine, identity queue; 12 phát hiện N1–N12 (N11: lớp cha để kế thừa không được `private`) | Plugin **vẫn không boot** nếu thiếu lõi (`bizcity_crm_spine_ready()`); menu nhường cho `BizCity_Admin_Menu` của twin; `/crm/` là TwinShell iframe |
| **PHASE-0.156 CRM-OUT-OF-CORE** | 2026-11-17 → đang W3/W4 | Lõi chỉ giữ **sổ hội thoại** (`crm-ledger@1`, 7 bảng + labels + archive + magic link); 29/40 route REST + Team_Manager + màn `/crm/` lõi ⇒ plugin; **kích hoạt + cài DB không cần Zalo Brain** (S156-3.3, `spine/` bản sao byte-giống); 4 ca kích hoạt A–D | S156-3.4 ca A/C/D chưa chạy site trắng; **màn hình vẫn đòi Zalo Brain** (`wp_die` 200 "hộp thư cần Zalo Brain") — chính là việc của PHASE-003 |
| **OPEN-CRM INIT** (`docs/open-crm/00…90`) | 2026-11-17 | Kernel sổ chăm sóc (chỉ thêm, dòng đảo, một cửa `submit()`), 5 bảng `ocrm_*`, Send Guard, MCP 9 tool, 4 menu lean **đen-xám-trắng-đỏ**, census 43 bảng → 5 | Lõi dữ liệu **giữ nguyên**; phần UI (50-UI-LEAN: 4 menu, đỏ, "không kanban / không dashboard nhiều biểu đồ") **được thay** bởi phase này (D001-3, D001-6) |
| **BRAND-OPEN-CRM** | 2026-11-21 | Tên "Zalo Brain CRM" → "Open CRM", repo `open-crm`; slug thư mục / prefix giữ | — |

## 3. Hiện trạng đọc mã (census thô 2026-11-23, chạy lại bằng công cụ ở OC-001.2)

| # | Sự thật | Ở đâu | Phase sửa |
|---|---|---|---|
| F1 | Boot chỉ khi `BIZCITY_CRM_SPINE_LOADED` (`bizcity_crm_spine_ready()`), nếu không thì không nạp `bootstrap.php` | `bizcity-twin-crm.php` ~L40, ~L112–120 | 003 |
| F2 | `/crm/` khi không có Zalo Brain ⇒ `wp_die( 'Open CRM đã cài sổ dữ liệu nhưng hộp thư cần plugin Zalo Brain…', 200 )` | `bizcity-twin-crm.php` ~L195–210 | 003 |
| F3 | Menu wp-admin: `if ( class_exists( 'BizCity_Admin_Menu', false ) ) return;` ⇒ khi có twin-ai, menu CRM do Workspace registry của twin sở hữu; tên menu còn là "BizCity CRM" | `includes/class-admin-menu.php` ~L29–31, L37 | 003 |
| F4 | Config SPA có `twinUrl => home_url('/twin/')`; nav có `href: '/twin/?plugin=web'`; "TwinShell" xuất hiện ở 20 file (`class-admin-menu`, `class-leader-member-rest`, `class-pipeline-rest`, `class-sprint-diagnostic`, `class-task-handoff`, `contracts/crm-surfaces`, `rest/class-crm-spine-rest-ext`, `frontend/src/shell/*`, `routes/inbox/*`, `routes/pipeline/pipelineUrl.js`, `routes/tasks/*`, `routes/team/*`, `components/onboarding/*`, `lib/useContainerLayout.js`) | grep `TwinShell\|/twin/` | 003 |
| F5 | SPA hiện tại: 8 nhóm menu, 40+ tab (`shell/navConfig.js`), Tailwind `important: 'body'`, brand indigo `#4f46e5`, chữ 13 px — khác hẳn Deplao | `frontend/src/` | 002, 003 |
| F6 | Zone 2 "CRM Internal Operations" cho `zalo_bot` còn khai trong `manifest.json` (capabilities.channels) — bot admin không phải việc của Open CRM (memory: kênh thống nhất qua cell) | `manifest.json` | 003 (bỏ khai báo) |
| F7 | `zalo-brain.json` khai 18 feature + `Zalo Brain Addon: crm` header — đúng để Zalo Brain *nhận ra* Open CRM khi có mặt; không làm Open CRM phụ thuộc | gốc plugin | giữ |
| F8 | REST namespace riêng `bizcity-crm/v1`, hằng `BIZCITY_CRM_*`, caps `bizcity_crm_*` — không trùng twin | gốc plugin | giữ |
| F9 | `spine/` = bản sao byte-giống installer + `crm-ledger@1` của lõi; validator `validate-crm-ledger-contract.mjs --sync` (0.156) | `spine/`, `bin/` (twin-ai) | giữ, kiểm ở 016 |

## 4. Deplao → Open CRM: bảng dịch ngữ cảnh (kế thừa 0.40 §0, cập nhật)

| Deplao (desktop, offline-first) | Open CRM (WordPress, server) | Ghi |
|---|---|---|
| SQLite local, DataSyncService 70 bảng | MySQL của WordPress: 7 bảng sổ hội thoại + 5 bảng `ocrm_*` | không có đồng bộ delta; một nguồn |
| Cloudflare tunnel / ngrok cho boss ↔ nhân viên | chính URL website; nhân viên đăng nhập WordPress | 0.40: "không cần tunnel" — vẫn đúng |
| zca-js trong Electron (đăng nhập Zalo tại máy) | **Zalo Hub** (dịch vụ BizCity) qua cầu `zalo-hub-bridge/1.0`; có Zalo Brain thì qua Channel Gateway | 30-STANDALONE-INSTALL §4 |
| AI key OpenAI / Anthropic trong app; "9Router miễn phí" | **không có LLM trong Open CRM**; trợ lý = Agent Guru của Zalo Brain (cell) | R-OC-BRAIN-1 |
| Workflow builder ReactFlow trong app | **bizcity-automation** (cell-first) — Open CRM là chỗ đặt + nguồn sự việc / hành động | R-ZONE-3 (0.40): CRM không CRUD kịch bản |
| POS KiotViet / Haravan / Sapo / Nhanh / Pancake | thẻ kết nối như Deplao **+ Open Kiot** (Bizcity) ưu tiên | 10-ARCHITECTURE §6 |
| Thanh toán Casso / SePay webhook | giữ **+ Open Kế Toán** nhận hoá đơn / công nợ | |
| ERP nội bộ (task / calendar / note / HRM) | module `tasks` nhỏ trong Open CRM; việc = `task.pushed` | Q001-3 |
| Plugin .zip, iframe, JSON-RPC | add-on WordPress khai `module.json`; REST + webhook | 13 |
| Employee mode (máy nhân viên nối boss) | vai WordPress + `inbox_members` | 009 |

## 5. Quyết định (D001-*)

| Mã | Quyết định | Lý do / hệ quả |
|---|---|---|
| **D001-1** | **Boot luôn, không gate theo Zalo Brain.** Bỏ điều kiện `bizcity_crm_spine_ready()` ở `plugins_loaded@6`; thay bằng `OCRM_Host` (30-STANDALONE §1) chọn *repository + connector*: có lõi ⇒ dùng Repository lõi + nghe `bizcity_crm_message_ingested`; không ⇒ Repository mỏng của plugin trên cùng 7 bảng + cầu Zalo Hub. Không `Requires Plugins`. | Yêu cầu chủ "phát hành độc lập"; 0.156 đã làm được phần DB, còn phần boot + màn |
| **D001-2** | **Menu và màn độc lập khỏi `/twin/`.** (a) wp-admin luôn có menu cấp 1 **"Open CRM"** (slug `bizcity-crm`), bỏ `return` khi có `BizCity_Admin_Menu`; (b) `/crm/` luôn trả SPA của plugin, không TwinShell, không iframe; (c) bỏ `twinUrl`, mọi `href` sang `/twin/`, mọi tham chiếu TwinShell (F4); (d) **không** `register_surface('crm', …)` vào vỏ twin; Zalo Brain muốn trỏ sang thì chỉ là một link một chiều tới `/crm/`. | "menu chức năng độc lập khỏi /twin/ như cũ" |
| **D001-3** | **Deplao là chuẩn giao diện; ≥ 90 % bố cục, thành phần, luồng** của 13 ảnh. Khác cố ý: xám trung tính + **một** màu nhấn (token `--primary`), ba màu trạng thái; chữ 15 px / nút 44 px / tiêu đề 26 px; avatar chữ một màu; rail có nhãn. **Sửa R-OC-UI-1**: "đỏ `#d0021b` chỉ cho nút chính" → "một màu nhấn `--primary` (mặc định xanh Deplao `#1f6bf2`; đỏ BizCity là lựa chọn — Q001-1); không gradient, không avatar màu, không biểu tượng màu". | "90% giao diện như trong hình" + "ít màu sắc, to, rõ" |
| **D001-4** | **Tính năng thuộc plugin khác không bị ẩn mà hiện thẻ "Cần cài …"** (component `Gate`): Zalo Brain (trợ lý AI, Facebook / Messenger / Telegram), Automation (kịch bản), Open Kiot / Open Kế Toán (POS / hoá đơn Bizcity). Một câu vì sao + nút cài. Có plugin ⇒ thẻ đổi thành chức năng thật, **cùng khung, cùng token**. | Người dùng hiểu sản phẩm trọn vẹn ngay cả khi mới cài một mình; không "menu biến mất" |
| **D001-5** | **Không xung đột khi cài cùng twin-brain** — kiểm bằng máy ở 016: một chủ một bảng (`crm-ledger@1`, changelog `owner_when_core_present`); tên lớp giữ nguyên + `class_exists(…, false)` (mẫu `$moved_files` 0.156); REST ns `bizcity-crm/v1` riêng; slug menu `bizcity-crm` ≠ `bizcity-start` / `bizchat-gateway-spa`; handle asset `bizcity-crm-*`; hook nghe lõi có guard; không hai plugin cùng đăng ký một route (Ext bỏ qua route lõi đã có). | 0.156 §4–5, N11, N12 |
| **D001-6** | **Phạm vi 13 màn ↔ phase 004–015** (bảng §6). Mục "Không làm" ở `50-UI-LEAN §4` (kanban, dashboard nhiều biểu đồ, 4 menu) **hết hiệu lực**; thay bằng rail 6 mục của Deplao. | chỉ đạo 2026-11-23 thay chỉ đạo 2026-11-17 |
| **D001-7** | **FE-first, mockup duyệt trước, mỗi phase ≤ 4 bước, mỗi màn 4 trạng thái, mọi thao tác ghi qua sheet** (R-LEAN-4, R-ACTION-SHEET, R-OC-UI-3/5). Không `alert/confirm/prompt`. | như 0.40, 0.96 |
| **D001-8** | **Dữ liệu dưới màn** không đổi so với `docs/open-crm/`: sổ hội thoại `crm-ledger@1` + sổ chăm sóc `ocrm_*`; báo cáo đếm từ sổ + dẫn xuất; cấu hình = option theo blog. Màn nào cần bảng mới ⇒ changelog trước (R-OC-DB-1). | lõi không nới vì UI |
| **D001-9** | **Tài liệu kỹ thuật song song:** phần "cần Zalo Brain" của mỗi màn ghi rõ `class_exists` nào gate; phần "cần Automation" ghi hợp đồng sự việc / hành động Open CRM cung cấp. | dev plugin khác đọc được |

## 6. Mười ba ảnh → phase

| Ảnh | Deplao | Open CRM | Phase | Thay đổi cố ý |
|---|---|---|---|---|
| 1 | Dashboard 9 tài khoản | Tổng quan tài khoản | 004 | Facebook / Telegram chỉ qua Zalo Brain (thẻ "Qua Zalo Brain") |
| 2 | Liên hệ 1.248 | Danh bạ | 005 | nhãn 4 tông; sheet hồ sơ có dòng sổ chăm sóc |
| 3 | Chat 3 cột + Gợi ý AI | Hộp thư | 006 | gợi ý AI chỉ khi có Zalo Brain |
| 4 | Chiến dịch | Chiến dịch gửi hàng loạt | 007 | Send Guard hiện trần, giờ, danh sách không nhận |
| 5 | Workflow canvas | Kịch bản tự động (chỗ đặt) | 012 | do bizcity-automation; node AI = Agent Guru |
| 6 | Trợ lý thiết kế workflow | Trợ lý thiết kế (sheet) | 012 | cell của Zalo Brain |
| 7 | Tích hợp | Kết nối mở rộng | 011 | + Open Kiot / Open Kế Toán; "9Router" ⇒ Zalo Brain |
| 8 | Báo cáo & Phân tích | Báo cáo & Phân tích | 008 | số đếm từ sổ; 2 màu biểu đồ |
| 9 | Quản lý nhân viên | Nhân viên | 009 | không LAN/WAN tunnel — URL website |
| 10 | Quản lý công việc Kanban | Công việc nội bộ | 010 | việc từ trợ lý `task.pushed` |
| 11 | Ứng dụng, API & Webhook | Ứng dụng, API & Webhook | 013 | add-on WordPress; outbox |
| 12 | Internet & Đám mây | Lưu trữ & Đám mây | 014 | kho = uploads / R2 / Drive; địa chỉ = website |
| 13 | Đồng bộ tin nhắn từ điện thoại | sheet trong Hộp thư | 006 | cần route Hub |

## 7. Câu hỏi cho chủ (Q001-*)

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| Q001-1 | Màu nhấn: xanh Deplao (`#1f6bf2`) để giống ảnh 90 %, hay đỏ BizCity (`#d0021b`) theo brandbook, hay đen? (thử ngay trên mockup: nút "Màu nhấn") | **xanh** cho Open CRM phát hành cộng đồng; đỏ giữ cho Zalo Brain / sản phẩm BizCity — để hai sản phẩm nhìn là biết |
| Q001-2 | Đổi slug thư mục `bizcity-twin-crm` → `bizcity-open-crm` ngay phase này hay để tới phát hành 1.0 (Q156-1, Q-OC-1)? | **để tới 016** — đổi slug làm site đang chạy mất trạng thái kích hoạt |
| Q001-3 | "Công việc nội bộ" (Kanban) là module trong Open CRM (tắt được) hay add-on riêng "Đội & quy trình" như 40-REDUCTION-CENSUS? | **module trong plugin, bật mặc định, tắt được** — ảnh 10 là một trong 13 màn mục tiêu; dữ liệu chỉ là sự việc `task.pushed` + dẫn xuất, không bảng mới |
| Q001-4 | Chạy một mình có nhận tin Zalo ngay (cầu Zalo Hub, cần route Hub mới — Q-OC-6) hay bản 1.0 chỉ đọc sổ + gửi hàng loạt, nhận tin khi có Zalo Brain? | **cầu Hub trong 1.0** — "chủ động" là lời chủ 2026-11-17; đặt ở 006 bước 4, phụ thuộc Hub |

## 8. Checklist phase

| # | Việc | TT |
|---|---|---|
| 001.1 | Chủ duyệt D001-1…9, trả lời Q001-1…4 | ⏸ |
| 001.2 | Công cụ census `bin/open-crm-twin-census.mjs`: liệt kê file / dòng còn `twin`, `TwinShell`, `BizCity_Admin_Menu`, `bizcity_crm_spine_ready`, `register_surface` ⇒ `evidence/twin-census.md` (thay bảng F4 bằng số thật) | ☐ |
| 001.3 | Ghi vào `docs/open-crm/00-CANON.md`: R-OC-UI-1 bản sửa (D001-3) + ghi chú "50-UI-LEAN §4 thay bởi PHASE-001 D001-6" | ☐ chờ 001.1 |
| 001.4 | `docs/open-crm/README.md` trỏ sang `docs/phases/` | ☑ 2026-11-23 |

## 9. Chủ chốt 2026-11-23 (tối)

<!-- [2026-11-23 11:10 PM Johnny Chu - Chu Hoàng Anh] OC-UI — chủ chốt: không chạy khi thiếu kết nối cell hub; canvas kịch bản sang repo open-workflow; các câu hỏi còn lại theo đề xuất. -->

> Chủ: *"Running without Zalo Brain ⇒ no, need api and scan QR zalo to use, cause use through zalo cell hub. Workflow canvas: don't dev with crm, we'll dev on repo open-workflow (bizcity-automation) after. And ok with other open questions."*

| Mã | Chốt | Thay cho |
|---|---|---|
| **D001-1 (sửa)** | Open CRM **không có chế độ chạy mà không kết nối**. Dùng được = có **khoá API + quét QR Zalo**, mọi tin đi qua **Zalo cell hub**. Bỏ ý tưởng "chế độ một mình chỉ đọc sổ". Màn "Thêm tài khoản" dẫn tới luồng khoá API + QR của cell hub. Plugin vẫn kích hoạt + cài bảng được khi chưa kết nối (đã có từ 0.156), nhưng màn hình chỉ có ý nghĩa sau khi kết nối | D001-1 bản đầu, Q001-4 |
| **D001-10** | **Canvas kịch bản không làm trong Open CRM.** Làm sau ở repo **open-workflow** (bizcity-automation). Màn "Kịch bản tự động" của Open CRM giữ dạng hiện tại: danh mục kích hoạt / hành động + nút mở trình dựng | PHASE-012 phần canvas, OC-012.1 |
| Q001-1 | Màu nhấn **xanh** (`#1f6bf2`) | — |
| Q001-2 | Đổi slug `bizcity-open-crm` để tới PHASE-016 | — |
| Q001-3 | Công việc nội bộ (Kanban) là **module trong plugin**, bật mặc định, tắt được | — |
| Q001-4 | Thay bằng D001-1 (sửa): kết nối qua cell hub bằng khoá API + QR | — |
| AI gợi ý | Dải "Gợi ý AI" lấy gợi ý từ cell (Zalo Brain); REST gợi ý thiết kế phía Zalo Brain, Open CRM chỉ hiển thị khi `caps.aiSuggest` | — |

Census 2026-11-23 (`scratchpad/census.cjs`, ghi ở đây để không làm lại): phần mở rộng cũ dùng **20 lớp core/crm** (Staff_Policy 175 chỗ, Repository 125 — có `extends`, Event_Emitter 40, Inbox_Access 28 …) và **86 lớp khác của Zalo Brain** (BizCity_Cache 110, Channel_File_Logger 55, JSONL_File_Logger 39, Zalo_Mapping_Repo 19 …). Chạy không Zalo Brain = phải mang gần như cả lõi ⇒ đúng với chốt trên: không làm.

## Xong khi

Chủ duyệt §5, §7 có câu trả lời ghi vào bảng; `evidence/twin-census.md` có; CANON sửa. Các phase 002–016 chỉ trỏ về đây, không bàn lại định vị.
