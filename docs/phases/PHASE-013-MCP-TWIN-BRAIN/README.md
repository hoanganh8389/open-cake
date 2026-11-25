# PHASE-013 — MCP cho Twin Brain: đọc, nháp, gửi có xác nhận; lớp kiểm chứng
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W6 · **Áp dụng cho:** cake + twin-brain · **Trạng thái:** ☐ · **Phụ thuộc:** 005, 010
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** Twin Brain dùng Cake như một công cụ an toàn: đọc khách / dòng thời gian (R0), soạn nháp (R1), gửi (R2, người xác nhận), nhận sự kiện. Kịch bản / skill nằm ở Twin Brain, **không** ở Cake.

## Đầu ra

| # | Việc |
|---|---|
| S013-1 | `/mcp` (`bizcity_mcp@1`): tool sinh từ action `expose.ai` — `cake_contact_lookup`, `cake_contact_timeline`, `cake_conversation_list_unanswered`, `cake_message_draft` (R1), `cake_message_send` (R2, `confirm_token`), `cake_task_create`, `cake_findings_list` |
| S013-2 | actor `{kind:'ai', via:'mcp:<client>', onBehalfOf, turnId}` trong bằng chứng; danh sách tối đa 50 / trần 500 |
| S013-3 | webhook HMAC `bizcity.cake.*` tới Twin Brain |
| S013-4 | màn Kịch bản: danh mục trigger (sự kiện) + action (tool) cho Twin Brain / Open Automation — không canvas |
| S013-5 | dải "Gợi ý AI" trong hộp thư = nháp từ Twin Brain; nhân viên bấm mới gửi |
| S013-6 | test prompt-injection: tin khách chứa lệnh ⇒ không tool ghi nào chạy khi chưa xác nhận |

## Xong khi

Twin Brain đọc được dòng thời gian một khách, soạn nháp, chỉ gửi sau khi người bấm xác nhận; mọi lượt có bằng chứng; khoá MCP không gọi được ghép / xuất / kết nối kênh.
