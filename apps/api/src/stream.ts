// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-9 realtime: GỢI Ý "đã đổi", không đẩy dữ liệu.
//   Ghi: pg_notify('cake_stream', {t, c}) TRONG giao dịch của lệnh / tin vào ⇒ chỉ phát khi commit, đúng cả khi chạy nhiều bản API.
//   Đọc: GET /api/v1/stream (text/event-stream, cần phiên — web đọc bằng fetch có Authorization, không để token trên URL) ⇒ "changed" {caps} cho đúng đơn vị;
//   web làm mới truy vấn theo quyền của chính mình. Nhịp 25 giây; đóng sau 10 phút để phiên bị thu hồi không giữ luồng mãi (web tự nối lại).
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { sql } from 'kysely';
import { authOf } from '@bizcity/platform/core/auth';
import { pool, type Db } from '@bizcity/platform/db/client';

const CHANNEL = 'cake_stream';
type Sub = (caps: string[]) => void;
const subs = new Map<string, Set<Sub>>();
let listener: Promise<pg.PoolClient> | null = null;

/** Gọi TRONG giao dịch ghi: phát khi commit, mất khi quay lui. Payload không có dữ liệu người dùng. */
export async function notifyChanged(conn: Db, tenantId: string, caps: string[]): Promise<void> {
  await sql`SELECT pg_notify(${CHANNEL}, ${JSON.stringify({ t: String(tenantId), c: caps })})`.execute(conn);
}

function ensureListener() {
  listener ??= pool.connect().then(async (c) => {
    c.on('notification', (m) => {
      try {
        const p = JSON.parse(m.payload ?? '{}') as { t?: string; c?: string[] };
        for (const fn of subs.get(String(p.t)) ?? []) fn(Array.isArray(p.c) ? p.c : []);
      } catch { /* gợi ý hỏng: bỏ qua */ }
    });
    c.on('error', () => { listener = null; });
    await c.query(`LISTEN ${CHANNEL}`);
    return c;
  });
  return listener;
}

export function registerStream(app: FastifyInstance, opts: { maxMs?: number; pingMs?: number } = {}): void {
  app.addHook('onClose', async () => { if (listener) (await listener.catch(() => null))?.release(true); listener = null; subs.clear(); });
  app.get('/api/v1/stream', async (req, reply) => {
    const tenantId = String(authOf(req).tenantId);
    await ensureListener();
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send('hello', { retryMs: 3000 });
    const fn: Sub = (caps) => send('changed', { caps });
    if (!subs.has(tenantId)) subs.set(tenantId, new Set());
    subs.get(tenantId)!.add(fn);
    const ping = setInterval(() => res.write(': ping\n\n'), opts.pingMs ?? 25_000);
    const end = setTimeout(() => { send('bye', { reconnect: true }); res.end(); }, opts.maxMs ?? 10 * 60_000);
    res.on('close', () => { clearInterval(ping); clearTimeout(end); subs.get(tenantId)?.delete(fn); });
  });
}
