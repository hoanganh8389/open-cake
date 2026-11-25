# PHASE-007 — Giao diện nối dữ liệu thật: đổi adapter giả lập → http, SSE realtime (màn đã dựng ở PHASE-003)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->
<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — màn lõi dựng ở PHASE-003 trên hợp đồng + giả lập; phase này chỉ nối backend thật (adapter http, SSE), giữ bảng đầu ra cũ làm danh sách kiểm. -->

> **Việc lộ trình:** W2 · **Áp dụng cho:** cake · **Trạng thái:** ◐ 2026-11-25 — mọi việc không cần kênh thật đã xong (đọc + ghi không Cell, R-WEB-8..11, 15, S007-8, SC-CAKE-WEB-1..3); còn gửi tin / trả lời bình luận (006, 008), Contact 360 hiện tin Zalo thật (006), chọn nhiều + gắn nhãn hàng loạt ở Danh bạ · **Phụ thuộc:** 004, 005, 006
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
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
| `?api=mix` theo `GET /api/v1/system/actions` (20 / 32 action) | ☑ | không viết cứng năng lực ở web |
| Ghi không cần Cell: gắn / gỡ nhãn, giao hội thoại, ghép (bằng chứng bắt buộc), tách — qua kernel (`tagContact`, `assignConversation`, `mergeContacts`, `unmergeContact`), mỗi lệnh có dòng sổ | ☑ | 11 kịch bản kernel trên bộ nhớ + Postgres; test HTTP (ghép theo tên bị chặn cả ở web lẫn máy chủ); ảnh `api-gan-nhan-sau-tai-lai` (nhãn còn sau khi tải lại) |
| Lớp mềm `core.record.*` (tin nhắn nhanh, nhãn, tài khoản ngân hàng) | ☑ máy chủ (`apps/api/src/records.ts`) | <!-- [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> kiểm `data` bằng chính `recordDataSchema` của form; quyền riêng từng loại; lưu trữ không xoá; `record_types` chép từ registry sau mỗi lần migrate (`syncRecordTypes`) — `apps/api/test/records.http.test.ts`. Còn 7 action chưa có máy chủ: 4 cần Cell (kết nối, gửi thử, gửi tin, trả lời bình luận — 006 / 008), 3 liên kết khách với Kế Toán (`contact.lookup / resolve / link` — 010) |
| Gửi tin, trả lời bình luận | ☐ | cần Cell / Hub (PHASE-006, 008) — 501 `CAKE_NOT_ON_SERVER` |
| R-WEB-8 `ErrorBoundary` | ☑ | biên lỗi ở Shell + mỗi màn (đổi màn là thử lại), màn lỗi = `State` sẵn có kèm `errFp`; báo về `POST /api/v1/system/client-errors` (cần phiên, ≤ 10 / phút / người, một dòng log, không nội dung tin) — test 401 / 400 / 429 |
| R-WEB-9 realtime (S007-2 SSE) | ☑ | <!-- [2026-11-25 10:08 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> mỗi lệnh ghi / tin vào gọi `pg_notify` **trong giao dịch** (chỉ phát khi commit, đúng khi nhiều bản API) với payload `{đơn vị, năng lực}` — không dữ liệu; `GET /api/v1/stream` (cần phiên, nhịp 25 s, đóng sau 10 phút) ⇒ web gộp 500 ms rồi làm mới truy vấn đang hiện, nối lại giãn 3 → 30 s. Đọc bằng `fetch` + `Authorization` thay `EventSource` (EventSource buộc token trên URL). Test qua cổng mạng thật: 401, lệnh lỗi không phát, lệnh đúng phát `{"caps":["cake.flex"]}` |
| R-WEB-10 cuộn vô hạn | ☑ | <!-- [2026-11-25 10:41 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> con trỏ keyset `(thời điểm, id)` cho hội thoại (mới → cũ) và tin (trang mới nhất trước, lùi về cũ), `meta.nextCursor`; con trỏ hỏng ⇒ 400; lọc nhãn chuyển vào SQL. Web: `useInfiniteQueryAction` + `LoadMore` (IntersectionObserver + nút), 50 dòng / trang; khung chat giữ chỗ đang đọc khi chèn tin cũ. "Ảo hoá" = CSS `content-visibility` trên dòng hội thoại (không thư viện); **không** áp cho bong bóng tin (làm lệch cuộn cuối — đã thấy ở ảnh). **Danh bạ giữ phân trang theo trang** (bảng 50 dòng + Pager) — khác luật, có chủ ý. Test: đi hết trang bằng `limit 1` khớp danh sách đầy đủ. Ảnh `cuon-con-tro-hop-thu` (giả lập ít dữ liệu nên chưa hiện nút tải thêm) |
| R-WEB-15 bàn phím hộp thư | ☑ | <!-- [2026-11-25 10:41 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> ↑/↓ chọn hội thoại, Enter vào ô soạn, `/` vào ô tìm (ô tìm thành ô nhập thật, từ khoá trên URL), Esc rời ô; không bắt phím khi đang gõ; `aria-selected` / `aria-label` cho dòng và nút biểu tượng. Kiểm trên **Chrome thật** bằng `playwright-core` (dùng Chrome đã cài): `npm run ui:hop-thu` — 9 / 9 ĐẠT; ảnh `phim-tim-hop-thu` |
| R-WEB-11 tệp ngôn ngữ | ☑ | <!-- [2026-11-25 12:12 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> mọi chữ hiển thị của web ở `apps/web/src/i18n/vi/{app,inbox,catalog,staff}.ts` (~400 khoá), của ui-kit ở `packages/ui-kit/src/vi.ts`; từ điển TypeScript `as const` (không thư viện — thiếu khoá là lỗi biên dịch), chữ có dữ liệu là hàm; giá trị là dữ liệu (tên nhãn, Nữ / Nam, ĐVT "Cái") giữ nguyên văn. Test chặn `apps/web/test/i18n.test.ts`: còn ký tự có dấu ngoài tệp ngôn ngữ (bỏ chú thích) ⇒ trượt kèm tệp:dòng. Các màn chụp lại giống trước; kịch bản Chrome 9 / 9. Còn: tên đơn vị "Shop Hoa Mai" trên thanh tiêu đề viết cứng — nên lấy từ phiên |
| S007-8 chụp tự động + so ảnh chuẩn | ☑ | <!-- [2026-11-25 12:31 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> `npm run ui:chup` (`tests/ui/chup-man.mjs`, Chrome thật qua `playwright-core`): 4 màn có ảnh chuẩn, đếm **phần tử chính rút từ chính ảnh chuẩn** (không so điểm ảnh — ảnh chuẩn là bản vẽ), phần tử của phase sau ghi rõ và không tính: **hộp thư 17/17 · danh bạ 12/13 (92 %) · tổng quan 8/8 · bốn trạng thái 6/6** — đạt ≥ 90 %. Để đạt: thêm tên thật dưới tên khách (hợp đồng `realName`), ô tìm tài khoản ở Tổng quan, thẻ "Cần cài …" + bộ thành phần ở Bốn trạng thái. **Còn thiếu: chọn nhiều + gắn nhãn hàng loạt ở Danh bạ** (S007-4) — kernel chỉ gắn nhãn qua hội thoại, cần một lệnh kernel mới. Ảnh `auto-inbox`, `auto-contacts`, `auto-dashboard`, `auto-states` |
| SC-CAKE-WEB-1..3 | ☑ | `apps/web/test/sc-cake-web.test.ts`: chỉ import react / gói @open-cake cho phép; không alert / confirm / prompt; không màu hex trong `.tsx` (sửa một chỗ: dấu ghim hộp thư dùng `var(--destructive)`) |
| Gửi tin thật qua Hub (S007-3) + Gửi thử kết nối (S007-6) | ◐ máy chủ (`apps/api/src/care/send.ts`) | <!-- [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 --> `cake.message.send` + `cake.channel.test` có máy chủ (PHASE-006 S006-3/S006-6); bong bóng hiện đang gửi / gửi lỗi / chưa rõ đã gửi / đã nhận / đã xem, tin lỗi hoặc chưa rõ có nút **Gửi lại** (tin mới, khoá mới). **Còn:** chạy với Hub + Cell thật; `channel.connect_start` (sheet Kết nối 4 bước — cần hợp đồng luồng QR của Hub, chưa có); trả lời bình luận (008); gửi ảnh / tệp cần chỗ tải tệp (thân lệnh đã mang `attachments`) |

## Nợ chờ nhận

<!-- [2026-11-25 01:14 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — chủ chốt: ghi NỢ, để dev khác nhận sau. -->

### NỢ-007-1 — Danh bạ: chọn nhiều + "Thao tác" gắn / gỡ nhãn hàng loạt (S007-4)

Nhận việc: điền tên + nhánh vào dòng NỢ-007-1 ở [CLAIMS](../CLAIMS.md) trước khi làm.

**Vì sao còn nợ.** Ảnh chuẩn [contacts.png](../../ui/mockup-shots/contacts.png) (đã duyệt) có ô chọn từng dòng, ô "chọn trang này" và nút **Thao tác ▾**. Kernel hiện chỉ gắn nhãn **qua hội thoại** (`tagContact({ conversationId, … })` trong `packages/care-kernel/src/commands.ts`); khách có thể chưa có hội thoại, và gắn theo lô cần một lệnh kernel mới — thay đổi ở lõi (mức K3), không chỉ giao diện. `npm run ui:chup` đang báo Danh bạ 12/13, thiếu đúng ô này.

**Đã kiểm sẵn.** `touch_ledger.conversation_id` cho phép NULL và cột `kind` đã có giá trị `'tag'` (migration 0101) ⇒ **không cần đổi lược đồ**.

**Làm:**

1. **Kernel** — thêm `tagContacts(deps, { contactIds, add, remove, actor })` cạnh `tagContact`: với mỗi khách, tính thay đổi so với `contact_state.tags`; ghi MỘT sự kiện `contact.tagged` (`docKey = tag|contact|<contactId>|<at>`, `conversation_id` NULL) + dòng sổ `kind = 'tag'`; cập nhật `contact_state` trong cùng giao dịch — đúng khuôn `tagContact`. Khách đã ghép (`merged_into`) ⇒ áp cho khách đích. Không có thay đổi ⇒ không ghi gì. Chạy trên **cả** MemoryRepo và PgCareRepo (`packages/care-kernel/test/scenarios.ts`).
2. **Hợp đồng** — `cake.contact.tag_bulk`: `POST /api/v1/contacts/tags`; vào `{ contactIds: ContactId[] (1–200), add: string[], remove: string[] }`, ra `{ changed: number }`; `permission: 'cake:contacts-sua'`, `risk: 'medium'`, `idempotent: true`, `emits: ['bizcity.cake.contact.tagged']`. Cập nhật số action ở 2 test của `packages/contracts/test`.
3. **Máy chủ** — handler trong `apps/api/src/care/commands.ts` (bằng chứng `audit_logs` và gợi ý realtime đã tự có qua `runCommand`).
4. **Giả lập** — `packages/action-client/src/mock/handlers-contacts.ts`, cùng luật với máy chủ.
5. **Web** — `apps/web/src/screens/Contacts.tsx` theo ảnh chuẩn: cột ô chọn + "Trang này (n)" chọn cả trang; **Thao tác ▾** (Gắn nhãn… / Gỡ nhãn…) mở sheet chọn nhãn từ `TAG_LOOK`; khoá nút kèm lý do khi thiếu `cake:contacts-sua` (R-WEB-7); chữ vào `apps/web/src/i18n/vi/inbox.ts` (test i18n chặn chữ viết thẳng); tệp < 200 dòng (tách nếu cần).
6. **Kiểm** — test kernel (2 kho); test HTTP (quyền, tối đa 200 khách, gửi lặp không ghi thêm); `npm run ui:chup` ⇒ Danh bạ **13/13** (sửa bộ chọn trong `tests/ui/chup-man.mjs` nếu đổi markup).

**Xong khi:** gắn 1 nhãn cho 3 khách ⇒ đúng 3 dòng sổ; gửi lặp ⇒ 0 dòng mới; nhãn hiện ngay trên Danh bạ và Hộp thư (gợi ý realtime); Danh bạ 13/13.

## Xong khi

Ảnh build 4 màn có ảnh chuẩn đạt ≥ 90 % phần tử chính; Contact 360 hiện tin Zalo thật từ 006; SC-CAKE-WEB-1..3 PASS.
