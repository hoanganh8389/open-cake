# PHASE-018 — Nơi lưu tệp theo site: một cổng, hai bộ (đĩa của app | R2)
<!-- [2026-11-26 11:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-018 — chủ (2026-11-26): nơi lưu đính kèm là thư mục dữ liệu của Cake, tham khảo cơ chế multisite WP khi nhân bản qua open-setup, chuẩn hoá vì chung một bản mã; open-setup nghiên cứu media WP + R2; R2 thì không đặt hạn giữ. -->

> **Việc lộ trình:** W3 · **Áp dụng cho:** cake · open-setup · bizcity-platform · **Trạng thái:** ◐ (nghiên cứu xong, chờ chủ duyệt chuẩn) · **Phụ thuộc:** 014 (ngữ cảnh site), 016 (khung chạy)
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Nghiên cứu + đề xuất chuẩn:** [26-NOI-LUU-TEP](../../architecture/26-NOI-LUU-TEP.md) (`bizcity_storage@1`).
> **Mục tiêu:** Cake lưu tệp (trước hết: đính kèm chat — [PHASE-007 S007-3](../PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/README.md)) qua **một cổng `storage`**, khoá luôn có `sites/<site>` như `uploads/sites/{blog_id}/` của WordPress, chạy được trên đĩa của app (Tự cài) hoặc R2 (mạng bizcity), nhân bản / dọn site theo tiền tố.
> **Ngoài phạm vi:** media công khai của web WP (đã có `bizcity-r2.php`), dữ liệu riêng của Cell (`DATA_DIR` của zalo-hub), quét virus.

## Phương án (chi tiết ở 26 §3–§4)

```text
mã nghiệp vụ ─► storage.put / get / signedUrl / copyPrefix …   (một cổng, biết site từ ngữ cảnh yêu cầu)
                    │
          STORAGE_DRIVER=local ──► DATA_DIR/files/cake/sites/<site>/chat/<tenant>/<yyyy>/<mm>/<băm>-<ngẫu nhiên>.<đuôi>
          STORAGE_DRIVER=s3    ──► R2 bucket riêng tư:  cake/sites/<site>/chat/…   (cùng khoá tương đối)
CSDL: files(file_id, site-scoped tenant_id, area, key tương đối, sha256, size, content_type, original_name, created_by, created_at, archived_at)
```

| Quyết định | Nội dung | Nguồn |
|---|---|---|
| D-STOR-1 | Một cổng hai bộ (phương án C) — mã nghiệp vụ không biết đĩa hay R2 | 26 §3 |
| D-STOR-2 | Khoá luôn có `sites/<site>`; bản cài một công ty dùng `_default` | 26 R-STOR-1, bài học open-ketoan `run-log` (F-4) |
| D-STOR-3 | Riêng tư mặc định; Cell tải bằng URL ký 10 phút, chỉ tệp đó | 26 R-STOR-3 |
| D-STOR-4 | **R2: app không đặt hạn giữ** (chủ chốt 2026-11-26). Đĩa: cảnh báo 80 %, mặc định không xoá (Q-STOR-2) | 26 R-STOR-6 |
| D-STOR-5 | Nhân bản site = `copyPrefix` theo tiền tố, chia lượt, ưu tiên tệp đang tham chiếu — như `MUCD_Files::r2_duplicate_prefix_chunked` của WP | 26 F-2, R-STOR-5 |
| D-STOR-6 | Viết cổng trong Cake trước (`apps/api/src/storage/`), đủ ổn thì nâng lên `@bizcity/platform` (cùng nếp `packages/flex`) | canon tái dùng |

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S018-1 | cake | nghiên cứu + đề xuất chuẩn ([26-NOI-LUU-TEP](../../architecture/26-NOI-LUU-TEP.md)) |
| S018-2 | cake | cổng `storage` hai bộ `local` / `s3` + bộ test chạy chung cho hai bộ (SC-STOR-4; `s3` thử bằng MinIO trong CI) |
| S018-3 | cake | migration bảng `files` (RLS theo đơn vị) + khoá theo site + kiểm cỡ / loại theo đầu tệp / sha256 (R-STOR-7) |
| S018-4 | cake | tải lên (`cake.file.upload`), tải về có quyền, URL ký 10 phút cho Cell (SC-STOR-3) |
| S018-5 | cake | `copyPrefix` / `deletePrefix` móc vào cấp site, nhân bản từ mẫu, xoá mềm 30 ngày (PHASE-014) |
| S018-6 | cake | đo dung lượng bộ `local`, cảnh báo 80 % ở `GET /api/v1/system/diagnostics` |
| S018-7 | open-setup | nghiên cứu media WP + R2 theo cấu hình WP đang cài (26 §6, OS-R2-1…6); sinh biến `STORAGE_*` cho app lúc cài |
| S018-8 | bizcity-platform | nộp chuẩn `bizcity_storage@1`; nâng cổng lên `@bizcity/platform`; báo open-ketoan rủi ro F-4 (`attachments`, `bang-chung` thiếu `sites/<site>`) |

## Xong khi

Hai site Cake cùng `tenant_id = 1` gửi cùng một ảnh ⇒ hai khoá khác nhau, site A không đọc được tệp site B (SC-STOR-2); cùng bộ test xanh trên `local` và `s3`; Cell tải ảnh bằng URL ký rồi gửi lên Zalo, quá 10 phút URL hết hiệu lực; nhân bản một site mẫu có tệp ⇒ site mới đủ tệp, dừng giữa chừng tiếp được (SC-STOR-5).

## Nhật ký

- 2026-11-26: mở phase; S018-1 xong (nghiên cứu); chủ duyệt mockup đính kèm PHASE-007 ⑦–⑩ và chốt "R2 không đặt hạn giữ".
- 2026-11-27: <!-- [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 --> chủ chốt Q-STOR-1 = A, Q-STOR-2 = A, Q-STOR-3 = B. **S018-2 ☑** — `apps/api/src/storage/`: khoá theo chuẩn (`keys.ts`, chặn khoá thoát thư mục), giao diện chung (`types.ts`), bộ `local` (DATA_DIR/files, vé tải ký HMAC từ CAKE_SECRET_KEY), bộ `s3` (AWS SDK v3 3.700.0, path-style, URL ký sẵn ≤ 1 giờ, chép / xoá tiền tố phía máy chủ chia lượt), chọn bộ theo `STORAGE_DRIVER`; slug site `_default` ở bản một công ty, nhiều site đóng khi thiếu (PHASE-014). Một bộ test chạy cho cả hai bộ (`apps/api/test/storage.test.ts`): **10/10** — bộ s3 chạy trên SeaweedFS có bật kiểm chữ ký (ảnh MinIO công khai không còn kéo được ở Docker Hub / quay.io); URL ký bị sửa ⇒ 403 thật. Compose: volume `cake-files` + biến `STORAGE_*` (trước đây API không có volume dữ liệu — tệp sẽ mất khi dựng lại). Toàn bộ 175/175.
- 2026-11-27: <!-- [2026-11-27 11:05 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 --> chủ: "S3 không cài thì local vẫn phải dùng được, giống WP media" ⇒ R-STOR-2a: bộ s3 nạp lười (không nạp AWS SDK khi chỉ dùng đĩa); đặt s3 mà thiếu / sai cấu hình ⇒ lùi về đĩa kèm lý do, hiện ở chẩn đoán `SC-STOR-0` (`GET /api/v1/system/diagnostics`), không làm sập app. Test thêm 5 ca (mặc định, thiếu biến, tên bộ sai, đủ cấu hình, không import tĩnh SDK); toàn bộ **180/180**.
- 2026-11-27: <!-- [2026-11-27 11:21 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-3 --> **S018-3 ☑** — migration `0109_files.sql` (khoá tương đối, `driver`, sha256, cỡ, loại, tên gốc, `archived_at`; RLS theo đơn vị). `storage/sniff.ts`: loại xác định từ **đầu tệp** (JPG / PNG / WebP · PDF · DOCX / XLSX / ZIP · DOC / XLS), loại thật thắng đuôi khai, chặn tệp chạy được theo nội dung (MZ, ELF, Mach-O, `#!`) và theo đuôi, ảnh ≤ 10 MB, tệp ≤ 25 MB (D-ATT-1). `storage/files.ts`: `saveFile` (cùng nội dung cùng vùng ⇒ trả tệp cũ; ghi dòng lỗi ⇒ dọn đối tượng mồ côi), `loadFile` (kiểm lại sha256; tệp nằm ở bộ đang tắt ⇒ `NOT_READY` rõ, tệp cũ trên đĩa vẫn đọc được sau khi chuyển sang s3), `archiveFile`. Test `files.test.ts` **14/14** (9 ca loại tệp + chặn / quá cỡ + 4 ca Postgres); toàn bộ **194/194**.
