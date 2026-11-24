# PHASE-003 — Hình thành UI/UX trên hợp đồng (chạy với dữ liệu giả lập)
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — chủ (2026-11-24): hình thành UI/UX trước; giao diện chạy trên action + schema của PHASE-002 với bộ giả lập, chưa cần backend. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 002
> **Mục tiêu:** `apps/web` chạy được các màn lõi **giống ảnh duyệt** ([docs/ui/mockup-shots](../../ui/mockup-shots/)) nhưng mọi dữ liệu đi qua **client action** đúng hợp đồng (`useAction`, `useQueryAction`) với **bộ giả lập** (mock adapter) — đổi sang backend thật = đổi adapter, không sửa màn.
> **Ngoài phạm vi:** backend, đăng nhập thật, kênh thật.

## Đầu ra

| # | Việc | Ảnh chuẩn |
|---|---|---|
| S003-1 | `packages/ui-kit`: token (`tokens.css`), thành phần (Button, Sheet, Field, Table, Avatar, ChannelBadge, Tag, 4 trạng thái) chuyển từ `docs/ui/mockup-src` sang TSX | [states](../../ui/mockup-shots/states.png) |
| S003-2 | Client action: `ActionClient` (phong bì, `ApiError`, `Idempotency-Key`), `useAction` / `useQueryAction` trên react-query; adapter `mock` (dữ liệu từ fixture PHASE-002, trễ giả, lỗi giả theo cờ URL) và adapter `http` (rỗng, cho 007) | — |
| S003-3 | Khung: thanh tiêu đề, rail tài khoản kênh + 6 mục, thanh trạng thái, điều hướng theo URL | mọi ảnh |
| S003-4 | Hộp thư 3 cột | [inbox](../../ui/mockup-shots/inbox.png) |
| S003-5 | Danh bạ | [contacts](../../ui/mockup-shots/contacts.png) |
| S003-6 | **Contact 360** (mới): dòng thời gian đa kênh, danh tính + độ tin, Ghép / Tách | — |
| S003-7 | **Kênh** (mới) + sheet Kết nối kênh 4 bước | — |
| S003-8 | Tổng quan tài khoản | [dashboard](../../ui/mockup-shots/dashboard.png) |
| S003-9 | `RecordTypeScreen` tự sinh từ registry lớp mềm (thử với `cake.quick_reply`) | — |
| S003-10 | Ảnh build Playwright → `evidence/build-shots/`, so với ảnh chuẩn | — |

## Xong khi

`npm run dev -w apps/web` mở được 6 màn với bộ giả lập; ảnh build 4 màn có ảnh chuẩn đạt ≥ 90 % phần tử chính; không màn nào gọi `fetch` ngoài `ActionClient`; không `alert/confirm/prompt`; mọi màn có đủ 4 trạng thái (bật bằng `?mock=empty|error|denied`).
