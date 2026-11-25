// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 09:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — phạm vi xem hội thoại theo tài khoản kênh (40-SECURITY §2) trên Postgres thật, dưới vai ứng dụng:
//   agent chưa được giao gì ⇒ không thấy hội thoại · giao tài khoản Zalo ⇒ chỉ thấy Zalo; hội thoại FB ⇒ 404 (đọc tin, gắn nhãn); dòng thời gian ẩn nội dung tin FB
//   · được giao một hội thoại FB ⇒ thấy hội thoại đó · chủ / quản lý có cake:all-inbox-xem thấy hết · đặt thành viên chỉ nhận nhân viên của đơn vị.
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 'wp-sso-bi-mat-kiem-thu-0123456789abcdef';
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const ticket = (o: Record<string, unknown>) => { const body = b64(JSON.stringify(o)); return `${body}.${b64(createHmac('sha256', SECRET).update(body).digest())}`; };
const now = () => Math.floor(Date.now() / 1000);

describe.skipIf(!url)('phạm vi xem hội thoại theo tài khoản kênh', () => {
  let app: FastifyInstance;
  let q: (sql: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  let owner = '', agent = '', agentId = '', zalo = '', fb = '';
  const req = (method: 'GET' | 'PUT' | 'POST', u: string, token: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'GET' ? {} : { 'idempotency-key': `pham-vi-${Math.random().toString(36).slice(2, 12)}` }) } });
  const login = async (email: string) =>
    (await app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: ticket({ email, tenant: 'hoa-mai', iat: now(), exp: now() + 120 }) } })).json().data.token as string;
  const convs = async (t: string) => (await req('GET', '/api/v1/conversations', t)).json().data as { conversationId: string; channelAccountId: string; contactId: string }[];

  beforeAll(async () => {
    process.env.WP_SSO_SECRET = SECRET;
    process.env.CAKE_APP_ROLE = 'cake_app_kiem';
    process.env.DB_SET_ROLE = 'cake_app_kiem';
    process.env.CAKE_DEV_AUTH = '1';
    const dbUrl = await freshDb(url!, 'pham_vi');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    q = (s, v) => admin.query(s, v as unknown[]);
    owner = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;
    await login('cham-soc@hoamai.vn');
    await q(`UPDATE users SET role = 'agent' WHERE email = 'cham-soc@hoamai.vn'`);
    agent = await login('cham-soc@hoamai.vn');
    agentId = String((await q(`SELECT id FROM users WHERE email = 'cham-soc@hoamai.vn'`)).rows[0]!.id);
    const accs = (await req('GET', '/api/v1/channels', owner)).json().data as { channelAccountId: string; channel: string }[];
    zalo = accs.find((a) => a.channel === 'zalo_personal')!.channelAccountId;
    fb = accs.find((a) => a.channel === 'facebook_page')!.channelAccountId;
  }, 90_000);
  afterAll(async () => { await app?.close(); delete process.env.CAKE_DEV_AUTH; });

  it('NT-NV-006 · quyền: chủ có cake:all-inbox-xem; agent thì không', async () => {
    expect((await req('GET', '/api/v1/auth/me', owner)).json().data.permissions).toContain('cake:all-inbox-xem');
    expect((await req('GET', '/api/v1/auth/me', agent)).json().data.permissions).not.toContain('cake:all-inbox-xem');
  });

  it('NT-NV-006 · chưa được giao gì ⇒ không thấy tài khoản, hội thoại; chủ thấy cả hai kênh', async () => {
    expect(await convs(agent)).toEqual([]);
    expect((await req('GET', '/api/v1/channels', agent)).json().data).toEqual([]);
    const all = await convs(owner);
    expect(new Set(all.map((c) => c.channelAccountId))).toEqual(new Set([zalo, fb]));
  });

  it('NT-NV-006 · đặt thành viên: nhân viên lạ ⇒ 400; giao Zalo ⇒ chỉ thấy Zalo; FB ⇒ 404 khi đọc tin / gắn nhãn', async () => {
    expect((await req('PUT', `/api/v1/channels/${zalo}/members`, owner, { userIds: ['987654321'] })).statusCode).toBe(400);
    const set = await req('PUT', `/api/v1/channels/${zalo}/members`, owner, { userIds: [agentId] });
    expect(set.statusCode).toBe(200);
    expect(set.json().data).toEqual([expect.objectContaining({ userId: agentId, role: 'agent' })]);
    expect((await req('GET', `/api/v1/channels/${zalo}/members`, agent)).json().data.map((m: { userId: string }) => m.userId)).toEqual([agentId]);

    const mine = await convs(agent);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.channelAccountId === zalo)).toBe(true);
    expect((await req('GET', '/api/v1/channels', agent)).json().data.map((a: { channelAccountId: string }) => a.channelAccountId)).toEqual([zalo]);

    const fbConv = (await convs(owner)).find((c) => c.channelAccountId === fb)!;
    expect((await req('GET', `/api/v1/conversations/${fbConv.conversationId}/messages`, agent)).statusCode).toBe(404);
    expect((await req('POST', `/api/v1/conversations/${fbConv.conversationId}/tags`, agent, { add: ['VIP'], remove: [] })).statusCode).toBe(404);
    expect((await req('GET', `/api/v1/conversations/${mine[0]!.conversationId}/messages`, agent)).statusCode).toBe(200);
  });

  it('NT-NV-006 · dòng thời gian: chạm của hội thoại ngoài phạm vi vẫn hiện, nội dung tin thì không', async () => {
    const fbConv = (await convs(owner)).find((c) => c.channelAccountId === fb)!;
    const tl = async (t: string) => ((await req('GET', `/api/v1/contacts/${fbConv.contactId}/timeline`, t)).json().data as { conversationId: string | null; summary: string; kind: string }[])
      .filter((e) => e.conversationId === fbConv.conversationId && (e.kind === 'message' || e.kind === 'comment'));
    const full = await tl(owner);
    expect(full.some((e) => e.summary.includes(':'))).toBe(true);
    const hidden = await tl(agent);
    expect(hidden.length).toBe(full.length);
    expect(hidden.every((e) => !e.summary.includes(':'))).toBe(true);
  });

  // [2026-11-24 10:15 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — 40-SECURITY §2–3: giao tài khoản kênh = users:write (chủ, quản lý); vé SSO đúng app, tên theo WordPress.
  it('NT-NV-006 · quản lý giao được tài khoản kênh, nhân viên thì không; vé app khác bị từ chối; tên theo vé', async () => {
    await login('quan-ly@hoamai.vn');
    await q(`UPDATE users SET role = 'manager' WHERE email = 'quan-ly@hoamai.vn'`);
    const manager = await login('quan-ly@hoamai.vn');
    expect((await req('GET', '/api/v1/auth/me', manager)).json().data.permissions).toEqual(expect.arrayContaining(['users:write', 'cake:all-inbox-xem']));
    expect((await req('GET', '/api/v1/auth/me', manager)).json().data.permissions).not.toContain('settings:write');
    expect((await req('PUT', `/api/v1/channels/${fb}/members`, agent, { userIds: [agentId] })).statusCode).toBe(403);
    expect((await req('PUT', `/api/v1/channels/${fb}/members`, manager, { userIds: [] })).statusCode).toBe(200);

    const sso = (o: Record<string, unknown>) => app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: ticket({ email: 'cham-soc@hoamai.vn', tenant: 'hoa-mai', iat: now(), exp: now() + 120, ...o }) } });
    expect((await sso({ aud: 'ketoan' })).statusCode).toBe(401);
    expect((await sso({ aud: 'cake', name: 'Lan Chăm Sóc' })).statusCode).toBe(200);
    const { rows: [u] } = await q(`SELECT full_name, last_login_at FROM users WHERE email = 'cham-soc@hoamai.vn'`);
    expect(u).toMatchObject({ full_name: 'Lan Chăm Sóc', last_login_at: expect.any(Date) });
  });

  it('NT-NV-006 · được giao MỘT hội thoại FB ⇒ thấy đúng hội thoại đó; gỡ thành viên Zalo ⇒ hết Zalo', async () => {
    const fbConv = (await convs(owner)).find((c) => c.channelAccountId === fb)!;
    expect((await req('POST', `/api/v1/conversations/${fbConv.conversationId}/assign`, owner, { userId: agentId })).statusCode).toBe(200);
    expect((await convs(agent)).map((c) => c.conversationId)).toContain(fbConv.conversationId);
    expect((await req('GET', `/api/v1/conversations/${fbConv.conversationId}/messages`, agent)).statusCode).toBe(200);
    expect((await req('PUT', `/api/v1/channels/${zalo}/members`, owner, { userIds: [] })).json().data).toEqual([]);
    expect((await convs(agent)).map((c) => c.conversationId)).toEqual([fbConv.conversationId]);
  });
});
