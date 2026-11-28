# PHASE-006 — Hợp đồng kênh: `bizcity_touch@1` vào, `bizcity_channel_command@1` ra; Zalo cá nhân là kênh đầu
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W2 · **Áp dụng cho:** cake + zalo-hub + llm-router · **Trạng thái:** ◐ 2026-11-28 — phía Cake có mã (cổng nhận HMAC, hàng chờ lệnh gửi, `cake.channel.test`), zalo-hub phát `bizcity_touch@1` (PR #4); **chưa chạy với Cell + Hub thật**, S006-5 (llm-router) ☐ <!-- [2026-11-28 09:58 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — PHASE-006 — đồng bộ README với checklist (1 ☑, 4 ◐, 1 ☐) --> · **Phụ thuộc:** 005
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** một số Zalo cá nhân thật (Cell zalo-hub) nhắn vào ⇒ dòng sổ trong Cake; nhân viên trả lời ⇒ tin tới Zalo; phát lại không trùng. Kênh đã chạy ổn định nên làm đầu.

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S006-1 | cake | zod `bizcity_touch@1`, `bizcity_channel_command@1` + fixture + `contracts:emit` |
| S006-2 | cake | `POST /ingress/v1/touch` (HMAC, lệch giờ, nonce, trần 256 KB) |
| S006-3 | cake | subscriber `channel-command` → Hub; `delivery.updated` → `submitTouchIn` version+1; `unknown` không gửi lại |
| S006-4 | zalo-hub | phát `bizcity_touch@1` **song song** `inbound_forward` (cờ theo tenant `targets: [wp, cake]`); `traceparent` |
| S006-5 | llm-router | chuyển `/ingress/v1/touch` theo `site_domains.channel_ingress`; `/channel/v1/commands` → Cell; giữ hàng khi site 503 |
| S006-6 | cake | thắng nhỏ: `account.test` gửi thử + nhận lại ⇒ `channel_accounts.tested_at` |

## Tiến độ

<!-- [2026-11-24 08:43 PM Johnny Chu - Chu Hoàng Anh] PHASE-006 — phía Cake của cổng nhận xong; Cell / Hub (zalo-hub, llm-router) chưa đụng. -->

| # | TT | Bằng chứng |
|---|---|---|
| S006-1 | ☑ (PHASE-002) | zod `bizcity_touch@1` + fixture |
| S006-2 | ◐ | `apps/api/src/care/ingress.ts`: khoá dịch vụ + HMAC trên thân thô + lệch ≤ 300 s + trần 256 KB + `X-Bizcity-Contract` ⇒ `submitTouchIn`; 3 test tích hợp. **Còn:** nonce chống lặp (hiện dựa vào idempotency `(source, docKey, version)` của kernel), khoá Hub trong `api_keys` (PHASE-004, đang đọc env) |
| S006-3 | ◐ | <!-- [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 --> phía Cake xong: kernel `requestSend` (1 dòng sổ lúc bấm gửi, tin mang khoá lệnh `cake:<touch>:send:1`); hàng chờ `channel_commands` (0106) ghi CÙNG giao dịch; gọi `POST {CAKE_HUB_URL}/channel/v1/commands` (khoá site, ký thân, Idempotency-Key); mạng / 5xx ⇒ gửi lại cùng khoá mỗi 15 s; 4xx ⇒ gửi lỗi; quá 10 phút ⇒ chưa rõ đã gửi, không tự gửi khoá mới. `delivery.updated` (hints.commandKey) ⇒ đổi trạng thái + gắn mã thật, **không** thêm dòng sổ. Sửa luôn 2 lỗi kernel: báo giao từng cộng thêm một lượt chạm; v2 báo giao từng đảo mất lượt chạm của v1 `message.sent`. Bằng chứng: 3 kịch bản kernel (bộ nhớ + Postgres), `apps/api/test/send.http.test.ts` 5 ca với Hub giả. **Còn:** chạy với Hub thật (S006-5) |
| S006-6 | ◐ | `cake.channel.test` ⇒ lệnh `account.test` tới Hub, Hub nhận ⇒ `tested_at`; <!-- [2026-11-26 11:14 PM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-6 --> `twoWay` giờ là bằng chứng thật trên đúng tài khoản kênh: có tin do LỆNH Cake gửi (dòng channel_commands) mà Cell đã báo delivery sent / delivered / read **và** có tin khách vào qua cổng nhận; tin chủ gõ trên điện thoại không tính; thiếu một chiều ⇒ false (test PG: tài khoản sạch ⇒ false, chỉ chiều vào ⇒ false, tin chủ gõ ⇒ false, đủ ⇒ true). Màn xong hướng dẫn cách có bằng chứng. **Còn:** chạy trên số thật (S018-10) |
| S006-4..5 | ◐ (S006-4) · ☐ (S006-5) | <!-- [2026-11-26 09:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-4 --> **S006-4 có mã trên main zalo-hub (PR #4 merge 4428d82):** phát `bizcity_touch@1` (Zalo + FB cá nhân, sau cờ `targets`), route lệnh `/wp/channel/v1/commands` (gửi, thu hồi, thả tim, đồng bộ danh bạ, tìm theo SĐT, account.test), `delivery.updated`; còn chạy với số thật (S018-10). <!-- [2026-11-26 09:56 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-4 --> Cell: zalo-hub [PHASE-018](https://github.com/hoanganh8389/zalo-hub/pull/4) (W0 tài liệu, chờ chủ D018-1…5) — ánh xạ tin Zalo ↔ hợp đồng + bảng việc phía Hub. Hub (S006-5): bizcity-llm-router [PHASE-0.3](https://github.com/hoanganh8389/bizcity-llm-router/pull/1) (W0 tài liệu, chờ chủ D03-1…4); repo router vừa nhập mã 1.3.4 lên `main` |

## Xong khi

Một số Zalo thử: 20 tin vào / 20 tin ra đúng trong DB Cake, một trace mỗi lượt (Cell → Hub → Cake); tắt Cake 10 phút ⇒ Hub giữ hàng, bật lại không mất, không trùng; plugin WP cùng số vẫn chạy song song.
