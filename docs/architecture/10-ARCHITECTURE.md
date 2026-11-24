# open-cake · 10 — Kiến trúc tổng thể

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH — kiến trúc open-cake theo khuôn open-ketoan main 6ad77b6 (Fastify · Kysely · PostgreSQL · React; một cửa; outbox; RLS; MCP; PHASE-039 nhiều CSDL) với care-kernel trục contact_id. -->

> **Luật cấp trên:** [BIZCITY OPEN CANON](../canon/BIZCITY-OPEN-CANON-v1.md) · [00-CANON](../00-CANON.md) · [ADR-0001](../adr/ADR-0001-cung-khung-open-ketoan-truc-contact.md)
> **Đọc kèm:** [20-DATA-SPINE](20-DATA-SPINE.md) · [30-OBSERVABILITY](30-OBSERVABILITY.md) · [40-SECURITY-USERS](40-SECURITY-USERS.md) · [50-DEPLOYMENT](50-DEPLOYMENT.md) · [60-UI](60-UI.md) · [70-API-REST](70-API-REST.md) · [80-REACT](80-REACT.md) · [90-LESSONS](90-LESSONS-FROM-OPEN-KETOAN.md)

## 1. Bối cảnh hệ (C4 mức 1)

```text
 Khách (Zalo · FB cá nhân · FB Page · FB Group · comment · web form · điện thoại)
        │
        ▼
 ZaloHub Cell ── zca-js · fbchat-v2 bridge · Meta webhook ── vault phiên / cookie / token / E2EE
        │ bizcity_touch@1 (ký HMAC, traceparent)          ▲ bizcity_channel_command@1
        ▼                                                 │
 bizcity-llm-router (Hub 1API) ── khoá biz-…, gói, định tuyến site, hàng đợi khi site offline
        │                                                 ▲
        ▼                                                 │
 ┌─────────────────────────── OPEN CAKE (site cake_<slug>) ───────────────────────────┐
 │  nhân viên (web /app, SSO WordPress)   Twin Brain (MCP)   POS / Kế toán (REST)      │
 └─────────────────────────────────────────────────────────────────────────────────────┘
        │ PUT /api/v1/partners/:code (bizcity_master_data@1)   document_links → pos.* / ketoan
        ▼
 Open Kế Toán · Open POS / Kiot              bizcity-open-setup ── bizcity_site_provisioning@1 ──► /_sites/v1
```

## 2. Container (C4 mức 2)

| Container | Công nghệ | Vai | Cổng |
|---|---|---|---|
| `web` | nginx 1.27 + bản build Vite | phục vụ `/app/*`, proxy `/api/`, `/mcp`, `/ingress/`, `/_sites/` → `api` | 8098 (mặc định, khác 8088 của Kế Toán) |
| `api` | Node 22, Fastify 5, Kysely, pg, zod, jose, pino, OpenTelemetry | REST `/api/v1`, MCP `/mcp`, nhận `/ingress/v1/touch`, Provisioning `/_sites/v1`, `/metrics`; chạy dispatcher outbox + đồng hồ theo vòng `forEachSite` | 4200 (nội bộ) |
| `db` | PostgreSQL 16 | `cake_control` (registry) · `cake_template` · `cake_<slug>` × N | 5432 nội bộ |
| `db-migrate` | ảnh `api`, chạy một lần | migration template rồi từng site | — |
| `redis` *(tuỳ chọn, profile `redis`)* | Redis 7 | bộ đệm danh mục, giới hạn tốc độ mềm, pub/sub realtime giữa nhiều bản `api` | 6379 nội bộ |
| giám sát *(compose riêng)* | Prometheus · Alertmanager · Grafana · Loki + promtail · otel-collector · Tempo · exporters | [30-OBSERVABILITY](30-OBSERVABILITY.md) | — |

## 3. Lớp mã (C4 mức 3) — chép khuôn open-ketoan

```text
packages/contracts     zod + kiểu: bizcity_touch@1 · bizcity_channel_command@1 · bizcity_contact@1
                       + bản sao có ghi nguồn: ERROR_CATALOG, DOC_LINK_ROLES, event envelope, api envelope
packages/platform      ← fork open-ketoan (UPSTREAM.md): http (phong bì, Errors.*), auth (JWT, API key, SSO),
                       actions (defineAction/runAction, Idempotency), events (outbox, defineSubscriber,
                       dispatchOnce, tickClock), db (client, router theo site, RLS set_config), settings,
                       documents (business_documents, document_links), evidence (audit_logs hash-chain),
                       logger (pino + REDACT_PATHS), telemetry (OTel), diagnostics
packages/care-kernel   KHÔNG biết HTTP. contacts · identities · resolver · submitTouchIn · touch ledger ·
                       contact_state · merge/unmerge · Send Guard. Mặt công khai chỉ src/index.ts
packages/module-sdk    facade duy nhất module được import
packages/ui-kit        facade duy nhất web module được import (token Deplao)
packages/cli           bin bizcity: site create|migrate|backup · cake rebuild-state · cake identity-audit · doctor
apps/api               lắp ráp: platform + care-kernel + modules; route lõi /api/v1/{contacts,conversations,
                       messages,channels,identities,system,auth,documents}; /ingress/v1; /mcp; /_sites/v1
apps/web               khung + màn lõi (Hộp thư, Danh bạ, Contact 360, Kênh, Tổng quan); nạp modules/*/web
modules/<key>          broadcast · tasks · reports · pipeline (sau) — mỗi module schema mod_<key>
```

**Luật lớp** (kế thừa LAYOUT-1..7, R-BOUND-1..10): `platform` không biết kernel; kernel không biết HTTP; module chỉ import `module-sdk` / `ui-kit`; không import chéo module; mỗi file mang `// @bizcity-layer <platform|kernel|module|app>`.

## 4. Vòng đời một tin nhắn vào

```text
Cell nhận tin (Zalo / FB) ─► chuẩn hoá bizcity_touch@1 ─► Hub (xác thực khoá, tra site, ký HMAC, giữ hàng đợi)
 ─► POST /ingress/v1/touch  (Host = site · X-Bizcity-Contract: bizcity_touch@1 · traceparent · Idempotency-Key = doc_key)
     1. router: Host → site → pool;  auth: chữ ký Hub + khoá dịch vụ;  zod: khuôn bizcity_touch@1
     2. BEGIN; set_config('bizcity.tenant_id')
     3. submitTouchIn: khoá doc_key → (unchanged | 409 | đảo + ghi) → touch_events
     4. resolver danh tính → contact_id (§ 20-DATA-SPINE 4) → conversation → touch_ledger (+1) → messages
     5. contact_state cập nhật (cùng giao dịch) → event_outbox: bizcity.cake.touch.recorded
     6. audit_logs (actor = service:hub, via cell:<id>) → COMMIT
     7. trả {ok:true, data:{status, touch_id, contact_id}, meta:{requestId, receipt}}
 ─► dispatcher: SSE tới nhân viên đang mở hộp thư (qua Redis pub/sub nếu nhiều bản api) · webhook Twin Brain
```

## 5. Vòng đời một tin nhắn ra

```text
nhân viên bấm Gửi (sheet) ─► POST /api/v1/messages  (Idempotency-Key)  requirePermission cake:inbox-lap
 1. runAction cake.message.send → Send Guard (trần / giờ / danh sách chặn / cửa sổ 24 h Page)
 2. submitTouchIn(type message.send_requested) → touch_ledger (out) → messages(delivery=accepted)
 3. event_outbox: bizcity.cake.message.requested → COMMIT → trả 202
 4. subscriber channel-command: POST Hub bizcity_channel_command@1 (idempotency = cake:<touch_id>:send:1)
 5. Cell gửi ─► bizcity_touch@1 type delivery.updated (sent | unknown | failed) ─► submitTouchIn (version+1)
    hết giờ chờ ⇒ unknown, KHÔNG tự gửi lại
```

## 6. Nhiều site (PHASE-039 của open-ketoan, đổi tiền tố)

| Thành phần | open-cake |
|---|---|
| Registry | `CONTROL_DATABASE_URL` → `cake_control`: `sites`, `site_domains` (+ `channel_ingress` cho Hub), `site_jobs`, `site_backups`, `provision_keys` |
| Router | `Host` → site (đệm 30 s) → pool (≤ 4 kết nối / site, đóng sau 5 phút rảnh, trần tổng) |
| Tạo site | `CREATE DATABASE cake_<slug> TEMPLATE cake_template` + vai `cake_<slug>_app` + đơn vị đầu + chủ |
| Tiến trình nền | dispatcher outbox, đồng hồ, Send Guard chạy `forEachSite`; site lỗi không chặn site khác |
| Provisioning | `/_sites/v1` chỉ trên `SITE_ADMIN_HOST`, khoá `prov_…`, `Idempotency-Key`, trả `202 {jobId}`; **cùng** `bizcity_site_provisioning@1`, thêm `product: "cake"` (tuỳ chọn, minor) |
| Một site | `SITE_MODE=single` (mặc định): một site ngầm định từ `DATABASE_URL`, cùng đường mã |

## 7. Ranh giới — không làm

| Không | Vì | Ai làm |
|---|---|---|
| giữ cookie / token / khoá E2EE, gọi Zalo / Meta | R-CAKE-CELL-1 | Cell |
| gọi LLM, kịch bản, skill | R-CANON-2 | Twin Brain qua MCP |
| bảng khách công nợ, hàng, đơn, tồn | R-CANON-1, H-MD-TABLE | Kế Toán, POS |
| nộp sổ kế toán | báo giá / cơ hội / chat không là sự thật tiền | POS, Kế Toán |
| Electron, bản cài máy khách | canon §7 | — |

## 8. Quyết định kiến trúc đã khoá / còn mở

| Khoá (ADR-0001) | Còn mở (PHASE-001 §8) |
|---|---|
| khung open-ketoan; trục `contact_id`; danh tính tách; kênh ở Cell; nhiều CSDL theo PHASE-039 | Q-1 fork hay tách gói `@bizcity/platform` · Q-2 open-setup thêm `product` · Q-3 Hub tra site bằng gì · Q-4 `from.id` comment vs group |
