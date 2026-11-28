# AGENTS.md — open-cake

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] INIT — nếp làm việc kế thừa open-ketoan AGENTS.md; luật cấp trên là BIZCITY OPEN CANON. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] AGENTS-0.2 — danh sách "trước khi xong việc" và "tự trượt khi review" theo open-ketoan AGENTS.md + RULE-REVIEW §7.2, thêm kiểm H-CAKE-*. -->

Đọc theo thứ tự: [canon chung ở open-hub](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/README.md) (canon, B2B, tái sử dụng, dữ liệu) → [00-CANON](docs/00-CANON.md) → [ADR-0001](docs/adr/ADR-0001-cung-khung-open-ketoan-truc-contact.md) → [architecture/10](docs/architecture/10-ARCHITECTURE.md) → phase đang mở ([phases/README](docs/phases/README.md)).

<!-- [2026-11-27 11:03 PM Johnny Chu - Chu Hoàng Anh] NC-003 — chủ chốt Q-CORE-1…4 (bizcity-platform NC-003): ba vai nền; open-core là repo mã lõi riêng -->
## open-cake trong ba vai nền (canon R-CANON-17)

**open-platform** (repo `bizcity-platform`: chuẩn `BIZCITY-*`, bộ kiểm `standard-check`) quy định → **open-core** (repo `open-core`: mã lõi `@bizcity/*`, semver chung) hiện thực → **open-cake = open-core + module `cake.crm` (+ `cake.catalog`)** → **open-setup** cấp instance (`/_sites/v1`, ghi `core_version`).

- Phần **chung** viết ở đây trước (Storage, Records / Meta, máy chủ action, web shell…) phải ở đúng ranh giới `core` (PHASE-019 S019-2) để dời lên open-core (NC-003 C5) **không đổi hành vi**; phần CRM ở `modules/crm`.
- Cần sửa lõi ⇒ PR vào open-core (trước C2: bizcity-platform), cake nhận qua bản phát hành; **không** vá `node_modules/@bizcity/*`, không chép mã lõi vào repo.
- Đổi chuẩn ⇒ PR ở open-platform trước; cake ghi mức đạt bằng `node ../bizcity-platform/tools/standard-check.mjs --repo .`.

<!-- [2026-11-28 12:24 AM Johnny Chu - Chu Hoàng Anh] NC-004 — trụ cột xuyên doanh nghiệp, open-core bảo đảm (canon R-CANON-18) -->
**Trụ cột xuyên doanh nghiệp (canon R-CANON-18, [NC-004](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/research/NC-004-TRU-COT-XUYEN-DOANH-NGHIEP.md)) — không app nào định nghĩa lại:**
- `qty` luôn quy về **đơn vị nhỏ nhất** (tỷ lệ 1); `unit` / `unitQty` / `unitRatio` chỉ để hiện; số lượng `numeric(18,4)`, tỷ lệ `(18,6)`, tiền `(18,2)`.
- `tenant ↔ blog_id` một-một; chuỗi nhiều cửa hàng = nhiều tenant; chi nhánh / kho / phòng ban là cây `branches` trong tenant.
- `contact_id` ↔ `partner.code` theo SPINE §4; `item_id` ULID bất biến.
- Chứng từ: `doc_ref` `<module>.<type>:<id>` + `version` + `content_hash`, bốn bảng, `document_links`, workflow YAML `<module>.<type>.workflow.yaml`; gửi đi với `Idempotency-Key = <doc_ref>@<version>` + `traceparent`.
- Vai quyền, cài đặt, meta / bản ghi mềm, tệp, API, MCP, **bốn bước kết nối open-hub** (`bizcity_hub_setup@1`), đệm, kiểm, bàn điều tra: dùng của lõi.
- open-cake hiện còn bản riêng của vài trụ (Storage, lớp mềm, danh mục H-1…H-18) — giữ đúng hình chuẩn để dời lên lõi (NC-003 C5) không đổi dữ liệu.

<!-- [2026-11-28 06:44 PM Johnny Chu - Chu Hoàng Anh] R-CANON-19 — một chuẩn REST + JSON + React trên open-core -->
**Một chuẩn REST + JSON + React (canon R-CANON-19):** open-core là hạ tầng. Mọi chức năng là action ⇒ REST `/api/v1` + MCP; **mọi danh sách** theo [`bizcity_list@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-LIST-v1.md) (`q`, `f.<cột>.<phép>`, `sort`, con trỏ, `count` / `sums`, xuất csv / xlsx / json / ndjson có quyền xuất riêng + bằng chứng); giao diện dùng `@bizcity/web-shell` (`<ListScreen>`, `useListQuery`, menu chung) khi lõi có (open-core PHASE-003) — **không** tự dựng bảng + lọc + phân trang + nút xuất mới; màn danh sách đang có chuyển dần ở S003-7.

## Bốn câu không được quên

1. **`contact_id` là trục.** Không bảng nào khoá theo id kênh.
2. **Không ghép người theo tên.** Chỉ ghép khi có `proof`.
3. **Sổ chạm khách chỉ thêm, một cửa `submitTouchIn`.**
4. **Kênh sống ở Cell.** Repo này không có cookie, token, khoá E2EE, không gọi LLM, không nộp sổ kế toán.

## Bước 0 — nhận việc (R-FLOW)

`node scripts/nhan-viec.mjs` → claim trong `docs/phases/CLAIMS.md` bằng PR chỉ tài liệu lên main → mới code. Một phạm vi một người; nhánh ≤ 1 ngày; trả claim trong cùng PR. Trùng phạm vi ⇒ dừng, hỏi.

## Khi viết mã

- Định danh tiếng Anh; chú thích, thông báo, tài liệu tiếng Việt. File < 200 dòng, kebab-case.
- Mỗi file mã mới: `// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.` + `// @bizcity-layer <platform|kernel|module|app|web>`.
- **R-SIG:** mỗi sửa đổi chức năng mang dấu `[YYYY-MM-DD HH:MM AM/PM Johnny Chu - Chu Hoàng Anh] <CODE> — …` theo giờ máy thật (`date '+%Y-%m-%d %I:%M %p'`); **không bao giờ** ghi tên agent hay model; không sửa dấu cũ.
- Route ghi = `defineAction` + `runAction`; lỗi = `Errors.*`; zod ở cửa; Kysely tham số hoá; migration lấy số bằng `node scripts/so-tiep-theo.mjs migration`.
- Module mới chỉ ở `modules/<key>/`; không đụng `packages/*`; web module chỉ import `@bizcity/ui-kit`.
- Chuẩn REST: [70-API-REST](docs/architecture/70-API-REST.md). Chuẩn React: [80-REACT](docs/architecture/80-REACT.md). Log / metric / trace: [30-OBSERVABILITY](docs/architecture/30-OBSERVABILITY.md).

## Trước khi xong việc (chạy theo thứ tự)

1. `node tests/conformance/selfcheck.mjs` — phải PASS (nợ mới **sửa**, không thêm vào `baseline.json`).
2. `bash scripts/kiem-chuan.sh`
3. `pnpm run typecheck` <!-- [2026-11-27 10:15 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 S019-1 — repo dùng pnpm (NC-002 Q-OC-6); cài: `corepack enable pnpm` rồi `pnpm install` -->
4. `npm test` (cần `docker compose up -d db`; luôn chạy trên `cake_test`, không bao giờ DB thật).
5. `node scripts/so-tiep-theo.mjs kiem` (số migration / ADR không trùng).
6. `npx bizcity module check <key>` nếu đụng module; `bizcity event check` phải `KẾT LUẬN: PASS` (SKIP ≠ PASS).
7. Cập nhật tài liệu theo bảng "sửa X ⇒ sửa Y" (00-CANON); đăng ký khoá cài đặt mới; quyền mới đăng ký cùng PR.
8. Liệt kê file framework đã sửa và xác nhận mỗi sửa có dấu R-SIG (thiếu = KHÔNG ĐẠT).
9. Đụng care-kernel ⇒ dán khối bằng chứng (`tests/conformance/output/latest/evidence.txt`) vào PR, khai mức K0–K3.

## Tự trượt khi review (KHÔNG ĐẠT)

- Trục chấm T1 (sự thật sổ), T2 (ranh giới kernel), T4 (bảo mật / đơn vị), T5 (kiểm đầu vào), **T-CAKE (trục contact)** = 0; còn phát hiện chặn chưa sửa; selfcheck / test đỏ vì đóng góp.
- **H-*** kế thừa: H-LEDGER, H-TRIGGER-OFF, H-LEDGERSVC, H-KERNEL-IMPORT, H-CROSS-MODULE, H-REPLY, H-SKIP, H-SECRET, H-MD-TABLE, H-METRIC-LABEL; R-LOG-1..4; R-REV-11 (dọn sổ); thiếu dấu R-SIG.
- **H-CAKE-***: H-CAKE-CHANNEL-KEY (bảng khoá theo id kênh thay `contact_id`) · H-CAKE-NAME-MERGE (ghép theo tên) · H-CAKE-SECRET-COL (cột cookie / token / khoá) · H-CAKE-LLM (gọi nhà cung cấp LLM) · H-CAKE-LEDGER-INTAKE (nộp `bizcity_ledger_intake@1`) · H-CAKE-PII-LOG (nội dung tin / số điện thoại trong log, metric, sự kiện) · H-CAKE-RESEND (tự gửi lại khi `unknown`).

## Hai bản song song

Plugin WordPress `open-crm` và `open-cake` **không** chung database, bảng, route. Chung: tên sản phẩm, token UI, luật, hợp đồng. Mỗi phase ghi "áp dụng cho: WP · cake · cả hai".
