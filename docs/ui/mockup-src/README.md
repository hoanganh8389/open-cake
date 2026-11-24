# Open CRM · bản mẫu giao diện (React)

<!-- [2026-11-23 07:30 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM PHASES — bản mẫu React cho 11 màn + 4 trạng thái; token theo Deplao rút gọn; số liệu giả lập. -->

> © 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. Số liệu, tên, số điện thoại, UID là **ví dụ**.

**Mở ngay:** [dist/open-crm-mockup.html](dist/open-crm-mockup.html) — một file HTML (React + CSS đã gộp), mở thẳng bằng trình duyệt.

| Đường dẫn | Màn | Phase |
|---|---|---|
| `#/dashboard` | Tổng quan tài khoản (lưới thẻ, QR thêm số, ngắt kết nối) | 004 |
| `#/inbox` · `#/inbox/sync` | Hộp thư 3 cột · sheet đồng bộ tin từ điện thoại | 006 |
| `#/contacts` | Danh bạ (bảng, lọc, sheet hồ sơ + sổ chăm sóc) | 005 |
| `#/campaigns` | Chiến dịch gửi hàng loạt (danh sách · chi tiết · tạo 3 bước) | 007 |
| `#/reports` | Báo cáo & phân tích | 008 |
| `#/workflow` | Kịch bản tự động (chỗ đặt cho bizcity-automation) + trợ lý thiết kế | 012 |
| `#/integrations` | Kết nối mở rộng | 011 |
| `#/tasks` | Công việc nội bộ (Kanban) | 010 |
| `#/apps` | Ứng dụng, API & Webhook | 013 |
| `#/settings` · `#/settings/cloud` · `#/settings/sendguard` | Cài đặt · Nhân viên · Internet & Đám mây · Trần gửi | 009 · 014 · 015 |
| `#/states` | Bốn trạng thái, thẻ "Cần cài …", bộ thành phần, toast | 002 |

Thanh nhỏ ở giữa thanh tiêu đề chỉ có trong bản mẫu: đổi **màu nhấn** (Xanh Deplao · Đỏ BizCity · Đen) để chủ chọn (Q001-1), và nhảy nhanh tới `#/states`, `#/campaigns`.

## Cấu trúc

```text
mockups/
├── index.html · vite.config.js · package.json
├── src/
│   ├── tokens.css      token màu / chữ / bo góc + CSS của mọi khối (PHASE-002)
│   ├── ui.jsx          Ic (biểu tượng nét), Btn, Badge, Chip, Avatar, Search, Tabs, Card, Kpi, Bar, Sheet, State, Toast, Gate, Pager, StatusBar
│   ├── data.js         số liệu giả lập
│   ├── main.jsx        khung app: TitleBar · Rail (tài khoản + 6 mục) · route theo #/ (PHASE-003)
│   └── screens/        một file một màn
└── dist/open-crm-mockup.html   bản build một file (vite-plugin-singlefile)
```

## Chạy / build

```bash
cd docs/phases/mockups
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/index.html  →  đổi tên thành dist/open-crm-mockup.html
```

Chụp ảnh bằng chứng (Windows, Edge có sẵn):

```bash
F="file:///D:/…/bizcity-twin-crm/docs/phases/mockups/dist/open-crm-mockup.html"
for s in dashboard inbox contacts campaigns workflow integrations reports settings tasks apps states; do
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1800,1100 --virtual-time-budget=4000 --screenshot="docs/phases/evidence/mockup-shots/$s.png" "$F#/$s"
done
```

## Khác Deplao ở đâu (cố ý)

| Deplao | Open CRM (bản mẫu) | Vì sao |
|---|---|---|
| Avatar nhiều màu theo người, huy hiệu kênh màu | avatar xám một màu + chữ, huy hiệu kênh chữ Z / F / B | "ít màu sắc"; màu chỉ cho trạng thái |
| Nhãn nhiều màu (cam, tím, vàng…) | nhãn 4 tông: nhấn · cảnh báo · thành công · viền | cùng lý do; nhãn vẫn phân biệt được |
| Chữ 13–14 px, nút 36 px | chữ 15 px, nút 44 px, tiêu đề 26 px | "to, rõ ràng, dễ bấm" |
| Rail chỉ biểu tượng | rail biểu tượng + nhãn 10 px | "dễ dùng" |
| Gradient nhẹ trên thẻ KPI | thẻ trắng viền xám | không trang trí |
| Trợ lý AI cấu hình API key trong app | trợ lý = Agent Guru của Zalo Brain, Open CRM không giữ khoá | R-OC-BRAIN-1 |
| Cloudflare tunnel cho nhân viên | địa chỉ = chính website WordPress | server-side sẵn online (0.40 §0) |
