# open-cake · 30 — Quan sát: log · metric · trace · chẩn đoán (Loki · Prometheus · Tempo · Grafana · Redis)

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-OBS — chép khuôn open-ketoan (infrastructure/monitoring, docs/ops/OBSERVABILITY.md R-OBS-1..9, RULE-LOG R-LOG-1..11, PHASE-038 nhật ký cố định, RULE-SELF-DIAGNOSTICS R-DIAG-1..9); thêm metric bizcity_cake_*, trace xuyên Cell → Hub → Cake. -->

## 1. Ngăn xếp

| Thành phần | Bản (ghim như open-ketoan) | Giữ | Vai |
|---|---|---|---|
| Prometheus | v2.53.4 | 15 ngày | metric từ `api:/metrics` (`METRICS_TOKEN`), exporter |
| Alertmanager | v0.27.0 | — | cảnh báo → Telegram / email quản trị |
| Grafana | 11.4.0 | — | dashboard (§5), một nơi xem log + trace + metric |
| Loki + promtail | 3.3.2 | 30 ngày | log JSON từ stdout container và `logs/` |
| otel-collector-contrib | 0.115.1 | — | nhận OTLP, tail sampling (giữ 100 % lỗi + chậm, 10 % còn lại) |
| Tempo | 2.6.1 | 7 ngày | trace |
| postgres-exporter · node-exporter · cadvisor | như open-ketoan | — | DB, máy, container |
| **Redis** *(tuỳ chọn)* | 7.x | không bền | **không phải** công cụ quan sát; ghi ở đây vì cần giám sát (`redis_exporter`) khi bật |

File: `infrastructure/monitoring/docker-compose.monitoring.yml` (project riêng, dùng chung được với open-ketoan trên cùng VPS: một Prometheus scrape nhiều app, nhãn `service`).

## 2. Log (R-LOG-1..11)

**Hình một dòng** (pino JSON, stdout):

```json
{"time":"2026-11-24T07:40:00.123Z","level":30,"service":"cake-api","version":"0.1.0","commit":"01c3548",
 "site":"cake_acme","tenant":"1","reqId":"r_…","traceId":"4bf92f…","actor":"user:7","actorKind":"user",
 "route":"POST /api/v1/messages","status":202,"ms":41,
 "evt":"bizcity.cake.message.requested","action":"cake.message.send","msg":"Đã xếp tin chờ gửi"}
```

| Luật | open-cake |
|---|---|
| R-LOG-1 | chỉ logger của platform, lỗi để trong `{err}` |
| R-LOG-2 | không `catch` im lặng, trừ chú thích `// nuot-loi: <lý do>` |
| R-LOG-3 | `installProcessHandlers`; lỗi chết ghi đồng bộ rồi thoát ≠ 0 |
| R-LOG-4 | **không** PII, bí mật, payload: không nội dung tin, không số điện thoại, không PSID / UID thô, không cookie. `REDACT_PATHS` thêm `*.body`, `*.text`, `*.external_id`, `*.phone`, `*.cookie`, `*.token`, `headers.authorization`, `headers["x-api-key"]` |
| R-LOG-5 | mọi dòng có `service, version, commit` (`BIZCITY_GIT_SHA`) + `site` |
| R-LOG-6 | việc nền dùng logger con `{job, fn, attempt, traceId, eventId, site}` |
| R-LOG-7 | lỗi người dùng (4xx) = `info`; 5xx = `error` có `errFp` |
| R-LOG-9 | file cố định `logs/{api,db-migrate,web,web-client}/<YYYY-MM-DD>.log` (`LOG_HOST_DIR`, `LOG_FILE_LEVEL=warn`), 30 ngày, ≤ 200 MB; `./scripts/lay-log.sh` gói báo lỗi |
| R-LOG-10 | web `ErrorBoundary` → `POST /api/v1/system/client-errors` `{errFp, route, message, stack đã map}` ≤ 10 / phút |
| R-LOG-11 | `msg` tiếng Việt; `evt = bizcity.cake.<việc>`; dữ liệu người dùng ở trường riêng (đã che) |

**Nhãn Loki chỉ:** `service, level, site, errCode, evt` (không `tenant` nếu số đơn vị lớn — cấu hình `LOKI_LABELDROP`).

## 3. Metric

Kế thừa nguyên bộ `bizcity_http_*`, `bizcity_db_*`, `bizcity_outbox_*`, `bizcity_actions_total`, `bizcity_mcp_tool_calls_total`, `bizcity_idempotency_requests_total`, `bizcity_diagnostics_*`, `bizcity_build_info`, `bizcity_sites`, `bizcity_tenants`. Thêm:

| Metric | Loại | Nhãn (ít giá trị) | Ý |
|---|---|---|---|
| `bizcity_cake_touches_total` | counter | `channel`, `kind`, `direction`, `status` (accepted/unchanged/rejected) | lưu lượng chạm khách |
| `bizcity_cake_ingress_duration_seconds` | histogram | `channel` | Hub → cam kết sổ |
| `bizcity_cake_ingress_lag_seconds` | histogram | `channel` | `occurred_at` → cam kết (trễ kênh) |
| `bizcity_cake_identity_resolutions_total` | counter | `result` (existing/proven_merge/new/suggested) | sức khoẻ resolver |
| `bizcity_cake_merges_total` | counter | `kind` (merge/unmerge), `proof` | ghép người |
| `bizcity_cake_send_total` | counter | `channel`, `result` (accepted/sent/unknown/failed/blocked) | gửi ra |
| `bizcity_cake_send_guard_blocks_total` | counter | `reason` (cap/hours/optout/window) | Send Guard chặn |
| `bizcity_cake_unanswered_conversations` | gauge | `channel` | hội thoại chờ trả lời (đếm từ dẫn xuất mỗi phút) |
| `bizcity_cake_channel_accounts` | gauge | `channel`, `status` | tài khoản kênh theo trạng thái Cell |

**Cấm nhãn** (H-METRIC-LABEL): `contact_id`, `conversation_id`, `user`, `tenant`, `external_id`, `site` khi > 50 site (dùng `bizcity_sites` thay).

## 4. Trace (OpenTelemetry → Tempo)

- `packages/platform/src/telemetry`: `@opentelemetry/sdk-node` + auto-instrumentation `http`, `fastify`, `pg`, `undici`, `ioredis`; `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME=cake-api`, `OTEL_SDK_DISABLED` để tắt.
- **Truyền ngữ cảnh xuyên hệ:** Cell sinh `traceparent` (W3C) cho mỗi tin; Hub giữ nguyên khi chuyển; `/ingress/v1/touch` tiếp tục span; `touch_events.trace_id` lưu lại; outbox mang `traceparent` vào webhook / `bizcity_channel_command@1` ⇒ một tin khách và câu trả lời của nhân viên là **một trace** (DOD-SYS-6).
- Span chuẩn: `ingress.touch`, `kernel.submitTouchIn`, `identity.resolve`, `ledger.append`, `outbox.dispatch`, `channel.command`, `mcp.tool`.
- Thuộc tính span **không** có PII (chỉ `cake.channel`, `cake.kind`, `cake.result`).

## 5. Dashboard và cảnh báo

| Dashboard | Panel |
|---|---|
| Cake — Tổng quan | RPS, lỗi theo `code`, p95, touches theo kênh, unanswered |
| Cake — Ingress kênh | trễ Hub → sổ theo kênh, `unchanged` (trùng), `rejected` theo `details.reason` |
| Cake — Gửi ra | accepted → sent / unknown / failed, Send Guard chặn theo lý do |
| Cake — Danh tính | resolve theo kết quả, merge / unmerge theo ngày |
| Outbox | backlog, dead-letter, tuổi việc chờ |
| Hạ tầng | DB pool, PostgreSQL, Redis, máy, container |

Cảnh báo kế thừa (HighErrorRate, HighLatency, ApiDown, PostgreSQLDown, DiskUsage, OutboxDeadLetter, OutboxBacklog, DbPoolSaturation, MetricsCollectorFailing) + thêm: **CakeIngressStalled** (0 touch 15 phút trong giờ làm khi có tài khoản `connected`), **CakeSendUnknownSpike** (> 5 % `unknown` 10 phút), **CakeMergeSpike**, **CakeChannelAccountDegraded**.

## 6. Sức khoẻ và tự chẩn đoán (R-DIAG-1..9)

| Mức | Đường | Kiểm |
|---|---|---|
| L0 | `GET /api/v1/system/health` | sống; trả `version, kernel (care-kernel), standard` |
| L1 | `GET /api/v1/system/health/ready` | DB, control DB, migration đúng `schema_version`; 503 `NOT_READY` (Docker healthcheck) |
| L2 (mỗi giờ) | `diagnostic_runs` | outbox dead-letter, kênh `degraded`, Send Guard kẹt |
| L3 (mỗi đêm) | `GET /api/v1/system/diagnostics` | SC-CAKE-1..8 trên dữ liệu thật (chỉ đọc), `contact_state` khớp sổ |

Lỗi có mã ổn định + mức + hậu quả + cách sửa tiếng Việt (`bizcity_findings@1`, tiền tố `CAKE-*`); "không có gì để kiểm" ≠ PASS (R-DIAG-7); `bizcity doctor --bundle` che bí mật.

## 7. Redis — dùng ở đâu, không ở đâu

| Dùng | Không dùng |
|---|---|
| đệm registry site, cấu hình, quyền đã tính (TTL ≤ 5 phút, khoá `site:tenant:config_version`) | Send Guard **đếm trần** — đếm từ `touch_ledger` (sự thật); Redis chỉ là bộ đếm nhanh có đối chiếu |
| pub/sub SSE giữa nhiều bản `api` (tin mới → màn hộp thư) | hàng đợi outbox (ở PostgreSQL, R-OUTBOX-1) |
| giới hạn tốc độ mềm cho `/ingress` theo site | khoá phân tán cho sổ (dùng `pg_advisory_xact_lock`) |

`REDIS_URL` trống ⇒ in-memory, một bản `api`; mọi test chạy **không** Redis.
