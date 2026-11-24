# BIZCITY-CHANNEL-COMMAND v1 — `bizcity_channel_command@1`

> **Phiên bản:** 0.1.0-draft · 2026-11-24 · **Trạng thái:** Nháp (đề xuất — chưa có mã) · **Chủ:** open-cake

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] C-CHANNEL-COMMAND — lệnh từ Cake ra kênh qua Hub 1API tới Cell; ba mức trạng thái; hết giờ = unknown, không tự gửi lại. -->

## 1. Đường đi

Subscriber outbox của Cake `channel-command` → `POST {HUB_BASE_URL}/channel/v1/commands` (khoá site `biz-…`, `traceparent`, `Idempotency-Key`) → Hub kiểm gói + quyền site → Cell. Cake **không** gọi Cell trực tiếp.

## 2. Thân

```json
{
  "contract": "bizcity_channel_command@1",
  "operation": "message.send",
  "idempotencyKey": "cake:88123:send:1",
  "channel": "facebook_page",
  "channelAccount": { "cellRef": "acc_9f2", "externalAccountId": "1234567890" },
  "target": { "externalThreadId": "t_2468", "anchor": null },
  "content": { "type": "text", "text": "Dạ còn ạ, chị lấy size nào?", "attachments": [] },
  "options": { "messageTag": null, "quoteExternalMessageId": null },
  "requestedBy": { "kind": "user", "id": "7" }
}
```

| `operation` | Ghi chú |
|---|---|
| `message.send` | Page ngoài 24 h ⇒ Cake đã chặn trước (`CAKE_WINDOW_CLOSED`) trừ khi `options.messageTag` hợp lệ |
| `comment.reply` | `target.anchor.commentId` bắt buộc |
| `comment.private_reply` | một lần / người / comment, trong 7 ngày |
| `thread.mark_read` | |
| `history.sync` | `{cursor, limit}`; kết quả về bằng `bizcity_touch@1` `backfill: true` |
| `account.test` | thắng nhỏ khi kết nối kênh |

`requestedBy` chỉ là siêu dữ liệu bằng chứng; Hub **không** tin nó để cấp quyền.

## 3. Kết quả

Hub trả `202 {accepted: true}` ngay. Kết quả thật về Cake bằng `bizcity_touch@1` `type: delivery.updated` với `delivery: {status: sent|delivered|read|failed|unknown, externalMessageId?, errorCode?}` và cùng `idempotencyKey` trong `hints.commandKey`.

**Luật:** `accepted ≠ sent ≠ delivered`; hết giờ chờ ⇒ `unknown`; **không tự gửi lại** — nhân viên mở hội thoại kiểm rồi bấm gửi lại (khoá mới `:send:2`).

## Changelog

- 0.1.0-draft (2026-11-24): bản đầu.
