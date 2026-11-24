# PHASE-005 — Care-kernel: contact, danh tính, một cửa, sổ chạm khách, ghép / tách
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ◐ 2026-11-24 — logic thuần xong (S005-2..5, S005-8 trên kho bộ nhớ); chờ PHASE-016 cho SQL (S005-1), outbox (S005-6), selfcheck (S005-7) · **Phụ thuộc:** 002, 004 · **Mức kernel:** K3 (R-KER-1)
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
| S005-1 | migration SQL care-kernel | ☐ chờ PHASE-016 (`CareRepo` đã định cột) |
| S005-2 | `submitTouchIn`: unchanged / CAKE_TOUCH_VERSION_STALE / lưu bản cũ + đảo + ghi; một phiên bản = một dòng sổ; một giao dịch | ☑ |
| S005-3 | resolver: có sẵn → phone / email proven → bắt tay trả lời riêng (chỉ khi shop **đã** trả lời riêng comment đó) → tạo mới asserted; không ghép theo tên | ☑ |
| S005-4 | ghép (bằng chứng bắt buộc, đóng / mở danh tính, chuyển hội thoại, dòng `merge`) / tách trong 30 ngày (dòng đảo) | ☑ |
| S005-5 | `contact_state` = một hàm tính từ sổ, dùng cả khi ghi lẫn khi dựng lại | ☑ |
| S005-6 | sự kiện outbox `bizcity.cake.*` | ☐ chờ outbox của platform (PHASE-016) |
| S005-7 | SC-CAKE-1..8 trong selfcheck | ☐ chờ PHASE-016 |
| S005-8 | test: G1–G4 bằng fixture thật · phát lại 1 000 lần ⇒ 0 dòng mới · đổi phiên bản ⇒ 1 đảo + 1 mới · phiên bản cũ / sai khuôn / tin ra mồ côi ⇒ lỗi và quay lui sạch · sổ không sửa được, mỗi dòng đảo một lần · trùng tên không ghép · ghép / tách · state khớp dựng lại | ☑ 9 test; thử đột biến (bỏ điều kiện "shop đã trả lời riêng") ⇒ 2 test đỏ |
