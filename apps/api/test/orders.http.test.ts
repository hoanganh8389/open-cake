// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/5/7/8 — luồng đơn xuyên app trên Postgres thật, với cửa hàng (open-pos-backend) GIẢ và Kế Toán GIẢ chạy trong tiến trình:
//   đọc tồn (đệm 60 giây) · nháp lấy giá công ty · gửi chặn khi chưa nối Kế Toán / chưa kết nối cửa hàng · khoá cửa hàng lưu mã hoá · thân gửi đi đúng schema chuẩn
//   (bizcity-platform order-flow.schema.json, khi có repo cạnh bên) · cửa hàng sập ⇒ queued, gửi lại · sự kiện ký sai ⇒ 401, lặp ⇒ bỏ, không lùi trạng thái, ghi dấu chạm kind=document · huỷ.
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 'bi-mat-ky-cua-hang-0123456789abcdef-thu';
const KEY = 'opb_khoaCuaHangThu0123456789';
const PLATFORM = join(dirname(fileURLToPath(import.meta.url)), '../../../../bizcity-platform');
const sign = (body: string, secret = SECRET, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const listen = (s: Server) => new Promise<string>((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(s.address() as { port: number }).port}`)));

describe.skipIf(!url)('luồng đơn xuyên app (open-cake ⇄ cửa hàng giả ⇄ Kế Toán giả)', () => {
  let app: FastifyInstance;
  let token = '';
  let sql: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  let contactId = '', itemId = '';
  const pos = { mode: 'ok' as 'ok' | 'down', received: [] as { body: Record<string, unknown>; key: string; auth: string; sigOk: boolean }[], cancels: 0, seq: 7000, gets: 0, known: new Set<string>() };
  let ketoanCalls = 0;
  let posServer: Server, ketoanServer: Server, posUrl = '', ketoanUrl = '';
  let validateOrder: ((v: unknown) => string[]) | null = null;

  const call = (method: 'GET' | 'POST', u: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'idempotency-key': `od-${Math.random().toString(36).slice(2, 12)}` } : {}) } });

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123';
    process.env.CAKE_OKT_API_KEY = 'kt_thu';
    const dbUrl = await freshDb(url!, 'don_hang');
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    sql = (q, p) => admin.query(q, p as unknown[]);
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;

    posServer = createServer(async (req, res) => {
      let raw = ''; for await (const c of req) raw += c;
      const send = (s: number, b: object) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); };
      if (pos.mode === 'down') return send(503, { ok: false, error: { code: 'NOT_READY', message: 'bảo trì' } });
      const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(req.headers['bizcity-signature'] ?? ''));
      const sigOk = !!m && createHmac('sha256', SECRET).update(`${m[1]}.${raw}`).digest('hex') === m[2];
      if (req.url!.startsWith('/wp-json/open-pos/v1/order-requests/cancel')) { pos.cancels++; return send(200, { ok: true, data: { status: 'cancelled', posRef: 'pos.order_request:x' } }); }
      if (req.method === 'GET') { // RC-ORDER-1: đọc trạng thái theo docRefs — chỉ trả các docRef cửa hàng "biết"
        pos.gets++;
        const refs = (new URL(req.url!, 'http://x').searchParams.get('docRefs') ?? '').split(',').filter((r) => pos.known.has(r));
        return send(sigOk ? 200 : 401, { ok: true, data: refs.map((docRef) => ({ docRef, version: 1, status: 'pending', posRef: 'pos.order_request:known', updatedAt: '2026-11-26T04:00:00Z' })) });
      }
      const body = JSON.parse(raw);
      pos.received.push({ body, key: String(req.headers['idempotency-key']), auth: String(req.headers.authorization), sigOk });
      return send(202, { ok: true, data: { status: 'pending', posRef: `pos.order_request:${++pos.seq}`, expiresAt: '2026-11-28T10:00:00Z' } });
    });
    ketoanServer = createServer((req, res) => {
      ketoanCalls++;
      const q = new URL(req.url!, 'http://x').searchParams;
      res.writeHead(req.headers['x-api-key'] === 'kt_thu' ? 200 : 401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, meta: { asOf: '2026-11-25T10:31:02Z', tenant: 'hoa-mai' },
        data: (q.get('skus') ?? '').split(',').map((sku) => ({ item: { code: sku }, branchCode: q.get('branchCode'), uom: 'Cái', onHand: 5, pendingOut: 1, held: 0, available: 4 })) }));
    });
    [posUrl, ketoanUrl] = [await listen(posServer), await listen(ketoanServer)];

    const schemaFile = join(PLATFORM, 'packages/contracts/schema/order/order-flow.schema.json');
    if (existsSync(schemaFile)) {
      const { validate } = await import(pathToFileURL(join(PLATFORM, 'tools/lib/json-schema.mjs')).href) as { validate: (r: unknown, s: unknown, v: unknown) => string[] };
      const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
      validateOrder = (v) => validate(schema, { $ref: '#/$defs/orderRequest' }, v);
    }

    const it = await call('POST', '/api/v1/catalog/items', { sku: '101010001', name: 'Váy hoa Thu Đông — hồng', units: [{ unit: 'Cái', ratio: 1, isDefaultSale: true }], taxCode: '8', price: 390000 });
    itemId = it.json().data.itemId;
    contactId = (await call('GET', '/api/v1/contacts?page=1&pageSize=10')).json().data[0].contact.contactId;
    const tid = (await sql(`SELECT id::text AS id FROM tenants WHERE code = 'hoa-mai'`)).rows[0]!.id;
    await sql(`INSERT INTO contact_identities (identity_id, tenant_id, contact_id, channel, scope, external_id, display_name, confidence, proof, valid_from) VALUES ('ID-PHONE-THU', $1, $2, 'phone', 'global', '0909123456', null, 'proven', '{"kind":"phone"}', now())`, [tid, contactId]);
  }, 90_000);
  afterAll(async () => { await app?.close(); posServer?.close(); ketoanServer?.close(); for (const k of ['CAKE_DEV_AUTH', 'CAKE_SECRET_KEY', 'CAKE_OKT_API_KEY']) delete process.env[k]; });

  it('S010-7 đọc tồn: chưa nối Kế Toán ⇒ none; nối rồi ⇒ số Kế Toán, đệm 60 giây', async () => {
    expect((await call('GET', `/api/v1/stock?itemIds=${itemId}`)).json().data).toMatchObject({ source: 'none', rows: [] });
    await sql(`UPDATE tenant_links SET catalog_source = 'ketoan', okt_base_url = $1, connected_at = now(), branch_code = 'CN01'`, [ketoanUrl]);
    const r = (await call('GET', `/api/v1/stock?itemIds=${itemId}`)).json().data;
    expect(r).toMatchObject({ source: 'ketoan', branchCode: 'CN01', rows: [{ itemId, onHand: 5, pendingOut: 1, held: 0, available: 4 }] });
    const before = ketoanCalls;
    await call('GET', `/api/v1/stock?itemIds=${itemId}`);
    expect(ketoanCalls).toBe(before);
  });

  it('S010-1/8 nháp lấy giá công ty; gửi cần kết nối cửa hàng; khoá lưu mã hoá; thân gửi đúng chuẩn; gửi lại không nhân đôi', async () => {
    const d = await call('POST', '/api/v1/order-requests', { contactId, lines: [{ itemId, qty: 2 }], shipTo: { name: 'Chị Lan', phone: '0909123456', address: '12 Lê Lợi, Q.1, TP.HCM' }, payment: 'cod', shipping: 'carrier', preferredCarrier: 'GHTK' });
    expect(d.statusCode).toBe(200);
    const o = d.json().data;
    expect(o).toMatchObject({ status: 'draft', total: 780000, code: `YC-${o.orderRequestId.slice(-6)}`, customer: { partnerCode: '0909123456', verified: true }, lines: [{ price: 390000, uom: 'Cái', qty: 2 }] });
    const noLink = await call('POST', `/api/v1/order-requests/${o.orderRequestId}/send`, {});
    expect(noLink.json().error.details.reason).toBe('CAKE_POS_NOT_LINKED');

    const set = await call('POST', '/api/v1/pos-link', { baseUrl: posUrl, branchCode: 'CN01', key: KEY, secret: SECRET });
    expect(set.json().data).toMatchObject({ keyPrefix: KEY.slice(0, 10), hasSecret: true, ketoanLinked: true, eventsPath: '/ingress/v1/pos-events' });
    const stored = (await sql(`SELECT key_sealed, secret_sealed FROM pos_links`)).rows[0]!;
    expect(JSON.stringify(stored)).not.toContain(KEY);
    expect(JSON.stringify(stored)).not.toContain(SECRET);
    expect((await call('POST', '/api/v1/pos-link/test', {})).json().data.lastError).toBeNull();

    const sent = (await call('POST', `/api/v1/order-requests/${o.orderRequestId}/send`, {})).json().data;
    expect(sent).toMatchObject({ status: 'pending', sendState: 'sent', posRef: 'pos.order_request:7001' });
    const got = pos.received.at(-1)!;
    expect(got).toMatchObject({ key: `cake.order_request:${o.orderRequestId}@1`, auth: `Bearer ${KEY}`, sigOk: true });
    expect(got.body).toMatchObject({ docRef: `cake.order_request:${o.orderRequestId}`, tenant: 'hoa-mai', branchCode: 'CN01', customer: { partner: { code: '0909123456' } }, lines: [{ item: { code: '101010001' }, uom: 'Cái', qty: 2, proposedPrice: 390000 }] });
    expect(JSON.stringify(got.body)).not.toContain(contactId); // R-STD-ORD-10
    if (validateOrder) expect(validateOrder(got.body)).toEqual([]);

    expect((await call('POST', `/api/v1/order-requests/${o.orderRequestId}/send`, {})).json().error.details.reason).toBe('CAKE_ORDER_LOCKED');
    expect((await call('POST', '/api/v1/order-requests', { orderRequestId: o.orderRequestId, contactId, lines: [{ itemId, qty: 1 }], shipping: 'pickup' })).json().error.details.reason).toBe('CAKE_ORDER_LOCKED');
  });

  it('RC-ORDER-1 cửa hàng sập ⇒ queued; đến hạn gửi lại ⇒ sent', async () => {
    const o = (await call('POST', '/api/v1/order-requests', { contactId, lines: [{ itemId, qty: 1 }], shipping: 'pickup' })).json().data;
    pos.mode = 'down';
    expect((await call('POST', `/api/v1/order-requests/${o.orderRequestId}/send`, {})).json().data).toMatchObject({ status: 'pending', sendState: 'queued' });
    pos.mode = 'ok';
    await sql(`UPDATE order_requests SET next_send_at = now() - interval '1 second' WHERE order_request_id = $1`, [o.orderRequestId]);
    expect(await (await import('../src/orders/service.js')).retryQueuedOrders()).toBe(1);
    const list = (await call('GET', `/api/v1/order-requests?contactId=${contactId}`)).json().data as { orderRequestId: string; sendState: string; posRef: string }[];
    expect(list.find((x) => x.orderRequestId === o.orderRequestId)).toMatchObject({ sendState: 'sent', posRef: 'pos.order_request:7002' });
  });

  it('S010-5 sự kiện cửa hàng: ký sai 401 · áp theo thứ tự · lặp bỏ qua · không lùi · dấu chạm kind=document · huỷ khi đã xác nhận bị khoá', async () => {
    const [o] = (await call('GET', `/api/v1/order-requests?contactId=${contactId}`)).json().data.filter((x: { total: number }) => x.total === 780000) as { orderRequestId: string; posRef: string }[];
    const docRef = `cake.order_request:${o!.orderRequestId}`;
    const ev = (id: string, type: string, at: string, data: object = {}) => ({ id, type, occurredAt: at, tenant: 'hoa-mai', data: { docRef, posRef: o!.posRef, version: 1, ...data } });
    const post = (body: object, secret = SECRET) => { const raw = JSON.stringify(body); return app.inject({ method: 'POST', url: '/ingress/v1/pos-events', payload: raw, headers: { 'content-type': 'application/json', 'bizcity-signature': sign(raw, secret) } }); };

    expect((await post(ev('evt-0001', 'pos.order.confirmed', '2026-11-25T10:40:00Z'), 'sai-bi-mat-0123456789abcdef0123456789')).statusCode).toBe(401);
    expect((await post(ev('evt-0001', 'pos.order.confirmed', '2026-11-25T10:40:00Z', { orderRef: 'pos.order:8812', lines: [], total: 780000 }))).json().data.status).toBe('applied');
    expect((await post(ev('evt-0001', 'pos.order.confirmed', '2026-11-25T10:40:00Z'))).json().data.status).toBe('duplicate');
    expect((await post(ev('evt-0002', 'pos.order.shipped', '2026-11-26T02:05:00Z', { shipmentRef: 'pos.shipment:5501', carrier: 'GHTK', waybill: 'S123456.SG01', ledgerDocKey: 'btsoft:3:sale:8812' }))).json().data.status).toBe('applied');
    expect((await post(ev('evt-0003', 'pos.order_request.received', '2026-11-25T10:31:05Z'))).json().data.status).toBe('kept'); // đến muộn: không lùi
    const now = (await call('GET', `/api/v1/order-requests?contactId=${contactId}`)).json().data.find((x: { orderRequestId: string }) => x.orderRequestId === o!.orderRequestId);
    expect(now).toMatchObject({ status: 'shipped', orderRef: 'pos.order:8812' });
    expect(now.events.map((e: { type: string }) => e.type).sort()).toEqual(['cake.sent', 'pos.order.confirmed', 'pos.order.shipped', 'pos.order_request.received']);
    const touches = (await sql(`SELECT dims->>'stage' AS stage FROM touch_ledger WHERE kind = 'document' AND contact_id = $1 ORDER BY touch_id`, [contactId])).rows.map((r) => r.stage);
    expect(touches).toEqual(['confirmed', 'shipped', 'pending']); // mỗi sự kiện MỚI một dấu chạm, mang bước cửa hàng báo (lặp không ghi; đến muộn vẫn ghi nhưng không đổi trạng thái)
    expect((await call('POST', `/api/v1/order-requests/${o!.orderRequestId}/cancel`, {})).json().error.details.reason).toBe('CAKE_ORDER_LOCKED');
  });

  it('S010-6 RC-ORDER-1: đã gửi > 15 phút — cửa hàng có ⇒ không gửi lại; thiếu ⇒ gửi lại CÙNG khoá; chưa đủ 15 phút ⇒ bỏ qua', async () => {
    const { reconcileSentOrders } = await import('../src/orders/service.js');
    const mk = async () => {
      const o = (await call('POST', '/api/v1/order-requests', { contactId, lines: [{ itemId, qty: 1 }], shipping: 'pickup' })).json().data;
      await call('POST', `/api/v1/order-requests/${o.orderRequestId}/send`, {});
      return o.orderRequestId as string;
    };
    const age = (id: string) => sql(`UPDATE order_requests SET updated_at = now() - interval '16 minutes' WHERE order_request_id = $1`, [id]);
    const [present, missing, fresh] = [await mk(), await mk(), await mk()];
    await age(present); await age(missing); // `fresh` giữ nguyên ⇒ chưa đủ 15 phút
    pos.known.add(`cake.order_request:${present}`);
    const before = pos.received.length;
    expect(await reconcileSentOrders()).toEqual({ checked: 2, resent: 1 });
    const again = pos.received.slice(before);
    expect(again).toHaveLength(1);
    expect(again[0]).toMatchObject({ key: `cake.order_request:${missing}@1`, sigOk: true });
    expect(again.some((x) => x.key.includes(present) || x.key.includes(fresh))).toBe(false);
    // `present` đã ghi dấu đã kiểm ⇒ lượt ngay sau không kiểm lại; `missing` vừa gửi lại ⇒ cũng mới
    expect(await reconcileSentOrders()).toEqual({ checked: 0, resent: 0 });
    // không đọc được cửa hàng ⇒ không kết luận "thiếu", không gửi lại
    await age(missing); pos.mode = 'down';
    expect(await reconcileSentOrders()).toEqual({ checked: 1, resent: 0 });
    pos.mode = 'ok';
  }, 30_000);

  it('huỷ: nháp huỷ tại chỗ; đã gửi ⇒ báo cửa hàng huỷ', async () => {
    const draft = (await call('POST', '/api/v1/order-requests', { contactId, lines: [{ itemId, qty: 1 }], shipping: 'pickup' })).json().data;
    expect((await call('POST', `/api/v1/order-requests/${draft.orderRequestId}/cancel`, {})).json().data.status).toBe('cancelled');
    const sent = (await call('POST', '/api/v1/order-requests', { contactId, lines: [{ itemId, qty: 1 }], shipping: 'pickup' })).json().data;
    await call('POST', `/api/v1/order-requests/${sent.orderRequestId}/send`, {});
    const before = pos.cancels;
    expect((await call('POST', `/api/v1/order-requests/${sent.orderRequestId}/cancel`, { reason: 'khách đổi ý' })).json().data.status).toBe('cancelled');
    expect(pos.cancels).toBe(before + 1);
  });
});
