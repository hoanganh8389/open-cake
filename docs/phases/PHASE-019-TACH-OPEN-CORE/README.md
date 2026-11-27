# PHASE-019 — Tách open-cake thành open-core + module CRM; áp các chuẩn Universal trước tiên ở đây
<!-- [2026-11-27 09:48 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 — chủ (2026-11-27): open-cake tách thành open-core và module nghiệp vụ CRM; tối ưu các chuẩn Universal từ open-cake trước; tuân stack chung và contract bizcity_workspace@1, bizcity_app_registry@1. -->

> **Việc lộ trình:** W3 · **Áp dụng cho:** cake · bizcity-platform · open-setup · bizcity-web · **Trạng thái:** ◐ — chủ chốt NC-002 Q-OC-1…9 ngày 2026-11-27, bắt đầu S019-1 <!-- [2026-11-27 10:15 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 — chủ chốt Q-OC-1…9 --> · **Phụ thuộc:** 014 (nhiều site), 016 (khung chạy), 018 (nơi lưu tệp)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md).
> **Kiến trúc:** bizcity-platform [NC-002 open-core](https://github.com/hoanganh8389/bizcity-platform/pull/30) · [NC-001 học từ WordPress](https://github.com/hoanganh8389/bizcity-platform/pull/30) (PR #30 của bizcity-platform).
> **Mục tiêu:** open-cake chạy như **một module CRM trên open-core**: máy chủ khung, giao diện khung, kernel (Site Context, Cache, Options, Meta, Records & Hooks, Storage) là phần chung; phần CRM (chạm khách, hộp thư, kênh, đơn, danh mục) là module có manifest. **Không đổi hành vi** trong lúc tách.
> **Ngoài phạm vi:** tính năng CRM mới; open-ketoan nhận open-core (đợt riêng qua R-FLOW của repo đó).

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S019-1 | cake | chuyển npm workspaces → pnpm workspace (Q-OC-6: **PR riêng**, 170 test xanh; sau đó bizcity-platform → open-ketoan); CI, Docker giữ nguyên kết quả |
| S019-2 | cake | ranh giới gói **trong cùng repo** theo NC-002 §8: `core/*` (server, web-shell, ui-kit, action-client, contracts nền) và `modules/crm/*`; kiểm tự động "module không import nội bộ core" |
| S019-3 | bizcity-platform → cake | `SiteContext` (NC-001 P-K1); open-cake đổi `Ctx` hiện tại sang `ctx` của nền — **chặn** tới khi chốt "một nguồn mã nền" (NC-002 §13) |
| S019-4 | bizcity-platform → cake | Universal Cache (P-K2) · Settings (P-K3, `bizcity_settings@1` giữ tên) · Meta + Records (P-K4) — open-cake dùng trước, chuyển `0103_flex.sql` về kernel |
| S019-5 | bizcity-platform → cake | `@bizcity/module-sdk` + manifest `bizcity.module.json`; CRM nạp như module, bật / tắt theo instance |
| S019-6 | bizcity-platform | rút `@bizcity/server` + `@bizcity/web-shell` từ open-cake lên nền; phát hành open-core 1.0 |
| S019-7 | cake | khai `bizcity_app_registry@1` đủ trường (tiền tố `cake_`, tên miền gốc `opencake.net`, URL `/_sites/v1`, module mặc định) |
| S019-8 | open-setup + bizcity-web | `bizcity_workspace@1`, `bizcity_app_instance@1` (tổng quát hoá `Bizcity Ketoan Site`, thêm `product`), API help desk; plugin "Bizcity Workspace" trên bizcity.vn |

## Xong khi

Bộ test hiện có của open-cake (170) xanh nguyên trước và sau mỗi bước; open-cake khởi động từ `@bizcity/server` với module `cake.crm`; tắt module ở một instance ⇒ menu, action, subscriber của CRM biến mất ở instance đó, instance khác không đổi; open-setup tạo được một Workspace có Open Cake + Open Kế Toán từ trang "Workspace của tôi" trên bizcity.vn và đặt lại mật khẩu một người dùng qua help desk.

## Nhật ký

- 2026-11-27: mở phase (chỉ tài liệu), chờ chủ chốt NC-002 §12.
- 2026-11-27: chủ chốt NC-002 Q-OC-1…9 — tên gói `@bizcity/*` (open-core là tên sản phẩm), Workspace / Instance / Tenant, outbox là nguồn, A ngay sẵn sàng B, Redis riêng, pnpm, module `include/workspace/` ở bizcity-web, tên miền `opencake.net` · `openkiot.com` · `openketoan.com` trên Cloudflare, options không gấp. Bắt đầu S019-1.
- 2026-11-27: <!-- [2026-11-27 10:15 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 S019-1 --> **S019-1 ☑ pnpm** — `pnpm-workspace.yaml`, `packageManager: pnpm@9.15.9` (bản 9: pnpm 10 mặc định chặn script cài của esbuild mà vite cần), gói nội bộ `workspace:*`, script gốc `pnpm --filter`, bỏ `package-lock.json`. pnpm bắt ngay **2 phụ thuộc ma** mà npm che: test API dùng `@open-cake/action-client` và `@opentelemetry/sdk-trace` (2.12.0, cùng bản của nền) không khai ⇒ khai `devDependencies` của `apps/api`. Docker: API cài theo `pnpm-lock.yaml` rồi `pnpm deploy --prod` ⇒ ảnh **312 MB (trước 410 MB)**, không phụ thuộc dev, nạp trọn đồ thị module tới `dist/server.js`; web sửa luôn lỗi có sẵn: ảnh chưa chép `bizcity.authz.json` nên bước kiểm luôn trượt. Kiểm: typecheck 0 lỗi, **170/170**, web build, `tests/ui/ket-noi-kenh.mjs` 6 ảnh, selfcheck 9/9, standard-check 0 phát hiện, build được cả hai ảnh.
- 2026-11-27: <!-- [2026-11-27 10:43 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 --> giữ tên settings (`bizcity_settings@1`); link trỏ PR #30 thay vì nhánh; S019-3 chặn bởi NC-002 §13.
