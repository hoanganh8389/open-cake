# NT-NV-002 · Vai riêng: Cho / Cấm từng quyền, áp ngay

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho màn đã làm ở PHASE-004 S004-7; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Cài đặt › Vai & quyền (`#/staff?tab=roles`) — ma trận, sheet Vai riêng mới |
| Bộ phận yêu cầu | Chủ cửa hàng |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; USERS-ROLES (vai riêng = vai nền + Cho / Cấm, Cấm thắng) |

## 1. Mục đích
Chủ tạo vai riêng của cửa hàng dựa trên một vai hệ thống, rồi bấm ô trên ma trận để Cho thêm hoặc Cấm từng quyền. Thay đổi có hiệu lực ngay với nhân viên đang mở phần mềm, không cần đăng nhập lại.

## 2. Khai báo trước
Người thao tác là Chủ (có `settings:write`); nhân viên Lan đang có vai Nhân viên chăm sóc và đang mở phần mềm.

## 3. Các bước thao tác
1. **Vai riêng** → tên "Trưởng ca", dựa trên **Nhân viên chăm sóc** → **Tạo vai**.
2. Bấm ô "Xem mọi hộp thư" ở cột Trưởng ca → **Cho**; bấm ô "Trả lời, gắn nhãn" → **Cấm**.
3. Giao vai Trưởng ca cho Lan (Cài đặt › Nhân viên).
4. Bỏ Cấm "Trả lời, gắn nhãn"; rồi **tắt** vai Trưởng ca; bật lại.
5. Thử tạo vai riêng dựa trên **Chủ**.

## 4. Số liệu đầu vào

| Vai | Dựa trên | Cho | Cấm |
|---|---|---|---|
| Trưởng ca (khoá `r-truong-ca`) | Nhân viên chăm sóc | cake:all-inbox-xem | cake:inbox-lap |

## 5. Kết quả mong đợi

| Mục | Mong đợi |
|---|---|
| Ma trận cột Trưởng ca | ✓ từ vai nền, ô Cho tô xanh, ô Cấm ⊘ đỏ; quyền hiệu lực **không** có cake:inbox-lap (Cấm thắng) |
| Quyền của Lan sau khi giao | có cake:all-inbox-xem + cake:inbox-xem, không có cake:inbox-lap |
| Bỏ Cấm | phiên **đang mở** của Lan có lại cake:inbox-lap — không đăng nhập lại |
| Tắt vai | Lan chỉ còn quyền vai nền (mất cake:all-inbox-xem) |
| Vai dựa trên Chủ | bị từ chối (400) |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | Quản lý (không có `settings:write`) mở ma trận | xem được, ô và nút Vai riêng khoá kèm lý do; máy chủ trả 403 |
| 2 | Cho một quyền không có trong sổ quyền | từ chối (400) |
| 3 | xoá vai | không có nút xoá — chỉ tắt; đổi vai nền = tạo vai mới |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/staff.http.test.ts` — ca "NT-NV-002 · vai riêng …" |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| quyền hiệu lực (Cấm thắng) | không có inbox-lap | khớp | 0 | |
| áp ngay cho phiên đang mở | có lại inbox-lap | khớp | 0 | `tenants.authz_version` |
| tắt vai | mất all-inbox-xem | khớp | 0 | |
| vai dựa trên Chủ | 400 | khớp | 0 | |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
