# PHASE-003-UI-UX-TREN-HOP-DONG — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S003-1 | `packages/ui-kit`: token (`tokens.css`), thành phần (Button, Sheet, Field, Table, Avatar, ChannelBadge, Tag, 4 trạng thái) chuyển từ `docs/ui/mockup-src` sang T | ☑ |
| S003-2 | Client action: `ActionClient` (phong bì, `ApiError`, `Idempotency-Key`), `useAction` / `useQueryAction` trên react-query; adapter `mock` (dữ liệu từ fixture PHA | ☑ |
| S003-3 | Khung: thanh tiêu đề, rail tài khoản kênh + 6 mục, thanh trạng thái, điều hướng theo URL | ☑ |
| S003-4 | Hộp thư 3 cột | ☑ |
| S003-5 | Danh bạ | ☑ |
| S003-6 | **Contact 360** (mới): dòng thời gian đa kênh, danh tính + độ tin, Ghép / Tách | ☑ |
| S003-7 | **Kênh** (mới) + sheet Kết nối kênh 4 bước | ☑ |
| S003-8 | Tổng quan tài khoản | ☑ |
| S003-9 | `RecordTypeScreen` tự sinh từ registry lớp mềm (thử với `cake.quick_reply`) | ☑ |
| S003-10 | Ảnh build Playwright → `evidence/build-shots/`, so với ảnh chuẩn | ☑ |
