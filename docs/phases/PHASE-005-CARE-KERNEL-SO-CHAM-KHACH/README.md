# PHASE-005 — Care-kernel: contact, danh tính, một cửa, sổ chạm khách, ghép / tách
<!-- [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — cổng CareRepo chuyển BẤT ĐỒNG BỘ (bản PG không hiện thực được cổng đồng bộ); PgCareRepo ở apps/api/src/care; bộ kịch bản dùng chung test/scenarios.ts chạy trên cả hai bản kho. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ◐ 2026-11-28 — kernel + **kho PostgreSQL** xong (S005-1..5, S005-8 trên CẢ MemoryRepo lẫn PgCareRepo), selfcheck S005-7 ☑ (9 / 9 ĐẠT), route hộp thư / danh bạ đã chạy ở PHASE-007; **còn duy nhất outbox (S005-6)** <!-- [2026-11-28 09:58 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — PHASE-005 — S005-7 đã ☑ ở checklist; đồng bộ README --> · **Phụ thuộc:** 002, 004 · **Mức kernel:** K3 (R-KER-1)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** trái tim open-cake chạy được không cần kênh nào: `submitTouchIn` ghi sổ chỉ-thêm, resolver trả `contact_id`, merge / unmerge có bằng chứng, `contact_state` dựng lại được. Chi tiết: [20-DATA-SPINE](../../architecture/20-DATA-SPINE.md).

## Đầu ra

| # | Việc |
|---|---|
| S005-1 | migration care-kernel: `contacts`, `contact_identities`, `contact_links`, `channel_accounts`, `conversations`, `touch_events`, `touch_event_versions`, `touch_ledger`, `messages`, `contact_state` + trigger chỉ-thêm + RLS + `COMMENT ON` |
| S005-2 | `submitTouchIn` (`pg_advisory_xact_lock` theo `doc_key`; unchanged / 409 / đảo + ghi) |
| S005-3 | resolver: identity có sẵn · proven phone / email / tax_code · fb_private_reply · tạo mới · gợi ý |
| S005-4 | merge / unmerge (30 ngày) + view `bizcity_read.touches_by_contact` |
| S005-5 | `contact_state` cùng giao dịch + `bizcity cake rebuild-state` |
| S005-6 | sự kiện outbox `bizcity.cake.*` (không PII) |
| S005-7 | SC-CAKE-1..8 trong selfcheck + chẩn đoán L3 |
| S005-8 | test: phát lại 1 000 touch trùng ⇒ 0 dòng mới; đổi version ⇒ 1 đảo + 1 mới; ghép theo tên ⇒ từ chối `CAKE_MERGE_NO_PROOF` |

## Xong khi

S005-8 xanh trên `cake_test`; `rebuild-state` trùng khớp; không đường ghi `touch_ledger` nào ngoài `submitTouchIn`.

## Rủi ro

Khoá theo `doc_key` thành nút cổ chai khi một tài khoản bị spam ⇒ đo p95 ở 008; khoá chỉ trong giao dịch ngắn.

## Tiến độ (2026-11-24)
<!-- [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — logic thuần của care-kernel làm trước PHASE-016 (không phụ thuộc DB / platform) -->

`packages/care-kernel` (`@open-cake/care-kernel`) — logic thuần trên cổng kho `CareRepo`; bản `MemoryRepo` có giao dịch quay lui và sổ đóng băng (mô phỏng trigger chỉ-thêm). PHASE-016 viết `PgCareRepo` hiện thực cùng cổng.

| # | Việc | TT |
|---|---|---|
| S005-1 | migration SQL care-kernel `db/migrations/0101_care_kernel.sql` (9 bảng, trigger chỉ-thêm, UNIQUE danh tính hiệu lực, CHECK bằng chứng, RLS FORCE) | ☑ SQL + **PgCareRepo** (`apps/api/src/care/pg-care-repo.ts`) — áp qua trình chạy nền, kiểm trên Postgres 16 |
| S005-2 | `submitTouchIn`: unchanged / CAKE_TOUCH_VERSION_STALE / lưu bản cũ + đảo + ghi; một phiên bản = một dòng sổ; một giao dịch | ☑ |
| S005-3 | resolver: có sẵn → phone / email proven → bắt tay trả lời riêng (chỉ khi shop **đã** trả lời riêng comment đó) → tạo mới asserted; không ghép theo tên | ☑ |
| S005-4 | ghép (bằng chứng bắt buộc, đóng / mở danh tính, chuyển hội thoại, dòng `merge`) / tách trong 30 ngày (dòng đảo) | ☑ |
| S005-5 | `contact_state` = một hàm tính từ sổ, dùng cả khi ghi lẫn khi dựng lại | ☑ |
| S005-6 | sự kiện outbox `bizcity.cake.*` | ☐ chờ outbox của platform (PHASE-016) |
| S005-7 | SC-CAKE-1/6/7/8 kiểm tĩnh ở `tests/conformance/selfcheck.mjs` (PHASE-016); **SC-CAKE-2..5 chẩn đoán L3 trên dữ liệu thật** — `apps/api/src/care/diagnose.ts`, `GET /api/v1/system/diagnostics` (quyền `reports:read`, chỉ đọc, mẫu là mã định danh): dòng sổ có sự kiện + đảo cùng khách, không trùng danh tính hiệu lực, không MERGE bằng tên, `contact_state` = dựng lại bằng đúng `computeState` của kernel. Bằng chứng: [diagnose.http.test.ts](../../../apps/api/test/diagnose.http.test.ts) (dữ liệu đúng ⇒ ĐẠT; cố ý sửa state / chèn MERGE bằng tên / đảo chéo khách ⇒ đúng phép kiểm báo). Gói vào `bizcity doctor --bundle`: S016-Q7 | ☑ |
| S005-8 | test: G1–G4 bằng fixture thật · phát lại 1 000 lần ⇒ 0 dòng mới · đổi phiên bản ⇒ 1 đảo + 1 mới · phiên bản cũ / sai khuôn / tin ra mồ côi ⇒ lỗi và quay lui sạch · sổ không sửa được, mỗi dòng đảo một lần · trùng tên không ghép · ghép / tách · state khớp dựng lại | ☑ 9 kịch bản (`test/scenarios.ts`) chạy trên MemoryRepo **và** PgCareRepo (trigger chỉ-thêm thật, UNIQUE reverses_id thật); bản PG phát lại 50 lần |
