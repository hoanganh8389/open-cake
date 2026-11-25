// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lớp mềm core.record.* trên Postgres thật, dưới vai ứng dụng: record_types đồng bộ từ registry; tạo / sửa / lưu trữ / khôi phục;
//   dữ liệu sai ⇒ 400 đúng thông báo của form; loại lạ ⇒ CAKE_RECORD_TYPE_UNKNOWN; quyền RIÊNG của loại (agent có tin nhắn nhanh, không có nhãn); đơn vị khác không thấy.
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 'wp-sso-bi-mat-kiem-thu-0123456789abcdef';
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const ticket = (o: Record<string, unknown>) => { const body = b64(JSON.stringify(o)); return `${body}.${b64(createHmac('sha256', SECRET).update(body).digest())}`; };
const now = () => Math.floor(Date.now() / 1000);

describe.skipIf(!url)('lớp mềm core.record.*', () => {
  let app: FastifyInstance;
  let owner = '';
  const req = (method: 'GET' | 'POST' | 'PATCH', u: string, token: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'GET' ? {} : { 'idempotency-key': `bg-${Math.random().toString(36).slice(2, 12)}` }) } });

  beforeAll(async () => {
    process.env.WP_SSO_SECRET = SECRET;
    process.env.CAKE_APP_ROLE = 'cake_app_kiem';
    process.env.DB_SET_ROLE = 'cake_app_kiem';
    process.env.CAKE_DEV_AUTH = '1';
    await freshDb(url!, 'ban_ghi');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    owner = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;
  }, 90_000);
  afterAll(async () => { await app?.close(); delete process.env.CAKE_DEV_AUTH; });

  it('tạo → danh sách → sửa → lưu trữ (ẩn khỏi danh sách) → khôi phục', async () => {
    const c = await req('POST', '/api/v1/records', owner, { type: 'cake.quick_reply', data: { title: 'Chào khách', shortcut: '/chao', body: 'Dạ shop chào anh chị ạ' } });
    expect(c.statusCode).toBe(200);
    const id = c.json().data.recordId as string;
    expect(c.json().data).toMatchObject({ title: 'Chào khách', status: 'active' });
    expect(c.json().meta.receipt.evidenceId).toBeTruthy();
    const list = async (extra = '') => ((await req('GET', `/api/v1/records?type=cake.quick_reply${extra}`, owner)).json().data as { recordId: string }[]).map((r) => r.recordId);
    expect(await list()).toEqual([id]);
    expect(await list('&q=CHÀO')).toEqual([id]);
    expect(await list('&q=khong-co')).toEqual([]);
    const u = await req('PATCH', `/api/v1/records/${id}`, owner, { data: { title: 'Chào khách mới', body: 'Dạ' } });
    expect(u.json().data).toMatchObject({ title: 'Chào khách mới', data: { title: 'Chào khách mới', body: 'Dạ' } });
    expect((await req('POST', `/api/v1/records/${id}/archive`, owner, { archived: true })).json().data.status).toBe('archived');
    expect(await list()).toEqual([]);
    expect(await list('&includeArchived=true')).toEqual([id]);
    expect((await req('PATCH', `/api/v1/records/${id}`, owner, { data: { title: 'x', body: 'y' } })).statusCode).toBe(409);
    expect((await req('POST', `/api/v1/records/${id}/archive`, owner, { archived: false })).json().data.status).toBe('active');
  });

  it('dữ liệu sai ⇒ 400 đúng chữ của form; trường lạ bị từ chối; loại lạ ⇒ CAKE_RECORD_TYPE_UNKNOWN', async () => {
    const r = await req('POST', '/api/v1/records', owner, { type: 'cake.label', data: { name: '', tone: 'pri' } });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.message).toBe('Tên nhãn không được trống');
    expect((await req('POST', '/api/v1/records', owner, { type: 'cake.label', data: { name: 'VIP', tone: 'pri', price: 1 } })).statusCode).toBe(400);
    const u = await req('POST', '/api/v1/records', owner, { type: 'cake.khong_co', data: {} });
    expect(u.json().error.details.reason).toBe('CAKE_RECORD_TYPE_UNKNOWN');
    expect((await req('PATCH', '/api/v1/records/01JDAC0000000000000000KHAC', owner, { data: {} })).statusCode).toBe(404);
  });

  it('quyền riêng của loại: nhân viên chăm sóc tạo tin nhắn nhanh được, nhãn thì không', async () => {
    const sso = await app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: ticket({ email: 'lan@hoamai.vn', tenant: 'hoa-mai', iat: now(), exp: now() + 120 }) } });
    expect(sso.statusCode).toBe(200);
    expect((await req('POST', '/api/v1/staff', owner, { email: 'yen@hoamai.vn', name: 'Yến', role: 'agent' })).statusCode).toBe(200);
    const agent = (await app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: ticket({ email: 'yen@hoamai.vn', tenant: 'hoa-mai', iat: now(), exp: now() + 120 }) } })).json().data.token as string;
    expect((await req('POST', '/api/v1/records', agent, { type: 'cake.quick_reply', data: { title: 'Cảm ơn', body: 'Cảm ơn anh chị' } })).statusCode).toBe(200);
    const denied = await req('POST', '/api/v1/records', agent, { type: 'cake.label', data: { name: 'VIP', tone: 'pri' } });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.message).toContain('cake:label-lap');
  });

  // [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-8: cổng nhận lỗi giao diện (cùng tệp để dùng chung CSDL kiểm thử).
  it('lỗi giao diện: cần phiên, sai khuôn ⇒ 400, quá 10 lần / phút ⇒ 429', async () => {
    const send = (token: string | null, body: object) => app.inject({ method: 'POST', url: '/api/v1/system/client-errors', payload: body, headers: token ? { authorization: `Bearer ${token}` } : {} });
    const body = { errFp: '0a1b2c3d', route: '#/inbox', message: 'x is undefined', stack: 'TypeError\n at Inbox', where: 'inbox' };
    expect((await send(null, body)).statusCode).toBe(401);
    expect((await send(owner, { ...body, errFp: 'khong-hex' })).statusCode).toBe(400);
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push((await send(owner, body)).statusCode);
    expect(codes.filter((c) => c === 200).length).toBe(9); // lần sai khuôn ở trên cũng tính vào hạn mức
    expect(codes.at(-1)).toBe(429);
  });
});
