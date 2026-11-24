# ADR-0001 — open-cake dùng chung khung open-ketoan; trục là `contact_id`, không phải kênh

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ADR-0001 — đề xuất, chờ chủ duyệt. -->

**Trạng thái:** đề xuất · 2026-11-24 · **Áp dụng cho:** cake (web). Plugin WP không đổi.

## Bối cảnh

- Open CRM đang là plugin WordPress (PHP / MySQL), trục là hội thoại + số Zalo (`crm-ledger@1`), UI Deplao 13 màn đã vào mã.
- Chủ muốn: web online như open-ketoan, không Electron; một bản mã, mỗi site một database, open-setup cấp site; `contact_id` xuyên mọi kênh; golden case Facebook 4 mặt (cá nhân, Page, Group, comment).
- open-ketoan đã có: Fastify · Kysely · PostgreSQL · React; một cửa `submitDocumentIn`; sổ chỉ thêm bằng trigger; outbox; RLS; MCP; selfcheck; PHASE-039 nhiều CSDL (chốt 2026-11-21).
- Facebook là bốn không gian định danh khác nhau (UID cá nhân, PSID theo Page, `from.id` comment, `from.id` group); Meta không có API ghép.

## Quyết định

1. Repo mới `open-cake`, TypeScript, **sao chép khung open-ketoan** (`packages/platform`, `module-sdk`, `ui-kit`, `cli`, `selfcheck`, docker) — fork có `UPSTREAM.md`, tiến tới gói chung `@bizcity/platform` (ADR sau).
2. Thay `accounting-kernel` bằng `care-kernel`: `contacts · contact_identities · channel_accounts · conversations · touch_events · touch_ledger · messages · contact_state`.
3. **`contact_id` là trục**; danh tính kênh tách ra `contact_identities` có `scope`, `confidence`, `proof`.
4. Kênh sống ở Cell; hợp đồng `bizcity_touch@1` (vào) và `bizcity_channel_command@1` (ra).
5. Nhiều CSDL theo PHASE-039, cùng `bizcity_site_provisioning@1`.
6. Plugin WP `open-crm` chạy song song theo canon §6; chuyển dữ liệu là phase riêng.

## Hệ quả

- Được: dùng lại toàn bộ hạ tầng đã chứng minh; open-setup cấp CRM mà không học hợp đồng mới; một người nhiều kênh không bị tách thành nhiều "khách".
- Trả giá: hai bản Open CRM trong một thời gian; fork platform có thể trôi; cần người đọc Meta docs khi webhook đổi.
- Đường lùi: plugin WP vẫn là bản chạy; open-cake tắt được theo site.
