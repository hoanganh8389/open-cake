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

## 2. Phân quyền — chuẩn (R-CAKE-AUTHZ)

<!-- [2026-11-24 10:14 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — chuẩn hoá theo @bizcity/platform 0.2.0 (core/auth, core/roles, core/security/role-assignments) và bizcity_authorization@1 / ADR-0027 của open-ketoan: vai + ma trận, đăng ký bằng hook, người dùng kiểu WordPress. Chủ duyệt mockup 2026-11-24. -->

Cake **không** có bộ tính quyền riêng: mọi thứ dưới đây là cổng của nền, Cake chỉ khai.

### 2.1 Ba lớp

| Lớp | Lưu ở | Khai / đổi bằng | Ai |
|---|---|---|---|
| **Sổ quyền** | trong mã | hook `registerModulePermissions('cake' \| 'core', …)` lúc khởi động — quyền Cake **sinh** từ action spec (`permission`, `risk`) + registry lớp mềm, một nguồn (R-CANON-14) | lập trình viên, qua PR |
| **Vai hệ thống** | trong mã | hook `registerRoles('cake', …)`; `owner` thuộc nền (mọi quyền); khoá API: `registerApiScopes` | lập trình viên — màn chỉ xem |
| **Vai riêng của đơn vị** | `tenant_roles` (dựa trên **một** vai hệ thống, không bao giờ `owner`) + `tenant_role_rules` (Cho đích danh / Cấm, được dùng `*`) | màn **Cài đặt › Vai & quyền** (ma trận) | quyền `settings:write` (chủ) |
| **Người dùng** | `users` (một vai chính `users.role`) + `user_role_assignments` (vai thêm / vai riêng) + `channel_account_members` (phạm vi dữ liệu) | màn **Cài đặt › Nhân viên** | quyền `users:write` (chủ, quản lý) |

**Quyền hiệu lực** (nền tính, đệm theo `tenants.authz_version`) = (vai chính ∪ vai thêm ∪ vai nền của vai riêng + Cho) − Cấm. **Cấm luôn thắng.** Quyền là "được làm việc gì"; **phạm vi** (§2.4) là "trên dữ liệu nào" — hai trục độc lập.

### 2.2 Luật

| Mã | Luật |
|---|---|
| R-CAKE-AUTHZ-1 | Tên quyền `<module>:<chức-năng>-<việc>` (`xem · lap · sua · xoa · gop · xuat · gia · duyet`); quyền nền giữ tên của nền (`users:write`, `settings:write`, `reports:read`…), **không** đặt lại tên Cake cho việc nền đã có. |
| R-CAKE-AUTHZ-2 | Mỗi action khai đúng **một** `permission` + `risk`; route sinh từ spec tự gắn `requirePermission`. Rủi ro của quyền = mức cao nhất trong các action dùng nó. Không kiểm quyền rải rác trong handler — ngoại lệ duy nhất là **phạm vi** (`care/scope.ts`). |
| R-CAKE-AUTHZ-3 | Quyền ⚠ (`risk: high`) không bao giờ vào khoá API / AI (nền lọc) và không vào vai `agent`, `marketer`, `viewer`, `auditor`, `developer`. |
| R-CAKE-AUTHZ-4 | Vai hệ thống chỉ đổi bằng PR (sửa `registerRoles`); đơn vị muốn khác thì tạo **vai riêng**. Vai riêng không xoá — tắt bằng `is_active`; đổi vai nền = tạo vai mới. |
| R-CAKE-AUTHZ-5 | Người có `users:write` **không** cấp, sửa, ngưng vai `owner`, và không cấp vai / vai riêng có quyền mà chính mình không có. Chủ cuối cùng không ngưng được. |
| R-CAKE-AUTHZ-6 | Mọi thay đổi vai, luật, lần gán, thành viên tài khoản kênh là lệnh ghi ⇒ một dòng `audit_logs` (§4). |
| R-CAKE-AUTHZ-7 | Giao diện khoá nút **kèm lý do** theo `/api/v1/auth/me` (R-WEB-7); máy chủ vẫn kiểm lại mọi lệnh. |

### 2.3 Sổ quyền hiện có và vai hệ thống

Nguồn sự thật: `apps/api/src/auth/authz.ts` (sinh từ `ALL_ACTIONS`). Bảng dưới là ảnh chụp để đọc — lệch với mã thì mã đúng.

| Quyền | ⚠ | owner | manager | agent | marketer | viewer · auditor · developer |
|---|---|---|---|---|---|---|
| `cake:inbox-xem` · `cake:inbox-lap` | | ✓ | ✓ | ✓ | | |
| `cake:all-inbox-xem` | ⚠ | ✓ | ✓ | | | |
| `cake:contacts-xem` · `cake:contacts-sua` | | ✓ | ✓ | ✓ | ✓ | xem |
| `cake:contacts-gop` (`cake:contacts-xuat` khai khi có action xuất danh bạ — sổ quyền sinh từ action, chưa có thì chưa có quyền) | ⚠ | ✓ | ✓ | | | |
| `cake:catalog-xem` · `-lap` · `-sua` · `-gia` | | ✓ | ✓ | xem | ✓ | xem |
| `cake:channels-xem` | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `cake:channels-lap` · `cake:channels-xoa` (kết nối kênh) | ⚠ | ✓ | | | | |
| `users:write` (mời, đổi vai, ngưng, giao tài khoản kênh) | ⚠ | ✓ | ✓ | | | |
| `settings:write` (vai riêng, cài đặt đơn vị) | ⚠ | ✓ | | | | |
| `reports:read` | | ✓ | ✓ | | | ✓ |

Thêm: `review:read` (auditor), `devtools:read` (developer), `core:records-*` theo registry lớp mềm.

### 2.4 Màn và action (S004-7)

<!-- [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — màn thật theo mockup đã duyệt. -->

| Màn | Action | Quyền | Ghi |
|---|---|---|---|
| **Cài đặt › Nhân viên** (`#/staff`) | `cake.staff.list` · `.invite` · `.update` · `.set_active` | `users:write` | một vai (vai hệ thống hoặc vai riêng) + tài khoản kênh; chọn vai riêng ⇒ `users.role` = vai nền của nó + một lần gán `tenant_role_id` |
| **Cài đặt › Vai & quyền** (`#/staff?tab=roles`) | `cake.role.list` (`users:write`) · `cake.role.create` · `.update` (đổi tên, tắt) · `.rule_set` (Cho / Cấm / bỏ) | `settings:write` | vai riêng có khoá `r-…` (có dấu "-", không bao giờ trùng vai hệ thống) |

Máy chủ (`apps/api/src/auth/staff.ts`) kiểm R-CAKE-AUTHZ-5: không cấp vai `owner`, không sửa / ngưng Chủ, không tự sửa mình, không cấp / sửa người có quyền mình không có. Vai kỹ thuật `auditor`, `developer` không hiện ở màn (vẫn có trong sổ).

### 2.5 Phạm vi xem hội thoại

Nhân viên không có `cake:all-inbox-xem` chỉ thấy hội thoại của **tài khoản kênh được giao** (`channel_account_members`) hoặc hội thoại **giao cho mình** (`assignee_user_id`). Một chỗ quyết: `apps/api/src/care/scope.ts`. Ngoài phạm vi ⇒ 404 (không lộ là có); dòng thời gian khách vẫn hiện chạm nhưng ẩn nội dung tin. Khoá API không có quyền này ⇒ không thấy hội thoại.

## 3. Đăng nhập một mối qua WordPress (SSO) và vòng đời người dùng

### 3.1 Vé

Dùng **chung khuôn vé với open-ketoan** (một plugin WordPress cấp vé cho mọi app): `base64url(JSON).base64url(HMAC-SHA256(JSON, WP_SSO_SECRET))`, JSON `{email, name?, login?, tenant?, aud?, perms?, iat, exp}`, sống ≤ 5 phút, đổi lấy phiên ở `POST /api/v1/auth/wp-sso` (30 lần sai / 15 phút / IP).

### 3.2 Luật SSO

| Mã | Luật |
|---|---|
| R-CAKE-SSO-1 | **Email là người.** WordPress chứng minh danh tính (email, tên, đơn vị); mỗi app giữ một dòng `users` theo (đơn vị, email). Cùng người, cùng email ⇒ cùng một người ở open-ketoan, Cake và các app khác. |
| R-CAKE-SSO-2 | **Một nơi quyết quyền cho mỗi app.** Vé **không có** `perms` ⇒ quyền theo §2 (vai chính + vai thêm + vai riêng, Cho / Cấm) — **chế độ mặc định của Cake**. Vé **có** `perms` ⇒ chế độ "WordPress quản quyền" (như open-ketoan): phiên mang đúng `perms ∩ sổ quyền`, ma trận của app **không áp** cho phiên đó (kể cả Cấm — giới hạn hiện tại của nền, PHASE-028 F8). Plugin không được gửi `perms` của app này sang app khác. |
| R-CAKE-SSO-3 | **Vé đúng app.** Mỗi app một `WP_SSO_SECRET` riêng; vé có `aud` khác `cake` bị từ chối. |
| R-CAKE-SSO-4 | **Mời trước, vào sau.** Mời ở Cake tạo sẵn `users` (email, tên, vai, tài khoản kênh); lần SSO đầu nhận đúng vai đã mời. Email chưa mời vào lần đầu ⇒ tạo với vai `viewer` (không đọc nội dung tin), như open-ketoan. |
| R-CAKE-SSO-5 | **Ứng dụng có quyền chặn cuối.** Ngưng ở Cake (`is_active=false`, `session_version`++) ⇒ vé WordPress hợp lệ vẫn bị từ chối, phiên đang mở hết hiệu lực ngay yêu cầu kế tiếp. Gỡ ở WordPress ⇒ không cấp vé mới; phiên đang mở hết theo `JWT_TTL_HOURS` hoặc khi ngưng ở app. |
| R-CAKE-SSO-6 | **Đổi quyền có hiệu lực ngay.** Đổi vai thêm / vai riêng / luật ⇒ `authz_version`++ (nền tính lại, không cần đăng nhập lại). Đổi **vai chính** (nằm trong phiên) ⇒ `session_version`++ ⇒ người đó tự vào lại qua WordPress. |
| R-CAKE-SSO-7 | Mỗi lần SSO đồng bộ tên hiển thị từ vé và ghi `last_login_at`. Production không có mật khẩu riêng ở Cake; đăng nhập dev chỉ khi `CAKE_DEV_AUTH=1`. |

### 3.3 Vòng đời

Mời (tạo `users` + vai + tài khoản kênh) → vào qua WordPress → hoạt động → **ngưng** (`is_active=false`, `session_version`++, gỡ khỏi tài khoản kênh, hội thoại đang giữ về hàng chung, giữ lịch sử) → bật lại được → **không xoá**.

### 3.4 Việc của nền (đề xuất, chưa làm)

- Đưa `verifyWpTicket` / đổi vé lấy phiên vào `@bizcity/platform` để open-ketoan và Cake dùng **một** mã (hiện Cake chép cùng khuôn).
- Phiên vé-có-`perms` vẫn áp luật Cấm của đơn vị (đóng PHASE-028 F8).
- Đưa R-CAKE-SSO-1..7 lên canon open-hub thành chuẩn chung của mọi app.

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
