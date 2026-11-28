# open-cake — Lộ trình phase

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): chia phase rõ ràng theo vai system builder / architect; khuôn phase open-ketoan (README · S<nnn>-n · Xong khi · Rủi ro). -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): "phase này tập trung làm open-cake foundation framework contract và hình thành UI/UX trước, làm open-ketoan sau" ⇒ PHASE-002 nền hợp đồng, PHASE-003 UI/UX trên hợp đồng (giả lập); khung chạy + quan sát dời sang PHASE-016; mọi việc trong open-ketoan hoãn (ADR-0003). -->
<!-- [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — ADR-0004: thêm PHASE-017 danh mục độc lập sẵn ánh xạ (ưu tiên standalone); đồng bộ contact / item / tenant vẫn ở 010. -->

**Khuôn một phase** (R-PHASE, theo open-ketoan): `README.md` có dòng máy đọc `> **Việc lộ trình:**`, áp dụng cho (WP · cake · cả hai), trạng thái, phụ thuộc, mục tiêu một câu, ngoài phạm vi, đầu ra `S<nnn>-n`, quyết định `D<nnn>-n`, câu hỏi `Q<nnn>-n`, **Xong khi**, rủi ro; khi lớn thêm `00-MASTER-PLAN.md`, `40-MASTER-CHECKLIST.md` (bằng chứng `T<nnn>-n`), `evidence/`, `70-REFLECT.md`. Nhận việc ở [CLAIMS.md](CLAIMS.md) trước khi code (R-FLOW).

**Số phase ≠ thứ tự làm.** Thứ tự ở bảng "Thứ tự làm" dưới.

Ký hiệu: ☐ chưa · ◐ đang · ☑ xong (mã + bằng chứng) · ⏸ chờ chủ · 💤 hoãn.

| Phase | Đợt | Một câu | Repo chạm | Golden | TT |
|---|---|---|---|---|---|
| [001](PHASE-001-KIEN-TRUC-TRUC-CONTACT-ID/README.md) Kiến trúc | W0 | trục `contact_id`, khung open-ketoan, bốn trục | cake | — | ◐ kiến trúc đã được mã hiện thực (002…018); còn rà D / Q đã chốt chưa rồi đóng |
| [002](PHASE-002-NEN-HOP-DONG-NANG-LUC/README.md) **Nền hợp đồng & năng lực** | W1 | zod một chỗ: hợp đồng nền, action spec + danh mục năng lực, trục contact, 3 hợp đồng cake, registry lớp mềm, fixture | cake | — | ☑ 2026-11-24 (25 test) |
| [003](PHASE-003-UI-UX-TREN-HOP-DONG/README.md) **UI/UX trên hợp đồng** | W1 | ui-kit + 6 màn lõi + màn lớp mềm tự sinh, dữ liệu qua `ActionClient` + bộ giả lập | cake | — | ☑ 2026-11-24 (14 ảnh build, 42 test) |
| [004](PHASE-004-NGUOI-DUNG-QUYEN-BANG-CHUNG/README.md) Người dùng | W2 | quyền `cake:*`, SSO WP, khoá API, bằng chứng | cake | — | ☑ S004-1..7; SSO của nền (40-SECURITY §3.4) để sau, chưa có việc riêng |
| [005](PHASE-005-CARE-KERNEL-SO-CHAM-KHACH/README.md) Care-kernel | W2 | `submitTouchIn`, sổ chỉ-thêm, resolver, merge / unmerge | cake | — | ◐ kernel + PgCareRepo + selfcheck ☑; còn **outbox S005-6** |
| [006](PHASE-006-HOP-DONG-INGRESS-CELL-ZALO/README.md) Kênh | W3 | ingress `bizcity_touch@1` / `bizcity_channel_command@1`; Zalo cá nhân đầu tiên | cake · zalo-hub · router | — | ◐ phía Cake ☑ (cổng nhận HMAC, hàng chờ lệnh gửi, `channel.test`); zalo-hub phát touch có mã; chưa chạy Cell + Hub thật; S006-5 ☐ |
| [007](PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/README.md) Giao diện nối dữ liệu thật | W3 | đổi adapter giả lập → `http`; SSE realtime | cake | — | ◐ mọi việc không cần kênh thật xong (đọc + ghi, SSE, ErrorBoundary, i18n, phím tắt, gửi tin kèm ảnh / tệp qua Hub giả); còn gửi tin thật, bình luận (008), NỢ-007-1 |
| [008](PHASE-008-FACEBOOK-PAGE-COMMENT/README.md) FB Page | W4 | chat Page, comment, private reply | cake · Cell · router | G1–G4 | ☐ |
| [009](PHASE-009-FACEBOOK-CA-NHAN-NHOM/README.md) FB cá nhân + Group | W5 | fbchat-v2 (mở lại WP 017), group_feed, Ghép / Tách | cake · zalo-hub | G5–G6 | ☐ |
| [010](PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/README.md) Bốn trục | W5 | `cake.order_request` → POS → Kế Toán | cake · ketoan · pos | G7–G8 | ◐ phía Cake S010-1, 2, 3, 5, 6, 7, 8 có mã (cửa hàng giả + Kế Toán giả); chưa chạy POS / Kế Toán thật |
| [011](PHASE-011-GUI-HANG-LOAT-SEND-GUARD/README.md) Gửi hàng loạt | W6 | module broadcast, Send Guard | cake | — | ☐ |
| [012](PHASE-012-BAO-CAO-CONG-VIEC/README.md) Báo cáo + Việc | W6 | báo cáo đọc sổ, Kanban | cake | — | ☐ |
| [013](PHASE-013-MCP-TWIN-BRAIN/README.md) MCP | W6 | Twin Brain đọc / nháp / gửi có xác nhận | cake · twin-brain | — | ☐ |
| [014](PHASE-014-NHIEU-SITE-OPEN-SETUP/README.md) Nhiều site | W6 | máy nhiều site của platform cho cake; open-setup `product` | cake · open-setup · router | — | ☐ |
| [015](PHASE-015-KIEM-CHUNG-PHAT-HANH/README.md) Kiểm chứng | W7 | golden G1–G8, DOD-SYS, thử tải, phát hành | cả hai | G1–G8 | ☐ |
| [016](PHASE-016-KHUNG-CHAY-PLATFORM-QUAN-SAT/README.md) Khung chạy + quan sát | W2 | API / DB / Docker / CI trên `bizcity-platform`; log · metric · trace | cake · bizcity-platform | — | ◐ `apps/api` + compose + selfcheck + quan sát Q1–Q3, Q6 ☑ · còn CI (S016-7), scripts (S016-9), Q4–Q5, Q7 |
| [017](PHASE-017-DANH-MUC-DOC-LAP-SAN-ANH-XA/README.md) **Danh mục độc lập** | W1 | hàng · nhóm · ĐVT · bảng giá của riêng Cake theo chuẩn H-* open-ketoan, `catalog_source local|ketoan`, một cổng ghi (ADR-0004) | cake | — | ☑ 2026-11-24 (64 test, 8 ảnh build; SPINE 1.1 ở platform PR #2) |
| [018](PHASE-018-NOI-LUU-TEP/README.md) **Nơi lưu tệp theo site** <!-- [2026-11-26 11:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-018 — mở phase --> | W3 | một cổng `storage` hai bộ (đĩa \| R2), khoá `sites/<site>` như WP, nhân bản theo tiền tố; đề xuất chuẩn `bizcity_storage@1` ([26](../architecture/26-NOI-LUU-TEP.md)) | cake · open-setup · bizcity-platform | — | ◐ S018-1..4 ☑ (cổng + bộ đĩa + `cake.file.upload`); còn S018-5..8 |
| [019](PHASE-019-TACH-OPEN-CORE/README.md) **Tách open-core + module CRM** <!-- [2026-11-27 09:48 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 — mở phase --> | W3 | open-cake chạy như module CRM trên open-core; Universal Cache · Options · Meta · Records & Hooks · Storage áp ở đây trước; pnpm; contract workspace / app registry (bizcity-platform NC-002) | cake · bizcity-platform · open-setup · bizcity-web | — | ◐ chủ chốt NC-002 2026-11-27; S019-1 đang làm |
| *(open-ketoan)* PHASE-041 tách gói | — | P0 / P1 / P3 / P6 trong open-ketoan | open-ketoan | — | 💤 hoãn (#616, #617 bản nháp) |

**Đánh giá gần nhất:** [DANH-GIA-TIEN-DO-2026-11-28.md](DANH-GIA-TIEN-DO-2026-11-28.md) — máy chủ, đăng nhập, quyền, bằng chứng, quan sát, kho tệp, luồng đơn đã chạy (199 / 199 test); còn thiếu CI, `scripts/`, chạy thật với Cell / Hub / POS / Kế Toán. Bản cũ: [2026-11-24](DANH-GIA-TIEN-DO-2026-11-24.md) (đã thay thế). <!-- [2026-11-28 10:03 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — đánh giá mới -->

## Thứ tự làm

```text
W1   001 ─► 002 Nền hợp đồng ─► 003 UI/UX trên hợp đồng (giả lập) ─► 017 Danh mục độc lập   ← phase này
W2   016 Khung chạy (bizcity-platform, bản sao chỉ đọc) ─► 004 · 005
W3   006 Kênh Zalo ─► 007 nối dữ liệu thật
W4+  008 ─► 009 · 010 · 011 · 012 · 013 · 014 ─► 015
sau  open-ketoan PHASE-041 (P0 / P1 / P3 / P6): open-ketoan chuyển sang dùng gói chung
```

Mỗi đợt kết thúc bằng một thứ **người dùng thấy được** (R-LEAN-4): **W1 = các màn Deplao chạy trên hợp đồng thật với dữ liệu giả lập**; W2 = hệ chạy rỗng có đăng nhập + sổ; W3 = Zalo thật trên web; W4 = Facebook Page; W5 = FB cá nhân + Group + bốn trục; W6 = đủ màn, MCP, nhiều site; W7 = phát hành.
