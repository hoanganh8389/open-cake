# open-cake · 00 — CANON

> **Luật cấp trên:** [BIZCITY OPEN CANON v1](canon/BIZCITY-OPEN-CANON-v1.md) — đọc trước. Mâu thuẫn ⇒ sửa file này.
> **Phiên bản:** 0.1 · 2026-11-24 · nháp chờ chủ duyệt.

<!-- [2026-11-24 Claude Opus 5.5] INIT — CANON 0.1: luật R-CAKE-* kế thừa R-OC-* của plugin WP, đổi nền sang PostgreSQL / TypeScript, thêm luật danh tính. -->

## Sứ mệnh (một câu)

Một doanh nghiệp nhỏ chăm sóc khách trên **mọi kênh** ở **một dòng thời gian cho mỗi người**, gửi thông báo an toàn, và mọi lần chạm khách đều **ghi sổ, truy vết được, AI đọc được**.

## Tier 0 — trục, sổ, cửa

| Mã | Luật |
|---|---|
| **R-CAKE-SPINE-1** | `contact_id` (ULID) là khoá ngoại bắt buộc của mọi bảng nghiệp vụ. Không bảng nào khoá theo số Zalo, PSID, UID. |
| **R-CAKE-ID-1** | Danh tính kênh nằm ở `contact_identities (channel, scope, external_id, confidence, proof, valid_from, valid_to)`. Một identity đúng một contact tại một thời điểm. |
| **R-CAKE-ID-2** | **Không ghép theo tên.** Ghép tự động chỉ khi `proof` là `phone`, `email`, hoặc handshake kênh (private reply → thread). Còn lại nhân viên xác nhận; MERGE có sổ, UNMERGE được trong 30 ngày. |
| **R-CAKE-LEDGER-1** | `touch_ledger` chỉ thêm; trigger chặn UPDATE/DELETE/TRUNCATE; sửa = dòng đảo (`reverses_id` UNIQUE) + dòng mới. |
| **R-CAKE-LEDGER-2** | Dẫn xuất (`contact_state`) cập nhật cùng giao dịch và dựng lại được bằng `bizcity cake rebuild-state`. |
| **R-CAKE-EVENT-1** | Không `care_events` ⇒ không dòng sổ. Một cửa `submitTouchIn(source, doc_key, version)`. |
| **R-CAKE-EVENT-2** | Mọi thay đổi ra ngoài đi qua `event_outbox` cùng giao dịch; consumer idempotent. |

## Tier 1 — ranh giới

| Mã | Luật |
|---|---|
| **R-CAKE-CELL-1** | Kênh sống ở Cell. Repo này không cầm cookie, token Page, khoá E2EE; chỉ nhận `unified-touch@1` đã ký và gửi `channel-command@1`. |
| **R-CAKE-CELL-2** | Không gọi LLM. AI / kịch bản / skill = Cell qua `/mcp`; ghi cần `confirm_token`. |
| **R-CAKE-SIB-1** | Không bảng `partners`, `items`, `orders`. Tham chiếu `partner_ref`, `item_ref`, `order_ref` qua hợp đồng của app chủ. |
| **R-CAKE-SITE-1** | Chép PHASE-039 open-ketoan: site = database `cake_<slug>`, `SITE_MODE`, control DB `cake_control`, `/_sites/v1` cùng `bizcity_site_provisioning@1`. |
| **R-CAKE-TEN-1** | Mọi bảng có `tenant_id` + RLS FORCE; không nhận `tenantId` / `siteId` từ input. |
| **R-CAKE-MOD-1** | Module = `modules/<key>/bizcity.module.json`, schema `mod_<key>`, đọc qua `bizcity_read.*`, không import module khác. |

## Tier 2 — giao diện

Kế thừa R-OC-UI-1…5 của plugin WP (token PHASE-002, 13 màn Deplao, R-LEAN-4, 4 trạng thái, sheet cho mọi thao tác ghi, URL là nguồn vị trí) + hai màn mới **Contact 360** và **Kênh**.

## Cấm (đọc nhanh)

❌ khoá bảng theo id kênh · ❌ ghép người theo tên · ❌ `UPDATE` dòng sổ · ❌ cookie / token trong DB · ❌ gọi LLM · ❌ bảng khách / hàng / đơn riêng · ❌ đọc DB của plugin WP · ❌ Electron / bản cài máy khách.
