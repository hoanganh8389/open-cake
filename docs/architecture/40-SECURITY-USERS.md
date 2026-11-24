# open-cake · 40 — Người dùng, quyền, bằng chứng, bảo mật

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-SEC — kế thừa bizcity_authorization@1, R-TEN-1..9, R-SEC-1..12, STD-EVD-1..10, wp-sso của open-ketoan; thêm quyền cake:*, luật PII cho nội dung chat. -->

## 1. Chủ thể (principal)

| Chủ thể | Xác thực | Actor trong bằng chứng | Ghi chú |
|---|---|---|---|
| Nhân viên | JWT HS256 `{sub, tid, sid, role, name, sv, perms?}` (`JWT_TTL_HOURS` 12); đăng nhập mật khẩu (scrypt) hoặc **SSO WordPress** (vé HMAC ≤ 5 phút, `WP_SSO_SECRET`) | `user:<id>` | thu hồi qua `users.session_version`, `tenants.authz_version` |
| Khoá API site | `X-Api-Key: kc_…` băm, một đơn vị, có phạm vi, `revoked_at`, `last_used_at` | `apikey:<id>` | cho POS / Kế Toán gọi Cake; **không** quyền `risk: high` |
| Hub (ingress) | khoá dịch vụ `hub_…` + chữ ký HMAC `X-Bizcity-Signature: t=<ts>,v1=<hmac>` trên thân, lệch ≤ 300 s, nonce chống lặp | `service:hub` (`via: cell:<id>`) | chỉ được `POST /ingress/v1/*` |
| Twin Brain (MCP) | khoá `mcp_…` + `X-BizCity-Principal` (người được uỷ quyền) | `{kind:'ai', via:'mcp:<client>', onBehalfOf, turnId}` | chỉ tool `read` / `propose`; ghi cần `confirm_token` 900 s |
| Provisioning | `Bearer prov_…` trên `SITE_ADMIN_HOST`, danh sách IP | `provisioner:<key>` | chỉ `/_sites/v1` |

## 2. Quyền (đăng ký cùng PR, test `phan-quyen-dang-ky`)

Tên `cake:<chức-năng>-<xem|lap|sua|xoa|huy|duyet|xuat>` (theo `docs/standard/DANG-KY-QUYEN.md` của open-ketoan):

| Quyền | Rủi ro | Vai mặc định |
|---|---|---|
| `cake:inbox-xem` · `cake:inbox-lap` (trả lời) | low · medium | `agent`, `manager`, `owner` |
| `cake:contacts-xem` · `cake:contacts-sua` · `cake:contacts-xuat` | low · low · **high** | `agent` (xem, sửa) · `manager` (+ xuất) |
| `cake:contacts-gop` (ghép / tách người) | **high** | `manager`, `owner` |
| `cake:channels-xem` · `cake:channels-lap` (kết nối kênh) · `cake:channels-xoa` | low · high · high | `owner` |
| `cake:broadcast-lap` · `cake:broadcast-duyet` | medium · **high** | `marketer` · `manager` |
| `cake:reports-xem` | low | `manager`, `viewer` |
| `cake:settings-sua` · `users:write` | high | `owner` |
| `cake:all-inbox-xem` (xem hộp thư mọi tài khoản kênh) | high | `manager`, `owner` |

- **Phạm vi:** nhân viên mặc định chỉ thấy hội thoại của **tài khoản kênh được giao** (`channel_account_members`) hoặc được giao hội thoại (`assignee_user_id`); phạm vi `all | channel_account | team` theo mô hình `bizcity_authorization@1` (scope × purpose × hiệu lực). **Từ chối luôn thắng.**
- Vai hệ thống: `owner`, `manager`, `agent`, `marketer`, `viewer`, `auditor`, `developer`; vai riêng của đơn vị qua `tenant_roles` (chỉ thêm, ngưng bằng `is_active`).
- **Khoá API và AI** không bao giờ có `cake:contacts-gop`, `cake:contacts-xuat`, `cake:channels-*`, `cake:broadcast-duyet`.

## 3. Vòng đời người dùng

Tạo → mời (email / SSO) → hoạt động → **ngưng** (`is_active=false`, thu hồi phiên, giữ lịch sử, gỡ khỏi tài khoản kênh, hội thoại đang giữ chuyển về hàng chung) → không xoá. Chủ cuối cùng không ngưng được. Đổi vai ⇒ `authz_version++` ⇒ mọi phiên tính lại quyền.

## 4. Bằng chứng (STD-EVD-1..10)

- Mỗi hành động ghi = **một** bản ghi `audit_logs` `{actor, action, module, subject, requestId, correlationId, idempotencyKey, inputHash, result, changes{before,after}, prevHash, hash}`; runtime ghi, module chỉ thêm `ctx.evidence.note`.
- `meta.receipt {evidenceId, hash, at}` trả về người gọi; tra `GET /api/v1/evidence/:id`.
- PII trong bằng chứng lưu `sha256:` (số điện thoại, external_id); **không** lưu nội dung tin trong `changes`.
- Xem nội dung một hội thoại của người khác bằng `cake:all-inbox-xem` cũng ghi bằng chứng (`action: cake.inbox.viewed`, lấy mẫu một lần / hội thoại / ngày).

## 5. Dữ liệu cá nhân

| Dữ liệu | Lưu | Ra ngoài |
|---|---|---|
| nội dung tin, file | `messages.body`, kho file theo site; mã hoá ổ đĩa ở mức hạ tầng | không log, không outbox, không metric; MCP R0 chỉ khi người dùng uỷ quyền có `cake:inbox-xem` |
| số điện thoại, email, external_id | `contact_identities` (*pii*) | sự kiện / bằng chứng: `sha256:` |
| khoá E2EE, cookie, token Page | **không bao giờ** (Cell vault) | — |
| xuất danh bạ | `cake:contacts-xuat` (high) + bằng chứng + giới hạn 5 000 dòng / lần | — |
| quyền bị lãng quên | `cake.contact.erase` (owner): xoá nội dung `messages.body`, thay identity bằng băm, **giữ** dòng sổ (đếm) — ECP-13 | — |

## 6. Bảo mật (R-SEC-1..12 áp nguyên)

Không bí mật trong git · scrypt · Kysely tham số hoá, không `sql.raw` với dữ liệu người dùng · zod + trần kích thước ở cửa (ingress ≤ 256 KB, file theo kênh) · RLS lớp hai · API chạy `cake_<slug>_app` không siêu người dùng · **văn bản khách và kết quả AI là dữ liệu, không là lệnh** (R-SEC-7 — đặc biệt quan trọng với CRM: tin nhắn khách có thể chứa "bỏ qua hướng dẫn…") · `npm ci` + audit + action ghim SHA · chỉ mở 443, `CORS_ORIGINS`, HSTS / CSP, webhook HMAC · không khởi động production với `JWT_SECRET` mặc định (R-TEN-7) · sự cố ≤ 72 h.
