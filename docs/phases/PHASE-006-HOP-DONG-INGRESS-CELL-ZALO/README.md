# PHASE-006 — Hợp đồng kênh: `bizcity_touch@1` vào, `bizcity_channel_command@1` ra; Zalo cá nhân là kênh đầu
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W2 · **Áp dụng cho:** cake + zalo-hub + llm-router · **Trạng thái:** ☐ · **Phụ thuộc:** 005
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
| S006-3..6 | ☐ | lệnh ra kênh, Cell phát song song, Hub định tuyến — làm cùng zalo-hub / llm-router |

## Xong khi

Một số Zalo thử: 20 tin vào / 20 tin ra đúng trong DB Cake, một trace mỗi lượt (Cell → Hub → Cake); tắt Cake 10 phút ⇒ Hub giữ hàng, bật lại không mất, không trùng; plugin WP cùng số vẫn chạy song song.
