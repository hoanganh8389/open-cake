# PHASE-004 — Người dùng, quyền `cake:*`, khoá API, SSO WordPress, bằng chứng
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 002
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

## Xong khi

Người `agent` không mở được hội thoại của tài khoản kênh không được giao (403 + `DeniedState`); khoá API không gọi được `/contacts/:id/merge`; mỗi thao tác ghi có `meta.receipt`; ngưng người dùng ⇒ phiên cũ bị từ chối ở lần gọi kế tiếp.
