# open-cake · 70 — Chuẩn REST nội bộ

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-REST — chủ (2026-11-24): "ghi nhớ thêm cả chuẩn api rest nội bộ … trong framework". Kế thừa bizcity_api@1 1.0.0, bizcity_errors@1, R-API-1..12, R-TEN-1..9 của open-ketoan; thêm quy ước cho route cake, phân trang con trỏ, SSE, ingress. -->

> **Nguồn chuẩn:** open-ketoan `docs/contracts/BIZCITY-API-v1.md`, `BIZCITY-ERRORS-v1.md`, `docs/rules/RULE-API.md`. File này **không đổi** chuẩn đó; chỉ chỉ cách áp vào cake và nêu phần thêm (đánh dấu **+cake**).

## 1. Bề mặt

| Tiền tố | Ai gọi | Xác thực | Hợp đồng |
|---|---|---|---|
| `/api/v1/*` | web, khoá API site, app anh em | JWT / `X-Api-Key` | `bizcity_api@1` |
| `/api/v1/m/<module>/*` | web (module) | JWT | `bizcity_module@1` |
| `/ingress/v1/touch` **+cake** | Hub | khoá dịch vụ + HMAC | `bizcity_touch@1` |
| `/mcp` | Twin Brain | `mcp_…` + `X-BizCity-Principal` | `bizcity_mcp@1` |
| `/_sites/v1/*` | open-setup | `prov_…` trên `SITE_ADMIN_HOST` | `bizcity_site_provisioning@1` |
| `/api/v1/system/*` | Docker, giám sát, web | công khai (health) / JWT | `bizcity_api@1` §system |
| `/metrics` | Prometheus | `METRICS_TOKEN` | — |

`/api/v1` ổn định; phá ⇒ `/api/v2` chạy song song (R-API-7). Route **chỉ** khai bằng Fastify + `fastify-type-provider-zod`; swagger ở `/api/docs` (tắt ở production trừ khi `API_DOCS=1`).

## 2. Phong bì (R-API-1)

```json
{ "ok": true,  "data": { … }, "meta": { "requestId": "r_…", "receipt": { "evidenceId": "…", "hash": "…", "at": "…" } } }
{ "ok": true,  "data": [ … ], "meta": { "requestId": "r_…", "page": 1, "pageSize": 50, "total": 1248 } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Số điện thoại không hợp lệ.",
                          "details": { "reason": "CAKE_PHONE_INVALID", "field": "phone",
                                       "hint": "Nhập 10 số, bắt đầu bằng 0.", "help_code": "cake-phone",
                                       "remedy": { "steps": ["…"], "owner": "user" } },
                          "requestId": "r_…", "traceId": "4bf9…" } }
```

- **Không** `reply.status(...).send(...)` tay (H-REPLY); luôn `throw Errors.validation(...)` / `Errors.conflict(...)` (R-API-2).
- `code` chỉ lấy từ `ERROR_CATALOG` (VALIDATION_ERROR 400 · UNAUTHORIZED 401 · FORBIDDEN 403 · NOT_FOUND 404 · CONFLICT 409 · IDEMPOTENCY_CONFLICT 409 · CAPABILITY_MISSING 501 · MODULE_DISABLED 403 · RATE_LIMITED 429 · NOT_READY 503 · GATEWAY_UNAVAILABLE 503 · INTERNAL_ERROR 500). Lý do riêng cake ở `details.reason` tiền tố `CAKE_` (vd `CAKE_WINDOW_CLOSED`, `CAKE_SEND_CAP_REACHED`, `CAKE_IDENTITY_CONFLICT`, `CAKE_MERGE_NO_PROOF`, `CAKE_CHANNEL_NOT_CONNECTED`), đăng ký trong `packages/contracts/src/errors.cake.ts` + finding `CAKE-*`.
- 500 không lộ nội bộ: `INTERNAL_ERROR` + `requestId` (R-API-12).

## 3. Đặt tên route và hành động

| Quy ước | Ví dụ |
|---|---|
| danh từ số nhiều, kebab-case, ID trục trong path | `GET /api/v1/contacts/:contactId`, `GET /api/v1/contacts/:contactId/timeline` |
| quan hệ con | `GET /api/v1/conversations/:id/messages` |
| hành động nghiệp vụ không phải CRUD ⇒ `POST …/:id/<động-từ>` gọi **action** | `POST /api/v1/contacts/:id/merge`, `POST /api/v1/contacts/:id/unmerge`, `POST /api/v1/conversations/:id/assign`, `POST /api/v1/channels/:id/test` |
| mỗi route ghi = một `defineAction` (`cake.<thực thể>.<việc>`) chạy qua `runAction` ⇒ quyền, idempotency, bằng chứng, outbox có sẵn | `cake.message.send`, `cake.contact.merge` |
| `PUT /:code` chỉ cho danh mục theo mã (master data); cake dùng `PATCH` cho sửa một phần | `PATCH /api/v1/contacts/:id` `{displayName}` |

**Không** route ghi nào bỏ qua `runAction` (kiểm SC-CAKE-API-1).

## 4. Đầu vào

- zod ở cửa, schema dùng chung trong `packages/contracts` (R-API-3); bỏ qua trường lạ ở hợp đồng ngoài, **từ chối** trường lạ ở route nội bộ (`.strict()`).
- Ngày giờ ISO 8601 UTC; ngày thuần `YYYY-MM-DD`; tiền là `number` VND (cake hiếm khi có tiền — chỉ hiển thị từ app khác).
- Boolean trong query dùng `queryBool` (R-API-5).
- **Không bao giờ** nhận `tenantId`, `siteId`, `actor` từ body / query (R-TEN-1).
- Trần: thân 1 MB (route thường), 256 KB (ingress), file theo `bizcity_settings` `bizcity.cake.upload_max_mb`.

## 5. Idempotency (R-API-9)

- Mọi POST ghi từ ngoài (khoá API, MCP, Hub) **bắt buộc** `Idempotency-Key` (8–128 ký tự); web tự sinh cho thao tác gửi / ghép.
- `action_requests UNIQUE(tenant_id, action_id, idem_key)` + `request_hash`: cùng khoá + cùng thân ⇒ trả kết quả cũ (`meta.replayed: true`); cùng khoá + khác thân ⇒ 409 `IDEMPOTENCY_CONFLICT`.
- Ingress: khoá = `doc_key` của `bizcity_touch@1`; trùng ⇒ `data.status = "unchanged"`.

## 6. Phân trang

| Loại | Dùng | Hình |
|---|---|---|
| trang số (chuẩn) | danh bạ, chiến dịch, báo cáo | `?page=1&pageSize=50` (trần 200) ⇒ `meta {page, pageSize, total}` |
| **+cake** con trỏ | tin nhắn, dòng thời gian, hội thoại (dài, chèn liên tục) | `?cursor=<opaque>&limit=50` (trần 200) ⇒ `meta {nextCursor, prevCursor}`; con trỏ = base64url `(at, id)` |

Đề xuất đưa con trỏ vào `bizcity_api@1` như minor (Q-API-1).

## 7. Realtime **+cake**

`GET /api/v1/stream` (SSE, JWT) phát `event: touch` `{conversationId, contactId, kind, at}` — **không** nội dung; web nhận rồi `invalidateQueries`. Nhiều bản `api` ⇒ Redis pub/sub; không Redis ⇒ một bản. Ping 25 s; mất kết nối ⇒ web tự nối lại và tải lại trang hiện tại.

## 8. Header

| Vào | Ra |
|---|---|
| `Authorization`, `X-Api-Key`, `X-Request-Id` (giữ nếu có), `Idempotency-Key`, `traceparent`, `X-Bizcity-Contract` (tuỳ chọn) | `X-Request-Id`, `traceparent`, `X-Bizcity-Standard: 1`, `Deprecation` / `Sunset` khi route sắp bỏ |

## 9. Hệ thống

`GET /api/v1/system/health` · `/health/ready` · `/diagnostics` · `/capabilities` (năng lực `cake.*` với `status`, `since`) · `POST /system/client-errors` · `GET /system/devtools/*` (`devtools:read`, AI bị từ chối).

## 10. Kiểm

- Test route đi qua **cửa thật** (`app.inject`) trên DB `cake_test`, mỗi test một đơn vị (`setupTenant`) (R-QG-2, R-QG-3).
- SC-CAKE-API-1 mọi route ghi gọi `runAction` · SC-CAKE-API-2 mọi route có `requirePermission` hoặc `config.public` · SC-CAKE-API-3 không `reply.status` · SC-CAKE-API-4 mọi `details.reason` có trong catalog.
