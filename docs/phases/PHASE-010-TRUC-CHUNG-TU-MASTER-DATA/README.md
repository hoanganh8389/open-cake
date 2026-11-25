# PHASE-010 — Nối bốn trục: chứng từ `cake.order_request`, khách công nợ, đơn POS, đối chiếu 3 chiều
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->
<!-- [2026-11-25 06:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — theo luồng đơn xuyên app (bizcity-platform PHASE-001, chuẩn bizcity_order_flow@1; chủ chốt Q-ORD-1..8 2026-11-25): S010-4 chuyển sang open-pos-backend PHASE-003 (cửa nhận đơn chờ); thêm S010-7 đọc tồn Kế Toán, S010-8 gửi đơn. -->

> **Việc lộ trình:** W5 · **Áp dụng cho:** cake (việc của open-pos-backend / open-pos / open-ketoan theo dõi ở bizcity-platform) · **Trạng thái:** ☐ · **Phụ thuộc:** 005, 007; open-ketoan PHASE-042 (đọc tồn), open-pos-backend PHASE-003 (đơn chờ)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc; việc xuyên repo `LD-*` ở [bizcity-platform PHASE-001](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/phases/PHASE-001-LUONG-DON-CRM-POS-KE-TOAN/CHECKLIST.md)).
> **Mục tiêu:** golden G7–G8: khách chốt trong chat ⇒ nhân viên thấy **tồn thật của Kế Toán** ⇒ `cake.order_request` ⇒ **đơn chờ** ở open-pos-backend ⇒ POS xác nhận, bàn giao vận chuyển (lúc đó mới ghi nhận bán) ⇒ Kế Toán ghi sổ; Contact 360 thấy đơn / giao / công nợ **bằng tham chiếu**. Hợp đồng: [`bizcity_order_flow@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-ORDER-FLOW-v1.md). Chi tiết trục: [20-DATA-SPINE §5–6](../../architecture/20-DATA-SPINE.md).

## Đầu ra

| # | LD | Repo | Việc |
|---|---|---|---|
| S010-1 | LD-CAKE-1 | cake | chứng từ `cake.order_request`, `cake.quote` trên `business_documents` (nháp → đã gửi → trạng thái theo POS), **không** nộp sổ |
| S010-2 | — | cake | "Tạo khách công nợ" ⇒ `PUT /api/v1/partners/CAKE-<contact_id>` + `contact_links`; nghe `bizcity.masterdata.partner.changed` |
| S010-3 | — | cake | Contact 360 đọc `/partners/:code/balances` (đệm ≤ 5 phút) |
| S010-4 | LD-OPB-1..7 | ~~open-pos~~ → **open-pos-backend PHASE-003** | nhận đơn chờ (`bizcity_order_request@1`), xác nhận, phát `pos.order_request.*` / `pos.order.*` — theo dõi ở bizcity-platform, không làm trong repo này |
| S010-5 | LD-CAKE-4 | cake | nghe sự kiện POS (cổng ký HMAC) ⇒ touch `kind=document`, `dims.doc_ref`; không lùi trạng thái |
| S010-6 | LD-CAKE-5 | cake | RC-ORDER-1 (đơn đã gửi phải có trạng thái ở POS, thiếu ⇒ gửi lại cùng khoá) + RC-ORDER-3 / `CAKE-DOC-*` (ba chiều: yêu cầu ⇄ `pos.order` ⇄ phiếu bán + thu tiền) |
| S010-7 | LD-CAKE-2 | cake | đọc tồn Kế Toán (`bizcity_stock_read@1`, đệm 60 giây, giả lập cho máy dev) ở ô chọn hàng / gửi giá trong chat — **mockup trước** |
| S010-8 | LD-CAKE-3 | cake | gửi đơn sang POS: outbox gửi sau, `Idempotency-Key = doc_ref@version`, chữ ký HMAC; cấu hình kết nối POS theo đơn vị (URL, khoá `opb_…`, bí mật webhook) ở Cài đặt; **chỉ bật khi `catalog_source=ketoan`** (Q-ORD-6) |

## Không được

Ghi tồn; tạo đơn bán / phiếu kế toán; gửi `contact_id` sang POS (gửi `partner.code` + danh tính đã băm); lưu số tồn đọc được làm sự thật.

## Xong khi

DOD-SYS-2: comment → chat → (thấy tồn Q3) → `cake.order_request` → đơn chờ `pos.order_request` → `pos.order` → bàn giao → bút toán bán hàng; một `contact_id`, một `partner_id`, chuỗi `document_links` liền; không bảng khách / đơn nào trong Cake. Bộ kiểm hợp đồng: CRM gửi qua `order-flow-check` vector (SC-ORD-1) và chạy được với bên nhận giả của `--self-test`.
