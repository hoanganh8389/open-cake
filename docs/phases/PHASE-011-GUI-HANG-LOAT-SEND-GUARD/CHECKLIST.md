# PHASE-011-GUI-HANG-LOAT-SEND-GUARD — checklist

<!-- [2026-11-25 01:58 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-DLV-6 — nguồn trạng thái TỪNG việc của phase (bảng việc docs/phases/BANG-VIEC.md sinh từ đây). Mô tả việc + bằng chứng chi tiết vẫn ở README. -->

> Ký hiệu: ☐ chưa làm · ◐ đang / có mã một phần · ☑ xong (có bằng chứng ở README) · ⛔ bị chặn. Đổi trạng thái ở đây rồi sinh lại bảng việc: `node ../bizcity-platform/tools/bang-viec.mjs --repo . --write`.

| Mã | Việc | Trạng thái |
|---|---|---|
| S011-1 | module `modules/broadcast` (`mod_broadcast`: `broadcasts`, `broadcast_targets`); mỗi người nhận một touch `broadcast_target` | ☐ |
| S011-2 | Send Guard trong care-kernel: trần theo tài khoản kênh / giờ, giờ gửi, danh sách không nhận, cửa sổ Page; đếm từ sổ; `/api/v1/m/broadcast/quota` | ☐ |
| S011-3 | duyệt chiến dịch (`cake:broadcast-duyet`, R2) | ☐ |
| S011-4 | trần qua `bizcity_settings@1` (`bizcity.cake.send_cap_per_hour`…) | ☐ |
