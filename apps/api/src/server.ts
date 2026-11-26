// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1/5 — API của open-cake trên @bizcity/platform 0.2.0: request-context + phong bì lỗi của nền,
//   32 route sinh từ action spec (9 danh mục chạy thật, còn lại 501 CAKE_NOT_ON_SERVER tới phase của nó), health / ready (cổng lược đồ R-SITE-9).
import Fastify, { type FastifyInstance } from 'fastify';
import { authOf, authPlugin, requirePermission } from '@bizcity/platform/core/auth';
import { registerErrorHandler } from '@bizcity/platform/core/http';
import { registerRequestContext } from '@bizcity/platform/core/request-context';
import { db, pool } from '@bizcity/platform/db/client';
import { pendingMigrations } from '@bizcity/platform/db/migrate';
import { ALL_ACTIONS } from '@open-cake/contracts';
import { catalogHandlers } from './catalog.js';
import { careCommandHandlers } from './care/commands.js';
import { memberHandlers } from './care/members.js';
import { inboxHandlers } from './care/inbox.js';
import { registerIngress } from './care/ingress.js';
import { MIGRATION_SOURCES } from './migrate.js';
import { recordHandlers } from './records.js'; // [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lớp mềm core.record.*
import { registerClientErrors } from './client-errors.js'; // [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-8
import { registerStream } from './stream.js'; // [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-9
import { registerCakeAuthz } from './auth/authz.js';
import { registerAuthRoutes } from './auth/routes.js';
import { staffHandlers } from './auth/staff.js'; // [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — nhân viên + vai & quyền
import { apiKeyHandlers } from './auth/apikeys.js'; // [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — khoá API
import { failure, registerActions } from './runtime.js';
import { orderHandlers, reconcileSentOrders, retryQueuedOrders } from './orders/service.js'; // [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — luồng đơn xuyên app
import { linkHandlers } from './orders/link.js';
import { partnerHandlers } from './orders/partner.js'; // [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-2/3
import { retryChannelCommands, sendHandlers } from './care/send.js'; // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — tin ra kênh qua Hub
import { registerPosEvents } from './orders/pos-events.js';
import { cakeLoggerOptions, genReqId, registerObservability } from './observability.js';
import { installProcessHandlers } from '@bizcity/platform/core/logger';
import { initTracing, shutdownTracing } from '@bizcity/platform/core/tracing';

export const VERSION = '0.1.0';

export async function buildApp(opts: { tenant?: string; logger?: boolean; hub?: { key: string; secret: string; now?: () => number }; stream?: { maxMs?: number; pingMs?: number } } = {}): Promise<FastifyInstance> {
  // [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — logger pino của nền (service/version/commit, che REDACT_PATHS, errFp; LOG_DIR ⇒ tệp theo ngày 30 ngày);
  //   nhận X-Request-Id của bên gọi; một dòng "xong yêu cầu" do observability.ts ghi (tắt log yêu cầu mặc định của Fastify).
  const app = Fastify({ logger: opts.logger === false ? false : cakeLoggerOptions(VERSION), genReqId, disableRequestLogging: true });
  registerRequestContext(app);
  registerObservability(app, VERSION);
  registerErrorHandler(app);
  // [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — mọi /api/v1/* cần phiên (JWT) hoặc khoá API (authPlugin của nền), trừ route khai public; quyền + vai của Cake khai trước khi nhận yêu cầu.
  registerCakeAuthz();
  await app.register(authPlugin);
  registerAuthRoutes(app, { devTenant: opts.tenant });
  app.get('/api/v1/system/health', { config: { public: true } }, async () => ({ ok: true, data: { app: 'open-cake', version: VERSION } }));
  app.get('/api/v1/system/health/ready', { config: { public: true } }, async (_req, reply) => {
    const pending = await pendingMigrations(pool, { sources: MIGRATION_SOURCES });
    if (pending.length) return reply.code(503).send({ ok: false, error: { code: 'NOT_READY', message: 'Còn migration chưa áp — chạy db-migrate.', details: { pending } } });
    return { ok: true, data: { schema: 'ready' } };
  });
  // [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — thêm 6 action đọc hộp thư / danh bạ / Contact 360 + cổng nhận bizcity_touch@1 của Hub.
  const handlers = { ...catalogHandlers, ...inboxHandlers, ...careCommandHandlers, ...memberHandlers, ...staffHandlers, ...apiKeyHandlers, ...recordHandlers, ...orderHandlers, ...linkHandlers, ...partnerHandlers, ...sendHandlers };
  registerActions(app, ALL_ACTIONS, handlers);
  // [2026-11-24 09:42 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-6 — tra một bằng chứng theo meta.receipt.evidenceId (trong đơn vị; không có nội dung, chỉ băm).
  app.get<{ Params: { id: string } }>('/api/v1/evidence/:id', { preHandler: requirePermission('reports:read') }, async (req) => {
    if (!/^[1-9][0-9]{0,18}$/.test(req.params.id)) throw failure('VALIDATION_ERROR', 'Mã bằng chứng không hợp lệ.', { field: 'id' });
    const r = await db.selectFrom('audit_logs').select(['id', 'created_at', 'actor', 'actor_kind', 'action', 'object_type', 'object_id', 'result_ok', 'result_code', 'request_id', 'idempotency_key', 'input_hash', 'chain_seq', 'prev_hash', 'hash'])
      .where('tenant_id', '=', authOf(req).tenantId).where('id', '=', req.params.id).executeTakeFirst();
    if (!r) throw failure('NOT_FOUND', 'Không tìm thấy bằng chứng.');
    return { ok: true, data: { ...r, id: String(r.id), created_at: new Date(r.created_at).toISOString() } };
  });
  app.get('/api/v1/system/actions', { config: { public: true } }, async () => ({ ok: true, data: { implemented: Object.keys(handlers).sort(), total: ALL_ACTIONS.length } }));
  registerIngress(app, opts.hub);
  registerClientErrors(app);
  registerPosEvents(app);
  registerStream(app, opts.stream);
  return app;
}

// Chạy trực tiếp: node --conditions=cake-dist dist/server.js
// [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — truy vết bật TRƯỚC mọi việc (không OTEL_EXPORTER_OTLP_ENDPOINT ⇒ vẫn có traceId, không gửi đi đâu);
//   lỗi không bắt ⇒ ghi fatal rồi thoát (R-LOG-3); dừng ⇒ gửi nốt span.
if (process.argv[1]?.endsWith('server.js')) {
  initTracing();
  installProcessHandlers({ service: 'open-cake-api', thuMuc: 'api', dir: process.env.LOG_DIR });
  const app = await buildApp();
  // [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — RC-ORDER-1: mỗi phút gửi lại yêu cầu đặt hàng chưa tới được cửa hàng.
  const retry = setInterval(() => { retryQueuedOrders().catch((e) => app.log.warn({ err: e }, 'gửi lại yêu cầu đặt hàng lỗi')); }, 60_000);
  // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — mỗi 15 giây gửi lại lệnh ra kênh chưa tới Hub (cùng khoá; quá 10 phút ⇒ "chưa rõ đã gửi").
  const cmds = setInterval(() => { retryChannelCommands().catch((e) => app.log.warn({ err: e }, 'gửi lại lệnh ra kênh lỗi')); }, 15_000);
  // [2026-11-26 11:31 AM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-6 — RC-ORDER-1: mỗi 5 phút đối chiếu yêu cầu đã gửi > 15 phút mà cửa hàng chưa có trạng thái.
  const recon = setInterval(() => { reconcileSentOrders().catch((e) => app.log.warn({ err: e }, 'đối chiếu yêu cầu đặt hàng lỗi')); }, 300_000);
  const stop = async () => { clearInterval(retry); clearInterval(cmds); clearInterval(recon); await app.close(); await shutdownTracing(); process.exit(0); };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8120) });
}
