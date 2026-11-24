# PHASE-006 — Hợp đồng kênh: `bizcity_touch@1` vào, `bizcity_channel_command@1` ra; Zalo cá nhân là kênh đầu
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W2 · **Áp dụng cho:** cake + zalo-hub + llm-router · **Trạng thái:** ☐ · **Phụ thuộc:** 005
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

## Xong khi

Một số Zalo thử: 20 tin vào / 20 tin ra đúng trong DB Cake, một trace mỗi lượt (Cell → Hub → Cake); tắt Cake 10 phút ⇒ Hub giữ hàng, bật lại không mất, không trùng; plugin WP cùng số vẫn chạy song song.
