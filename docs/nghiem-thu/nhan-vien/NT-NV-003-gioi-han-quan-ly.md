# NT-NV-003 · Giới hạn của quản lý khi quản nhân viên

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho luật R-CAKE-AUTHZ-5 đã làm ở PHASE-004 S004-7; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Cài đặt › Nhân viên (`#/staff`) |
| Bộ phận yêu cầu | Chủ cửa hàng |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; SECURITY (không leo thang quyền) |

## 1. Mục đích
Quản lý được mời, đổi vai, giao tài khoản kênh cho nhân viên, nhưng **không** được đụng tới Chủ, không tự sửa mình, không cấp cho ai quyền mà chính quản lý không có, và không sửa vai riêng.

## 2. Khai báo trước
Minh có vai Quản lý (có `users:write`, không có `settings:write`, không có `cake:channels-lap`); vai riêng Trưởng ca được Chủ Cho thêm `cake:channels-lap`.

## 3. Các bước thao tác
1. Minh mở danh sách nhân viên.
2. Minh thử đổi vai của Chủ; thử đổi vai của chính mình.
3. Minh thử tạo vai riêng "Ca đêm".
4. Minh thử giao vai Trưởng ca (đang có cake:channels-lap) cho Lan.
5. Minh giao cho Lan đúng tài khoản Zalo.
6. Lan (Nhân viên chăm sóc) thử mở danh sách nhân viên.

## 4. Số liệu đầu vào

| Người | Vai | users:write | settings:write | cake:channels-lap |
|---|---|---|---|---|
| Minh | Quản lý | có | không | không |
| Lan | Nhân viên chăm sóc | không | không | không |

## 5. Kết quả mong đợi

| Bước | Mong đợi |
|---|---|
| 1 | xem được danh sách |
| 2 | cả hai bị chặn (403) |
| 3 | bị chặn (403) |
| 4 | bị chặn (403) — vai có quyền Minh không có |
| 5 | thành công, Lan chỉ thấy tài khoản Zalo |
| 6 | bị chặn (403); trên màn: nút khoá kèm lý do |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | gọi thẳng API bỏ qua giao diện | máy chủ vẫn chặn như §5 |
| 2 | Chủ cuối cùng | không ngưng / sửa được ở màn này |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/staff.http.test.ts` — ca "NT-NV-003 · R-CAKE-AUTHZ-5 …" |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| bước 1–6 | như §5 | khớp | 0 | |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
