# PHASE-004 — Người dùng, quyền `cake:*`, khoá API, SSO WordPress, bằng chứng
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☑ 2026-11-24 (việc SSO của nền ở 40-SECURITY §3.4 để sau — chủ chốt) · **Phụ thuộc:** 002
> **Mục tiêu:** đăng nhập (mật khẩu + SSO từ WordPress), vai và quyền `cake:*`, khoá API site, mọi hành động ghi có một bản ghi bằng chứng hash-chain. Chi tiết: [40-SECURITY-USERS](../../architecture/40-SECURITY-USERS.md).

## Đầu ra

| # | Việc |
|---|---|
| S004-1 | đăng ký quyền `cake:*` + test `phan-quyen-dang-ky` |
| S004-2 | vai hệ thống `owner · manager · agent · marketer · viewer · auditor · developer`; vai riêng `tenant_roles` |
| S004-3 | JWT `{sub,tid,sid,role,name,sv}`, thu hồi `session_version` / `authz_version`; khoá `kc_…` (băm, hiện một lần, phạm vi) |
| S004-4 | SSO `/api/v1/auth/wp-sso` (vé HMAC ≤ 5 phút) — nhúng từ plugin WP / bizcity.vn |
| S004-5 | `channel_account_members` + phạm vi xem hội thoại |
| S004-6 | `defineAction` + `runAction` + `audit_logs` + `meta.receipt`; `GET /api/v1/evidence/:id` |
| S004-7 | màn Cài đặt › Nhân viên theo [ảnh duyệt](../../ui/mockup-shots/settings.png): danh sách, mời, ngưng, giao tài khoản kênh, mục được dùng |

## Tiến độ

<!-- [2026-11-24 09:19 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — đăng nhập + phân quyền chạy trên phiên / authPlugin / cổng vai của @bizcity/platform 0.2.0; vai CSDL ứng dụng. -->

| # | TT | Bằng chứng |
|---|---|---|
| S004-1 | ☑ | quyền `cake:*` + `core:records-*` SINH từ action spec + registry (`apps/api/src/auth/authz.ts`); mỗi route kiểm `requirePermission(spec.permission)` |
| S004-2 | ☑ | 7 vai hệ thống (owner của nền + 6 vai Cake qua `registerRoles`); `cake:inbox-xem` chỉ agent / manager / owner. Vai riêng `tenant_roles` + ma trận Cho / Cấm: màn Vai & quyền (S004-7) |
| S004-3 | ☑ | JWT của nền (`signSession`, thu hồi `session_version`); khoá API băm + phạm vi `cake:read`. **Máy chủ xong** (2026-11-24 11:49 PM): `cake.apikey.list` / `.create` / `.revoke` (`settings:write`) trên `api_keys` của nền — khoá `kc_…` hiện **một lần**, runtime ẩn `secret` khỏi `action_requests` (test kiểm DB không có khoá rõ), thu hồi ⇒ 401 ngay. Màn **Khoá API** (tab thứ ba `#/staff?tab=keys`) theo [mockup đã duyệt](mockup/index.html): ảnh `man-khoa-api`, `man-tao-khoa`, `man-thu-hoi-khoa` (bản giả lập; sheet hiện khoá một lần chỉ tới được sau khi tạo — hành vi kiểm ở test). Màn Nhân viên tách thành `apps/web/src/screens/staff/` (mọi tệp < 200 dòng) |
| S004-4 | ☑ | `POST /api/v1/auth/wp-sso` — **cùng khuôn vé open-ketoan** (một plugin cấp vé cho cả hai), giới hạn 30 lần sai / 15 phút; web `?sso=<vé>`; đăng nhập dev chỉ khi `CAKE_DEV_AUTH=1` |
| (40-SECURITY §6) | ☑ | vai CSDL `cake_app` (NOLOGIN, không siêu người dùng), API `DB_SET_ROLE` ⇒ RLS có hiệu lực: test chứng minh siêu người dùng đọc chéo được còn vai ứng dụng thì không; **toàn bộ 100 test chạy dưới vai này** |
| S004-6 | ☑ | mỗi lệnh ghi = một dòng `audit_logs` (chuỗi băm của nền) cùng giao dịch; thất bại ghi `result_ok=false` sau khi quay lui; gửi lặp ⇒ `meta.replayed`, không thêm; `meta.receipt`; `GET /api/v1/evidence/:id` (`reports:read`); không lưu nội dung, chỉ `sha256` đầu vào — `apps/api/test/evidence.http.test.ts` |
| R-WEB-7 | ☑ | `useCan` + quyền từ `/auth/me`: nút ghi khoá **kèm lý do** (Thêm hàng, giá, Bán trong CRM, lưu hàng, nhãn, gửi / trả lời, Ghép, Tách); ảnh `quyen-viewer-hang-hoa`, `quyen-viewer-hop-thu` |
| S004-5 | ☑ | bảng `channel_account_members` (0104, RLS FORCE); quyền `cake:all-inbox-xem` (rủi ro cao — manager / owner); một chỗ quyết phạm vi `apps/api/src/care/scope.ts`: danh sách kênh / hội thoại lọc theo tài khoản được giao **hoặc** hội thoại được giao; đọc tin, gắn nhãn, giao trên hội thoại ngoài phạm vi ⇒ 404; dòng thời gian vẫn hiện chạm nhưng **ẩn nội dung tin**; `cake.channel.members` / `members_set` (chỉ nhận nhân viên đang hoạt động của đơn vị) — `apps/api/test/scope.http.test.ts` (5 ca) |
| S004-7 | ☑ | màn thật theo [mockup đã duyệt](mockup/index.html): 8 action `cake.staff.*` / `cake.role.*` trên bảng của nền, test `apps/api/test/staff.http.test.ts` (5 ca, Postgres thật, vai ứng dụng); ảnh `man-nhan-vien`, `man-sua-nhan-vien`, `man-moi-nhan-vien`, `man-vai-quyen` (bản giả lập) |

Ảnh: [evidence/build-shots](evidence/build-shots/) `dang-nhap-dev-hop-thu`, `can-dang-nhap`. Test: `apps/api/test/auth.http.test.ts` (6 ca).

## Thiết kế phân quyền (S004-7)

<!-- [2026-11-24 10:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — chủ duyệt mockup; chuẩn nằm MỘT chỗ ở 40-SECURITY §2–3. -->

Chuẩn: [40-SECURITY-USERS §2 Phân quyền (R-CAKE-AUTHZ-1..7)](../../architecture/40-SECURITY-USERS.md#2-phân-quyền--chuẩn-r-cake-authz) và [§3 SSO xuyên suốt (R-CAKE-SSO-1..7)](../../architecture/40-SECURITY-USERS.md#3-đăng-nhập-một-mối-qua-wordpress-sso-và-vòng-đời-người-dùng). Tóm tắt: sổ quyền + vai hệ thống đăng ký bằng hook của nền (như open-ketoan); vai riêng của đơn vị = vai nền + Cho / Cấm (Cấm thắng) ở ma trận; người dùng kiểu WordPress (email là người, một vai chính); quản lý và chủ giao tài khoản kênh (`users:write`), chỉ chủ sửa vai riêng (`settings:write`); mỗi app một nơi quyết quyền (vé không `perms` ⇒ vai của app).

Đã làm theo chuẩn: `cake.channel.members_set` dùng `users:write`; vai quản lý có `users:write`; vé SSO có `aud` khác `cake` bị từ chối; mỗi lần SSO đồng bộ tên + `last_login_at` — test ở `apps/api/test/scope.http.test.ts`.

## Xong khi

Người `agent` không mở được hội thoại của tài khoản kênh không được giao (403 + `DeniedState`); khoá API không gọi được `/contacts/:id/merge`; mỗi thao tác ghi có `meta.receipt`; ngưng người dùng ⇒ phiên cũ bị từ chối ở lần gọi kế tiếp.
