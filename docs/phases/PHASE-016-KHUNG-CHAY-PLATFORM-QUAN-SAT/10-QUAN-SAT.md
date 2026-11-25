# PHASE-016 · 10 — Quan sát: log, metric, trace, dashboard, chẩn đoán L0–L1 (trước là PHASE-003)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->
<!-- [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — Q1/Q2/Q3 xong trên bộ của nền 0.2.0; Q4 đổi theo bizcity_observability@1 §1: MỘT bộ giám sát chung mỗi máy chủ, app chỉ khai phần của mình. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ◐ · **Phụ thuộc:** 002
> **Mục tiêu:** một yêu cầu bất kỳ thấy được **log (Loki) + metric (Prometheus) + trace (Tempo)** nối bằng `traceId` trong Grafana — trước khi có nghiệp vụ. Chi tiết: [30-OBSERVABILITY](../../architecture/30-OBSERVABILITY.md).

## Đầu ra

| # | Việc | TT | Bằng chứng |
|---|---|---|---|
| S016-Q1 | logger pino + `REDACT_PATHS` (thêm khoá PII cake) + `installProcessHandlers` + file `logs/<svc>/<ngày>.log` (R-LOG-1..11) | ☑ | `cakeLoggerOptions` + `CAKE_PII` ([observability.ts](../../../apps/api/src/observability.ts)); [log-redact.test.ts](../../../apps/api/test/log-redact.test.ts); compose `LOG_DIR=/app/logs` + volume `cake-logs`; `BIZCITY_GIT_SHA` vào trường `commit` |
| S016-Q2 | OTel SDK (`http`, `fastify`, `pg`, `undici`, `ioredis`), nhận / truyền `traceparent`, `traceId` vào log + lỗi | ☑ | `initTracing` của nền (span HTTP, `action {id}`, `db {op} {table}`, undici gửi kèm `traceparent`); [observability.http.test.ts](../../../apps/api/test/observability.http.test.ts) SC-OBS-P1: lỗi mang đúng `traceId` gửi vào, span `action` cùng trace; chạy thật: log có `reqId` + `traceId` |
| S016-Q3 | `/metrics` (`METRICS_TOKEN`): bộ `bizcity_*` kế thừa + khai sẵn `bizcity_cake_*` | ☑ | `bizcity_cake_touches_total{result}`, `bizcity_cake_stream_clients`, `bizcity_cake_client_errors_total{result}`; test: không nhãn đơn vị / người, token sai ⇒ 401; nginx chỉ chuyển `/api/` |
| S016-Q4 | ~~`infrastructure/monitoring/` đủ bộ~~ → theo chuẩn §1: nối vào **bộ giám sát chung** của máy chủ | ◐ | [infrastructure/monitoring](../../../infrastructure/monitoring/README.md): đoạn `scrape_configs` + cách đặt `OTEL_EXPORTER_OTLP_ENDPOINT`; bộ chung (một bộ cho mọi app) chưa có — việc của bizcity-platform |
| S016-Q5 | 6 dashboard + quy tắc cảnh báo (kế thừa + Cake*); `promtool` / `amtool` / `otelcol validate` trong CI | ☐ | |
| S016-Q6 | ErrorBoundary web + `POST /system/client-errors` (R-LOG-10) | ☑ | PHASE-007 (`ErrorBoundary.tsx`, `client-errors.ts`, ≤ 10 / phút) |
| S016-Q7 | `diagnostic_runs`, L0 / L1, `bizcity doctor --bundle` | ☐ | |

## Xong khi

Gọi một route API (vd `/api/v1/catalog/items`; health không có span — chuẩn §6) kèm `traceparent` ⇒ trace hiện trong Tempo, log cùng `traceId` trong Loki, `bizcity_http_requests_total` tăng; SC-LOG-1..3, SC-OBS-3 PASS; test chứng minh không dòng log nào chứa khoá trong `REDACT_PATHS`.
