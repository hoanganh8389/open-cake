# open-cake · Hợp đồng

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] CONTRACTS — danh mục hợp đồng open-cake làm chủ và hợp đồng dùng lại; quy ước tên bizcity_<x>@MAJOR theo open-ketoan docs/standard/VERSIONING.md. -->

**Quy ước** (open-ketoan `VERSIONING.md`): tên dây `bizcity_<tên>@MAJOR`; file `BIZCITY-<TÊN>-v<MAJOR>.md` (+ `.schema.json` khi có hình dữ liệu); dòng đầu `> **Phiên bản:** x.y.z[-draft] · ngày · **Trạng thái:** …`; changelog cuối file. Thêm trường tuỳ chọn = minor; phá = file `-v2` + ADR + chạy song song. Bên nhận bỏ qua trường lạ. Header tuỳ chọn `X-Bizcity-Contract`. Schema thật là zod trong `packages/contracts/src/`, xuất JSON Schema bằng `npm run contracts:emit`; fixture ở `fixtures/`.

## Open-cake làm chủ

| Tên dây | File | Phiên bản | Ai dùng |
|---|---|---|---|
| `bizcity_touch@1` | [BIZCITY-TOUCH-v1.md](BIZCITY-TOUCH-v1.md) | 0.1.0-draft | Cell → Hub → Cake |
| `bizcity_channel_command@1` | [BIZCITY-CHANNEL-COMMAND-v1.md](BIZCITY-CHANNEL-COMMAND-v1.md) | 0.1.0-draft | Cake → Hub → Cell |
| `bizcity_contact@1` | [BIZCITY-CONTACT-v1.md](BIZCITY-CONTACT-v1.md) | 0.1.0-draft | POS, Kế Toán, Twin Brain tra / liên kết người |

## Dùng lại (chủ: open-ketoan)

`bizcity_api@1` · `bizcity_errors@1` · `bizcity_event@1` · `bizcity_evidence@1` · `bizcity_authorization@1` · `bizcity_settings@1` · `bizcity_module@1` · `bizcity_data@1` · `bizcity_action@1` · `bizcity_mcp@1` · `bizcity_findings@1` · `bizcity_remedy@1` · `bizcity_document@1` · `bizcity_master_data@1` · `bizcity_site_provisioning@1`. **Không** dùng `bizcity_ledger_intake@1` (Cake không nộp sổ).

## Đóng băng (bản WP, không mở rộng)

`zalo-hub-bridge@1.x` · `crm-ledger@1` · `zalo-brain-extension@1` · `connect-setup@1`.
