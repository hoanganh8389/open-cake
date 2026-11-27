# PHASE-019 — Tách open-cake thành open-core + module CRM; áp các chuẩn Universal trước tiên ở đây
<!-- [2026-11-27 09:48 AM Johnny Chu - Chu Hoàng Anh] PHASE-019 — chủ (2026-11-27): open-cake tách thành open-core và module nghiệp vụ CRM; tối ưu các chuẩn Universal từ open-cake trước; tuân stack chung và contract bizcity_workspace@1, bizcity_app_registry@1. -->

> **Việc lộ trình:** W3 · **Áp dụng cho:** cake · bizcity-platform · open-setup · bizcity-web · **Trạng thái:** ☐ (chờ chủ chốt NC-002 §12) · **Phụ thuộc:** 014 (nhiều site), 016 (khung chạy), 018 (nơi lưu tệp)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md).
> **Kiến trúc:** bizcity-platform [NC-002 open-core](https://github.com/hoanganh8389/bizcity-platform/blob/docs/nc-001-kernel-tu-wordpress/docs/research/NC-002-OPEN-CORE-WORKSPACE-UNIVERSAL.md) · [NC-001 học từ WordPress](https://github.com/hoanganh8389/bizcity-platform/blob/docs/nc-001-kernel-tu-wordpress/docs/research/NC-001-KERNEL-TU-WORDPRESS.md) (PR #30 của bizcity-platform).
> **Mục tiêu:** open-cake chạy như **một module CRM trên open-core**: máy chủ khung, giao diện khung, kernel (Site Context, Cache, Options, Meta, Records & Hooks, Storage) là phần chung; phần CRM (chạm khách, hộp thư, kênh, đơn, danh mục) là module có manifest. **Không đổi hành vi** trong lúc tách.
> **Ngoài phạm vi:** tính năng CRM mới; open-ketoan nhận open-core (đợt riêng qua R-FLOW của repo đó).

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S019-1 | cake | chuyển npm workspaces → pnpm workspace (NC-002 §7, Q-OC-6); CI, Docker giữ nguyên kết quả |
| S019-2 | cake | ranh giới gói **trong cùng repo** theo NC-002 §8: `core/*` (server, web-shell, ui-kit, action-client, contracts nền) và `modules/crm/*`; kiểm tự động "module không import nội bộ core" |
| S019-3 | bizcity-platform → cake | `SiteContext` (NC-001 P-K1); open-cake đổi `Ctx` hiện tại sang `ctx` của nền |
| S019-4 | bizcity-platform → cake | Universal Cache (P-K2) · Options (P-K3, `bizcity_options@1`) · Meta + Records (P-K4) — open-cake dùng trước, chuyển `0103_flex.sql` về kernel |
| S019-5 | bizcity-platform → cake | `@open-core/module-sdk` + manifest `bizcity.module.json`; CRM nạp như module, bật / tắt theo instance |
| S019-6 | bizcity-platform | rút `@open-core/server` + `@open-core/web-shell` từ open-cake lên nền; phát hành open-core 1.0 |
| S019-7 | cake | khai `bizcity_app_registry@1` đủ trường (tiền tố `cake_`, tên miền gốc `opencake.net`, URL `/_sites/v1`, module mặc định) |
| S019-8 | open-setup + bizcity-web | `bizcity_workspace@1`, `bizcity_app_instance@1` (tổng quát hoá `Bizcity Ketoan Site`, thêm `product`), API help desk; plugin "Bizcity Workspace" trên bizcity.vn |

## Xong khi

Bộ test hiện có của open-cake (170) xanh nguyên trước và sau mỗi bước; open-cake khởi động từ `@open-core/server` với module `cake.crm`; tắt module ở một instance ⇒ menu, action, subscriber của CRM biến mất ở instance đó, instance khác không đổi; open-setup tạo được một Workspace có Open Cake + Open Kế Toán từ trang "Workspace của tôi" trên bizcity.vn và đặt lại mật khẩu một người dùng qua help desk.

## Nhật ký

- 2026-11-27: mở phase (chỉ tài liệu), chờ chủ chốt NC-002 §12.
