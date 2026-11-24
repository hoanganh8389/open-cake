// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1/5 — API của open-cake trên @bizcity/platform 0.2.0: request-context + phong bì lỗi của nền,
//   32 route sinh từ action spec (9 danh mục chạy thật, còn lại 501 CAKE_NOT_ON_SERVER tới phase của nó), health / ready (cổng lược đồ R-SITE-9).
import Fastify, { type FastifyInstance } from 'fastify';
import { registerErrorHandler } from '@bizcity/platform/core/http';
import { registerRequestContext } from '@bizcity/platform/core/request-context';
import { pool } from '@bizcity/platform/db/client';
import { pendingMigrations } from '@bizcity/platform/db/migrate';
import { ALL_ACTIONS } from '@open-cake/contracts';
import { catalogHandlers } from './catalog.js';
import { MIGRATION_SOURCES } from './migrate.js';
import { registerActions, useDevTenant } from './runtime.js';

export const VERSION = '0.1.0';

export async function buildApp(opts: { tenant?: string; logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? { level: process.env.LOG_LEVEL ?? 'info' } });
  registerRequestContext(app);
  registerErrorHandler(app);
  app.get('/api/v1/system/health', async () => ({ ok: true, data: { app: 'open-cake', version: VERSION } }));
  app.get('/api/v1/system/health/ready', async (_req, reply) => {
    const pending = await pendingMigrations(pool, { sources: MIGRATION_SOURCES });
    if (pending.length) return reply.code(503).send({ ok: false, error: { code: 'NOT_READY', message: 'Còn migration chưa áp — chạy db-migrate.', details: { pending } } });
    return { ok: true, data: { schema: 'ready' } };
  });
  await useDevTenant(app, opts.tenant ?? process.env.CAKE_TENANT ?? 'hoa-mai');
  registerActions(app, ALL_ACTIONS, { ...catalogHandlers });
  return app;
}

// Chạy trực tiếp: node --conditions=cake-dist dist/server.js
if (process.argv[1]?.endsWith('server.js')) {
  const app = await buildApp();
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8120) });
}
