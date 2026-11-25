# Canon và xương sống xuyên app — áp cho open-cake

<!-- [2026-11-24 05:08 PM Johnny Chu - Chu Hoàng Anh] SPINE-1 — thêm chỗ trỏ tới chuẩn xương sống bizcity_spine@1 (bizcity-platform) cạnh chỗ trỏ canon đã có; khai trục của app ở bizcity.app.json. Không đổi mã. -->

| Tài liệu | Ở đâu |
|---|---|
| Canon chung (bản chủ) | [open-hub/docs/canon](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/README.md) — chỗ trỏ cũ: [BIZCITY-OPEN-CANON-v1.md](BIZCITY-OPEN-CANON-v1.md) |
| **Xương sống xuyên app `bizcity_spine@1`** | [bizcity-platform/docs/standard/BIZCITY-SPINE-v1.md](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-SPINE-v1.md) · schema máy đọc `packages/contracts/schema/spine/` |
| Luật của repo này | [docs/00-CANON.md](../00-CANON.md) (R-CAKE-*) |

## App này trong xương sống (`bizcity.app.json` ở gốc repo)

| | |
|---|---|
| Làm chủ | `contact` (`contact_id` ULID, `contact_identities` có `proof`), `touch` (sổ chạm khách, chỉ thêm), chứng từ `cake.<loại>:<id>` |
| Dùng | `tenant` (slug, ví dụ `hoa-mai`), `user` (`sub = wp:<id>` qua SSO), `item` + `uom` (danh mục **cục bộ** chạy một mình, ràng buộc muộn với `item_id` của Kế Toán — R-SPINE-9), `branch` (`branch_code` khi bán), `partner` (gửi `code` = SĐT đã xác minh, không có thì `CAKE-<contact_id>`, vãng lai `KHACH-LE`; lưu `partner_ref` một chiều — R-MD-1) |
| Gửi sau | sự kiện sổ chạm khách qua outbox; `Idempotency-Key = <doc_ref>@<version>` |
| Đối chiếu | `RC-SPINE-partner` (mọi `partner_ref` tra được ở open-ketoan), `RC-SPINE-item`, `RC-SPINE-uom` (hàng / ĐVT đã gắn khớp phiên bản của chủ) |
| Hình thức tham chiếu | app khác nói tới khách của cake bằng `ContactRef {id}` hoặc `{identity: {kind, value, proof}}` — **không bao giờ** bằng tên (R-CANON-3, R-SPINE-2) |

Giai đoạn W1 (chưa có máy chủ): các mục bản sao / outbox / đối chiếu vào ở PHASE-016 cùng DB và API; manifest khai trước để bộ kiểm và trang bizcity.vn thấy đúng vai.

## Kiểm

```bash
node ../bizcity-platform/tools/spine-check.mjs --manifest bizcity.app.json   # SC-SPINE-1, phải ĐẠT
```

Thêm trục mới hay đổi dạng ID: đề xuất ở bizcity-platform (chuẩn §7), không tự làm ở đây.

## Chuẩn nền của hệ (bizcity-platform)

<!-- [2026-11-25 10:04 AM Johnny Chu - Chu Hoàng Anh] STD-2 — trỏ về bản đồ chuẩn nền bizcity_standard_map@1 (bản nháp chờ duyệt) để repo này đi cùng hướng với cả hệ. Không đổi mã. -->

Repo này theo **[bản đồ chuẩn nền `bizcity_standard_map@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/README.md)**: bốn trục dữ liệu (master data, chứng từ, khách 360, người dùng) và mười hai trụ cột kỹ thuật. Bức tranh toàn hệ: [ARCHITECTURE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/ARCHITECTURE.md). Thứ tự luật: canon chung (open-hub) → chuẩn nền (bizcity-platform) → luật của repo này; luật của repo **không được nới** hai tầng trên.

| Việc ở repo này | Chuẩn |
|---|---|
| Khuôn repo, manifest, nếp làm việc | [APP-SKELETON](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-APP-SKELETON-v1.md) |
| API, kiểm đầu vào / đầu ra | [API-PROFILE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-API-PROFILE-v1.md) |
| Người dùng, vai, quyền, đăng nhập một lần | [USERS-ROLES](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-USERS-ROLES-v1.md) · [IDENTITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-IDENTITY-v1.md) |
| Bảo mật · quan sát và truy lỗi · đệm | [SECURITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-SECURITY-v1.md) · [OBSERVABILITY](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-OBSERVABILITY-v1.md) · [CACHE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-CACHE-v1.md) |
| Kiểm thử · phiên bản, migration, sao lưu, nâng cấp | [TESTING](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-TESTING-v1.md) · [RELEASE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-RELEASE-v1.md) |
| Giao diện React (model · view · controller), mockup | [WEB](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-WEB-v1.md) |
| Nhiều site / nhiều CSDL · Hub, khoá, 1API | [MULTISITE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-MULTISITE-v1.md) · [HUB](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-HUB-v1.md) |

Kiểm khuôn repo (mức S0–S3):

```bash
node ../bizcity-platform/tools/standard-check.mjs --repo .
```

Lần kiểm 2026-11-25 còn:

- SC-STD-3 (cảnh báo): `tests/conformance/selfcheck.mjs` — app Node chưa có selfcheck (R-STD-TEST-1)
