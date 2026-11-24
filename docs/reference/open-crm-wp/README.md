# Bizcity Open CRM

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — tài liệu khởi tạo open-crm: plugin độc lập, sổ chăm sóc chỉ thêm, sự việc vào một cửa, tinh gọn chat + gửi hàng loạt. -->

**Open Customer Care Framework** — lõi chăm sóc khách hàng mở, lấy **sổ chăm sóc (Care Ledger)** làm trái tim. Tập trung một việc: **chăm sóc khách hàng trên nhiều tài khoản Zalo** — chat và gửi hàng loạt.

> Dev không phải tự xây lõi hội thoại. Dev làm giao diện, quy trình ngành, plugin. Kernel Open CRM bảo đảm tin nhắn, người nhận, lượt gửi và dấu vết chăm sóc không sai lệch.

Cùng hệ sinh thái Bizcity, ba dự án độc lập, cùng một nguyên tắc:

| Dự án | Sổ | Trái tim | Repo |
|---|---|---|---|
| Open Kế Toán | sổ cái kế toán | bút toán cân Nợ = Có | `hoanganh8389/bizcity-open-ketoan` |
| Open Kiot | sổ bán lẻ | giao dịch ba chân phải cân | `hoanganh8389/bizcity-open-kiot` |
| **Open CRM** | **sổ chăm sóc** | **mỗi lần chạm khách là một dòng sổ** | `hoanganh8389/bizcity-open-crm` (khởi tạo — Q-OC-1) |

Cả ba: **sổ chỉ thêm**, **sự việc vào một cửa** (event-driven, khoá tự nhiên + phiên bản), **sửa = dòng đảo**, đồng bộ với nhau qua **outbox + hợp đồng có phiên bản**, và mở cho **Zalo Brain (cell)** đọc / báo cáo / đẩy việc / đẩy giấy tờ qua **MCP tools**.

## Đọc theo thứ tự

| Tài liệu | Một câu |
|---|---|
| [00-CANON](00-CANON.md) | mục lục luật `R-OC-*`, thứ bậc, cái gì không được làm |
| [10-ARCHITECTURE](10-ARCHITECTURE.md) | cấu trúc thư mục chuẩn, kernel / platform / modules, luồng sự việc, MCP, đồng bộ với Open Kế Toán / Open Kiot |
| [20-DATA-LEDGER](20-DATA-LEDGER.md) | ít bảng: 7 bảng sổ hội thoại dùng chung + 5 bảng riêng |
| [30-STANDALONE-INSTALL](30-STANDALONE-INSTALL.md) | bật một mình / bật cùng Zalo Brain: ai tạo bảng, ai nhận tin, ma trận 4 ca |
| [40-REDUCTION-CENSUS](40-REDUCTION-CENSUS.md) | từ `bizcity-twin-crm` (43 bảng, 63 mục `includes/`) xuống open-crm: giữ / bỏ / sang add-on |
| [50-UI-LEAN](50-UI-LEAN.md) | giao diện: đen · xám · trắng · đỏ điểm nhấn, chữ to, nút dễ bấm — giống Kho tri thức |
| [90-ROADMAP](90-ROADMAP.md) | giai đoạn P0–P5, các bước khởi tạo repo, checklist |
| [mockups/open-crm-mockup.html](mockups/open-crm-mockup.html) | Hộp thư · Gửi hàng loạt · Kết nối mở rộng · 4 trạng thái |

Phía Zalo Brain (tách khỏi lõi): `bizcity-twin-ai/core/channel-gateway/docs/PHASE-0.156-CRM-OUT-OF-CORE/` (nội bộ).

## Vì sao "Open CRM" và không phải "CRM đủ thứ"

`bizcity-twin-crm` hiện có pipeline, task, SLA, hoá đơn, hợp đồng, email, in quảng cáo, điều phối dịch vụ, Woo… 43 bảng. Phần lớn đó là việc của **Open Kế Toán** (hoá đơn, công nợ), **Open Kiot** (đơn, thanh toán), hoặc của **Automation** (quy trình). Open CRM giữ đúng phần không ai khác làm: **nói chuyện với khách và nhớ đã nói gì**.

<!-- [2026-11-23 07:30 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM PHASES — lộ trình thi công theo phase (001–016) + mockup React Deplao-like: docs/phases/. PHASE-001 D001-3/D001-6 thay 50-UI-LEAN §1 (màu) và §4 (không làm). -->

## Lộ trình thi công

Từ 2026-11-23 việc xây UI/UX và định vị plugin độc lập đi theo phase ở [`../phases/`](../phases/README.md) (PHASE-001 định vị · 002 ngôn ngữ giao diện · 003 khung app · 004–015 mười ba màn theo Deplao · 016 kiểm chứng 90 %). Bản mẫu React: [`../phases/mockups/dist/open-crm-mockup.html`](../phases/mockups/dist/open-crm-mockup.html).
