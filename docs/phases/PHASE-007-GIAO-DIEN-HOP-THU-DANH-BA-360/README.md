# PHASE-007 — Giao diện nối dữ liệu thật: đổi adapter giả lập → http, SSE realtime (màn đã dựng ở PHASE-003)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — màn lõi dựng ở PHASE-003 trên hợp đồng + giả lập; phase này chỉ nối backend thật (adapter http, SSE), giữ bảng đầu ra cũ làm danh sách kiểm. -->

> **Việc lộ trình:** W2 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 004, 005, 006
> **Mục tiêu:** 6 màn lõi giống ảnh duyệt ([docs/ui/mockup-shots](../../ui/mockup-shots/)) chạy trên dữ liệu thật. Chi tiết: [60-UI](../../architecture/60-UI.md), [80-REACT](../../architecture/80-REACT.md).

## Đầu ra

| # | Việc | Ảnh chuẩn |
|---|---|---|
| S007-1 | `packages/ui-kit` từ `docs/ui/mockup-src` (TSX, token, Sheet, ChannelBadge, 4 trạng thái) | [states](../../ui/mockup-shots/states.png) |
| S007-2 | Shell: thanh tiêu đề, rail tài khoản kênh + 6 mục, thanh trạng thái Send Guard, SSE `/api/v1/stream` | mọi ảnh |
| S007-3 | Hộp thư 3 cột: danh sách theo tài khoản kênh, tin (con trỏ), thẻ, gửi chữ / ảnh / tệp, gán người | [inbox](../../ui/mockup-shots/inbox.png) |
| S007-4 | Danh bạ: bảng, lọc nhãn / giới tính / sinh nhật, chọn nhiều, gắn nhãn, xuất (quyền cao) | [contacts](../../ui/mockup-shots/contacts.png) |
| S007-5 | **Contact 360**: dòng thời gian mọi kênh, danh tính + độ tin, Ghép / Tách | (mới) |
| S007-6 | **Kênh** + sheet Kết nối kênh 4 bước (Zalo trước) | (mới) |
| S007-7 | Tổng quan tài khoản | [dashboard](../../ui/mockup-shots/dashboard.png) |
| S007-8 | Playwright chụp `evidence/build-shots/` và so với ảnh chuẩn | — |

## Tiến độ

<!-- [2026-11-24 08:43 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — đọc hộp thư / danh bạ / Contact 360 chạy máy chủ thật; web ?api=mix tự lấy danh sách action đã có. -->

| Phần | TT | Bằng chứng |
|---|---|---|
| Đọc: `channel.list`, `conversation.list`, `message.list`, `contact.list`, `contact.get`, `contact.timeline`, `contact.suggestions` | ☑ máy chủ (`apps/api/src/care/inbox.ts`) | test tích hợp G1 qua API; ảnh [evidence/build-shots](evidence/build-shots/) `api-hop-thu`, `api-danh-ba`, `api-contact-360` |
| `?api=mix` theo `GET /api/v1/system/actions` (16 / 32 action) | ☑ | không viết cứng năng lực ở web |
| Ghi: gửi tin, trả lời bình luận, gắn nhãn, giao việc, ghép / tách | ☐ | 501 `CAKE_NOT_ON_SERVER`; gửi tin cần Cell / Hub (PHASE-006, 008); ghép / tách dùng kernel đã có (`mergeContacts`) — việc kế tiếp |
| SSE, cuộn vô hạn + ảo hoá, `ErrorBoundary`, `i18n`, phím tắt (R-WEB-8..11, 15) | ☐ | — |

## Xong khi

Ảnh build 4 màn có ảnh chuẩn đạt ≥ 90 % phần tử chính; Contact 360 hiện tin Zalo thật từ 006; SC-CAKE-WEB-1..3 PASS.
