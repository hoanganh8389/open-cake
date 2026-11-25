# Giám sát open-cake

<!-- [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — open-cake nối vào BỘ GIÁM SÁT CHUNG, không tự mang một bộ. -->

Chuẩn: [`bizcity_observability@1`](https://github.com/hoanganh8389/bizcity-platform/blob/main/docs/standard/BIZCITY-OBSERVABILITY-v1.md). Mỗi máy chủ chạy **một** bộ giám sát (otel-collector → Tempo, promtail → Loki, Prometheus + Alertmanager, Grafana; bản mẫu ở open-ketoan `infrastructure/monitoring/`). Mọi app trên máy đều gửi về bộ đó. Thư mục này chỉ chứa phần open-cake cần khai cho bộ chung.

| Việc | open-cake có | Nối vào bộ chung |
|---|---|---|
| Trace | span `HTTP {method} {route}`, `action {id}`; nhận `traceparent` thì tiếp trace đó; `fetch` gọi ra ngoài tự gửi kèm | đặt `OTEL_EXPORTER_OTLP_ENDPOINT` (vd `http://otel-collector:4318`) |
| Log | pino JSON ra stdout: `service, version, commit, reqId, traceId, tenant`; một dòng `xong yêu cầu` mỗi yêu cầu; lỗi ≥ warn chép thêm vào `logs/api/<ngày>.log` (giữ 30 ngày) | promtail đọc log Docker của `api` |
| Số đo | `GET /metrics`: `bizcity_http_*`, `bizcity_actions_total`, `bizcity_idempotency_requests_total`, `bizcity_db_pool_*`, `bizcity_build_info`, tiến trình Node; riêng Cake: `bizcity_cake_touches_total{result}`, `bizcity_cake_stream_clients`, `bizcity_cake_client_errors_total{result}` | dán [`prometheus-job.yml`](prometheus-job.yml) vào `scrape_configs` |

Hai mã truy lỗi: `requestId` (header `X-Request-Id`, trường `error.requestId`) và `traceId` (trường `error.traceId`). Khách báo lỗi thì chép hai mã này; tra trong Loki (`{service="open-cake-api"} |= "<requestId>"`) hoặc Tempo (`traceId`). Không cần xem dữ liệu của khách.

Chưa có (PHASE-016): luật cảnh báo riêng của Cake kèm `alerts.test.yml` và sổ tay `RUNBOOK-CANH-BAO.md` (R-OBS-5), bảng Grafana của Cake.
