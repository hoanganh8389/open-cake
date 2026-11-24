// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — test tích hợp: createHttpClient của WEB gọi API THẬT (app.inject) trên Postgres thật, kịch bản như
//   test giả lập (action-client/test/mock.test.ts) ⇒ máy chủ và bộ giả lập cùng ngữ nghĩa hợp đồng. Chạy: TEST_DATABASE_URL=postgres://… npm test. Không có ⇒ bỏ qua.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ActionClient } from '@open-cake/action-client';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('API danh mục trên Postgres (cùng hợp đồng với bộ giả lập)', () => {
  let app: FastifyInstance;
  let c: ActionClient;
  let sql: (q: string) => Promise<unknown>;
  const C = () => import('@open-cake/contracts');

  beforeAll(async () => {
    process.env.DATABASE_URL = url; // nền đọc env lúc nạp ⇒ đặt trước khi import
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: url }); await admin.connect();
    sql = (q) => admin.query(q);
    await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const { runMigrations } = await import('@bizcity/platform/db/migrate');
    const { MIGRATION_SOURCES } = await import('../src/migrate.js');
    await runMigrations(() => {}, { connectionString: url, sources: MIGRATION_SOURCES });
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    const { createHttpClient } = await import('@open-cake/action-client');
    c = createHttpClient({
      fetchImpl: (async (u: string, init: RequestInit) => {
        const r = await app.inject({ method: init.method as 'GET', url: u, headers: init.headers as Record<string, string>, payload: init.body as string | undefined });
        return new Response(r.body, { status: r.statusCode, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    });
  }, 60_000);
  afterAll(async () => { await app?.close(); });

  it('local: tạo đúng chuẩn kèm giá, trùng mã / tên bị chặn, giá theo ĐVT của mã', async () => {
    const { catalogItemCreate, catalogItemList, catalogPriceSet } = await C();
    const a = await c.call(catalogItemCreate, { sku: '101010009', name: 'Váy kèm giá', units: [{ unit: 'Cái', ratio: 1, isDefaultSale: true }], taxCode: '8', price: 450000 });
    expect(a.data.warnings.map((w) => w.code)).not.toContain('CAT-NO-COMPANY-PRICE');
    const b = await c.call(catalogItemCreate, { sku: '101010004', name: 'Váy hoa Thu Đông — đỏ', units: [{ unit: 'Cái', ratio: 1, isDefaultSale: true }], taxCode: 'R08', categoryCode: '101010' });
    expect(b.data.taxCode).toBe('8');
    expect(b.data.itemId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(b.data.warnings.map((w) => w.code)).toContain('CAT-NO-COMPANY-PRICE');
    await expect(c.call(catalogItemCreate, { sku: '101010004', name: 'Khác', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_SKU_TAKEN' });
    await expect(c.call(catalogItemCreate, { sku: '101010005', name: 'váy hoa thu đông — đỏ', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_ITEM_NAME_TAKEN' });
    await expect(c.call(catalogPriceSet, { priceListCode: 'CONGTY', itemId: b.data.itemId, unit: 'Hộp', price: 1 })).rejects.toMatchObject({ field: 'unit' });
    await c.call(catalogPriceSet, { priceListCode: 'CONGTY', itemId: b.data.itemId, unit: 'Cái', price: 390000 });
    const list = await c.call(catalogItemList, { q: '101010004', page: 1, pageSize: 50, includeRetired: false });
    expect(list.data[0]?.warnings.map((w) => w.code)).not.toContain('CAT-NO-COMPANY-PRICE');
    expect(list.meta).toMatchObject({ page: 1, pageSize: 50, total: 1 });
  });

  it('idempotency: cùng khoá ⇒ cùng kết quả, không tạo hai lần', async () => {
    const { catalogItemCreate, catalogItemList } = await C();
    const input = { sku: '102020001', name: 'Kẹp tóc hoa', units: [{ unit: 'Chiếc', ratio: 1, isDefaultSale: true }], taxCode: '8', categoryCode: '102020' };
    const x = await c.call(catalogItemCreate, input, { idempotencyKey: 'test-idem-0001' });
    const y = await c.call(catalogItemCreate, input, { idempotencyKey: 'test-idem-0001' });
    expect(y.data.itemId).toBe(x.data.itemId);
    expect((await c.call(catalogItemList, { q: '102020001', page: 1, pageSize: 50, includeRetired: false })).meta).toMatchObject({ total: 1 });
  });

  it('cột riêng ở lớp mềm; lọc "Bán trong CRM"; bảng giá một lần gọi', async () => {
    const { catalogItemList, catalogItemUpdate, catalogPriceList } = await C();
    const id = (await c.call(catalogItemList, { q: '101010009', page: 1, pageSize: 50, includeRetired: false })).data[0]!.itemId;
    const up = await c.call(catalogItemUpdate, { itemId: id, patch: { local: { displayName: 'Váy hồng (bán chạy)', sellable: false } } });
    expect(up.data.local).toMatchObject({ displayName: 'Váy hồng (bán chạy)', sellable: false });
    expect(await sql(`SELECT 1 FROM entity_meta WHERE entity_id = '${id}' AND key = 'cake.item.sellable'`)).toMatchObject({ rowCount: 1 });
    expect((await c.call(catalogItemList, { sellableOnly: true, page: 1, pageSize: 50, includeRetired: false })).data.map((x) => x.itemId)).not.toContain(id);
    expect((await c.call(catalogPriceList, { priceListCode: 'CONGTY', page: 1, pageSize: 200 })).data.length).toBe(2);
  });

  it('ketoan: cột kế toán chỉ đọc (cổng ghi), cột riêng vẫn sửa; nguồn trả tenant slug', async () => {
    const { catalogItemList, catalogItemUpdate, catalogItemCreate, catalogSourceGet } = await C();
    await sql(`UPDATE tenant_links SET catalog_source = 'ketoan', okt_base_url = 'https://ketoan.hoamai.example', connected_at = now(), branch_code = 'CN01'`);
    const id = (await c.call(catalogItemList, { q: '101010004', page: 1, pageSize: 50, includeRetired: false })).data[0]!.itemId;
    await expect(c.call(catalogItemUpdate, { itemId: id, patch: { name: 'Đổi tên' } })).rejects.toMatchObject({ reason: 'CAKE_CATALOG_READONLY' });
    await expect(c.call(catalogItemCreate, { sku: '199999999', name: 'Mới', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_CATALOG_READONLY' });
    expect((await c.call(catalogItemUpdate, { itemId: id, patch: { local: { displayName: 'Váy đỏ' } } })).data.local.displayName).toBe('Váy đỏ');
    expect((await c.call(catalogSourceGet, {})).data).toMatchObject({ tenant: 'hoa-mai', catalogSource: 'ketoan', branchCode: 'CN01' });
  });

  it('action chưa có máy chủ ⇒ 501 CAKE_NOT_ON_SERVER (không giả vờ thành công)', async () => {
    const { contactList } = await C();
    await expect(c.call(contactList, { page: 1, pageSize: 50 })).rejects.toMatchObject({ code: 'CAPABILITY_MISSING', reason: 'CAKE_NOT_ON_SERVER' });
  });
});
