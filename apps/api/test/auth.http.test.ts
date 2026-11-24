// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — đăng nhập + phân quyền trên Postgres thật: không phiên ⇒ 401; vé WordPress (cùng khuôn open-ketoan) đúng / sai /
//   hết hạn / sống quá 5 phút; quyền theo vai (viewer không đọc nội dung tin, agent không ghép khách); quyền trong vé thay quyền vai; khoá API phạm vi cake:read chỉ đọc;
//   đăng nhập dev chỉ khi CAKE_DEV_AUTH=1. Không có TEST_DATABASE_URL ⇒ bỏ qua.
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 'wp-sso-bi-mat-kiem-thu-0123456789abcdef';
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const ticket = (o: Record<string, unknown>, secret = SECRET) => { const body = b64(JSON.stringify(o)); return `${body}.${b64(createHmac('sha256', secret).update(body).digest())}`; };
const now = () => Math.floor(Date.now() / 1000);

describe.skipIf(!url)('đăng nhập + phân quyền', () => {
  let app: FastifyInstance;
  let q: (sql: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const get = (u: string, token?: string, h: Record<string, string> = {}) => app.inject({ method: 'GET', url: u, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...h } });
  const sso = async (t: string) => app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: t } });
  const login = async (o: Record<string, unknown>) => (await sso(ticket({ tenant: 'hoa-mai', iat: now(), exp: now() + 120, ...o }))).json().data.token as string;

  beforeAll(async () => {
    process.env.WP_SSO_SECRET = SECRET; // nền đọc env lúc nạp ⇒ đặt trước freshDb
    process.env.CAKE_APP_ROLE = 'cake_app_kiem'; // API chạy dưới vai ứng dụng ⇒ RLS có hiệu lực thật
    process.env.DB_SET_ROLE = 'cake_app_kiem';
    delete process.env.CAKE_DEV_AUTH;
    const dbUrl = await freshDb(url!, 'auth');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    q = (s, v) => admin.query(s, v as unknown[]);
  }, 90_000);
  afterAll(async () => { await app?.close(); });

  it('không phiên ⇒ 401; route công khai vẫn mở; đăng nhập dev tắt mặc định', async () => {
    expect((await get('/api/v1/contacts')).statusCode).toBe(401);
    expect((await get('/api/v1/system/health')).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).statusCode).toBe(404);
    process.env.CAKE_DEV_AUTH = '1';
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).statusCode).toBe(200);
    delete process.env.CAKE_DEV_AUTH;
  });

  it('vé WordPress: đúng ⇒ phiên; sai chữ ký / hết hạn / sống quá 5 phút ⇒ 401', async () => {
    const ok = await sso(ticket({ email: 'lan@hoamai.vn', name: 'Lan', tenant: 'hoa-mai', iat: now(), exp: now() + 120 }));
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.user).toMatchObject({ email: 'lan@hoamai.vn', role: 'viewer', tenant: 'hoa-mai' });
    expect((await sso(ticket({ email: 'lan@hoamai.vn', iat: now(), exp: now() + 120 }, 'bi-mat-khac-0123456789abcdefghijk'))).statusCode).toBe(401);
    expect((await sso(ticket({ email: 'lan@hoamai.vn', iat: now() - 600, exp: now() - 300 }))).statusCode).toBe(401);
    expect((await sso(ticket({ email: 'lan@hoamai.vn', iat: now(), exp: now() + 3600 }))).statusCode).toBe(401);
  });

  it('quyền theo vai: viewer đọc danh bạ nhưng KHÔNG đọc nội dung tin; agent đọc tin nhưng KHÔNG ghép khách', async () => {
    const viewer = await login({ email: 'xem@hoamai.vn' });
    expect((await get('/api/v1/contacts', viewer)).statusCode).toBe(200);
    expect((await get('/api/v1/conversations', viewer)).statusCode).toBe(403);
    await q(`UPDATE users SET role = 'agent' WHERE email = 'xem@hoamai.vn'`);
    const agent = await login({ email: 'xem@hoamai.vn' }); // vai mới có hiệu lực từ phiên mới
    expect((await get('/api/v1/conversations', agent)).statusCode).toBe(200);
    const merge = await app.inject({ method: 'POST', url: '/api/v1/contacts/01JDAC00000000000000000001/merge', headers: { authorization: `Bearer ${agent}` }, payload: { intoContactId: '01JDAC00000000000000000002', proof: { kind: 'human', userId: '7' } } });
    expect(merge.statusCode).toBe(403);
    const me = (await get('/api/v1/auth/me', agent)).json().data;
    expect(me.role).toBe('agent');
    expect(me.permissions).toContain('cake:inbox-lap');
    expect(me.permissions).not.toContain('cake:contacts-gop');
  });

  it('quyền trong vé thay quyền theo vai (như open-ketoan); quyền lạ bị bỏ', async () => {
    const t = await login({ email: 'kho@hoamai.vn', perms: ['cake:catalog-xem', 'khong:ton-tai'] });
    expect((await get('/api/v1/auth/me', t)).json().data.permissions).toEqual(['cake:catalog-xem']);
    expect((await get('/api/v1/catalog/items', t)).statusCode).toBe(200);
    expect((await get('/api/v1/contacts', t)).statusCode).toBe(403);
  });

  it('vai ứng dụng: RLS chặn đọc chéo đơn vị (siêu người dùng thì không) — lớp thứ hai sau lọc tenant_id trong mã', async () => {
    await q(`INSERT INTO tenants (code, name) VALUES ('khac', 'Đơn vị khác') ON CONFLICT DO NOTHING`);
    const { rows: [b] } = await q(`SELECT id FROM tenants WHERE code = 'khac'`);
    await q(`INSERT INTO contacts (contact_id, tenant_id, kind, display_name) VALUES ('01JDAC0000000000000000KHAC', $1, 'person', 'Khách đơn vị khác') ON CONFLICT DO NOTHING`, [b!.id]);
    const { rows: [a] } = await q(`SELECT id FROM tenants WHERE code = 'hoa-mai'`);
    const count = async (asApp: boolean) => {
      await q('BEGIN');
      try {
        if (asApp) await q('SET LOCAL ROLE cake_app_kiem');
        await q(`SELECT set_config('bizcity.tenant_id', $1, true)`, [String(a!.id)]);
        return Number((await q(`SELECT count(*) AS n FROM contacts WHERE contact_id = '01JDAC0000000000000000KHAC'`)).rows[0]!.n);
      } finally { await q('ROLLBACK'); }
    };
    expect(await count(false)).toBe(1); // siêu người dùng bỏ qua RLS — lý do phải có vai ứng dụng
    expect(await count(true)).toBe(0);
    const agent = await login({ email: 'xem@hoamai.vn' });
    expect((await get('/api/v1/contacts/01JDAC0000000000000000KHAC', agent)).statusCode).toBe(404);
  });

  it('khoá API phạm vi cake:read: đọc danh mục được, tạo hàng thì không', async () => {
    const { hashApiKey } = await import('@bizcity/platform/core/security/password');
    const key = 'kc_kiem_thu_khoa_api_0123456789';
    const { rows: [t] } = await q(`SELECT id FROM tenants WHERE code = 'hoa-mai'`);
    await q(`INSERT INTO api_keys (id, tenant_id, name, key_prefix, key_hash, scopes) VALUES (9001, $1, 'POS cửa hàng', 'kc_kiem_t', $2, ARRAY['cake:read'])`, [t!.id, hashApiKey(key)]);
    expect((await get('/api/v1/catalog/items', undefined, { 'x-api-key': key })).statusCode).toBe(200);
    const create = await app.inject({ method: 'POST', url: '/api/v1/catalog/items', headers: { 'x-api-key': key }, payload: { sku: 'A1', name: 'Thử', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' } });
    expect(create.statusCode).toBe(403);
    expect((await get('/api/v1/conversations', undefined, { 'x-api-key': key })).statusCode).toBe(403);
  });
});
