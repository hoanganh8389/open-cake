# open-cake · 90 — Bài học kế thừa từ open-ketoan

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-LESSONS — 17 bài học ghi trong docs/rules/RULE-REVIEW.md §6 (W-1..13), 70-REFLECT các phase, audits/ của open-ketoan main 6ad77b6; mỗi bài một hàng rào cụ thể ở open-cake. -->

R-REV-10: **lỗi gặp hai lần thành luật.** open-ketoan đã trả giá cho những bài dưới đây; open-cake dựng hàng rào **trước khi viết dòng mã đầu**.

| # | Bài học (gốc) | Ở open-cake thành |
|---|---|---|
| 1 | Script dọn dẹp tắt trigger / xoá dòng sổ làm vỡ sổ (W-1) | H-TRIGGER-OFF, H-LEDGER chặn PR; **không có** lệnh "dọn" `touch_ledger`; xoá dữ liệu cá nhân dùng `cake.contact.erase` (giữ dòng sổ) |
| 2 | Tra cứu mặc định `?? 1` / `?? 0` nhân sai tiền (W-2, R-REV-13) | Send Guard: tra trần không thấy ⇒ **chặn** + lỗi, không mặc định |
| 3 | Chép cấu hình số từ bản ghi khác sai cho biến thể (W-3) | không chép `capabilities` / trần giữa tài khoản kênh; mỗi tài khoản lấy từ Cell |
| 4 | Test chính sách tích luỹ trên một sổ chung cho số lệch giả (W-4) | mỗi test một đơn vị (`setupTenant`), lọc theo đơn vị |
| 5 | Script chỉ chạy được trên sổ thật thì không kiểm được (W-5) | mọi lệnh CLI có `--dry-run` + chạy được trên DB test |
| 6 | Tổng báo cáo phải đọc sổ, không đọc cột đầu chứng từ (W-7) | báo cáo đọc `touch_ledger` + dẫn xuất; không đếm từ `conversations.last_*` |
| 7 | Không suy thuộc tính từ đoạn mã, không đổi mã cho khớp (W-8) | không suy kênh / Page từ chuỗi `external_id`; luôn đọc cột `channel`, `scope` |
| 8 | Đẩy thẳng main để lọt lỗi (W-9) | nhánh bảo vệ, chỉ PR (R-REV-1) |
| 9 | Linter bỏ qua `.sql` / `.json` cho "xanh giả" (W-10) | `kiem-chuan.sh` quét cả `.sql`, `.json`, `.tsx` |
| 10 | `packages/contracts/dist` cũ gây lỗi typecheck giả (W-11) | `npm run build` theo thứ tự trước typecheck trong CI; `dist` không commit |
| 11 | Test trỏ DB thật (W-12) | vitest từ chối DB không có chữ `test` |
| 12 | Hai nhánh lấy trùng số migration / ADR (W-13) | `scripts/so-tiep-theo.mjs migration|adr` + `kiem` trước PR |
| 13 | Chẩn đoán trên DB thiếu migration báo lỗi giả (audit A-1) | L1 kiểm `schema_version` trước khi chạy L2 / L3 |
| 14 | Test nâng cấp bắt lỗi mà test mới không bắt (PHASE-004 R3) | job CI `migrate-upgrade` từ tag trước |
| 15 | Test DB chung tích dữ liệu, chú thích fixture làm kiểm "đỗ" tình cờ (PHASE-006 R3/R4) | truy vấn kiểm luôn lọc `tenant_id`; fixture không chứa chuỗi kiểm |
| 16 | Hai phiên làm trùng việc (R-FLOW bước 0) | `CLAIMS.md` trên main trước khi code |
| 17 | Đổi ID lớn (`sku` → `item_id`) phải chạy song song, dừng ở dòng chưa giải, diễn tập trên bản sao (PHASE-024) | phase chuyển dữ liệu WP → cake: chạy song song, dừng khi identity chưa giải, diễn tập trên bản sao |

## Bài học riêng từ Open CRM bản WordPress (đã gặp)

| # | Bài học | Hàng rào |
|---|---|---|
| C-1 | Trục là "số Zalo" ⇒ một người nhiều số / nhiều kênh thành nhiều khách | R-CAKE-SPINE-1 |
| C-2 | `Connected` chỉ vì HTTP 200 | `connected` chỉ từ sự thật Cell + thắng nhỏ hai chiều |
| C-3 | Gửi lại khi hết giờ chờ E2EE ⇒ nhân đôi tin | `unknown` không tự gửi lại |
| C-4 | Site WP cũ không hiểu trường `platform` ghi tin FB vào hộp Zalo | hợp đồng mới `bizcity_touch@1` có `channel` bắt buộc; Cell chỉ gửi kênh site khai nhận |
| C-5 | REST trả trường khác tên ⇒ màn trống không lỗi | schema zod chung web ↔ api trong `packages/contracts` |
| C-6 | Tailwind `important: 'body'` đè giao diện khác | token CSS, không Tailwind ở lõi |
