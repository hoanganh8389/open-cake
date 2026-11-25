# PHASE-004-NGUOI-DUNG-QUYEN-BANG-CHUNG — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S004-1 | đăng ký quyền `cake:*` + test `phan-quyen-dang-ky` | ☑ |
| S004-2 | vai hệ thống `owner · manager · agent · marketer · viewer · auditor · developer`; vai riêng `tenant_roles` | ☑ |
| S004-3 | JWT `{sub,tid,sid,role,name,sv}`, thu hồi `session_version` / `authz_version`; khoá `kc_…` (băm, hiện một lần, phạm vi) | ☑ |
| S004-4 | SSO `/api/v1/auth/wp-sso` (vé HMAC ≤ 5 phút) — nhúng từ plugin WP / bizcity.vn | ☑ |
| S004-5 | `channel_account_members` + phạm vi xem hội thoại | ☑ |
| S004-6 | `defineAction` + `runAction` + `audit_logs` + `meta.receipt`; `GET /api/v1/evidence/:id` | ☑ |
| S004-7 | màn Cài đặt › Nhân viên theo [ảnh duyệt](../../ui/mockup-shots/settings.png): danh sách, mời, ngưng, giao tài khoản kênh, mục được dùng | ☑ |
