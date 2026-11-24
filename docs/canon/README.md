# Canon và xương sống xuyên app — áp cho open-cake

<!-- [2026-11-24 05:08 PM Johnny Chu - Chu Hoàng Anh] SPINE-1 — thêm chỗ trỏ tới chuẩn xương sống bizcity_spine@1 (bizcity-platform) cạnh chỗ trỏ canon đã có; khai trục của app ở bizcity.app.json. Không đổi mã. -->

| Tài liệu | Ở đâu |
|---|---|
| Canon chung (bản chủ) | [open-hub/docs/canon](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/README.md) — chỗ trỏ cũ: [BIZCITY-OPEN-CANON-v1.md](BIZCITY-OPEN-CANON-v1.md) |
| **Xương sống xuyên app `bizcity_spine@1`** | [bizcity-platform/docs/standard/BIZCITY-SPINE-v1.md](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-SPINE-v1.md) · schema máy đọc `packages/contracts/schema/spine/` |
| Luật của repo này | [docs/00-CANON.md](../00-CANON.md) (R-CAKE-*) |

## App này trong xương sống (`bizcity.app.json` ở gốc repo)

| | |
|---|---|
| Làm chủ | `contact` (`contact_id` ULID, `contact_identities` có `proof`), `touch` (sổ chạm khách, chỉ thêm), chứng từ `cake.<loại>:<id>` |
| Dùng | `tenant`, `user` (`sub = wp:<id>` qua SSO), `item` (bản sao khi cần gợi ý hàng), `partner` (gửi `code = CAKE-<contact_id>`, lưu `partner_ref` một chiều — R-MD-1) |
| Gửi sau | sự kiện sổ chạm khách qua outbox; `Idempotency-Key = <doc_ref>@<version>` |
| Đối chiếu | `RC-SPINE-partner`: mọi `partner_ref` của cake tra được ở open-ketoan |
| Hình thức tham chiếu | app khác nói tới khách của cake bằng `ContactRef {id}` hoặc `{identity: {kind, value, proof}}` — **không bao giờ** bằng tên (R-CANON-3, R-SPINE-2) |

Giai đoạn W1 (chưa có máy chủ): các mục bản sao / outbox / đối chiếu vào ở PHASE-016 cùng DB và API; manifest khai trước để bộ kiểm và trang bizcity.vn thấy đúng vai.

## Kiểm

```bash
node ../bizcity-platform/tools/spine-check.mjs --manifest bizcity.app.json   # SC-SPINE-1, phải ĐẠT
```

Thêm trục mới hay đổi dạng ID: đề xuất ở bizcity-platform (chuẩn §7), không tự làm ở đây.
