# PHASE-009 — Facebook cá nhân (fbchat-v2) và Group; Ghép / Tách trên màn
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W4 · **Áp dụng cho:** cake + zalo-hub · **Trạng thái:** ☐ · **Phụ thuộc:** 008; mở lại WP PHASE-017 (bridge Go, Q017-1…5)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** golden G5–G6: cùng người nhắn Messenger cá nhân của chủ shop và comment trong Group ⇒ gợi ý cùng người ⇒ nhân viên ghép ⇒ một dòng thời gian.

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S009-1 | zalo-hub | bridge Go fbchat-v2 ở **repo công khai riêng** (AGPL), Cell gọi qua stdio; phát `bizcity_touch@1` `facebook_personal` (scope `global`) |
| S009-2 | Cell | `group_feed` ⇒ `facebook_group` (scope `group:<id>`) |
| S009-3 | cake | gợi ý cùng người (tên + ảnh + thời gian); màn Ghép / Tách với `proof.kind = human` |
| S009-4 | cake | cảnh báo rủi ro tài khoản cá nhân ở bước ② sheet kết nối |

## Xong khi

G5–G6 PASS; không ghép tự động nào giữa `facebook_personal` và PSID; tắt bridge FB không ảnh hưởng Zalo.
