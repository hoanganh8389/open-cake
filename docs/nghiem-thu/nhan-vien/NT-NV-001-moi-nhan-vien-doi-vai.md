# NT-NV-001 · Mời nhân viên, vào lần đầu đúng vai, đổi vai

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho màn đã làm ở PHASE-004 S004-7; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Cài đặt › Nhân viên (`#/staff`) — sheet Mời, sheet Sửa |
| Bộ phận yêu cầu | Chủ cửa hàng / Quản lý chăm sóc khách hàng |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; USERS-ROLES (một vai kiểu WordPress) |

## 1. Mục đích
Chủ / quản lý thêm nhân viên mới bằng email, chọn vai và tài khoản kênh trước; nhân viên vào Open CRM bằng tài khoản WordPress cùng email và có ngay đúng quyền. Đổi vai chính thì phiên cũ hết, nhân viên vào lại nhận vai mới.

## 2. Khai báo trước
Đơn vị "hoa-mai" có tài khoản kênh Zalo "Shop Hoa Mai"; người thao tác là Chủ (có `users:write`); WordPress cấp vé đăng nhập cho email nhân viên.

## 3. Các bước thao tác
1. Cài đặt › Nhân viên › **Mời nhân viên**: email `Lan@HoaMai.vn`, tên "Nguyễn Thị Lan", vai **Nhân viên chăm sóc**, tick "Shop Hoa Mai" → **Mời**.
2. Lan mở Open CRM từ WordPress (cùng email) lần đầu.
3. Mời lại cùng email; thử mời với vai **Chủ**.
4. Bấm dòng Lan → đổi vai sang **Tiếp thị** → **Lưu**; Lan bấm tiếp trên phiên cũ, rồi vào lại.

## 4. Số liệu đầu vào

| Email | Tên | Vai | Tài khoản kênh |
|---|---|---|---|
| Lan@HoaMai.vn | Nguyễn Thị Lan | Nhân viên chăm sóc | Shop Hoa Mai (Zalo) |

## 5. Kết quả mong đợi

| Mục | Mong đợi |
|---|---|
| Dòng nhân viên sau khi mời | email lưu chữ thường `lan@hoamai.vn`, vai Nhân viên chăm sóc, hoạt động, "chưa vào lần nào", thấy hội thoại của Shop Hoa Mai |
| Bằng chứng | lệnh mời có biên nhận (`meta.receipt.evidenceId`) |
| Lan vào lần đầu | có quyền trả lời hội thoại (`cake:inbox-lap`), **không** có quyền quản lý nhân viên (`users:write`) |
| Mời trùng email | báo "Email này đã là nhân viên của đơn vị." (409) |
| Mời vai Chủ | bị chặn (403) — chủ đơn vị do nền quản |
| Đổi vai chính | phiên cũ của Lan hết hiệu lực ngay (401); vào lại có quyền của Tiếp thị (`cake:catalog-gia`) |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | email sai khuôn / thiếu tên | nút Mời khoá |
| 2 | người thao tác không có `users:write` | nút Mời khoá kèm lý do |
| 3 | mời vai Chủ | từ chối, không tạo người |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/staff.http.test.ts` — ca "NT-NV-001 · mời …", "NT-NV-001 · đổi vai chính …" (Postgres thật, vai CSDL ứng dụng) |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| mời → dòng nhân viên | như §5 | khớp | 0 | |
| vào lần đầu → quyền | có inbox-lap, không users:write | khớp | 0 | |
| trùng email / vai Chủ | 409 / 403 | khớp | 0 | |
| đổi vai chính | phiên cũ 401, vai mới có catalog-gia | khớp | 0 | |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
