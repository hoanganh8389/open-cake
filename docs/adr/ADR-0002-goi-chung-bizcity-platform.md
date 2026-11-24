# ADR-0002 — Dùng gói chung `@bizcity/platform`, không fork; lớp dữ liệu mềm làm bản đầu ở open-cake

<!-- [2026-11-24 03:10 PM Johnny Chu - Chu Hoàng Anh] PLATFORM-SPLIT — chủ chốt 2026-11-24: "tách thành gói chung @bizcity/platform"; "để open-cake làm bản đầu". -->

**Trạng thái:** Chấp nhận (chủ dự án, 2026-11-24) · **Áp dụng cho:** cake · **Sửa:** ADR-0001 quyết định 1 · **Kế hoạch xuyên repo:** [open-hub/docs/canon/KE-HOACH-GOI-CHUNG-BIZCITY-PLATFORM.md](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/KE-HOACH-GOI-CHUNG-BIZCITY-PLATFORM.md)

## Bối cảnh

- ADR-0001 định "sao chép khung open-ketoan, fork `packages/platform` có `UPSTREAM.md`". Fork làm hai bản trôi nhau và trái R-CANON-14 (một năng lực viết một lần).
- `packages/platform` của open-ketoan **đã mang tên** `@bizcity/platform` 0.1.0 nhưng còn phụ thuộc `@ketoan/contracts` (17 import) và có phần kế toán (`masterdata/`); migration nền lẫn trong 178 migration của Kế Toán.
- Máy nhiều site PHASE-039 (`db/site-*.ts`) đã nằm trong platform.

## Quyết định

1. open-cake **phụ thuộc** `@bizcity/platform`, `@bizcity/contracts`, `@bizcity/module-sdk`, `@bizcity/ui-kit`, `@bizcity/cli`, `@bizcity/conformance` theo phiên bản; **không** chép mã platform vào repo.
2. Nghiệp vụ cake gắn vào platform qua **cổng đăng ký** (`registerTouchSubmitter`, `registerCapabilities`, `registerErrorReasons`), như Kế Toán gắn `registerLedgerSubmitter`.
3. **Lớp dữ liệu mềm** (`user_meta`, `entity_meta`, `record_types`, `records` + registry + action `core.meta.*` / `core.records.*` + `RecordTypeScreen`) làm **bản đầu** ở `open-cake/packages/flex` (`@bizcity/flex`), viết **như thể đã là gói chung**: không import `care-kernel`, không chữ `cake` cứng trong logic; thăng vào `@bizcity/platform` khi open-ketoan dùng (R-KER-8, D-PLAT-4).
4. Cake cần sửa platform ⇒ PR vào repo gói chung, chạy test ma trận (open-ketoan + open-cake); không vá tại chỗ.
5. Nhiều site (PHASE-014) **dùng** máy có sẵn trong platform với tiền tố `cake_`, không viết lại.

## Hệ quả

- Được: một nguồn, sửa một lần có cho mọi app; PHASE-014 nhẹ đi; lớp mềm có người dùng thật trước khi vào lõi.
- Trả giá: PHASE-002 **chờ** gói chung P0–P4 (kiểm kê, tách hợp đồng nền, tách platform, tách migration nền, phát hành); việc tách chạm open-ketoan mức K3.
- Đường lùi: nếu P0–P4 trễ quá 3 tuần, cake dùng workspace git trỏ nhánh tách (vẫn một nguồn), **không** fork.
