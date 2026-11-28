# PHASE-010 — Nối bốn trục: chứng từ `cake.order_request`, khách công nợ, đơn POS, đối chiếu 3 chiều
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->
<!-- [2026-11-25 06:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — theo luồng đơn xuyên app (bizcity-platform PHASE-001, chuẩn bizcity_order_flow@1; chủ chốt Q-ORD-1..8 2026-11-25): S010-4 chuyển sang open-pos-backend PHASE-003 (cửa nhận đơn chờ); thêm S010-7 đọc tồn Kế Toán, S010-8 gửi đơn. -->

> **Việc lộ trình:** W5 · **Áp dụng cho:** cake (việc của open-pos-backend / open-pos / open-ketoan theo dõi ở bizcity-platform) · **Trạng thái:** ◐ 2026-11-28 — phía Cake S010-1, 2, 3, 5, 6, 7, 8 có mã, kiểm với cửa hàng giả + Kế Toán giả (`orders.http.test`); **chưa chạy với open-pos-backend PHASE-003 và open-ketoan PHASE-042 thật** <!-- [2026-11-28 09:58 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — PHASE-010 — đồng bộ README; S010-2/3 đã có mã + test ở README, checklist đổi ☐ → ◐ --> · **Phụ thuộc:** 005, 007; open-ketoan PHASE-042 (đọc tồn), open-pos-backend PHASE-003 (đơn chờ)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc; việc xuyên repo `LD-*` ở [bizcity-platform PHASE-001](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/phases/PHASE-001-LUONG-DON-CRM-POS-KE-TOAN/CHECKLIST.md)).
> **Mục tiêu:** golden G7–G8: khách chốt trong chat ⇒ nhân viên thấy **tồn thật của Kế Toán** ⇒ `cake.order_request` ⇒ **đơn chờ** ở open-pos-backend ⇒ POS xác nhận, bàn giao vận chuyển (lúc đó mới ghi nhận bán) ⇒ Kế Toán ghi sổ; Contact 360 thấy đơn / giao / công nợ **bằng tham chiếu**. Hợp đồng: [`bizcity_order_flow@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-ORDER-FLOW-v1.md). Chi tiết trục: [20-DATA-SPINE §5–6](../../architecture/20-DATA-SPINE.md).

## Mockup chờ chủ duyệt (trước khi code)

<!-- [2026-11-25 06:28 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — mockup S010-1/5/7/8 trên CSS thật của ui-kit; nguồn mockup/index.html, chụp lại: node docs/phases/PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/mockup/chup.mjs -->

| Khung | Việc | Ảnh |
|---|---|---|
| ① Gửi giá có tồn Kế Toán (Còn 4 · Còn 1 · Hết hàng), nút **+** thêm vào đơn | S010-7 | [mockup-gui-gia-ton](evidence/build-shots/mockup-gui-gia-ton.png) |
| ② Yêu cầu đặt hàng: khách đã xác minh, giao tới, cửa hàng xuất, dòng hàng + tồn, vượt tồn cảnh báo, COD / chuyển khoản, hãng / lấy tại shop | S010-1, S010-8 | [mockup-tao-don](evidence/build-shots/mockup-tao-don.png) |
| ③ Dấu đơn trong chat: đã gửi → cửa hàng xác nhận → đã giao vận chuyển (dòng hệ thống, không gửi khách) | S010-5 | [mockup-don-trong-chat](evidence/build-shots/mockup-don-trong-chat.png) |
| ④ Contact 360 › Đơn: các bước, chờ xác nhận (huỷ được), bị từ chối có lý do | S010-5 | [mockup-don-360](evidence/build-shots/mockup-don-360.png) |
| ⑤ Cài đặt › Kết nối cửa hàng: địa chỉ, khoá `opb_…`, bí mật ký, cửa hàng xuất, địa chỉ nhận trạng thái; khoá khi chưa nối Kế Toán | S010-8 | [mockup-ket-noi](evidence/build-shots/mockup-ket-noi.png) |
| ⑥ Contact 360 › **Công nợ**: số dư theo tài khoản từ Kế Toán (mã đối tượng, giờ đọc, **Đọc lại**), không lưu số dư; Kế Toán không trả lời ⇒ giữ số lần đọc gần nhất | S010-3 | [mockup-cong-no](evidence/build-shots/mockup-cong-no.png) |
| ⑦ **Tạo khách công nợ**: mã theo R-CAKE-MASTER-5 (SĐT đã xác minh → `CAKE-<contact_id>` → `KHACH-LE`), tên, SĐT, chi nhánh; gửi lại không tạo trùng | S010-2 | [mockup-tao-khach-cong-no](evidence/build-shots/mockup-tao-khach-cong-no.png) |

## Tiến độ

<!-- [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — phần open-cake của S010-1/5/7/8 đã có mã; ◐ vì chưa chạy với open-pos-backend PHASE-003 và open-ketoan PHASE-042 thật. -->

| Việc | Đã có | Bằng chứng | Còn |
|---|---|---|---|
| S010-1/8 yêu cầu đặt hàng + gửi cửa hàng | migration 0105, `apps/api/src/orders/`, 8 action, giả lập, sheet Yêu cầu đặt hàng, Cài đặt › Kết nối cửa hàng | [orders.http.test.ts](../../../apps/api/test/orders.http.test.ts) (Postgres thật, cửa hàng giả: gửi lặp không nhân đôi, sập ⇒ queued ⇒ gửi lại, thân gửi qua schema chuẩn của bizcity-platform); ảnh [app-tao-don](evidence/build-shots/app-tao-don.png), [app-ket-noi](evidence/build-shots/app-ket-noi.png) | chạy với open-pos-backend PHASE-003 thật (`order-flow-check --profile receiver`) |
| S010-7 đọc tồn | `cake.stock.read` (đệm 60 giây), nhãn Còn n / Hết hàng + nút + ở Gửi giá | test trên Kế Toán giả; ảnh [app-gui-gia-ton](evidence/build-shots/app-gui-gia-ton.png) | open-ketoan PHASE-042 (`/inventory/availability`); khoá Kế Toán còn ở biến môi trường (nợ) |
| S010-2/3 khách công nợ + công nợ ở Contact 360 | `cake.partner.get` / `cake.partner.create` (`orders/partner.ts`): tạo ⇒ `PUT /partners/<mã>` rồi lưu `contact_links` (mã: SĐT đã xác minh → `CAKE-<id>`; không gửi `contact_id`); công nợ ⇒ `GET /partners/:code/balances` theo tài khoản, đệm 5 phút, **Đọc lại** bỏ đệm, Kế Toán sập ⇒ giữ số lần đọc gần nhất + nhãn "Chưa đọc được"; không lưu số dư. Tab **Công nợ** + sheet **Tạo khách công nợ** (`ContactDebt.tsx`), giả lập theo cùng luật | ca trong [orders.http.test.ts](../../../apps/api/test/orders.http.test.ts) (Kế Toán giả: tạo, gửi lại không trùng, đệm, đọc lại, sập, mã khách không rò ra ngoài); ảnh [app-cong-no](evidence/build-shots/app-cong-no.png), [app-tao-khach-cong-no](evidence/build-shots/app-tao-khach-cong-no.png) | open-ketoan thật; **nghe `bizcity.masterdata.partner.changed`** (đồng bộ tên khi Kế Toán sửa); khoá Kế Toán còn ở `CAKE_OKT_API_KEY` (nợ) và cần quyền ghi danh mục |
| S010-6 RC-ORDER-1 đối chiếu | `reconcileSentOrders` (`orders/service.ts`): đã gửi > 15 phút, chưa có trạng thái ⇒ đọc `GET ?docRefs=` ở cửa hàng; thiếu ⇒ gửi lại CÙNG khoá `docRef@version`; có ⇒ chỉ ghi dấu đã kiểm; không đọc được ⇒ không kết luận. Chạy nền mỗi 5 phút | ca trong [orders.http.test.ts](../../../apps/api/test/orders.http.test.ts) (cửa hàng giả: có / thiếu / chưa đủ 15 phút / cửa hàng sập) | **RC-ORDER-3** ba chiều (cần phiếu bán + thu tiền của Kế Toán, open-ketoan PHASE-042); chưa chạy với cửa hàng thật |
| S010-5 trạng thái về | cổng `/ingress/v1/pos-events` (ký HMAC, chống lặp, không lùi, dấu chạm kind=document), dòng hệ thống trong chat, Contact 360 › Đơn | test 401 / áp / lặp / đến muộn; ảnh [app-don-trong-chat](evidence/build-shots/app-don-trong-chat.png), [app-don-360](evidence/build-shots/app-don-360.png) | sự kiện thật từ open-pos-backend |

Chạy lại giao diện: `npm run web:build && node tests/ui/luong-don.mjs`.

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
