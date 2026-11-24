# PHASE-010 — Nối bốn trục: chứng từ `cake.order_request`, khách công nợ, đơn POS, đối chiếu 3 chiều
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W5 · **Áp dụng cho:** cake + open-ketoan + open-pos · **Trạng thái:** ☐ · **Phụ thuộc:** 005, 007
> **Mục tiêu:** golden G7–G8: khách chốt trong chat ⇒ `cake.order_request` ⇒ POS tạo đơn (`document_links` role `source`) ⇒ Kế Toán ghi sổ; Contact 360 thấy đơn / giao / công nợ **bằng tham chiếu**. Chi tiết: [20-DATA-SPINE §5–6](../../architecture/20-DATA-SPINE.md).

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S010-1 | cake | chứng từ `cake.order_request`, `cake.quote` trên `business_documents` (6 nhóm trạng thái, không nộp sổ) |
| S010-2 | cake | "Tạo khách công nợ" ⇒ `PUT /api/v1/partners/CAKE-<contact_id>` + `contact_links`; nghe `bizcity.masterdata.partner.changed` |
| S010-3 | cake | Contact 360 đọc `/partners/:code/balances` (đệm ≤ 5 phút) |
| S010-4 | open-pos | nhận `order_request` (REST `bizcity_contact@1` + document), ghi `document_links`; phát `pos.order.*` |
| S010-5 | cake | nghe `pos.order.*` ⇒ touch `kind=document`, `dims.doc_ref` |
| S010-6 | cake | finding `CAKE-DOC-*` khi `order_request` `done` mà sau N ngày không có `pos.delivery` / thu tiền (đối chiếu 3 chiều cho Twin Brain) |

## Xong khi

DOD-SYS-2: comment → chat → `cake.order_request` → `pos.order` → bút toán bán hàng; một `contact_id`, một `partner_id`, chuỗi `document_links` liền; không bảng khách / đơn nào trong Cake.
