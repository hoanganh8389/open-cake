# Open CRM · 00 — CANON

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — CANON bản 0.1: mục lục luật R-OC-*, thứ bậc, danh sách cấm. -->

> **Phiên bản:** 0.1 · 2026-11-17 · nháp, chờ chủ duyệt. Khi lên repo riêng, mỗi nhóm luật tách thành `docs/rules/RULE-*.md` như Open Kế Toán / Open Kiot.

## Sứ mệnh (một câu)

Một doanh nghiệp nhỏ chăm sóc khách trên **nhiều số Zalo** ở **một hộp thư**, gửi **thông báo hàng loạt** an toàn, và mọi lần chạm khách đều **ghi sổ, truy vết được, AI đọc được**.

## Thứ bậc

Tier 0 (sổ + cửa) > Tier 1 (ranh giới + cài đặt) > Tier 2 (giao diện). Luật thấp mâu thuẫn luật cao ⇒ sửa luật thấp.

## Tier 0 — sổ chăm sóc và cửa sự việc

| Mã | Luật |
|---|---|
| **R-OC-LEDGER-1** | Sổ chăm sóc `ocrm_ledger` **chỉ thêm**. Không `UPDATE` / `DELETE` dòng sổ. |
| **R-OC-LEDGER-2** | Sửa / huỷ = **dòng đảo** (`reverses_id`, cùng loại, `is_reversal = 1`) + dòng mới nếu còn nội dung. Mỗi dòng bị đảo tối đa một lần. |
| **R-OC-LEDGER-3** | Bảng dẫn xuất (`ocrm_contact_state`, thống kê gửi) cập nhật **trong cùng giao dịch** với dòng sổ và **dựng lại được** từ sổ. Báo cáo chỉ đọc sổ + dẫn xuất. |
| **R-OC-EVENT-1** | **Không sự việc, không dòng sổ.** Tin vào, tin ra, gửi hàng loạt, gắn thẻ, đổi giai đoạn, ghi chú, việc đẩy từ cell — đều có một dòng `ocrm_events`. |
| **R-OC-EVENT-2** | **Một cửa:** `OCRM_Kernel::submit( $event )`. Không module nào ghi thẳng `ocrm_events` / `ocrm_ledger`. |
| **R-OC-EVENT-3** | **Khoá tự nhiên** `(source, doc_key)` duy nhất, không đổi; **phiên bản chỉ tăng** (cùng ⇒ `unchanged`, nhỏ hơn ⇒ `409 conflict`). Gửi lại không sinh dòng trùng. |
| **R-OC-EVENT-4** | Payload lưu nguyên. Kiểm khuôn ở cửa; sai khuôn ⇒ lỗi 4 trường (`code/message/hint/help_code`), không lưu. |
| **R-OC-EVENT-5** | Mọi thay đổi ra ngoài (sang Zalo Brain, Open Kế Toán, Open Kiot) đi qua **outbox** `ocrm_outbox` ghi cùng giao dịch, phát lại không trùng (idempotency key). |

## Tier 1 — ranh giới, cài đặt, quyền

| Mã | Luật |
|---|---|
| **R-OC-BOUND-1** | Plugin **chạy một mình**: không `require` file của plugin khác, không gọi lớp của plugin khác khi chưa `class_exists()`. |
| **R-OC-BOUND-2** | Bảng sổ hội thoại (7 bảng `bizcity_crm_*`, hợp đồng `crm-ledger@1`) có **một chủ**: Zalo Brain khi có mặt, Open CRM khi không. DDL là bản sao **byte-giống**, kiểm bằng validator. |
| **R-OC-BOUND-3** | Module (`modules/<key>/`) không import module khác; dùng chung qua action đọc công khai của kernel. Bảng riêng của module có tiền tố `ocrm_<key>_`. |
| **R-OC-BOUND-4** | Ứng dụng ngoài (Open Kế Toán, Open Kiot, cell) chỉ dùng **REST + hợp đồng có phiên bản** hoặc **MCP tools**; không đọc CSDL trực tiếp. |
| **R-OC-BRAIN-1** | Open CRM **không gọi LLM**. AI trả lời, tóm tắt, phân tích = việc của cell (Zalo Brain). Không có Zalo Brain ⇒ không có AI, không lỗi. |
| **R-OC-BRAIN-2** | Mỗi MCP tool khai **mức rủi ro**: R0 đọc · R1 nháp · R2 gửi (cần chủ duyệt) · R3 tiền (không có trong Open CRM). Gửi hàng loạt luôn là R2. |
| **R-OC-SEND-1** | Gửi hàng loạt: trần mỗi số / ngày, khoảng cách giữa hai tin, giờ được gửi, danh sách không nhận — kernel kiểm, module không vượt được. |
| **R-OC-MT-1** | Mỗi blog một kho dữ liệu (`$wpdb->prefix`). Không đọc / ghi bảng của blog khác. |
| **R-OC-DB-1** | Thêm bảng = changelog trước (version, `since` cho cột mới) + lý do vì sao sổ / dẫn xuất / option không chứa được. Không `DROP` / đổi cột tự động. |
| **R-OC-PHP-1** | PHP 7.4, WordPress 6.0. Không cú pháp chỉ có ở PHP 8. |

## Tier 2 — giao diện

| Mã | Luật |
|---|---|
| **R-OC-UI-1** | Đen · xám · trắng; **đỏ `#d0021b` chỉ cho nút chính và mục đang chọn**. Không gradient, không bóng màu, không emoji làm biểu tượng. |
| **R-OC-UI-2** | Chữ thân ≥ 15 px, nút ≥ 44 px chiều cao, mỗi màn ≤ 4 bước chính. |
| **R-OC-UI-3** | Mọi thao tác ghi mở sheet (tiêu đề = động từ + đối tượng, lỗi trong sheet, khoá khi đang lưu). Không `alert` / `confirm` / `prompt`. |
| **R-OC-UI-4** | URL là nguồn vị trí duy nhất: hộp thư, hội thoại, bộ lọc đọc từ URL; F5 về đúng chỗ. |
| **R-OC-UI-5** | Mỗi màn có 4 trạng thái: đang tải · trống · lỗi · không có quyền. |

## Cấm (đọc nhanh)

❌ Gọi LLM trong PHP · ❌ ghi thẳng bảng sổ · ❌ `UPDATE` dòng sổ · ❌ bảng mới không changelog · ❌ `require` file plugin khác · ❌ gửi hàng loạt không trần · ❌ màu trang trí, icon thừa · ❌ thêm pipeline / hoá đơn / kho vào lõi (đó là việc của Open Kế Toán / Open Kiot / add-on).
