# PHASE-005-CARE-KERNEL-SO-CHAM-KHACH — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S005-1 | migration care-kernel: `contacts`, `contact_identities`, `contact_links`, `channel_accounts`, `conversations`, `touch_events`, `touch_event_versions`, `touch_le | ☑ |
| S005-2 | `submitTouchIn` (`pg_advisory_xact_lock` theo `doc_key`; unchanged / 409 / đảo + ghi) | ☑ |
| S005-3 | resolver: identity có sẵn · proven phone / email / tax_code · fb_private_reply · tạo mới · gợi ý | ☑ |
| S005-4 | merge / unmerge (30 ngày) + view `bizcity_read.touches_by_contact` | ☑ |
| S005-5 | `contact_state` cùng giao dịch + `bizcity cake rebuild-state` | ☑ |
| S005-6 | sự kiện outbox `bizcity.cake.*` (không PII) | ☐ |
| S005-7 | SC-CAKE-1..8 trong selfcheck + chẩn đoán L3 | ☐ |
| S005-8 | test: phát lại 1 000 touch trùng ⇒ 0 dòng mới; đổi version ⇒ 1 đảo + 1 mới; ghép theo tên ⇒ từ chối `CAKE_MERGE_NO_PROOF` | ☑ |
