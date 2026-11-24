# open-cake — Bizcity Open Customer Framework

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] INIT — chủ (2026-11-24): tạo repo open-cake; web TypeScript cùng khung open-ketoan; trục contact_id; song song với plugin WordPress open-crm. -->

> **Open Cake** là bản **web** của Open CRM trong hệ Bizcity: một bản mã, mỗi site một database PostgreSQL, do `bizcity-open-setup` cấp site — cùng khung với [open-ketoan](https://github.com/hoanganh8389/open-ketoan). Trái tim là **sổ chạm khách chỉ thêm** và **`contact_id` là trục duy nhất**: tin nhắn, bình luận, thẻ, việc, đơn, giấy tờ từ **mọi kênh** (Zalo cá nhân, Zalo OA, Facebook cá nhân, Facebook Page, Facebook Group, comment, web, điện thoại) đều rơi về một người.
>
> **Định hướng:** *Lõi khách hàng ổn định — Kênh sống ở Cell — Hợp đồng rõ ràng — Dữ liệu do người dùng kiểm soát.*

**Trạng thái:** 🟡 W1 — nền hợp đồng (PHASE-002 ☑) và giao diện 6 màn trên hợp đồng với dữ liệu giả lập (PHASE-003 ◐). **Chưa có máy chủ** (PHASE-016 / 007). Bản đang chạy của Open CRM là plugin WordPress [`open-crm`](https://github.com/hoanganh8389/open-crm); hai bản song song theo [BIZCITY OPEN CANON §10](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/BIZCITY-OPEN-CANON-v1.md) (ở open-hub).

## Chạy thử

<!-- [2026-11-24 08:16 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — có API + Postgres; danh mục chạy máy chủ thật, màn khác còn giả lập. -->

```bash
npm install
npm test            # hợp đồng + bộ giả lập; thêm TEST_DATABASE_URL=postgres://… để chạy cả test tích hợp API trên Postgres
npm run typecheck
npm run web:dev     # http://localhost:5173/#/inbox — ?mock=empty|error|denied|slow xem 4 trạng thái
```

Màn: `#/inbox` · `#/contacts` · `#/contacts/01JDAC00000000000000000001` (Contact 360 ca vàng Facebook) · `#/catalog` · `#/channels` · `#/dashboard` · `#/settings`.

**Bằng Docker** — web + api + Postgres (cạnh ketoan / okt-* trên cùng máy):

```bash
cp .env.example .env            # đặt JWT_SECRET (bắt buộc — nền chặn khoá mặc định)
docker compose up -d --build    # db · db-migrate (nền @bizcity/platform + open-cake, gieo dữ liệu GIẢ LẬP) · api · web
# http://127.0.0.1:8110/?api=mix#/catalog   Hàng hoá chạy máy chủ thật, màn khác còn giả lập
# http://127.0.0.1:8110/#/inbox             toàn bộ giả lập (như trước)
# http://127.0.0.1:8120/api/v1/system/health/ready   API trực tiếp
```

`?api=`: không có = giả lập · `mix` = năng lực đã có máy chủ (`cake.catalog`) đi API · `http` = mọi màn đi API (màn chưa có máy chủ báo `CAKE_NOT_ON_SERVER`). Ảnh `open-cake-web` chạy lại test + typecheck khi build. API dựng trên `@bizcity/platform` [v0.2.0](https://github.com/hoanganh8389/bizcity-platform/releases/tag/v0.2.0).

## Đọc theo thứ tự

| Tài liệu | Một câu |
|---|---|
| [**Canon chung ở open-hub**](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/README.md) | **nguyên tắc chung giữa mọi repo Bizcity** (bản chủ ở repo điều phối open-hub; thêm mô hình B2B, hai repo điều phối open-hub / open-setup, chuẩn tái sử dụng năng lực, chuẩn dữ liệu trục cứng + lớp mềm) — vì sao (per-agent, mã mở + dịch vụ), lời hứa thị trường, một app một trục, **bốn trục dữ liệu** (Master Data · Document · Accounting Events · Contact 360), Twin Brain kiểm chứng, hợp đồng `bizcity_*@N`, chuẩn REST / React / quan sát chung, hai bản song song, nghiệm thu hệ |
| [docs/00-CANON.md](docs/00-CANON.md) | bốn câu không phá, luật `R-CAKE-*`, bảng luật kế thừa từ open-ketoan, bản đồ tài liệu |
| [docs/architecture/](docs/architecture/10-ARCHITECTURE.md) | 10 tổng thể · 20 trục dữ liệu · 30 quan sát (Loki · Prometheus · Tempo · Grafana · Redis) · 40 người dùng & bảo mật · 50 triển khai Docker · 60 giao diện · 70 REST nội bộ · 80 React · 90 bài học từ open-ketoan |
| [docs/contracts/](docs/contracts/README.md) | `bizcity_touch@1` · `bizcity_channel_command@1` · `bizcity_contact@1` |
| [docs/phases/](docs/phases/README.md) | lộ trình PHASE-001…015, đường găng, golden case Facebook G1–G8 |
| [docs/ui/](docs/ui/mockup-shots/) | 11 ảnh giao diện chủ duyệt + mã bản mẫu React |
| [docs/reference/open-crm-wp/](docs/reference/open-crm-wp/README.md) | thiết kế gốc của Open CRM bản WordPress (sổ chăm sóc, kernel, UI lean) |
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
