# NT-NV-006 · Nhân viên chỉ thấy hội thoại của tài khoản kênh được giao

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho phạm vi xem đã làm ở PHASE-004 S004-5; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Hộp thư (`#/inbox`), Contact 360; giao tài khoản kênh ở Cài đặt › Nhân viên |
| Bộ phận yêu cầu | Quản lý chăm sóc khách hàng |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; SECURITY (dữ liệu cá nhân trong tin nhắn) |

## 1. Mục đích
Nội dung tin nhắn là dữ liệu cá nhân của khách: nhân viên chỉ đọc được hội thoại của tài khoản kênh mình được giao, hoặc hội thoại được giao riêng cho mình. Chủ / quản lý thấy hết.

## 2. Khai báo trước
Đơn vị có 2 tài khoản kênh: Zalo "Shop Hoa Mai" và Fanpage "Hoa Mai Fashion", mỗi tài khoản có hội thoại. Lan là Nhân viên chăm sóc, chưa được giao gì.

## 3. Các bước thao tác
1. Lan mở Hộp thư khi chưa được giao gì.
2. Chủ giao Zalo cho Lan; Lan mở lại Hộp thư.
3. Lan mở thẳng đường dẫn một hội thoại Fanpage; thử gắn nhãn hội thoại đó.
4. Lan mở Contact 360 của khách Fanpage đó.
5. Chủ giao riêng MỘT hội thoại Fanpage cho Lan; rồi gỡ Lan khỏi Zalo.

## 4. Số liệu đầu vào

| Người | Vai | Được giao |
|---|---|---|
| Lan | Nhân viên chăm sóc | bước 1: không · bước 2: Zalo · bước 5: 1 hội thoại Fanpage, bỏ Zalo |

## 5. Kết quả mong đợi

| Bước | Mong đợi |
|---|---|
| 1 | không thấy tài khoản kênh nào, không thấy hội thoại nào |
| 2 | chỉ thấy tài khoản Zalo và hội thoại của Zalo |
| 3 | "không tìm thấy" (404) — không lộ là có; gắn nhãn cũng 404 |
| 4 | dòng thời gian vẫn hiện các lần chạm, **ẩn nội dung tin** |
| 5 | thấy đúng 1 hội thoại Fanpage được giao; hết thấy Zalo |
| Chủ | thấy cả hai kênh (có `cake:all-inbox-xem`) |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | giao cho người không thuộc đơn vị / đã ngưng | từ chối (400) |
| 2 | nhân viên tự giao tài khoản kênh cho mình | bị chặn (403) — cần `users:write` |
| 3 | khoá API đọc hội thoại | bị chặn — khoá không có quyền hộp thư |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/scope.http.test.ts` — các ca "NT-NV-006 · …" |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| bước 1–5, Chủ | như §5 | khớp | 0 | một chỗ quyết: `apps/api/src/care/scope.ts` |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
