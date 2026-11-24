# open-cake — Bizcity Open Customer Framework

<!-- [2026-11-24 Claude Opus 5.5] INIT — chủ (2026-11-24): tạo repo open-cake; web TypeScript cùng khung open-ketoan; trục contact_id; song song với plugin WordPress open-crm. -->

> **Open Cake** là bản **web** của Open CRM trong hệ Bizcity: một bản mã, mỗi site một database PostgreSQL, do `bizcity-open-setup` cấp site — cùng khung với [open-ketoan](https://github.com/hoanganh8389/open-ketoan). Trái tim là **sổ chạm khách chỉ thêm** và **`contact_id` là trục duy nhất**: tin nhắn, bình luận, thẻ, việc, đơn, giấy tờ từ **mọi kênh** (Zalo cá nhân, Zalo OA, Facebook cá nhân, Facebook Page, Facebook Group, comment, web, điện thoại) đều rơi về một người.
>
> **Định hướng:** *Lõi khách hàng ổn định — Kênh sống ở Cell — Hợp đồng rõ ràng — Dữ liệu do người dùng kiểm soát.*

**Trạng thái:** 🟡 khởi tạo — mới có tài liệu kiến trúc và canon, **chưa có mã**. Bản đang chạy của Open CRM là plugin WordPress [`open-crm`](https://github.com/hoanganh8389/open-crm); hai bản song song theo [BIZCITY OPEN CANON §6](docs/canon/BIZCITY-OPEN-CANON-v1.md).

## Đọc theo thứ tự

| Tài liệu | Một câu |
|---|---|
| [docs/canon/BIZCITY-OPEN-CANON-v1.md](docs/canon/BIZCITY-OPEN-CANON-v1.md) | **nguyên tắc chung giữa mọi repo Bizcity** — lời hứa thị trường, một app một trục, năm nguyên tắc sổ, danh tính xuyên app, hợp đồng, hình dáng chuẩn, hai bản song song, nếp làm việc, nghiệm thu hệ |
| [docs/00-CANON.md](docs/00-CANON.md) | luật riêng `R-CAKE-*` của repo này |
| [docs/phases/PHASE-001-KIEN-TRUC-TRUC-CONTACT-ID/README.md](docs/phases/PHASE-001-KIEN-TRUC-TRUC-CONTACT-ID/README.md) | kiến trúc: 10 bảng lõi, `submitTouchIn`, resolver danh tính, hợp đồng `unified-touch@1` / `channel-command@1`, golden case Facebook 4 mặt, nhiều CSDL, đợt W0–W6 |
| [docs/adr/ADR-0001-cung-khung-open-ketoan-truc-contact.md](docs/adr/ADR-0001-cung-khung-open-ketoan-truc-contact.md) | vì sao cùng khung open-ketoan, vì sao trục là contact |
| [AGENTS.md](AGENTS.md) | nếp làm việc cho người và agent |

## Vì sao "Cake"

Mỗi khách hàng là **một chiếc bánh nhiều lớp**: lớp Zalo, lớp Facebook, lớp comment, lớp đơn hàng, lớp công nợ — nhiều lớp nhưng **một chiếc bánh, một `contact_id`**. Dev không phải tự xây lõi hội thoại hay lõi danh tính; dev làm giao diện, quy trình ngành, module. Kernel bảo đảm mỗi lần chạm khách đều ghi sổ, truy vết được, AI (Cell) đọc được qua MCP.

## Ba dự án anh em, một nguyên tắc

| Dự án | Sổ | Trái tim | Trục |
|---|---|---|---|
| Open Kế Toán | sổ cái | bút toán Nợ = Có | `partner_id`, `item_id` |
| Open Kiot / POS | sổ bán lẻ | giao dịch ba chân | `txn_id` |
| **Open Cake** | **sổ chạm khách** | **mỗi lần chạm khách là một dòng** | **`contact_id`** |

Cell Zalo Brain là não điều phối (AI, kịch bản, skill, phiên kênh) — **không** là chủ dữ liệu nào.

## Giấy phép

Mã: GPL-2.0-or-later ([LICENSE](LICENSE)). Nhãn hiệu BizCity: [TRADEMARK.md](TRADEMARK.md).
