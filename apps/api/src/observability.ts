// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 · NO-CHUAN R-STD-OBS-1 — quan sát theo bizcity_observability@1, dùng NGUYÊN bộ của nền (tracing / metrics / logger):
//   - mọi câu trả lời có X-Request-Id (R-OBS-1); nhận traceparent của bên gọi ⇒ TIẾP trace đó (span HTTP), traceId vào log và vào error.traceId;
//     gọi ra ngoài bằng fetch tự mang traceparent (initTracing gắn undici) — không tạo trace mới giữa chừng;
//   - xong yêu cầu: một dòng log { route, method, status, ms, errCode } + bizcity_http_* (nhãn ít giá trị, R-OBS-4: không tenant / user làm nhãn);
//   - GET /metrics (Prometheus, R-OBS-3): không qua nginx; METRICS_TOKEN đặt thì cần Bearer. Số đo riêng: bizcity_cake_*.
//   Không import @opentelemetry/* ở đây (R-OBS-7: chỉ tracing.ts của nền). /metrics, health, stream (SSE dài) không có span.
import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Errors } from '@bizcity/platform/core/errors';
import { loggerOptions } from '@bizcity/platform/core/logger';
import { Counter, Gauge, metrics, renderMetrics } from '@bizcity/platform/core/metrics';
import { currentTraceId, endServerSpan, runInScope, startServerSpan, type TraceScope } from '@bizcity/platform/core/tracing';
import { pool } from '@bizcity/platform/db/client';

/** Số đo riêng của Cake (SC-OBS-1: số đo dùng ở bảng / cảnh báo phải khai trong mã). Nhãn chỉ là tập nhỏ cố định. */
export const cakeMetrics = {
  touches: new Counter('bizcity_cake_touches_total', 'Lần chạm khách Hub gửi vào cổng /ingress/v1/touch theo kết quả (accepted, unchanged, rejected)'),
  streamClients: new Gauge('bizcity_cake_stream_clients', 'Số luồng gợi ý realtime (GET /api/v1/stream) đang mở'),
  clientErrors: new Counter('bizcity_cake_client_errors_total', 'Lỗi giao diện web gửi về POST /system/client-errors theo kết quả (logged, limited)'),
};

const TRACEPARENT = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/;
const UNTRACED = new Set(['/metrics', '/api/v1/system/health', '/api/v1/system/health/ready', '/api/v1/stream']);
const scopes = new WeakMap<FastifyRequest, TraceScope>();
const incomingTraceId = (req: FastifyRequest) => {
  const tp = req.headers.traceparent;
  return typeof tp === 'string' ? TRACEPARENT.exec(tp)?.[1] : undefined;
};

/** Khoá PII riêng của Cake (R-LOG-4) — che thêm ngoài REDACT_PATHS của nền (phone, email, token, body, payload…): tên khách, nội dung tin, địa chỉ, mã người trên kênh. */
export const CAKE_PII = ['displayName', 'realName', 'text', 'content', 'address', 'note', 'externalUserId', 'avatarUrl'];

/**
 * Logger pino của nền (service / version / commit, errFp, LOG_DIR ⇒ tệp lỗi theo ngày giữ 30 ngày) + che CAKE_PII.
 * version của nền 0.2.0 đọc package.json SAI chỗ khi cài làm gói (ra 0.0.0) ⇒ ghi đè bằng VERSION của app; commit lấy từ BIZCITY_GIT_SHA (Dockerfile).
 */
export function cakeLoggerOptions(version: string) {
  const lo = loggerOptions({ service: 'open-cake-api', level: process.env.LOG_LEVEL ?? 'info', dir: process.env.LOG_DIR });
  if (!lo.base) return lo;
  return { ...lo, base: { ...lo.base, version }, redact: { ...lo.redact, paths: [...lo.redact.paths, ...CAKE_PII.flatMap((k) => [k, `*.${k}`])] } };
}

/** Mã yêu cầu: nhận X-Request-Id hợp lệ của bên gọi (Hub, nginx), không thì sinh mới. */
export function genReqId(raw: { headers: Record<string, string | string[] | undefined> }): string {
  const h = raw.headers['x-request-id'];
  const v = Array.isArray(h) ? h[0] : h;
  return v && /^[A-Za-z0-9._:-]{8,128}$/.test(v) ? v : `req-${crypto.randomUUID().slice(0, 13)}`;
}

export function registerObservability(app: FastifyInstance, version: string): void {
  metrics.buildInfo.set({ version, kernel: '', standard: '' }, 1);

  // Hook callback: done() chạy TRONG ngữ cảnh span ⇒ mọi hook / handler sau là con của span HTTP.
  app.addHook('onRequest', (req, reply, done) => {
    reply.header('x-request-id', req.id);
    const route = req.routeOptions.url ?? 'unmatched';
    if (UNTRACED.has(route)) {
      const traceId = incomingTraceId(req);
      if (traceId) req.log = req.log.child({ traceId });
      return done();
    }
    const scope = startServerSpan(req.method, route, req.headers, String(req.id));
    scopes.set(req, scope);
    runInScope(scope, () => {
      const traceId = currentTraceId() ?? incomingTraceId(req);
      if (traceId) req.log = req.log.child({ traceId });
      done();
    });
  });

  // Sau authPlugin: mã đơn vị / người thao tác vào log (mã, không tên — R-LOG-4); KHÔNG làm nhãn số đo.
  app.addHook('preHandler', async (req) => {
    const a = (req as { auth?: { tenantId: string; actor: string; kind: string } }).auth;
    if (a) {
      req.log = req.log.child({ tenant: a.tenantId, actor: a.actor, actorKind: a.kind });
      scopes.get(req)?.span.setAttribute('bizcity.tenant', a.tenantId);
    }
  });

  app.addHook('onResponse', async (req, reply) => {
    const route = req.routeOptions.url ?? 'unmatched';
    const status = reply.statusCode;
    metrics.httpRequests.inc({ method: req.method, route, status: String(status) });
    metrics.httpDuration.observe({ method: req.method, route }, reply.elapsedTime / 1000);
    if (reply.errCode) metrics.httpErrors.inc({ code: reply.errCode });
    if (route !== '/metrics') req.log.info({ route, method: req.method, status, ms: Math.round(reply.elapsedTime), ...(reply.errCode ? { errCode: reply.errCode } : {}) }, 'xong yêu cầu');
    const scope = scopes.get(req);
    if (scope) { scopes.delete(req); endServerSpan(scope, status, reply.errCode); }
  });

  // Bên gọi ngắt giữa chừng: onResponse không chạy — vẫn đóng span (499 như nginx).
  app.addHook('onRequestAbort', async (req) => {
    const scope = scopes.get(req);
    if (scope) { scopes.delete(req); endServerSpan(scope, 499); }
  });

  app.get('/metrics', { config: { public: true } }, async (req, reply) => {
    if (!tokenOk(req.headers.authorization)) throw Errors.unauthorized('Cần Authorization: Bearer <METRICS_TOKEN>.');
    metrics.dbPool.set({ state: 'total' }, pool.totalCount);
    metrics.dbPool.set({ state: 'idle' }, pool.idleCount);
    metrics.dbPool.set({ state: 'waiting' }, pool.waitingCount);
    metrics.dbPoolMax.set({}, pool.options.max ?? 10);
    return reply.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
  });
}

function tokenOk(header: string | undefined): boolean {
  const want = process.env.METRICS_TOKEN;
  if (!want) return true;
  const given = Buffer.from(header?.startsWith('Bearer ') ? header.slice(7) : '');
  return given.length === Buffer.byteLength(want) && timingSafeEqual(given, Buffer.from(want));
}
