# open-cake — Lộ trình phase

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): chia phase rõ ràng theo vai system builder / architect; khuôn phase open-ketoan (README · S<nnn>-n · Xong khi · Rủi ro). -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): "phase này tập trung làm open-cake foundation framework contract và hình thành UI/UX trước, làm open-ketoan sau" ⇒ PHASE-002 nền hợp đồng, PHASE-003 UI/UX trên hợp đồng (giả lập); khung chạy + quan sát dời sang PHASE-016; mọi việc trong open-ketoan hoãn (ADR-0003). -->

**Khuôn một phase** (R-PHASE, theo open-ketoan): `README.md` có dòng máy đọc `> **Việc lộ trình:**`, áp dụng cho (WP · cake · cả hai), trạng thái, phụ thuộc, mục tiêu một câu, ngoài phạm vi, đầu ra `S<nnn>-n`, quyết định `D<nnn>-n`, câu hỏi `Q<nnn>-n`, **Xong khi**, rủi ro; khi lớn thêm `00-MASTER-PLAN.md`, `40-MASTER-CHECKLIST.md` (bằng chứng `T<nnn>-n`), `evidence/`, `70-REFLECT.md`. Nhận việc ở [CLAIMS.md](CLAIMS.md) trước khi code (R-FLOW).

**Số phase ≠ thứ tự làm.** Thứ tự ở bảng "Thứ tự làm" dưới.

Ký hiệu: ☐ chưa · ◐ đang · ☑ xong (mã + bằng chứng) · ⏸ chờ chủ · 💤 hoãn.

| Phase | Đợt | Một câu | Repo chạm | Golden | TT |
|---|---|---|---|---|---|
| [001](PHASE-001-KIEN-TRUC-TRUC-CONTACT-ID/README.md) Kiến trúc | W0 | trục `contact_id`, khung open-ketoan, bốn trục | cake | — | ◐ (D / Q còn mở) |
| [002](PHASE-002-NEN-HOP-DONG-NANG-LUC/README.md) **Nền hợp đồng & năng lực** | W1 | zod một chỗ: hợp đồng nền, action spec + danh mục năng lực, trục contact, 3 hợp đồng cake, registry lớp mềm, fixture | cake | — | ◐ đang làm |
| [003](PHASE-003-UI-UX-TREN-HOP-DONG/README.md) **UI/UX trên hợp đồng** | W1 | ui-kit + 6 màn lõi giống ảnh duyệt, dữ liệu qua `ActionClient` + bộ giả lập | cake | — | ☐ |
| [004](PHASE-004-NGUOI-DUNG-QUYEN-BANG-CHUNG/README.md) Người dùng | W2 | quyền `cake:*`, SSO WP, khoá API, bằng chứng | cake | — | ☐ |
| [005](PHASE-005-CARE-KERNEL-SO-CHAM-KHACH/README.md) Care-kernel | W2 | `submitTouchIn`, sổ chỉ-thêm, resolver, merge / unmerge | cake | — | ☐ |
| [006](PHASE-006-HOP-DONG-INGRESS-CELL-ZALO/README.md) Kênh | W3 | ingress `bizcity_touch@1` / `bizcity_channel_command@1`; Zalo cá nhân đầu tiên | cake · zalo-hub · router | — | ☐ |
| [007](PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/README.md) Giao diện nối dữ liệu thật | W3 | đổi adapter giả lập → `http`; SSE realtime | cake | — | ☐ |
| [008](PHASE-008-FACEBOOK-PAGE-COMMENT/README.md) FB Page | W4 | chat Page, comment, private reply | cake · Cell · router | G1–G4 | ☐ |
| [009](PHASE-009-FACEBOOK-CA-NHAN-NHOM/README.md) FB cá nhân + Group | W5 | fbchat-v2 (mở lại WP 017), group_feed, Ghép / Tách | cake · zalo-hub | G5–G6 | ☐ |
| [010](PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/README.md) Bốn trục | W5 | `cake.order_request` → POS → Kế Toán | cake · ketoan · pos | G7–G8 | ☐ |
| [011](PHASE-011-GUI-HANG-LOAT-SEND-GUARD/README.md) Gửi hàng loạt | W6 | module broadcast, Send Guard | cake | — | ☐ |
| [012](PHASE-012-BAO-CAO-CONG-VIEC/README.md) Báo cáo + Việc | W6 | báo cáo đọc sổ, Kanban | cake | — | ☐ |
| [013](PHASE-013-MCP-TWIN-BRAIN/README.md) MCP | W6 | Twin Brain đọc / nháp / gửi có xác nhận | cake · twin-brain | — | ☐ |
| [014](PHASE-014-NHIEU-SITE-OPEN-SETUP/README.md) Nhiều site | W6 | máy nhiều site của platform cho cake; open-setup `product` | cake · open-setup · router | — | ☐ |
| [015](PHASE-015-KIEM-CHUNG-PHAT-HANH/README.md) Kiểm chứng | W7 | golden G1–G8, DOD-SYS, thử tải, phát hành | cả hai | G1–G8 | ☐ |
| [016](PHASE-016-KHUNG-CHAY-PLATFORM-QUAN-SAT/README.md) Khung chạy + quan sát | W2 | API / DB / Docker / CI trên `bizcity-platform`; log · metric · trace | cake · bizcity-platform | — | ☐ |
| *(open-ketoan)* PHASE-041 tách gói | — | P0 / P1 / P3 / P6 trong open-ketoan | open-ketoan | — | 💤 hoãn (#616, #617 bản nháp) |

## Thứ tự làm

```text
W1   001 ─► 002 Nền hợp đồng ─► 003 UI/UX trên hợp đồng (giả lập)          ← phase này
W2   016 Khung chạy (bizcity-platform, bản sao chỉ đọc) ─► 004 · 005
W3   006 Kênh Zalo ─► 007 nối dữ liệu thật
W4+  008 ─► 009 · 010 · 011 · 012 · 013 · 014 ─► 015
sau  open-ketoan PHASE-041 (P0 / P1 / P3 / P6): open-ketoan chuyển sang dùng gói chung
```

Mỗi đợt kết thúc bằng một thứ **người dùng thấy được** (R-LEAN-4): **W1 = các màn Deplao chạy trên hợp đồng thật với dữ liệu giả lập**; W2 = hệ chạy rỗng có đăng nhập + sổ; W3 = Zalo thật trên web; W4 = Facebook Page; W5 = FB cá nhân + Group + bốn trục; W6 = đủ màn, MCP, nhiều site; W7 = phát hành.
