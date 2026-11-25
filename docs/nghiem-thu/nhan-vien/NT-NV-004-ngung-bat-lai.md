# NT-NV-004 · Ngưng / bật lại nhân viên

<!-- [2026-11-25 02:00 PM Johnny Chu - Chu Hoàng Anh] NGHIEM-THU — tạo phiếu (NO-CHUAN R-STD-DLV-1) cho màn đã làm ở PHASE-004 S004-7; chờ bộ phận sử dụng chốt. -->

| | |
|---|---|
| Phân hệ | Nhân viên & quyền |
| Màn hình | Cài đặt › Nhân viên — sheet Sửa › **Ngưng nhân viên…** (có xác nhận) |
| Bộ phận yêu cầu | Chủ cửa hàng / Quản lý chăm sóc khách hàng |
| Ngày tạo | 25/11/2026 |
| Trạng thái | Nháp — phần mềm đã có (làm trước khi có khuôn nghiệm thu), chờ bộ phận sử dụng chốt tình huống; chốt xong chuyển Chờ nghiệm thu |
| Trụ cột / tiêu chí | T13 nghiệm thu; IDENTITY (app có quyền chặn cuối) |

## 1. Mục đích
Nhân viên nghỉ việc: ngưng ở Open CRM thì người đó bị đăng xuất ngay trên mọi máy, vé WordPress không vào được nữa, rời khỏi tài khoản kênh, hội thoại đang giữ trở về hàng chung; lịch sử giữ nguyên và bật lại được.

## 2. Khai báo trước
Lan đang hoạt động, được giao 1 tài khoản kênh, đang giữ 1 hội thoại, đang mở phần mềm.

## 3. Các bước thao tác
1. Bấm dòng Lan → **Ngưng nhân viên…** → đọc 4 hệ quả → **Ngưng**.
2. Lan bấm tiếp trên phiên đang mở; Lan mở lại từ WordPress.
3. Thử đổi vai của Lan khi đang ngưng.
4. **Bật lại** Lan; Lan mở lại từ WordPress.

## 4. Số liệu đầu vào

| Nhân viên | Tài khoản kênh được giao | Hội thoại đang giữ |
|---|---|---|
| Lan | 1 | 1 |

## 5. Kết quả mong đợi

| Mục | Mong đợi |
|---|---|
| Kết quả lệnh ngưng | gỡ 1 tài khoản kênh, trả 1 hội thoại về hàng chung; trạng thái "đã ngưng"; không còn tài khoản kênh |
| Phiên đang mở | hết hiệu lực ngay (401) |
| Vé WordPress | bị từ chối (401) — "Tài khoản đã bị ngưng ở Open CRM — nhờ quản lý bật lại." |
| Đổi vai khi đang ngưng | bị chặn (409) — bật lại trước |
| Bật lại | hoạt động; vào lại từ WordPress được |

## 6. Trường hợp lệch chuẩn
| # | Làm thế này | Phần mềm phải |
|---|---|---|
| 1 | ngưng Chủ / ngưng chính mình | bị chặn (403) |
| 2 | xoá nhân viên | không có — chỉ ngưng, lịch sử giữ nguyên |

## 7. Kết quả chạy
| | |
|---|---|
| Ngày chạy | 25/11/2026 |
| Bản code (commit) | 86e60af (main) — 118/118 test đạt |
| Test tự động | `apps/api/test/staff.http.test.ts` — ca "NT-NV-004 · ngưng …" |

| Mục | Mong đợi | Phần mềm | Chênh | Giải thích |
|---|---|---|---|---|
| gỡ tài khoản / trả hội thoại | 1 / 1 | 1 / 1 | 0 | |
| phiên cũ, vé WordPress | 401, 401 | khớp | 0 | `session_version`++, `is_active=false` |
| đổi vai khi ngưng | 409 | khớp | 0 | |
| bật lại | vào được | khớp | 0 | |

## 8. Biên bản nghiệm thu
| Ngày | Bộ phận | Kết quả | Ghi chú |
|---|---|---|---|

## 9. Lịch sử thay đổi
| Ngày | Thay đổi |
|---|---|
| 25/11/2026 | tạo phiếu sau khi phần mềm đã có (nợ chuẩn R-STD-DLV-1) |
