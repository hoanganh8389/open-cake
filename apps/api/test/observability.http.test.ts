// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 · NO-CHUAN R-STD-OBS-1 — SC-OBS-P1 trên Postgres thật: gửi traceparent ⇒ lỗi trả đúng traceId đó, span action
//   là con của trace đó (không trace mới giữa chừng); mọi câu trả lời có X-Request-Id (nhận lại mã của bên gọi); /metrics có bizcity_http_* / bizcity_actions_total /
//   bizcity_cake_*, không nhãn đơn vị; METRICS_TOKEN đặt thì cần Bearer.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';
import { freshDb } from './fresh-db.js';
import { devToken } from './http-client.js';

const url = process.env.TEST_DATABASE_URL;
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const traceparent = `00-${TRACE_ID}-00f067aa0ba902b7-01`;

describe.skipIf(!url)('quan sát: traceparent, X-Request-Id, /metrics', () => {
  const memory = new InMemorySpanExporter();
  let app: FastifyInstance;
  let token = '';

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    await freshDb(url!, 'quan_sat'); // trước khi nạp nền: pool lấy DATABASE_URL lúc import
    (await import('@bizcity/platform/core/tracing')).initTracing({ exporter: memory });
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = await devToken(app);
  }, 60_000);
  afterAll(async () => { await app?.close(); await (await import('@bizcity/platform/core/tracing')).disableTracing(); delete process.env.CAKE_DEV_AUTH; delete process.env.METRICS_TOKEN; });

  it('nhận traceparent ⇒ tiếp trace đó: lỗi mang traceId, span action cùng trace; X-Request-Id của bên gọi được trả lại', async () => {
    const bad = await app.inject({ method: 'GET', url: '/api/v1/evidence/abc', headers: { authorization: `Bearer ${token}`, traceparent, 'x-request-id': 'hub-req-12345678' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.headers['x-request-id']).toBe('hub-req-12345678');
    expect(bad.json().error).toMatchObject({ code: 'VALIDATION_ERROR', requestId: 'hub-req-12345678', traceId: TRACE_ID });

    const anon = await app.inject({ method: 'GET', url: '/api/v1/catalog/items', headers: { traceparent } });
    expect(anon.statusCode).toBe(401);
    expect(anon.json().error.traceId).toBe(TRACE_ID);
    expect(anon.headers['x-request-id']).toMatch(/^req-/);

    memory.reset();
    const okRes = await app.inject({ method: 'GET', url: '/api/v1/catalog/items', headers: { authorization: `Bearer ${token}`, traceparent } });
    expect(okRes.statusCode).toBe(200);
    const spans = memory.getFinishedSpans();
    const action = spans.find((s) => s.name === 'action cake.catalog_item.list');
    expect(action?.spanContext().traceId).toBe(TRACE_ID);
    expect(spans.find((s) => s.name === 'HTTP GET /api/v1/catalog/items')?.spanContext().traceId).toBe(TRACE_ID);
  });

  it('/metrics: số đo nền + bizcity_cake_*, không nhãn đơn vị / người; METRICS_TOKEN đặt thì cần Bearer', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/system/client-errors', headers: { authorization: `Bearer ${token}` }, payload: { message: 'thử', errFp: '0a1b2c3d', route: '#/inbox' } });
    const m = await app.inject({ method: 'GET', url: '/metrics' });
    expect(m.statusCode).toBe(200);
    expect(m.headers['content-type']).toContain('text/plain');
    for (const name of ['bizcity_http_requests_total', 'bizcity_actions_total', 'bizcity_build_info', 'bizcity_db_pool_connections', 'bizcity_cake_client_errors_total']) expect(m.body).toContain(`# TYPE ${name} `);
    expect(m.body).toMatch(/bizcity_actions_total\{action="cake\.catalog_item\.list",result="ok",code=""\} \d+/);
    expect(m.body).not.toMatch(/\{[^}]*\b(tenant|actor|user|contact_id)="/);

    process.env.METRICS_TOKEN = 'so-do-bi-mat-0123456789';
    expect((await app.inject({ method: 'GET', url: '/metrics' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/metrics', headers: { authorization: 'Bearer sai' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/metrics', headers: { authorization: 'Bearer so-do-bi-mat-0123456789' } })).statusCode).toBe(200);
  });
});
