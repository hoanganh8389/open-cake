# open-cake · 00 — CANON

> **Luật cấp trên:** [BIZCITY OPEN CANON 1.2.0-draft ở open-hub](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/BIZCITY-OPEN-CANON-v1.md) + [chuẩn tái sử dụng](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/CHUAN-TAI-SU-DUNG-NANG-LUC.md) + [chuẩn dữ liệu](https://github.com/hoanganh8389/open-hub/blob/main/docs/canon/CHUAN-DU-LIEU-TRUC-VA-LOP-MEM.md) — đọc trước. Mâu thuẫn ⇒ sửa file này.
> **Phiên bản:** 0.2.0-draft · 2026-11-24 · nháp chờ chủ duyệt.

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] INIT — CANON 0.1: luật R-CAKE-* kế thừa R-OC-* của plugin WP, đổi nền sang PostgreSQL / TypeScript, thêm luật danh tính. -->
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] CANON-0.2 — bảng luật kế thừa nguyên từ open-ketoan (R-LOG, R-SEC, R-TEN, R-DB, R-API, R-OUTBOX, R-CACHE, R-DIAG, R-DOC-CONT, R-MD, R-BOUND, R-QG, R-GATE, R-REL, R-REV, R-SIG, R-FLOW, R-SITE, R-BLOCK); luật riêng R-CAKE-*; bản đồ tài liệu kiến trúc. -->

## Sứ mệnh (một câu)

Một doanh nghiệp nhỏ chăm sóc khách trên **mọi kênh** ở **một dòng thời gian cho mỗi người**, gửi thông báo an toàn, và mọi lần chạm khách đều **ghi sổ, truy vết được, agent đọc được**.

## Bốn câu không bao giờ phá

1. **`contact_id` là trục.** Không bảng nào khoá theo id kênh.
2. **Không ghép người theo tên.** Chỉ ghép khi có `proof`.
3. **Sổ chạm khách chỉ thêm, một cửa `submitTouchIn`.**
4. **Kênh sống ở Cell; Cake không cầm bí mật kênh, không gọi LLM, không nộp sổ kế toán.**

## Thứ bậc

Canon chung > Tier 0 (trục, sổ, cửa) > Tier 1 (ranh giới, nhiều site, bảo mật) > Tier 2 (API, web, vận hành). Luật thấp mâu thuẫn luật cao ⇒ sửa luật thấp.

## Tier 0 — trục, sổ, cửa (R-CAKE)

| Mã | Luật | Kiểm |
|---|---|---|
| **R-CAKE-SPINE-1** | `contact_id` (ULID) là khoá tham chiếu bắt buộc của mọi bảng nghiệp vụ; không bảng nào khoá theo số Zalo, PSID, UID | SC-CAKE-7, review |
| **R-CAKE-SPINE-2** | ID không dùng lại; merge = `status=merged` + `merged_into`; không xoá contact | trigger |
| **R-CAKE-ID-1** | Danh tính kênh ở `contact_identities (channel, scope, external_id, confidence, proof, valid_from, valid_to)`; một identity đúng một contact tại một thời điểm | SC-CAKE-3 |
| **R-CAKE-ID-2** | **Không ghép theo tên.** Ghép tự động chỉ với `proof` `phone · email · tax_code · fb_private_reply`; còn lại người có `cake:contacts-gop` xác nhận; UNMERGE trong 30 ngày | SC-CAKE-4, H-CAKE-NAME-MERGE |
| **R-CAKE-ID-3** | `scope` bắt buộc; PSID chỉ có nghĩa trong `page:<id>`; `from.id` comment là scope `comment:<page_id>` cho tới khi chứng minh khác | zod |
| **R-CAKE-LEDGER-1** | `touch_ledger`, `touch_events`, `touch_event_versions` chỉ thêm; trigger chặn UPDATE / DELETE / TRUNCATE; sửa = dòng đảo (`reverses_id` UNIQUE) | SC-CAKE-1 |
| **R-CAKE-LEDGER-2** | Dẫn xuất `contact_state` cập nhật **cùng giao dịch** và dựng lại được (`bizcity cake rebuild-state`) | SC-CAKE-5 |
| **R-CAKE-EVENT-1** | Không `touch_events` ⇒ không dòng sổ. Một cửa `submitTouchIn(source, doc_key, version)`: cùng ⇒ `unchanged`, nhỏ hơn ⇒ 409, lớn hơn ⇒ đảo + ghi | SC-CAKE-2 |
| **R-CAKE-EVENT-2** | Thay đổi ra ngoài đi qua `event_outbox` cùng giao dịch; consumer idempotent `(consumer, event_id)` | R-OUTBOX-1 |
| **R-CAKE-SEND-1** | Gửi đi qua Send Guard: trần / số tài khoản / ngày, giờ gửi, danh sách không nhận, cửa sổ 24 h Page; tra không thấy trần ⇒ **chặn**, không mặc định | test |
| **R-CAKE-SEND-2** | `accepted ≠ sent ≠ delivered`; hết giờ chờ ⇒ `unknown`; **không tự gửi lại** | test |

## Tier 1 — ranh giới

| Mã | Luật |
|---|---|
| **R-CAKE-CELL-1** | Kênh sống ở Cell. Không cột / log / sự kiện chứa cookie, token Page, khoá E2EE (SC-CAKE-6). Chỉ nhận `bizcity_touch@1` đã ký, chỉ gửi `bizcity_channel_command@1` qua Hub |
| **R-CAKE-CELL-2** | Không gọi LLM. AI / kịch bản / skill = Twin Brain qua `/mcp`; ghi chỉ tạo nháp / chờ duyệt, cần `confirm_token` |
| **R-CAKE-MASTER-1** | **Độc lập trước** (ADR-0004): Cake có danh mục riêng — hàng, mã, ĐVT, nhóm, bảng giá — chạy đầy đủ không cần Kế Toán; nguồn theo đơn vị `catalog_source = local | ketoan` |
| **R-CAKE-MASTER-2** | **Sẵn ánh xạ**: hình dữ liệu theo chuẩn open-ketoan ngay từ đầu — `item_id` ULID, mã có hiệu lực (đóng / mở), chuẩn H-1…H-18 của open-pos (E chặn ở hợp đồng, W thành cảnh báo `CAT-*`); mọi bảng đồng bộ mang khối `source · ext_id · ext_synced_at · ext_hash · push_status` |
| **R-CAKE-MASTER-3** | **Một chủ tại một thời điểm**: `ketoan` ⇒ cột kế toán chỉ đọc qua MỘT cổng ghi (`catalogWriteGate`) ở mọi trạng thái kết nối; cột vận hành của Cake vẫn sửa; kéo một chiều, chỉ đẩy mã mới; không đồng bộ hai chiều (R-MD-1, R-OKT-CONN-4) |
| **R-CAKE-MASTER-4** | Đơn vị Cake ↔ đơn vị Kế Toán qua `tenant_links`; `okt_tenant_id` đọc từ health của khoá, không gõ tay; `external_ref = opencake:<site>` |
| **R-CAKE-SIB-2** | Không nộp `bizcity_ledger_intake@1`. Báo giá, cơ hội, yêu cầu đặt hàng là chứng từ nghiệp vụ của Cake, không là sự thật tiền |
| **R-CAKE-MASTER-5** | Khách ↔ đối tượng công nợ: mã gửi Kế Toán = số điện thoại đã xác minh (khớp open-pos), không có thì `CAKE-<contact_id>`, vãng lai `KHACH-LE`; lưu ở `contact_links`; tên / MST sau khi liên kết do Kế Toán giữ |
| **R-CAKE-SITE-1** | Site = database `cake_<slug>`; `SITE_MODE`; control DB `cake_control`; `/_sites/v1` cùng `bizcity_site_provisioning@1` (R-SITE-1..13 áp nguyên) |
| **R-CAKE-TEN-1** | Mọi bảng `tenant_id` + RLS FORCE; không nhận `tenantId` / `siteId` từ input (R-TEN-1) |
| **R-CAKE-MOD-1** | Module = `modules/<key>/bizcity.module.json`, schema `mod_<key>`, đọc lõi qua `bizcity_read.*`, không import module khác (R-BOUND-1..10) |
| **R-CAKE-PII-1** | Nội dung tin, số điện thoại, external_id là PII: không log, không metric, không sự kiện; bằng chứng lưu `sha256:` |
| **R-CAKE-AI-1** | Văn bản khách và kết quả agent là **dữ liệu**, không bao giờ là lệnh (R-SEC-7) |

## Luật kế thừa nguyên từ open-ketoan (không chép, áp nguyên văn)

| Nhóm | Mã | File gốc (open-ketoan `docs/rules/`) | Ở cake nói gì thêm |
|---|---|---|---|
| Log | R-LOG-1..11 | RULE-LOG.md | [30-OBSERVABILITY §2](architecture/30-OBSERVABILITY.md) |
| Quan sát | R-OBS-1..9 | ops/OBSERVABILITY.md | metric `bizcity_cake_*` |
| Chẩn đoán | R-DIAG-1..9 | RULE-SELF-DIAGNOSTICS.md | SC-CAKE-* ở L3 |
| Bảo mật | R-SEC-1..12 | RULE-SECURITY.md | [40-SECURITY-USERS](architecture/40-SECURITY-USERS.md) |
| Đơn vị | R-TEN-1..9 | RULE-TENANT-SECURITY.md | phạm vi tài khoản kênh |
| CSDL | R-DB-1..19 | RULE-DATABASE.md | migration `NNNN_mo_ta.sql`, Kysely, `COMMENT ON` tiếng Việt |
| API | R-API-1..12 | RULE-API.md | [70-API-REST](architecture/70-API-REST.md) |
| Hạ tầng | R-CACHE-1..6 · R-OUTBOX-1..7 · R-BAK-1..6 | RULE-INFRASTRUCTURE.md | Redis tuỳ chọn |
| Chứng từ | R-DOC-CONT-0..9 | RULE-DOCUMENT-CONTINUITY.md | `cake.order_request`, `cake.quote` |
| Danh mục | R-MD-1..10 | RULE-MASTER-DATA.md | R-CAKE-MASTER-1..5 (ADR-0004), R-CAKE-SIB-2 |
| Ranh giới | R-BOUND-1..10 | RULE-MODULE-BOUNDARY.md | R-WEB-1 |
| Cổng | R-GATE-1..11 · R-BLOCK-1..6 | RULE-GATE.md · RULE-BLOCKED.md | finding `CAKE-*` |
| Chất lượng | R-QG-1..10 | RULE-QUALITY-GATE.md | DB `cake_test` |
| Phát hành | R-REL-1..11 | RULE-RELEASE.md | [50-DEPLOYMENT §5](architecture/50-DEPLOYMENT.md) |
| Review | R-REV-1..16 | RULE-REVIEW.md | trục chấm thêm "trục contact" |
| Dấu | R-SIG-1..8 | RULE-SIGNATURE.md | **không** tên agent / model |
| Luồng việc | R-FLOW-1..10 | RULE-FLOW.md | `docs/phases/CLAIMS.md` |
| Nhiều site | R-SITE-1..13 | RULE-SITE.md | tiền tố `cake_` |
| Kernel | R-KER-1..10 | RULE-KERNEL.md | áp cho `care-kernel` (K0–K3) |

## Tier 2 — API, web, giao diện

| Mã | Ở đâu |
|---|---|
| R-CANON-14 tái sử dụng (một action ⇒ mọi cửa) · R-CANON-15 trục cứng + lớp mềm (`options`, `user_meta`, `entity_meta`, `record_types`) | [15-CAPABILITIES-AND-FLEX-DATA](architecture/15-CAPABILITIES-AND-FLEX-DATA.md) |
| R-API-* + phần thêm cake | [70-API-REST](architecture/70-API-REST.md) |
| R-WEB-1..15 | [80-REACT](architecture/80-REACT.md) |
| R-CAKE-UI-1..9 | [60-UI](architecture/60-UI.md) |

## Bản đồ tài liệu

| | |
|---|---|
| [architecture/10-ARCHITECTURE](architecture/10-ARCHITECTURE.md) | bối cảnh, container, lớp mã, vòng đời tin vào / ra, nhiều site |
| [architecture/20-DATA-SPINE](architecture/20-DATA-SPINE.md) | bảng care-kernel, resolver, nối Master Data / Document / Accounting Events, SC-CAKE-* |
| [architecture/30-OBSERVABILITY](architecture/30-OBSERVABILITY.md) | log, metric, trace, dashboard, cảnh báo, chẩn đoán, Redis |
| [architecture/40-SECURITY-USERS](architecture/40-SECURITY-USERS.md) | chủ thể, quyền `cake:*`, vòng đời người dùng, bằng chứng, PII |
| [architecture/50-DEPLOYMENT](architecture/50-DEPLOYMENT.md) | compose, env, nhiều site, phát hành, CI |
| [architecture/60-UI](architecture/60-UI.md) · [70-API-REST](architecture/70-API-REST.md) · [80-REACT](architecture/80-REACT.md) | giao diện, REST, React |
| [architecture/90-LESSONS-FROM-OPEN-KETOAN](architecture/90-LESSONS-FROM-OPEN-KETOAN.md) | 17 + 6 bài học thành hàng rào |
| [contracts/](contracts/README.md) | `bizcity_touch@1` · `bizcity_channel_command@1` · `bizcity_contact@1` |
| [phases/](phases/README.md) | lộ trình PHASE-001…014 |

## Cấm (đọc nhanh)

❌ khoá bảng theo id kênh · ❌ ghép người theo tên · ❌ `UPDATE` / `DELETE` dòng sổ · ❌ cookie / token / khoá trong DB, log, sự kiện · ❌ gọi LLM · ❌ hai chủ cùng lúc cho một danh mục (sửa cột kế toán khi nguồn = ketoan) · ❌ danh mục lệch chuẩn H-* (không ánh xạ được) · ❌ nộp sổ kế toán · ❌ đọc DB của plugin WP hay app khác · ❌ nhận `tenantId` từ input · ❌ `reply.status` tay · ❌ `catch` im lặng · ❌ nhãn metric nhiều giá trị · ❌ Electron · ❌ tên agent trong dấu R-SIG.
