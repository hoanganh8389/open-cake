# Đánh giá tiến độ mã so với tài liệu — 2026-11-24

> **ĐÃ THAY THẾ bởi [DANH-GIA-TIEN-DO-2026-11-28.md](DANH-GIA-TIEN-DO-2026-11-28.md)** — giữ làm lịch sử; số liệu và các mục L1–L6 dưới đây **đã lỗi thời**. <!-- [2026-11-28 10:03 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — đánh dấu bản cũ đã thay thế -->
<!-- [2026-11-24 06:38 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-24): "đánh giá tiến độ code base so với tài liệu", sau khi phát hành bizcity-platform v0.2.0. Số liệu đo trên main 2026-11-24 18:38. -->

## 1. Một câu

**Lớp hợp đồng + giao diện (W1) đã xong và vượt kế hoạch; lớp chạy thật (máy chủ, DB nối vào giao diện, đăng nhập, quan sát, triển khai) của Cake chưa bắt đầu — nhưng nền để dựng nó (bizcity-platform v0.2.0) vừa sẵn sàng.**

## 2. Số liệu

| Hạng mục | Hiện có |
|---|---|
| Phase | 17 · ☑ 3 (002, 003, 017) · ◐ 3 (001, 005, 016) · ☐ 11 (004, 006–015) |
| Mã | ~4 800 dòng TS / SQL: `contracts`, `care-kernel`, `ui-kit`, `action-client`, `apps/web`; **không có `apps/api`** |
| Hợp đồng | 32 action (19 cake + 4 lớp mềm + 9 danh mục), 3 hợp đồng `bizcity_*@1`, registry lớp mềm; mọi action có bộ giả lập kiểm cả vào lẫn ra |
| DB | 3 migration (0101 care-kernel, 0102 danh mục, 0103 lớp mềm) = 21 bảng, RLS FORCE; đã áp trên Postgres 16 cùng migration nền của platform (48 bảng) — **chưa có mã đọc / ghi DB** |
| Test | 64 (vitest) + typecheck 0 lỗi; 22 ảnh build (PHASE-003, 017) |
| Nền dùng chung | bizcity-platform **v0.2.0** (P2b-1..5): migration nhiều nguồn, 26 bảng nền, cổng vai / quyền, `AppDatabase`, phát hành bằng Release |
| Chuẩn xuyên app | `bizcity.app.json` đạt `spine-check` (SPINE 1.1) |

## 3. Khớp tài liệu

- **Canon / ADR:** R-CAKE-SPINE, LEDGER, ID, MASTER-1..7 có mã thật ở hợp đồng + care-kernel (logic thuần) + migration. ADR-0002 (không chép platform), ADR-0003 (hợp đồng + UI trước), ADR-0004 (danh mục độc lập sẵn ánh xạ) đều đúng như mã.
- **15-CAPABILITIES:** action spec một chỗ (zod) → mock / http / hook React dùng chung — đúng R-CANON-14.
- **20-DATA-SPINE:** trục `contact_id`, sổ chạm khách chỉ thêm, danh tính có bằng chứng — logic + SQL đủ; danh mục theo SPINE 1.1.
- **60-UI / 80-REACT:** 9 / 15 luật đạt (module chỉ dùng ui-kit, URL là nguồn vị trí, react-query, client chung, 4 trạng thái, sheet, token, huy hiệu kênh, tệp < 200 dòng).

## 4. Lệch / thiếu so với tài liệu (theo mức ảnh hưởng)

| # | Tài liệu nói | Mã hiện tại | Phase |
|---|---|---|---|
| L1 | 10-ARCHITECTURE, 70-API-REST: API Fastify trên platform, REST sinh từ action spec, phong bì `bizcity_api@1` | **không có máy chủ**; giao diện chạy hoàn toàn trên bộ giả lập (`?api=http` có nhưng không có gì để gọi) | 016, 007 |
| L2 | 20-DATA-SPINE: `PgCareRepo`, repo danh mục | chỉ `MemoryRepo`; 21 bảng chưa có mã truy cập | 005, 016 |
| L3 | 40-SECURITY-USERS: SSO WordPress, vai `cake:*`, khoá API, bằng chứng | chưa có; platform đã có cổng `registerRoles` nhưng Cake chưa khai vai | 004 |
| L4 | 30-OBSERVABILITY + 016/10-QUAN-SAT: log JSON, số đo Prometheus, trace Tempo, Loki, Grafana | 0 dòng mã | 016 |
| L5 | 50-DEPLOYMENT: compose db · db-migrate · api · web · redis; CI; selfcheck; scripts R-FLOW | compose chỉ có `web`; không CI, không `tests/conformance`, không `scripts/` (S016-7/8/9) | 016 |
| L6 | 80-REACT R-WEB-7 `useCan`, R-WEB-8 `ErrorBoundary`, R-WEB-9 SSE, R-WEB-10 cuộn vô hạn + ảo hoá, R-WEB-11 `i18n/vi.ts`, R-WEB-15 phím ↑/↓ · Enter · `/` trong hộp thư | chưa có (6 / 15 luật) — chữ tiếng Việt viết thẳng trong màn; phím mới có ở bảng Gửi giá | 004, 007 |
| L7 | Kênh: ingress `bizcity_touch@1` từ Cell, Facebook Page / comment / cá nhân / nhóm (G1–G8) | chỉ có hợp đồng + fixture; G1–G4 kiểm ở mức logic care-kernel | 006, 008, 009 |
| L8 | 80-REACT gọi hook URL là `useUrlState` | mã đặt tên `useRoute` (cùng chức năng) | sửa tài liệu |

## 5. Rủi ro

- **GitHub Actions của tài khoản bị khoá vì thanh toán:** CI / release không chạy; v0.2.0 phát hành từ máy (đã chạy đủ bộ kiểm trước). Cần mở lại trước khi nhiều người cùng làm.
- **Platform còn phần kế toán (giai đoạn 0):** `masterdata/`, `documents/signature.routes.ts` (ký dùng `periods:lock`), khoảng 100 / 117 kiểu bảng trong `db/types.ts` là bảng kế toán. Cake **chỉ import** `db/*`, `core/roles`, `core/auth`, `core/http`… — không import `masterdata`, `documents/signature.routes`.
- **Giao diện đi trước máy chủ:** 32 action đã có màn; khi nối thật dễ lộ chỗ giả lập "dễ dãi" hơn DB (ràng buộc, RLS, idempotency). Giảm: cùng bộ test hợp đồng chạy cả trên adapter http.

## 6. Thứ tự đề xuất

1. **PHASE-016 phần Cake** (đang là việc kế tiếp): `apps/api` trên v0.2.0 — khai `AppDatabase` cho 21 bảng, `registerRoles` vai CRM, route sinh từ action spec, **repo danh mục Postgres trước** (khép kín, không cần kênh), compose `db · db-migrate · api · web`, `?api=http` chạy được màn Hàng hoá.
2. **PHASE-005 phần SQL:** `PgCareRepo` qua cùng bộ test của `MemoryRepo`.
3. **PHASE-004:** SSO WordPress (`sub = wp:<id>`), vai `cake:*`, `useCan` (R-WEB-7).
4. **PHASE-007:** chuyển mọi màn sang http, SSE, `ErrorBoundary`, `i18n` (đóng L6).
5. Quan sát (L4) làm cùng 016/007, không để cuối.
6. Rồi mới tới kênh (006 → 008 → 009).
