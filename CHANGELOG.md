# Changelog

## [Unreleased]

### Added
- 2026-11-24 — PHASE-017 danh mục độc lập sẵn ánh xạ (ADR-0004): chuẩn H-* open-ketoan ở hợp đồng (ĐVT, thuế, SKU, tên, giá), hàng / nhóm / bảng giá / liên kết đơn vị với khối ánh xạ chung, cổng ghi `catalogWriteGate`, 8 action `cake.catalog_*`, giả lập + hàng mẫu; 00-CANON: R-CAKE-SIB-1/3 → R-CAKE-MASTER-1..5; 61 test.
- 2026-11-24 — PHASE-005 care-kernel (logic thuần): `@open-cake/care-kernel` — một cửa submitTouchIn, sổ chạm khách chỉ thêm (dòng đảo), resolver danh tính có bằng chứng, ghép / tách, contact_state dựng lại từ sổ; MemoryRepo có giao dịch; 9 test (ca vàng G1–G4 bằng fixture thật).
- 2026-11-24 — PHASE-003 S003-9: RecordTypeScreen tự sinh từ registry lớp mềm, 4 action core.record.*, Tin nhắn nhanh dùng lại lớp mềm.
- 2026-11-24 — PHASE-003 UI/UX trên hợp đồng: `@open-cake/ui-kit` (từ bản mẫu duyệt), `@open-cake/action-client` (mock kiểm hợp đồng / http / hook React), `apps/web` 6 màn (Hộp thư, Danh bạ, Contact 360, Kênh, Tổng quan, Bốn trạng thái); 11 ảnh build; 38 test.
- 2026-11-24 — PHASE-002 nền hợp đồng: `@open-cake/contracts` (zod) — phong bì / lỗi / sự kiện / action spec, trục contact, bizcity_touch@1, bizcity_channel_command@1, bizcity_contact@1, 19 action, registry lớp mềm, fixture + bộ mẫu Shop Hoa Mai; 25 test.
- 2026-11-24 — ADR-0003: nền hợp đồng + UI/UX trước, open-ketoan sau.
- 2026-11-24 — khởi tạo: README, BIZCITY OPEN CANON v1, 00-CANON, ADR-0001, PHASE-001 kiến trúc, AGENTS.md. Chưa có mã.
