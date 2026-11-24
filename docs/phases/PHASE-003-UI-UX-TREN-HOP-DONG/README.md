# PHASE-003 — Hình thành UI/UX trên hợp đồng (chạy với dữ liệu giả lập)
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — chủ (2026-11-24): hình thành UI/UX trước; giao diện chạy trên action + schema của PHASE-002 với bộ giả lập, chưa cần backend. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ◐ 2026-11-24 — S003-1..8 xong, S003-10 ảnh build có (Edge headless); còn S003-9 RecordTypeScreen và phép so ≥ 90 % bằng máy · **Phụ thuộc:** 002
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

## Bằng chứng (2026-11-24)
<!-- [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-1..8 xong; ảnh build ở evidence/build-shots/ -->

```text
npx vitest run         → 3 tệp, 38/38 qua (contracts 25 · action-client 13)
npm run typecheck      → 4 gói, 0 lỗi
npm run web:build      → 123 module, js 321 kB (gzip 97 kB), css 28 kB
ảnh build              → msedge --headless=new --window-size=1800,1100, vite preview :4173
```

| Màn | Ảnh build | Ảnh chuẩn | Dữ liệu qua action |
|---|---|---|---|
| Hộp thư | [inbox](evidence/build-shots/inbox.png) · [bình luận](evidence/build-shots/inbox-comment.png) · [trống](evidence/build-shots/inbox-empty.png) | [inbox](../../ui/mockup-shots/inbox.png) | `cake.conversation.list`, `cake.message.list`, `cake.message.send`, `cake.comment.reply`, `cake.conversation.tag`, `cake.contact.get` |
| Danh bạ | [contacts](evidence/build-shots/contacts.png) · [lỗi](evidence/build-shots/contacts-error.png) · [không quyền](evidence/build-shots/contacts-denied.png) | [contacts](../../ui/mockup-shots/contacts.png) | `cake.contact.list` |
| **Contact 360** (mới) | [contact-360](evidence/build-shots/contact-360.png) | — | `cake.contact.get`, `cake.contact.timeline`, `cake.contact.suggestions`, `cake.contact.merge`, `cake.contact.unmerge` |
| **Kênh** (mới) | [channels](evidence/build-shots/channels.png) · [kết nối](evidence/build-shots/channels-connect.png) | — | `cake.channel.list`, `cake.channel.connect_start`, `cake.channel.test` |
| Tổng quan | [dashboard](evidence/build-shots/dashboard.png) | [dashboard](../../ui/mockup-shots/dashboard.png) | `cake.channel.list` |
| Bốn trạng thái | [states](evidence/build-shots/states.png) | [states](../../ui/mockup-shots/states.png) | — |

**Ca vàng chạy được trên giao diện:** Contact 360 của Chị Hương hiện một dòng thời gian gồm bình luận Facebook → trả lời riêng → ghép Messenger Page bằng bằng chứng trả lời riêng → tin Fanpage → tin Zalo → nhãn → yêu cầu đặt hàng `cake.order_request:1`; danh tính chưa xác minh in nghiêng; gợi ý "Hương Nguyễn" (Facebook cá nhân) chỉ là gợi ý, Ghép bắt chọn bằng chứng, Tách lại được.

**Lỗi thật bắt được (đã sửa):** do test — sắp xếp thời gian so chuỗi khi dữ liệu trộn `+07:00` và `Z` (dòng ghép bị xếp sai); do chụp ảnh — bộ mẫu ghi chiều tin cuối sai ở hội thoại bình luận / Fanpage (câu của khách hiện như tin shop) · ngày hiện `24-11` · tab "Của tôi" xuống dòng · nhãn độ tin tràn khung · thanh phân trang hiện "0 liên hệ" khi lỗi.

**Không làm giả:** thanh Send Guard ghi "—" + phase; "Ngắt kết nối" không hiện vì hợp đồng chưa có action; Báo cáo / Chiến dịch / Kịch bản / Công việc / Ứng dụng / Cài đặt hiện thẻ "Chưa có ở bản này" nêu phase; tiêu đề có huy hiệu "Bản giả lập".

**Còn lại:** S003-9 `RecordTypeScreen` tự sinh từ registry lớp mềm · phép so ảnh build với ảnh chuẩn bằng máy (đếm phần tử) · chuỗi giao diện vào `i18n/vi.ts` (R-WEB-11, nợ) · chọn bằng chứng `phone` / `email` khi ghép hiện chưa đối chiếu danh tính thật — máy chủ kiểm ở PHASE-005.
