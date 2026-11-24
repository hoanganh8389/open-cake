// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 09:42 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-6 — bằng chứng: lệnh thành công ⇒ meta.receipt tra lại được, chuỗi băm nối tiếp, KHÔNG lưu nội dung;
//   lệnh thất bại ⇒ một dòng result_ok=false (sau khi quay lui); gửi lặp cùng khoá ⇒ replayed, không thêm bằng chứng. Chạy dưới vai CSDL ứng dụng.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';
import { devToken } from './http-client.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('bằng chứng mỗi lệnh ghi', () => {
  let app: FastifyInstance;
  let token: string;
  let q: (s: string) => Promise<{ rows: Record<string, unknown>[] }>;
  const post = (u: string, payload: unknown, key?: string) => app.inject({ method: 'POST', url: u, payload: payload as object, headers: { authorization: `Bearer ${token}`, ...(key ? { 'idempotency-key': key } : {}) } });
  const item = (sku: string, name: string) => ({ sku, name, units: [{ unit: 'Cái', ratio: 1, isDefaultSale: true }], taxCode: '8', price: 390000 });

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_APP_ROLE = 'cake_app_kiem';
    process.env.DB_SET_ROLE = 'cake_app_kiem';
    const dbUrl = await freshDb(url!, 'evidence');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = await devToken(app);
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    q = (s) => admin.query(s);
  }, 90_000);
  afterAll(async () => { await app?.close(); });

  it('thành công ⇒ receipt tra được, chuỗi băm nối tiếp, không có nội dung', async () => {
    const a = await post('/api/v1/catalog/items', item('101010001', 'Váy hoa hồng'), 'bang-chung-0001');
    const b = await post('/api/v1/catalog/items', item('101010002', 'Váy hoa xanh'), 'bang-chung-0002');
    const ra = a.json().meta.receipt, rb = b.json().meta.receipt;
    expect(ra).toMatchObject({ evidenceId: expect.any(String), hash: expect.stringMatching(/.+/), at: expect.any(String) });
    const ev = (await app.inject({ method: 'GET', url: `/api/v1/evidence/${rb.evidenceId}`, headers: { authorization: `Bearer ${token}` } })).json().data;
    expect(ev).toMatchObject({ action: 'cake.catalog_item.create', object_type: 'cake.catalog', result_ok: true, idempotency_key: 'bang-chung-0002', input_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/), hash: rb.hash });
    expect(ev.object_id).toBe(b.json().data.itemId);
    expect(ev.prev_hash).toBe(ra.hash); // chuỗi băm nối tiếp (trigger của nền)
    const { rows: [row] } = await q(`SELECT before_data, after_data FROM audit_logs WHERE id = ${rb.evidenceId}`);
    expect(row).toEqual({ before_data: null, after_data: null }); // không lưu nội dung (PII)
  });

  it('gửi lặp cùng khoá ⇒ replayed, không thêm bằng chứng; thất bại ⇒ một dòng result_ok=false', async () => {
    const n = async () => Number((await q(`SELECT count(*) AS n FROM audit_logs`)).rows[0]!.n);
    const before = await n();
    const again = await post('/api/v1/catalog/items', item('101010001', 'Váy hoa hồng'), 'bang-chung-0001');
    expect(again.json().meta).toMatchObject({ replayed: true });
    expect(await n()).toBe(before);
    const dup = await post('/api/v1/catalog/items', item('101010001', 'Tên khác hẳn'), 'bang-chung-0003');
    expect(dup.statusCode).toBe(409);
    expect(await n()).toBe(before + 1);
    const { rows: [last] } = await q(`SELECT action, result_ok, result_code FROM audit_logs ORDER BY id DESC LIMIT 1`);
    expect(last).toEqual({ action: 'cake.catalog_item.create', result_ok: false, result_code: 'CONFLICT' });
    expect(Number((await q(`SELECT count(*) AS n FROM catalog_items WHERE name = 'Tên khác hẳn'`)).rows[0]!.n)).toBe(0); // lệnh lỗi đã quay lui
  });
});
