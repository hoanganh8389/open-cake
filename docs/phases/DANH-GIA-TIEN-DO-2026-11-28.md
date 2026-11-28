# Đánh giá tiến độ mã so với tài liệu — 2026-11-28

<!-- [2026-11-28 09:46 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — chủ (2026-11-28): "đánh giá tiến độ open-cake hiện tại, viết lại, đồng bộ README". Thay bản 2026-11-24 (đã lỗi thời). Số liệu đo trên main 2026-11-28 21:45. -->

> Thay thế [DANH-GIA-TIEN-DO-2026-11-24.md](DANH-GIA-TIEN-DO-2026-11-24.md) (giữ làm lịch sử). Mọi số liệu dưới đây **đo lại bằng lệnh** ở §7, không chép từ bản cũ.

## 1. Một câu

**Từ 11-24 đến nay Cake đã chuyển từ "hợp đồng + giao diện giả lập" sang "máy chủ thật có đăng nhập, phân quyền, bằng chứng, quan sát, kho tệp, luồng đơn, kênh Zalo qua Hub" — còn thiếu ba thứ chặn việc đưa cho người khác dùng: CI, bộ script vận hành, và phần Cell / Hub phía Facebook + Zalo chạy thật end-to-end.**

## 2. Số liệu (đo 2026-11-28)

| Hạng mục | 11-24 | **11-28** |
|---|---|---|
| Phase | 17 | **19** (thêm 018 nơi lưu tệp, 019 tách open-core) |
| Việc trong bảng việc | 130 (11-27: xong 56 · có mã 18 · bị chặn 1 · chưa 54) | **130** (sinh lại 11-28: xong 56 · có mã 20 · bị chặn 1 · chưa 52) — S010-2/3 chuyển ☐ → ◐ |
| Mã TS / TSX | ~4 800 dòng | **~13 400 dòng** (`apps/api` có, `apps/web`, 4 gói) |
| Action trong spec | 32 | **66** (hợp đồng); khoảng 61 có handler trên máy chủ, **5 chưa**: `cake.comment.reply`, `cake.contact.link`, `cake.contact.lookup`, `cake.contact.resolve`, `cake.message.draft` |
| Migration | 3 (0101–0103) | **9** (0101–0109): + phạm vi kênh, yêu cầu đặt hàng, lệnh kênh, hồ sơ kênh, liên kết kênh, tệp |
| Bảng do Cake tạo | 21 | **28** câu `CREATE TABLE` trong migration |
| Test | 64 | **199 / 199 qua** (27 tệp, Postgres 16 thật; 91 test cần DB, chạy không DB chỉ được 108) |
| Typecheck | 0 lỗi | **0 lỗi** (`pnpm run typecheck`) |
| Selfcheck | — | **9 / 9 ĐẠT** (SC-CAKE-1, 6, 7, 8, SC-CAKE-WEB-1..3, R-WEB-14, R-SIG) |
| Nền dùng chung | bizcity-platform v0.2.0 | **open-core v0.5.0** (đã đổi tên và tách repo: NC-003) |
| Phát hành / hạ tầng | compose `web` | compose `db · db-migrate · api · web` + profile `connector`; volume `cake-files`, `cake-link` |

## 3. Đã đóng so với bản 11-24

| # | Lệch cũ | Hiện tại |
|---|---|---|
| L1 | không có máy chủ | ☑ `apps/api` (Fastify) — route sinh từ action spec, phong bì, idempotency, `/api/v1/stream` (SSE), `/ingress/v1/touch`, `/metrics` |
| L2 | không có mã đọc / ghi DB | ☑ `PgCareRepo` chạy cùng bộ kịch bản với `MemoryRepo`; danh mục, hộp thư, danh bạ, đơn đều trên Postgres |
| L3 | chưa có SSO / vai / khoá API | ☑ SSO WordPress, 7 vai + vai riêng (Cho / Cấm), vai CSDL `cake_app` (RLS có hiệu lực), khoá `kc_…`, `audit_logs` hash-chain, phạm vi xem theo tài khoản kênh, 3 màn Nhân viên · Vai & quyền · Khoá API |
| L6 | thiếu R-WEB-7/8/9/10/11/15 | ☑ cả sáu: `useCan`, `ErrorBoundary` + cổng lỗi client, SSE, keyset + cuộn vô hạn, i18n (`vi.ts` + test chặn chữ viết thẳng), phím tắt hộp thư |
| L8 | `useUrlState` vs `useRoute` | không còn trong tài liệu theo dõi — **cần xác nhận lại** ở 80-REACT |

## 4. Còn lệch / còn thiếu (theo mức ảnh hưởng)

| # | Tài liệu nói | Hiện tại | Phase |
|---|---|---|---|
| **N1** | 50-DEPLOYMENT: CI (guard, typecheck, test, migrate-upgrade, conformance) | **không có `.github/`**; GitHub Actions của tài khoản từng bị khoá thanh toán nên lúc phát hành phải chạy tay | 016 S016-7 ☐ |
| **N2** | AGENTS.md "trước khi xong việc" gọi `scripts/nhan-viec.mjs`, `kiem-chuan.sh`, `so-tiep-theo.mjs`, `ky-dau.mjs`, `lay-log.sh`, `kiem-nang-cap.sh` | **không có thư mục `scripts/`** — các bước 2, 5 và "Bước 0" của AGENTS không chạy được trong repo này | 016 S016-9 ☐ |
| **N3** | Quan sát Q4 / Q5 / Q7: bộ giám sát chung, dashboard + cảnh báo `Cake*` (`promtool`), `diagnostic_runs` + `bizcity doctor --bundle` | log pino, OTel, `/metrics` ☑ (Q1–Q3, Q6); `infrastructure/monitoring` mới có `prometheus-job.yml`; **chưa có** dashboard, cảnh báo, sổ tay, chẩn đoán L0/L1 (dù có test `diagnose.http`) | 016 Q4 ◐, Q5 ☐, Q7 ☐ |
| **N4** | 5 action còn 501 (§2) | hợp đồng + giả lập có, máy chủ chưa: tra / ghép tay danh tính, nháp tin, trả lời bình luận | 007 / 008 |
| **N5** | Kênh: Zalo (006), Facebook Page + comment (008), FB cá nhân + nhóm (009) | phía Cake: cổng nhận HMAC, hàng chờ `channel_commands`, `cake.channel.test` ⇒ `account.test` đã chạy với Hub giả; zalo-hub phát `bizcity_touch@1` có mã (PR #4); **chưa kiểm với Cell + Hub thật**, `S006-5` (llm-router) ☐; 008, 009 ☐ | 006 ◐, 008 ☐, 009 ☐ |
| **N6** | 010 luồng đơn: đơn → POS → Kế Toán | phía Cake có mã và test với **cửa hàng giả + Kế Toán giả** (yêu cầu đặt hàng, gửi, sự kiện, RC-ORDER-1, khách công nợ, đệm 5 phút, bản chiếu chứng từ chung); chưa chạy với open-pos-backend PHASE-003 và open-ketoan PHASE-042 thật | 010 ◐ |
| **N7** | S005-6: sự kiện outbox `bizcity.cake.*` (không PII) | chưa làm; là việc duy nhất còn lại của care-kernel | 005 |
| **N8** | 007: chọn nhiều + gắn nhãn hàng loạt | **NỢ-007-1** vẫn chưa ai nhận (từ 11-25) | 007 |
| **N9** | 019: tách open-core | đã cài từ Release open-core (C2, C3 → v0.5.0), nhưng ranh giới `core` / `modules/crm` (S019-2) chưa làm; S019-3 ⛔ | 019 |
| **N10** | 018: nơi lưu tệp | S018-1..4 ☑ (cổng `storage`, bộ đĩa, migration 0109, `cake.file.upload`); chưa có bộ R2, S018-7 (open-setup) và S018-8 (platform) | 018 |
| N11 | 014 nhiều site, 011 gửi hàng loạt, 012 báo cáo, 013 MCP, 015 kiểm chứng | chưa bắt đầu | 011–015 |

## 5. Rủi ro

- **Không có CI và không có `scripts/`** (N1, N2): hiện chỉ có người đang làm mới biết chạy `selfcheck` + `typecheck` + `vitest` + Postgres thử (`TEST_DATABASE_URL` có chữ "test"). Thêm người ⇒ dễ đẩy mã không qua kiểm.
- **Tài liệu bám kịp mã chậm hơn mã chạy:** trạng thái README phase 001, 006, 010, 018 từng lệch checklist (đã sửa ở đợt này); bảng việc `BANG-VIEC.md` sinh tay, dễ cũ.
- **Giả lập dễ dãi hơn thật:** các luồng Hub, cửa hàng, Kế Toán mới được kiểm với bản giả; lệch hợp đồng chỉ lộ khi chạy với Cell / POS / Kế Toán thật (N5, N6).
- **Hai bộ thay đổi lớn song song:** NC-003 (open-core), NC-004 (trụ cột xuyên doanh nghiệp), R-CANON-19 (một chuẩn REST / danh sách) làm hình dữ liệu và route có thể đổi; Cake giữ bản riêng của Storage, lớp mềm, danh mục — phải theo đúng hình chuẩn để dời lên lõi (C5) không đổi dữ liệu.
- **Bảng việc sinh tay:** `BANG-VIEC.md` chỉ cập nhật khi có người chạy `bang-viec.mjs`; bản 11-27 đã cũ so với mã (v0.3.1 → v0.5.0, bản chiếu chứng từ S003-14b). Đã sinh lại ở đợt này (§6) — nên đưa vào CI (N1) để không cũ nữa.

## 6. Đồng bộ tài liệu đợt này

README phase sửa theo bằng chứng trong mã / CHANGELOG / checklist: **001, 004, 005, 006, 010, 016, 018** và bảng `README.md` của thư mục phases. Bảng việc sinh lại bằng `bang-viec.mjs`. Việc **không** tự đổi: trạng thái từng việc ở checklist (chỉ sửa khi có bằng chứng rõ — xem từng README).

## 7. Cách đo (chạy lại được)

```bash
pnpm run typecheck                       # 0 lỗi
node tests/conformance/selfcheck.mjs     # 9/9
TEST_DATABASE_URL=postgres://…/cake_test npx vitest run   # 199 / 199 (27 tệp)
grep -hiE "^create table" db/migrations/*.sql | wc -l     # 28
```

Không chạy được trong đợt này: `bizcity event check`, `standard-check.mjs` của platform (chưa chạy lại), Docker end-to-end, `ui:chup` / `ui:hop-thu` (cần Chrome). Các dòng có bằng chứng từ các lệnh này trong CHANGELOG là **số của lần chạy trước**, không phải của đợt này.

## 8. Thứ tự đề xuất

1. **Bật CI + dựng `scripts/`** (N1, N2) — rẻ nhất, gỡ rủi ro lớn nhất; làm trước khi thêm người.
2. **Chạy thật với Cell + Hub** (N5): Zalo end-to-end (006), rồi mới Facebook (008 → 009).
3. **Đóng care-kernel:** outbox S005-6 (N7) và 5 action còn 501 (N4).
4. **Chạy luồng đơn với POS + Kế Toán thật** (N6) khi open-pos-backend PHASE-003 và open-ketoan PHASE-042 sẵn sàng.
5. **Quan sát hoàn chỉnh** (N3): dashboard + cảnh báo + chẩn đoán — làm cùng bước 2 để có số khi chạy thật.
6. **Ranh giới `core` / `modules/crm`** (S019-2) trước khi dời lên open-core (C5); nhận hoặc đóng NỢ-007-1.
7. Sau đó: 011, 012, 013, 014, 015.
