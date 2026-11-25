# Nợ chuẩn nền — Open Cake (Open CRM bản web)

<!-- [2026-11-25 05:12 PM Johnny Chu - Chu Hoàng Anh] STD-5 — sinh bởi bizcity-platform tools/no-chuan.mjs (R-STD-9). Sửa nợ ở repo này; thêm / bớt mục "đã biết" thì sửa sổ docs/standard/no-chuan.json bên bizcity-platform rồi sinh lại. -->

> Ngày đo: 2026-11-25 · Repo: `open-cake` · Chuẩn: [bản đồ chuẩn nền `bizcity_standard_map@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/README.md) · Kiến trúc: [ARCHITECTURE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/ARCHITECTURE.md)

Tệp này liệt kê chỗ repo **chưa theo khuôn chung** của hệ. Dev của repo trả dần, mỗi lần một mục, theo nếp giữ chỗ / PR của repo. bizcity-platform giữ khuôn và bộ kiểm; **không ai sửa hộ** và **không nới chuẩn để trả nợ**.

## Định hướng phải giữ khi trả nợ

1. Mỗi app một sổ, một trục; tham chiếu app khác bằng ID của chủ (`item_id`, `doc_ref`, `contact_id`, `sub`), không bịa ID, không đọc CSDL chéo.
2. Người dùng · vai · quyền theo một khuôn ([USERS-ROLES](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-USERS-ROLES-v1.md)): bảng của gói nền, quyền `<module>:<chức-năng>-<động-từ>` tiếng Việt không dấu, từ chối luôn thắng, khoá API không mang quyền rủi ro cao. App tự đứng được không cần Hub; SSO nối sau.
3. Không ghi "xong" khi chưa có phép kiểm chạy được; nợ mới không vào baseline.
4. Đổi thứ dùng chung (hợp đồng, quyền, migration) có chữ chốt trước, có bằng chứng chạy máy trong PR.
5. Mọi ứng dụng 0 đồng; chỉ 1API của Zalo Hub và dịch vụ theo liên hệ tính phí.

## Nợ do bộ kiểm đo (0)

Không có.

## Nợ đã biết từ rà soát (11)

| # | Luật | Việc | Lưu ý | Chuẩn |
|---|---|---|---|---|
| 1 | R-STD-DLV-6 | Thêm cột trạng thái (☐ 🟡 ✅ ⛔) cho từng việc `S<nnn>-n` trong bảng việc của phase (đang chỉ có trạng thái cả phase ở README) để bảng việc đếm được từng việc | bảng việc sinh bằng bizcity-platform `tools/bang-viec.mjs` | [DELIVERY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-DELIVERY-v1.md) |
| 2 | R-STD-DLV-1 | Lập `docs/nghiem-thu/` theo khuôn open-ketoan (README, `_MAU.md`, phiếu theo phân hệ); viết phiếu cho các màn PHASE-004 đã làm và khép bằng biên bản | test `describe` mở đầu bằng mã phiếu | [DELIVERY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-DELIVERY-v1.md) |
| 3 | R-USER-1 | Thêm đăng nhập email + mật khẩu cục bộ (đang chỉ có SSO và `dev-login`) và luồng đặt mật khẩu cho người được mời | app phải tự đứng được khi không có Hub | [USERS-ROLES](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-USERS-ROLES-v1.md) |
| 4 | R-USER-13 | Sinh `bizcity.authz.json` từ sổ đăng ký (`authzManifest()` hoặc test ảnh chụp như open-ketoan `apps/api/test/authz-manifest.test.ts`) và chặn lệch trong test | đo 2026-11-25: 28 quyền, 6 vai, 2 khoá user meta — ĐẠT khuôn | [USERS-ROLES](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-USERS-ROLES-v1.md) |
| 5 | R-STD-2 | Import hợp đồng nền từ `@bizcity/contracts` thay bản chép `packages/contracts/src/base/` (ADR-0003 tạm) | — | [APP-SKELETON](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-APP-SKELETON-v1.md) |
| 6 | R-STD-TEST-1 | Có selfcheck chạy được (`tests/conformance/selfcheck.mjs`), các script `AGENTS.md` đang dẫn (`nhan-viec`, `so-tiep-theo`, `kiem-chuan.sh`) và CI | AGENTS.md hiện trỏ tới công cụ chưa có | [TESTING](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-TESTING-v1.md) |
| 7 | R-STD-SEC-5 | Test dừng khi tên CSDL không có chữ `test` (đang chỉ bỏ qua khi thiếu `TEST_DATABASE_URL`) | — | [SECURITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-SECURITY-v1.md) |
| 8 | R-STD-OBS-1 | OpenTelemetry + `traceparent`, `/metrics` (`bizcity_cake_*`), `infrastructure/monitoring` theo bộ chung (PHASE-016) | — | [OBSERVABILITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-OBSERVABILITY-v1.md) |
| 9 | R-STD-WEB-1 | Dùng facade `@bizcity/ui-kit` (đang `@open-cake/ui-kit`); thêm ErrorBoundary, tệp ngôn ngữ, ảo hoá danh sách dài (R-WEB 6/15 đạt theo tự đánh giá) | thành phần riêng sản phẩm dựng trên facade | [WEB](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-WEB-v1.md) |
| 10 | SC-DOC-1 | Sửa tài liệu lệch mã: 60-UI ghi `cake:contacts:merge` (mã dùng `cake:contacts-gop`); 40 ghi đăng nhập mật khẩu + JWT `sid` (mã chưa có); 80-REACT ghi `@bizcity/ui-kit`, `useUrlState` (mã dùng `@open-cake/ui-kit`, `useRoute`); trạng thái PHASE-004 | — | [APP-SKELETON](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-APP-SKELETON-v1.md) |
| 11 | R-IDENT-3 | (khi bật lại SSO) `aud` = `open-cake` theo `bizcity.app.json`, cột `external_sub`, quyền trong vé là trần (R-USER-12) | SSO để sau theo chủ dự án 2026-11-25 | [IDENTITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-IDENTITY-v1.md) |

## Trả nợ thế nào

1. Chọn một mục; nhận việc theo nếp của repo (giữ chỗ nếu có `docs/phases/CLAIMS.md`).
2. Làm theo chuẩn được dẫn; có phép kiểm hoặc test chứng minh.
3. Chạy lại bộ kiểm (bizcity-platform cạnh repo này):

```bash
node ../bizcity-platform/tools/standard-check.mjs --repo .
node ../bizcity-platform/tools/users-check.mjs --repo .
node ../bizcity-platform/tools/no-chuan.mjs --repo . --write   # sinh lại tệp này
```

4. Mục "đã biết" trả xong: PR nhỏ vào bizcity-platform gỡ mục khỏi [sổ nợ chuẩn nền](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/no-chuan.json), rồi sinh lại tệp này.
