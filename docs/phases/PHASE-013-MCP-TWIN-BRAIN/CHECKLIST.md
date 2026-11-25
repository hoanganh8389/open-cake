# PHASE-013-MCP-TWIN-BRAIN — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S013-1 | `/mcp` (`bizcity_mcp@1`): tool sinh từ action `expose.ai` — `cake_contact_lookup`, `cake_contact_timeline`, `cake_conversation_list_unanswered`, `cake_message_d | ☐ |
| S013-2 | actor `{kind:'ai', via:'mcp:<client>', onBehalfOf, turnId}` trong bằng chứng; danh sách tối đa 50 / trần 500 | ☐ |
| S013-3 | webhook HMAC `bizcity.cake.*` tới Twin Brain | ☐ |
| S013-4 | màn Kịch bản: danh mục trigger (sự kiện) + action (tool) cho Twin Brain / Open Automation — không canvas | ☐ |
| S013-5 | dải "Gợi ý AI" trong hộp thư = nháp từ Twin Brain; nhân viên bấm mới gửi | ☐ |
| S013-6 | test prompt-injection: tin khách chứa lệnh ⇒ không tool ghi nào chạy khi chưa xác nhận | ☐ |
