# PHASE-008 — Facebook Page: chat Page, comment, private reply (API chính thức)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W3 · **Áp dụng cho:** cake + zalo-hub (Cell) + llm-router · **Trạng thái:** ☐ · **Phụ thuộc:** 006, 007
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** golden G1–G4: một người comment bài Page → được trả lời riêng → chat Messenger Page → để lại số điện thoại, **một `contact_id`**, ghép bằng bằng chứng.

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S008-1 | Cell | nhận webhook Meta (`messages`, `message_reads`, `messaging_postbacks`, `feed`); xác minh chữ ký Meta; token Page trong vault |
| S008-2 | Cell | phát `bizcity_touch@1` `facebook_page` (scope `page:<id>`) và `facebook_comment` (scope `comment:<page_id>`, anchor) |
| S008-3 | Cell | thực thi `message.send`, `comment.reply`, `comment.private_reply` (7 ngày, một lần) |
| S008-4 | cake | `window_until` 24 h + chặn `CAKE_WINDOW_CLOSED`; handshake private reply ⇒ resolver `fb_private_reply` proven |
| S008-5 | cake | hộp thư hiện comment như hội thoại `comment_thread` (bài gốc ở đầu), nút "Trả lời riêng" |
| S008-6 | cake | sheet Kết nối kênh FB Page (OAuth do Cell / Hub làm, Cake chỉ hiện trạng thái) |

## Xong khi

G1–G4 trên một Page thử, `evidence/golden-fb-page-<ngày>.md` (PSID che một phần), một trace mỗi bước.

## Câu hỏi

Q008-1 `from.id` của comment có trùng PSID không — đo trên Page thử, ghi kết quả vào R-CAKE-ID-3.
