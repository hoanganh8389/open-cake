# NT-NV-005 · Khoá API: tạo (hiện một lần), dùng theo phạm vi, thu hồi

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho màn đã làm ở PHASE-004 S004-3; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Cài đặt › Nhân viên › tab **Khoá API** (`#/staff?tab=keys`) |
| Bộ phận yêu cầu | Chủ cửa hàng (nối POS / Kế Toán) |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; SECURITY (khoá băm, không quyền rủi ro cao) |

## 1. Mục đích
Chủ tạo khoá cho phần mềm khác (POS, Kế Toán) đọc danh bạ và hàng hoá; khoá chỉ hiện một lần, Open CRM chỉ giữ bản băm; thu hồi là hết dùng được ngay.

## 2. Khai báo trước
Người thao tác là Chủ (`settings:write`); có ít nhất một mặt hàng trong danh mục.

## 3. Các bước thao tác
1. **Tạo khoá** → tên "POS Quận 3", được làm **Đọc danh bạ + hàng hoá** → **Tạo khoá** → **Chép**.
2. POS gọi `GET /api/v1/catalog/items` với header `X-Api-Key`; POS thử đọc hội thoại.
3. **Thu hồi…** khoá → xác nhận; POS gọi lại.
4. Quản lý thử tạo khoá.

## 4. Số liệu đầu vào

| Tên khoá | Phạm vi |
|---|---|
| POS Quận 3 | cake:read (cake:contacts-xem, cake:catalog-xem) |

## 5. Kết quả mong đợi

| Mục | Mong đợi |
|---|---|
| Khoá hiện ra | dạng `kc_` + 43 ký tự; danh sách chỉ hiện 10 ký tự đầu |
| Gửi lặp lệnh tạo (cùng khoá chống lặp) | không hiện lại khoá rõ; CSDL không chứa khoá rõ ở đâu |
| POS đọc hàng hoá | 200 |
| POS đọc hội thoại | 403 (ngoài phạm vi) |
| Sau thu hồi | 401 ngay |
| Quản lý tạo khoá | 403 |
| Phạm vi lạ (`documents:write`) | 400 |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | đóng sheet khi chưa chép | không xem lại được — thu hồi và tạo khoá mới |
| 2 | thu hồi rồi bật lại | không có — tạo khoá mới |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/staff.http.test.ts` — ca "NT-NV-005 · khoá API …" |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| khuôn khoá, tiền tố | như §5 | khớp | 0 | |
| CSDL không có khoá rõ | 0 dòng | 0 | 0 | `action_requests` lưu bản ẩn |
| đọc hàng / hội thoại / sau thu hồi | 200 / 403 / 401 | khớp | 0 | |
| quản lý / phạm vi lạ | 403 / 400 | khớp | 0 | |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
