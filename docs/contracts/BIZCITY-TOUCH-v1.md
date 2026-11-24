# BIZCITY-TOUCH v1 — `bizcity_touch@1`

> **Phiên bản:** 0.1.0-draft · 2026-11-24 · **Trạng thái:** Nháp (đề xuất — chưa có mã) · **Chủ:** open-cake

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] C-TOUCH — một lần chạm khách từ kênh (Cell) vào Cake qua Hub; thay inbound_forward của zalo-hub-bridge cho bản web. -->

## 1. Đường đi

`Cell → Hub (xác thực khoá, tra site, ký) → POST https://<site>/ingress/v1/touch`. Header: `X-Bizcity-Contract: bizcity_touch@1` · `Idempotency-Key: <doc_key>` · `traceparent` · `X-Bizcity-Signature: t=<unix>,v1=<hex hmac-sha256(secret, t + "." + body)>` · `Authorization: Bearer hub_…`.

## 2. Thân

```json
{
  "contract": "bizcity_touch@1",
  "eventId": "01JDA…",
  "type": "message.received",
  "occurredAt": "2026-11-24T08:00:00Z",
  "source": "cell:zalohub-01",
  "docKey": "facebook_page|1234567890|t_2468|m_abc123",
  "version": 1,
  "channel": "facebook_page",
  "channelAccount": { "externalAccountId": "1234567890", "kind": "page" },
  "thread": { "externalThreadId": "t_2468", "kind": "dm", "anchor": null },
  "sender": { "externalId": "2468", "scope": "page:1234567890", "displayName": "Nguyễn Văn A", "avatarRef": null },
  "direction": "inbound",
  "content": { "type": "text", "text": "Còn hàng không shop?", "attachments": [] },
  "hints": { "phone": null, "email": null, "privateReplyOf": null },
  "encryption": { "e2ee": false, "decryptedOnCell": false },
  "delivery": null,
  "history": { "backfill": false, "cursor": null }
}
```

| Trường | Bắt buộc | Luật |
|---|---|---|
| `type` | ✓ | `message.received` · `message.sent` (chủ gửi từ máy khác) · `delivery.updated` · `comment.received` · `comment.replied` · `reaction.added` · `account.status` · `history.sync.completed`. Cell chỉ phát loại có trong `capabilities` của tài khoản |
| `docKey` | ✓ | Cell tạo: `channel|externalAccountId|externalThreadId|externalMessageId` (comment: `…|comment_id`). Bất biến. Thiếu id nguồn ⇒ surrogate băm + `hints.surrogate: true` |
| `version` | ✓ | tăng khi tin được sửa / thu hồi / đổi `delivery` |
| `channel` | ✓ | enum `zalo_personal · zalo_oa · facebook_personal · facebook_page · facebook_comment · facebook_group`; không bao giờ `facebook` trơn |
| `sender.scope` | ✓ | `global` · `page:<id>` · `oa:<id>` · `comment:<page_id>` · `group:<id>` |
| `thread.anchor` | comment | `{postId, commentId, parentId}` |
| `hints.privateReplyOf` | — | comment_id khi tin Page là trả lời của private reply ⇒ resolver ghép `proven` |
| `content.attachments[]` | — | `{type, ref, mime, size, ttlSeconds}` — `ref` là URL có hạn của Cell, **không** khoá E2EE |
| `history.backfill` | — | `true` ⇒ Cake ghi sổ nhưng **không** bắn tự động / thông báo |

**Cấm** trong thân: `contactId`, `tenantId`, `siteId`, cookie, token, khoá.

## 3. Trả lời

```json
{ "ok": true, "data": { "status": "accepted", "touchId": "88123", "contactId": "01JD…" }, "meta": { "requestId": "r_…" } }
```

`status`: `accepted` · `unchanged` (cùng `docKey` + `version`) · lỗi 409 `CONFLICT` reason `CAKE_TOUCH_VERSION_STALE` (version nhỏ hơn) · 400 `VALIDATION_ERROR` · 401 chữ ký sai / lệch giờ > 300 s · 503 `SITE_UPGRADING` (Hub giữ hàng đợi và thử lại). Hub coi 2xx là đã giao; 409 / 400 là cuối, vào dead-letter của Hub.

## 4. Bảo đảm

Ít nhất một lần từ Hub; Cake idempotent theo `(source, docKey, version)`; thứ tự **không** bảo đảm giữa các thread, Cake sắp theo `occurredAt`.

## Changelog

- 0.1.0-draft (2026-11-24): bản đầu.
