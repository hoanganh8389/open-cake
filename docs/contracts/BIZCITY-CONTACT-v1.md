# BIZCITY-CONTACT v1 — `bizcity_contact@1`

> **Phiên bản:** 0.1.0-draft · 2026-11-24 · **Trạng thái:** Nháp (đề xuất — chưa có mã) · **Chủ:** open-cake

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] C-CONTACT — tra cứu và liên kết con người cho app anh em (POS, Kế Toán, Twin Brain); Cake là chủ contact_id, app khác giữ contact_ref. -->

## 1. Đọc (khoá API site `cake:contacts-xem` hoặc MCP R0)

| Route | Trả |
|---|---|
| `GET /api/v1/contacts/lookup?phone=…|email=…|taxCode=…|channel=…&scope=…&externalId=…` | `{contactId, displayName, status, mergedInto?, confidence}` — chỉ khớp identity **proven** cho phone / email / taxCode |
| `GET /api/v1/contacts/:contactId` | hồ sơ tối thiểu + `links[]` (`{app, kind, refCode, refId}`) + `channels` (đếm) — **không** nội dung tin |
| `GET /api/v1/contacts/:contactId/timeline?cursor=` | dòng sổ (kind, channel, direction, at, docRef?) — nội dung tin chỉ khi người gọi có `cake:inbox-xem` |

`mergedInto` khác rỗng ⇒ bên gọi **phải** đổi tham chiếu sang `contactId` mới (theo sự kiện `bizcity.cake.contact.merged`).

## 2. Ghi liên kết (khoá API app anh em)

`POST /api/v1/contacts/:contactId/links` `{app: "pos", kind: "customer", refCode: "C-0912…", refId: "…"}` + `Idempotency-Key` ⇒ ghi `contact_links` + touch `kind=identity`. App gọi chỉ ghi liên kết **của chính nó**.

`POST /api/v1/contacts/resolve` `{identities: [{channel:"phone", externalId:"0912…"}], displayName}` ⇒ trả contact có sẵn (proven) hoặc **tạo mới** (`asserted`) — dùng cho POS khi khách mua tại quầy.

## 3. Sự kiện (webhook HMAC tới subscriber đăng ký)

`bizcity.cake.contact.created` · `bizcity.cake.contact.merged {from, into}` · `bizcity.cake.contact.unmerged` · `bizcity.cake.contact.partner_linked {contactId, partnerCode}`. `data` không có PII.

## Changelog

- 0.1.0-draft (2026-11-24): bản đầu.
