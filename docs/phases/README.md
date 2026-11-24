# open-cake — Lộ trình phase

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): chia phase rõ ràng theo vai system builder / architect; khuôn phase open-ketoan (README · S<nnn>-n · Xong khi · Rủi ro); thứ tự: nền → quan sát → người dùng → kernel → kênh → giao diện → Facebook → bốn trục → mô-đun → MCP → nhiều site → kiểm chứng. -->

**Khuôn một phase** (R-PHASE, theo open-ketoan): `README.md` có dòng máy đọc `> **Việc lộ trình:**`, áp dụng cho (WP · cake · cả hai), trạng thái, phụ thuộc, mục tiêu một câu, ngoài phạm vi, đầu ra `S<nnn>-n`, quyết định `D<nnn>-n`, câu hỏi `Q<nnn>-n`, **Xong khi**, rủi ro; khi lớn thêm `00-MASTER-PLAN.md`, `40-MASTER-CHECKLIST.md` (bằng chứng `T<nnn>-n`), `evidence/`, `70-REFLECT.md`. Nhận việc ở [CLAIMS.md](CLAIMS.md) trước khi code (R-FLOW).

Ký hiệu: ☐ chưa · ◐ đang · ☑ xong (mã + bằng chứng) · ⏸ chờ chủ.

| Phase | Đợt | Một câu | Repo chạm | Golden | TT |
|---|---|---|---|---|---|
| [001](PHASE-001-KIEN-TRUC-TRUC-CONTACT-ID/README.md) Kiến trúc | W0 | trục `contact_id`, khung open-ketoan, bốn trục, chốt D / Q | cake | — | ⏸ chờ chủ |
| [002](PHASE-002-KHUNG-MONOREPO-PLATFORM/README.md) Khung | W1 | monorepo, platform fork, Docker, CI, selfcheck, một site ngầm định | cake | — | ☐ |
| [003](PHASE-003-QUAN-SAT-VAN-HANH/README.md) Quan sát | W1 | log Loki · metric Prometheus · trace Tempo · Grafana · chẩn đoán | cake | — | ☐ |
| [004](PHASE-004-NGUOI-DUNG-QUYEN-BANG-CHUNG/README.md) Người dùng | W1 | quyền `cake:*`, SSO WP, khoá API, bằng chứng hash-chain | cake | — | ☐ |
| [005](PHASE-005-CARE-KERNEL-SO-CHAM-KHACH/README.md) Care-kernel | W1 | `submitTouchIn`, sổ chỉ-thêm, resolver, merge / unmerge | cake | — | ☐ |
| [006](PHASE-006-HOP-DONG-INGRESS-CELL-ZALO/README.md) Kênh | W2 | `bizcity_touch@1` / `bizcity_channel_command@1`; Zalo cá nhân đầu tiên | cake · zalo-hub · router | — | ☐ |
| [007](PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/README.md) Giao diện lõi | W2 | khung Deplao, Hộp thư, Danh bạ, Contact 360, Kênh | cake | — | ☐ |
| [008](PHASE-008-FACEBOOK-PAGE-COMMENT/README.md) FB Page | W3 | chat Page, comment, private reply | cake · Cell · router | G1–G4 | ☐ |
| [009](PHASE-009-FACEBOOK-CA-NHAN-NHOM/README.md) FB cá nhân + Group | W4 | fbchat-v2 (mở lại WP 017), group_feed, Ghép / Tách | cake · zalo-hub | G5–G6 | ☐ |
| [010](PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/README.md) Bốn trục | W5 | `cake.order_request` → POS → Kế Toán; khách công nợ; đối chiếu 3 chiều | cake · ketoan · pos | G7–G8 | ☐ |
| [011](PHASE-011-GUI-HANG-LOAT-SEND-GUARD/README.md) Gửi hàng loạt | W6 | module broadcast, Send Guard | cake | — | ☐ |
| [012](PHASE-012-BAO-CAO-CONG-VIEC/README.md) Báo cáo + Việc | W6 | báo cáo đọc sổ, Kanban | cake | — | ☐ |
| [013](PHASE-013-MCP-TWIN-BRAIN/README.md) MCP | W6 | Twin Brain đọc / nháp / gửi có xác nhận; kiểm chứng | cake · twin-brain | — | ☐ |
| [014](PHASE-014-NHIEU-SITE-OPEN-SETUP/README.md) Nhiều site | W5 | PHASE-039 cho cake; open-setup thêm `product` | cake · open-setup · router | — | ☐ |
| [015](PHASE-015-KIEM-CHUNG-PHAT-HANH/README.md) Kiểm chứng | W6 | golden G1–G8, DOD-SYS, thử tải, phát hành, kế hoạch WP | cả hai | G1–G8 | ☐ |

## Đường găng

```text
001 ─► 002 ─┬─► 003
            ├─► 004 ─┐
            └─► 005 ─┴─► 006 ─► 007 ─► 008 ─► 009
                              │        └─► 010 ─► 013
                              ├─► 011 · 012
                              └─► 014 ─────────────► 015
```

Mỗi đợt kết thúc bằng một thứ **người dùng thấy được** (R-LEAN-4): W1 = hệ chạy rỗng có quan sát + đăng nhập + sổ; W2 = Zalo thật trên web; W3 = Facebook Page; W4 = FB cá nhân + Group; W5 = bốn trục + nhiều site; W6 = đủ màn, MCP, phát hành.
