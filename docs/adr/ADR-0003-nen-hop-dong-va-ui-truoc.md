# ADR-0003 — Nền hợp đồng và UI/UX của open-cake làm trước; việc trong open-ketoan làm sau

<!-- [2026-11-24 03:30 PM Johnny Chu - Chu Hoàng Anh] ADR-0003 — chủ (2026-11-24): "tài liệu yêu cầu chuẩn hoá nhưng phase này cần tập trung làm open-cake foundation framework contract và hình thành UI/UX trước, làm open-ketoan sau". -->

**Trạng thái:** Chấp nhận (chủ dự án, 2026-11-24) · **Áp dụng cho:** cake · **Sửa:** thứ tự ở ADR-0002 (đích "gói chung một nguồn" giữ nguyên)

## Bối cảnh

ADR-0002 đặt PHASE-002 của cake **chờ** kế hoạch gói chung P0–P4 — mà P0–P3 nằm trong open-ketoan (giữ chỗ, K3, chồng dòng NT-HT-003). Cake bị chặn bởi repo khác trước khi có được một màn nào.

## Quyết định

1. **W1 của cake = nền hợp đồng (PHASE-002) + UI/UX trên hợp đồng (PHASE-003)**, không cần backend, không cần open-ketoan: zod một chỗ, action spec, fixture; giao diện chạy qua `ActionClient` với bộ giả lập.
2. Hợp đồng **nền** (phong bì API, mã lỗi, sự kiện, action spec, phân trang) viết ở `packages/contracts/src/base/` **đúng hình** `bizcity_api@1` / `bizcity_errors@1` / `bizcity_event@1` / `bizcity_action@1` của open-ketoan; khi `@bizcity/contracts` có ở `bizcity-platform`, thư mục này chuyển sang đó (đường import đổi một lần).
3. **Khung chạy (PHASE-016)** dựng trên `bizcity-platform` được tạo bằng **bản sao chỉ đọc** `git subtree split` của `open-ketoan/packages/platform` rồi tổng quát hoá (cổng đăng ký) **trong repo gói chung**; open-ketoan không đổi gì.
4. Việc trong open-ketoan (PHASE-041 P0 / P1 / P3 / P6 — chuyển open-ketoan sang dùng gói chung) **hoãn**; PR #616, #617 về bản nháp.
5. Chuẩn hoá vẫn giữ: tên hợp đồng `bizcity_*`, hình phong bì / lỗi / sự kiện theo open-ketoan, canon R-CANON-14/15 — chỉ đổi **thứ tự**, không đổi **chuẩn**.

## Hệ quả

- Được: cake có giao diện chạy được sớm, chủ duyệt UX trên dữ liệu đúng hợp đồng; backend về sau hiện thực đúng action đã khai.
- Trả giá: hai bản hợp đồng nền tồn tại tạm (cake `base/` và `@ketoan/contracts`) tới khi `@bizcity/contracts` ra đời — giữ khớp bằng test so hình với fixture lấy từ tài liệu hợp đồng open-ketoan; gói chung có thể trôi khỏi open-ketoan cho tới P6.
