// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 02:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 S005-7 — chẩn đoán L3 SC-CAKE-2..5 trên Postgres thật: dữ liệu đúng ⇒ ĐẠT; cố ý làm hỏng ngoài kernel (sửa contact_state, chèn MERGE bằng tên,
//   chèn dòng đảo chéo khách) ⇒ đúng phép kiểm báo, kèm mã mẫu. Chạy dưới vai CSDL ứng dụng (RLS thật).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';
import { devToken } from './http-client.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('chẩn đoán dữ liệu thật SC-CAKE-2..5', () => {
  let app: FastifyInstance;
  let token: string;
  let q: (s: string) => Promise<{ rows: Record<string, any>[] }>; // eslint-disable-line @typescript-eslint/no-explicit-any -- hàng thô từ pg
  const run = async () => (await app.inject({ method: 'GET', url: '/api/v1/system/diagnostics', headers: { authorization: `Bearer ${token}` } })).json().data as { ok: boolean; checks: { id: string; ok: boolean; count: number; sample: string[] }[] };
  const by = (r: Awaited<ReturnType<typeof run>>, id: string) => r.checks.find((c) => c.id === id)!;

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_APP_ROLE = 'cake_app_chan_doan';
    process.env.DB_SET_ROLE = 'cake_app_chan_doan';
    const dbUrl = await freshDb(url!, 'chan_doan');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = await devToken(app);
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    q = (s) => admin.query(s);
  }, 90_000);
  afterAll(async () => { await app?.close(); });

  it('dữ liệu do kernel ghi ⇒ cả bốn phép kiểm ĐẠT; cần quyền reports:read', async () => {
    const r = await run();
    expect(r.checks.map((c) => c.id)).toEqual(['SC-CAKE-2', 'SC-CAKE-3', 'SC-CAKE-4', 'SC-CAKE-5', 'SC-STOR-0']);
    expect(r).toMatchObject({ ok: true });
    for (const c of r.checks) expect(c).toMatchObject({ ok: true, count: 0, sample: [] });
    expect((await app.inject({ method: 'GET', url: '/api/v1/system/diagnostics' })).statusCode).toBe(401);
  });

  it('làm hỏng ngoài kernel ⇒ đúng phép kiểm báo (state lệch · MERGE bằng tên · đảo chéo khách)', async () => {
    const { rows: [st] } = await q('SELECT contact_id FROM contact_state ORDER BY contact_id LIMIT 1');
    await q(`UPDATE contact_state SET unanswered = NOT unanswered WHERE contact_id = '${st!.contact_id}'`);
    const { rows: [base] } = await q(`SELECT tenant_id, event_id, contact_id FROM touch_ledger WHERE is_reversal = false ORDER BY touch_id LIMIT 1`);
    await q(`INSERT INTO touch_ledger (tenant_id, event_id, contact_id, kind, direction, qty, is_reversal, dims, at) VALUES (${base!.tenant_id}, '${base!.event_id}', '${base!.contact_id}', 'merge', 'none', 1, false, '{"proof":"name"}', now())`);
    const { rows: [pair] } = await q(`SELECT a.touch_id AS orig, b.contact_id AS other, b.event_id AS ev, a.tenant_id FROM touch_ledger a JOIN touch_ledger b ON b.contact_id <> a.contact_id AND b.tenant_id = a.tenant_id
      WHERE a.is_reversal = false AND NOT EXISTS (SELECT 1 FROM touch_ledger z WHERE z.reverses_id = a.touch_id) ORDER BY a.touch_id LIMIT 1`);
    await q(`INSERT INTO touch_ledger (tenant_id, event_id, contact_id, kind, direction, qty, is_reversal, reverses_id, dims, at) VALUES (${pair!.tenant_id}, '${pair!.ev}', '${pair!.other}', 'message', 'in', -1, true, ${pair!.orig}, '{}', now())`);

    const r = await run();
    expect(r.ok).toBe(false);
    expect(by(r, 'SC-CAKE-4')).toMatchObject({ ok: false, count: 1 });
    expect(by(r, 'SC-CAKE-2')).toMatchObject({ ok: false, count: 1 });
    expect(by(r, 'SC-CAKE-2').sample[0]).toMatch(/^đảo khác khách: \d+$/);
    expect(by(r, 'SC-CAKE-5')).toMatchObject({ ok: false });
    expect(by(r, 'SC-CAKE-5').sample).toContain(st!.contact_id);
    expect(by(r, 'SC-CAKE-3')).toMatchObject({ ok: true });
  });
});
