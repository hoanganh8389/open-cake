# 26 — Nơi lưu tệp: một bản mã, nhiều site (nghiên cứu để chuẩn hoá)
<!-- [2026-11-26 11:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-018 — chủ (2026-11-26): "nơi lưu là thư mục dữ liệu của Cake nhưng cần tham khảo cơ chế multisite của WP khi duplicate qua open-setup; lập tài liệu nghiên cứu để chuẩn hoá vì chung một code base; open-setup nghiên cứu media WP có R2 theo cấu hình R2 của WP đang cài; nếu là R2 thì không cần quan tâm giữ bao lâu". -->

> **Trạng thái:** nghiên cứu xong · **đề xuất chuẩn `bizcity_storage@1`** chờ chủ duyệt, duyệt rồi nộp sang `bizcity-platform/docs/standard/` (cạnh [MULTISITE](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-MULTISITE-v1.md), chuẩn đó hiện chỉ nói về CSDL).
> **Phase thực hiện:** [PHASE-018](../phases/PHASE-018-NOI-LUU-TEP/README.md) · **Người dùng đầu tiên:** đính kèm ảnh / tệp khi chat ([PHASE-007 S007-3](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/README.md)).
> **Cách đọc:** §1 là sự thật đọc từ mã đang chạy (có đường dẫn để kiểm lại). §3–§4 là đề xuất. §6 là việc của open-setup.

## 0. Một câu

**Tệp của mỗi site nằm dưới một tiền tố mang mã site — cùng ý với `uploads/sites/{blog_id}/` của WordPress — qua một cổng lưu trữ có hai bộ (đĩa của app | R2); mã nghiệp vụ không biết đang dùng bộ nào; tệp riêng tư không bao giờ nằm dưới tiền tố mà CDN công khai phục vụ.**

## 1. Sự thật đọc mã (2026-11-26)

| # | Ở đâu | Thấy gì | Nghĩa là |
|---|---|---|---|
| F-1 | `wp-content/mu-plugins/bizcity-r2.php` (1.2.0) | Media WordPress đẩy lên R2 với khoá **soi gương thư mục `uploads/`**: site chính `uploads/2025/12/a.jpg`, site con `uploads/sites/{blog_id}/2025/12/a.jpg` (cả bản gốc lẫn các cỡ ảnh). Cấu hình là hằng số trong `wp-config.php`: `BIZCITY_R2_ACCESS_KEY`, `BIZCITY_R2_SECRET_KEY`, `BIZCITY_R2_BUCKET`, `BIZCITY_R2_ENDPOINT`, `BIZCITY_MEDIA_CDN`. URL được viết lại sang CDN công khai, `Cache-Control: public, max-age=31536000, immutable`. Giữ bản cục bộ (`BIZCITY_R2_DELETE_LOCAL=false`). Trùng khoá ⇒ đổi tên `a(1).jpg`. Tự kiểm mỗi ngày ghi `global/_selftest_…`. Lệch giờ ⇒ tạm dừng 15 phút | khuôn khoá theo site **đã chạy thật** và đã quen với đội vận hành; nhưng toàn bộ là **công khai** qua CDN |
| F-2 | `mu-plugins/bizcity-web/lib/files.php` (`MUCD_Files`) + `bizcity-web-main.php` | Nhân bản site WP: chép **phía máy chủ R2** (`CopyObject`) từ `uploads/sites/{nguồn}/` sang `uploads/sites/{mới}/`, chia lượt có thẻ tiếp tục (`token`, `start_after`, giới hạn giờ), **ưu tiên tệp đang được nội dung tham chiếu** (quét CSDL site mới) để site mới không vỡ ảnh khi lượt chép dài chưa xong; liệt kê R2 sót thì chép từ URL CDN công khai. Không có R2 ⇒ `copy_local_uploads` chép đệ quy thư mục `uploads` | nhân bản = chép theo tiền tố site, không cần biết từng tệp; tiền tố là chìa khoá |
| F-3 | open-ketoan `packages/platform/src/core/documents.ts` | Năng lực đính kèm chung `documents.attachments`: tệp ở `DATA_DIR/attachments/<tenant_id>/<yyyy-mm>/<sha256[0:16]>-<ngẫu nhiên>-<tên>`; CSDL `document_attachments` giữ siêu dữ liệu + `storage_path` tương đối + `sha256`; tối đa 15 MB; cùng nội dung gửi lại ⇒ trả tệp cũ; gỡ = `archived_at`. **Chỉ đĩa cục bộ** | có sẵn khuôn siêu dữ liệu + băm + đường dẫn tương đối để tái dùng (R-CANON tái dùng); chưa có bộ R2 |
| F-4 | open-ketoan `core/run-log.ts` + `docs/ops/NHIEU-SITE.md` §11 | Ở chế độ nhiều site **mọi site đều có đơn vị mã 1** ⇒ nhật ký tệp đã phải tách sang `DATA_DIR/nhat-ky/_sites/<mã site>/…` (PHASE-039 B7b-2: "không tách thì nhật ký các site ghi chung và đọc lẫn"). Nhưng `attachments` (F-3) và bằng chứng niêm phong `DATA_DIR/bang-chung/<tenant_id>/` **vẫn chỉ theo `tenant_id`** | **rủi ro cô lập** ở `SITE_MODE=multi`: hai site cùng `tenant_id = 1` ghi chung một thư mục tệp. Mới là kết luận đọc mã, chưa chạy thử — cần kiểm và sửa ở platform (S018-8) |
| F-5 | `bizcity-platform` `BIZCITY-MULTISITE-v1` | Chuẩn nhiều site chỉ nói CSDL (registry, định tuyến, cấp site, sao lưu từng CSDL, xoá mềm 30 ngày R-SITE-12); **không một dòng về tệp** | khoảng trống của chuẩn nền — tài liệu này lấp |
| F-6 | open-cake | Chưa lưu tệp nào; tệp chat của khách (ảnh CCCD, hoá đơn, đơn hàng…) là **dữ liệu cá nhân** (40-SECURITY) | không được đặt dưới tiền tố CDN công khai như media WP |
| F-7 | zalo-hub (Cell / máy kết nối) | Lệnh kênh mang `content.attachments[{ref, name}]`; Cell tải `ref` rồi gửi lên Zalo. Máy kết nối Tự cài nằm cùng docker compose với Cake; Cell của Hub ở máy khác | `ref` phải là URL **tải được từ xa, có hạn, không lộ tệp khác** |

## 2. Yêu cầu

| Mã | Yêu cầu |
|---|---|
| Y-1 | Một bản mã: bản cài một công ty và mạng nhiều khách chạy cùng mã (R-SITE-5) |
| Y-2 | Cô lập tuyệt đối giữa site: không đường nào đọc / ghi tệp site khác, kể cả khi `tenant_id` trùng (F-4) |
| Y-3 | Chạy được không cần R2 (Tự cài trên một máy); có R2 thì dùng R2 |
| Y-4 | Nhân bản / dọn site theo **tiền tố** như WP (F-2), không theo từng tệp |
| Y-5 | Tệp riêng tư mặc định; chỉ tải qua quyền của app hoặc URL ký hạn ngắn |
| Y-6 | Đổi bộ lưu (đĩa ⇄ R2) không đổi CSDL — CSDL chỉ giữ khoá tương đối |
| Y-7 | Kiểm được tệp: băm sha256, cỡ, loại thật (đầu tệp), không tệp chạy được |

## 3. Phương án

| | A — chỉ đĩa của app | B — chỉ R2 | **C — một cổng, hai bộ (chọn)** |
|---|---|---|---|
| Tự cài không mạng ngoài | ✓ | ✗ | ✓ (bộ đĩa) |
| Mạng bizcity nhiều site | đĩa VPS đầy dần, sao lưu nặng | ✓ | ✓ (bộ R2) |
| Nhân bản site | chép thư mục | `CopyObject` theo tiền tố | cùng một lệnh `copyPrefix`, mỗi bộ tự làm |
| Hạn giữ | phải có (đĩa hữu hạn) | **không cần** (chủ chốt 2026-11-26) | theo bộ |
| Mã nghiệp vụ | gọi `fs` | gọi SDK S3 | chỉ gọi cổng `storage` |

**Chọn C.** Cùng lý do với R-SITE-5: chỉ một chỗ biết có nhiều site / nhiều bộ lưu; mọi chỗ khác gọi một cổng.

## 4. Đề xuất chuẩn `bizcity_storage@1`

### 4.1 Khoá

```text
<app>/sites/<site>/<vùng>/<tenant_id>/<yyyy>/<mm>/<sha256[0:16]>-<ngẫu nhiên 8>.<đuôi>
cake/sites/hoa-mai/chat/1/2026/11/9f3c2a71b0d4e8aa-5c1e0f2b.jpg
```

| Phần | Luật |
|---|---|
| `<app>` | `cake`, `kt`, … — một bucket dùng chung được cho nhiều app mà không đè nhau |
| `sites/<site>` | **mã site** (slug) như `uploads/sites/{blog_id}` của WP (F-1). Bản cài một công ty dùng `_default` (như `run-log` của open-ketoan dùng site ngầm định) — **luôn có** phần này, để lên nhiều site không phải dời tệp |
| `<vùng>` | `chat` (đính kèm hội thoại), `attachments` (chứng từ), `bang-chung` (niêm phong), `public` (ảnh sản phẩm được phép công khai) … |
| `<tenant_id>` | đơn vị **trong** site — cô lập lớp hai, cùng RLS |
| tên tệp | băm + ngẫu nhiên, **không** dùng tên khách đặt (tên gốc chỉ nằm trong CSDL) ⇒ không trùng, không phải đổi tên `a(1).jpg` như F-1, không đoán được |

### 4.2 Luật

| Mã | Luật |
|---|---|
| R-STOR-1 | Mọi khoá tệp có `sites/<site>` (Y-2). Không có ngữ cảnh site ⇒ từ chối (`SITE_CONTEXT_MISSING`), không rơi về `_default` khi đang chạy nhiều site (R-SITE-3) |
| R-STOR-2 | Một cổng `storage` (`put`, `get`, `head`, `delete`, `signedUrl`, `copyPrefix`, `deletePrefix`, `usage`); hai bộ `local` (dưới `DATA_DIR/files/`) và `s3` (R2 dùng giao thức S3). Chọn bằng biến `STORAGE_DRIVER`. Ngoài cổng không mã nào gọi `fs` / SDK S3 cho tệp nghiệp vụ |
| R-STOR-3 | **Riêng tư mặc định.** Tệp nghiệp vụ không nằm dưới tiền tố CDN công khai (`uploads/` của WP, hoặc bucket gắn tên miền công khai). Tải về: qua API có kiểm quyền, hoặc URL ký **hạn 10 phút** cho bên được phép (Cell). Vùng `public` là ngoại lệ có khai báo |
| R-STOR-4 | CSDL giữ **khoá tương đối** + `sha256` + cỡ + loại + tên gốc; không đường dẫn tuyệt đối, không URL CDN ⇒ đổi bộ / đổi bucket / đổi CDN không đổi CSDL (Y-6). Dùng lại khuôn `document_attachments` của F-3 khi lên platform |
| R-STOR-5 | **Cấp site:** không tạo gì (tiền tố có khi có tệp đầu). **Nhân bản site:** `copyPrefix(<app>/sites/<nguồn>/, <app>/sites/<mới>/)` phía máy chủ, chia lượt có thẻ tiếp tục, ưu tiên tệp đang được tham chiếu (bài học F-2). **Xoá mềm site:** giữ tệp 30 ngày cùng CSDL (R-SITE-12) rồi `deletePrefix` |
| R-STOR-6 | **Hạn giữ:** bộ `s3` (R2) — **app không đặt hạn**, không xoá theo tuổi (chủ chốt 2026-11-26); muốn dọn thì đặt luật vòng đời ở bucket, ngoài app. Bộ `local` — app đo dung lượng, cảnh báo ở 80 % đĩa; hạn xoá tệp **chat** là cài đặt của đơn vị (mặc định đề xuất: không xoá — Q-STOR-2); tệp chứng từ / bằng chứng **không bao giờ** xoá theo tuổi (≥ 10 năm, ADR-0030 open-ketoan) |
| R-STOR-7 | Kiểm khi nhận: cỡ theo vùng, loại theo **đầu tệp** (magic bytes) chứ không chỉ đuôi, chặn tệp chạy được; tính sha256 lúc ghi, kiểm lại lúc đọc (như F-3) |
| R-STOR-8 | **Cấu hình theo bản cài, không theo site:** biến `STORAGE_*` đặt một lần lúc cài; tiền tố site tự sinh từ slug. open-setup lấy cấu hình R2 từ mạng WP đang cài (§6) |
| R-STOR-9 | **Sao lưu:** bộ `local` nằm trong volume `appdata` (đã được sao lưu); bộ `s3` dựa vào bản sao / phiên bản của bucket, không chép tệp vào bản sao lưu CSDL |

### 4.3 Biến môi trường

| Biến | Bộ | Ghi chú |
|---|---|---|
| `STORAGE_DRIVER` | cả hai | `local` (mặc định) \| `s3` |
| `DATA_DIR` | local | đã có; tệp ở `DATA_DIR/files/<app>/sites/…` |
| `STORAGE_S3_ENDPOINT`, `STORAGE_S3_BUCKET`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY` | s3 | R2: endpoint `https://<account>.r2.cloudflarestorage.com`, vùng `auto`, path-style (như F-1) |
| `STORAGE_PUBLIC_BASE` | s3, tuỳ chọn | chỉ cho vùng `public`; trống ⇒ không có tệp công khai |

### 4.4 Kiểm

| Mã | Lane | Kiểm |
|---|---|---|
| SC-STOR-1 | HOUSE | ngoài module `storage` không có `fs.writeFile` / `createWriteStream` / client S3 cho tệp nghiệp vụ |
| SC-STOR-2 | test | hai site cùng `tenant_id = 1` ghi cùng tên tệp ⇒ hai khoá khác nhau; site A đọc khoá site B ⇒ từ chối |
| SC-STOR-3 | test | URL ký quá hạn / sửa một ký tự ⇒ 403; URL ký của site A trên `Host` site B ⇒ 403 |
| SC-STOR-4 | test | cùng bộ test chạy cho `local` và `s3` (MinIO / R2 thử) — một hành vi |
| SC-STOR-5 | test | `copyPrefix` nhân bản site: dừng giữa chừng rồi tiếp ⇒ đủ tệp, không trùng |

## 5. Hiện trạng so với chuẩn đề xuất

| Nơi | Khớp | Lệch |
|---|---|---|
| WP media (`bizcity-r2.php`) | tiền tố theo site, nhân bản theo tiền tố | công khai (đúng cho media web, **không** dùng cho tệp nghiệp vụ); site chính không có `sites/` |
| open-ketoan `documents.attachments` | siêu dữ liệu, sha256, đường dẫn tương đối | thiếu `sites/<site>` (F-4); chỉ đĩa |
| open-ketoan `bang-chung` | — | thiếu `sites/<site>` (F-4) |
| open-ketoan `run-log` | `_sites/<site>` | ngoài phạm vi tệp nghiệp vụ |
| open-cake | — | chưa có (PHASE-018) |
| zalo-hub `DATA_DIR` | — | dữ liệu của Cell, không thuộc site app — ngoài phạm vi |

## 6. Việc của open-setup — media WP có R2 theo cấu hình R2 của WP đang cài

open-setup là nơi cài và cấp site (R-STD-SITE-2: không chạm CSDL app). Phần tệp, open-setup cần nghiên cứu và chốt (ghi ở open-setup, [PHASE-018 S018-7](../phases/PHASE-018-NOI-LUU-TEP/README.md)):

| Mã | Câu hỏi | Điểm xuất phát đã biết |
|---|---|---|
| OS-R2-1 | Đọc cấu hình R2 của mạng WP đang cài ở đâu, ai được đọc | hằng số `BIZCITY_R2_*` + `BIZCITY_MEDIA_CDN` trong `wp-config.php` (F-1); thiếu ⇒ WP tự báo `CONFIG_MISSING` |
| OS-R2-2 | App dùng **cùng bucket** với media WP hay bucket riêng | cùng bucket được nếu tiền tố app (`cake/…`) không bao giờ được CDN công khai phục vụ — cần kiểm cấu hình tên miền công khai của bucket (CDN đang trỏ cả bucket hay chỉ `uploads/`). Không chắc ⇒ **bucket riêng tư riêng** |
| OS-R2-3 | Khoá truy cập cho app | **không** dùng lại khoá của WP: tạo token R2 quyền hẹp (chỉ bucket / tiền tố của app, đọc + ghi), đưa vào biến `STORAGE_S3_*` của app lúc cài |
| OS-R2-4 | Nhân bản site có kèm tệp app không | WP nhân bản tệp theo tiền tố (F-2). Site app cấp từ **mẫu** (`CREATE DATABASE … TEMPLATE`) thì tệp mẫu chép bằng `copyPrefix` cùng lúc; site trắng thì không chép gì |
| OS-R2-5 | Lệch giờ máy chủ | R2 từ chối chữ ký khi lệch giờ (F-1 tạm dừng 15 phút) — kiểm NTP của VPS là một bước cài |
| OS-R2-6 | Hiện cấu hình ở Site Manager | trạng thái bộ lưu của từng app (`local` / `s3`, dung lượng, lần tự kiểm cuối), **không** hiện khoá |

## 7. Quyết định của chủ (2026-11-27)
<!-- [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — chủ chốt Q-STOR-1…3 theo đề xuất -->

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| Q-STOR-1 | Duyệt khuôn khoá §4.1 và luật §4.2 làm chuẩn chung `bizcity_storage@1` (nộp `bizcity-platform`) | **chốt A**: chuẩn chung; `sites/<slug Workspace>` (một công ty: `_default`) |
| Q-STOR-2 | Bộ `local` có xoá tệp chat theo tuổi không | **chốt A**: không xoá; cảnh báo 80 % đĩa; settings `bizcity.cake.storage.chat_retention_days` (trống = không xoá) để chủ đơn vị tự bật; chứng từ / bằng chứng không bao giờ xoá theo tuổi |
| Q-STOR-3 | App dùng chung bucket media WP hay bucket riêng | **chốt B**: bucket riêng tư riêng, cùng tài khoản R2, token quyền hẹp, không gắn tên miền công khai; một bucket cho mọi app open-core, tách bằng tiền tố `<app>/` |

## Nhật ký

- 2026-11-26: bản đầu — đọc `bizcity-r2.php`, `bizcity-web` (nhân bản site), open-ketoan `documents` / `run-log` / `NHIEU-SITE`, chuẩn MULTISITE của platform; đề xuất `bizcity_storage@1`; chủ chốt: R2 không đặt hạn giữ.
