# PHASE-016 · 10 — Quan sát: log, metric, trace, dashboard, chẩn đoán L0–L1 (trước là PHASE-003)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W1 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 002
> **Mục tiêu:** một yêu cầu bất kỳ thấy được **log (Loki) + metric (Prometheus) + trace (Tempo)** nối bằng `traceId` trong Grafana — trước khi có nghiệp vụ. Chi tiết: [30-OBSERVABILITY](../../architecture/30-OBSERVABILITY.md).

## Đầu ra

| # | Việc |
|---|---|
| S016-Q1 | logger pino + `REDACT_PATHS` (thêm khoá PII cake) + `installProcessHandlers` + file `logs/<svc>/<ngày>.log` (R-LOG-1..11) |
| S016-Q2 | OTel SDK (`http`, `fastify`, `pg`, `undici`, `ioredis`), nhận / truyền `traceparent`, `traceId` vào log + lỗi |
| S016-Q3 | `/metrics` (`METRICS_TOKEN`): bộ `bizcity_*` kế thừa + khai sẵn `bizcity_cake_*` |
| S016-Q4 | `infrastructure/monitoring/`: Prometheus · Alertmanager · Grafana · Loki · promtail · otel-collector · Tempo · exporters (+ redis_exporter khi bật profile) |
| S016-Q5 | 6 dashboard + quy tắc cảnh báo (kế thừa + Cake*); `promtool` / `amtool` / `otelcol validate` trong CI |
| S016-Q6 | ErrorBoundary web + `POST /system/client-errors` (R-LOG-10) |
| S016-Q7 | `diagnostic_runs`, L0 / L1, `bizcity doctor --bundle` |

## Xong khi

Gọi `/api/v1/system/health/ready` kèm `traceparent` ⇒ trace hiện trong Tempo, log cùng `traceId` trong Loki, `bizcity_http_requests_total` tăng; SC-LOG-1..3, SC-OBS-3 PASS; test chứng minh không dòng log nào chứa khoá trong `REDACT_PATHS`.
