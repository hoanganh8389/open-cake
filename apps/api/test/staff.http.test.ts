// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Nhân viên + Vai & quyền trên Postgres thật, dưới vai ứng dụng (40-SECURITY §2–3):
//   mời ⇒ SSO cùng email nhận đúng vai · vai riêng (nền + Cho / Cấm, Cấm thắng) có hiệu lực KHÔNG cần đăng nhập lại · đổi vai chính ⇒ phiên cũ hết
//   · ngưng ⇒ phiên hết, gỡ tài khoản kênh, hội thoại về hàng chung, vé SSO bị chặn · R-CAKE-AUTHZ-5: quản lý không sửa Chủ / chính mình / vai cao hơn mình, không sửa vai riêng.
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 'wp-sso-bi-mat-kiem-thu-0123456789abcdef';
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const ticket = (o: Record<string, unknown>) => { const body = b64(JSON.stringify(o)); return `${body}.${b64(createHmac('sha256', SECRET).update(body).digest())}`; };
const now = () => Math.floor(Date.now() / 1000);

describe.skipIf(!url)('nhân viên + vai & quyền', () => {
  let app: FastifyInstance;
  let owner = '', zalo = '', fb = '';
  const req = (method: 'GET' | 'PUT' | 'POST' | 'PATCH', u: string, token: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'GET' ? {} : { 'idempotency-key': `nv-${Math.random().toString(36).slice(2, 12)}` }) } });
  const sso = (email: string) => app.inject({ method: 'POST', url: '/api/v1/auth/wp-sso', payload: { ticket: ticket({ email, tenant: 'hoa-mai', iat: now(), exp: now() + 120 }) } });
  const login = async (email: string) => (await sso(email)).json().data.token as string;
  const perms = async (t: string) => (await req('GET', '/api/v1/auth/me', t)).json().data?.permissions as string[];

  beforeAll(async () => {
    process.env.WP_SSO_SECRET = SECRET;
    process.env.CAKE_APP_ROLE = 'cake_app_kiem';
    process.env.DB_SET_ROLE = 'cake_app_kiem';
    process.env.CAKE_DEV_AUTH = '1';
    await freshDb(url!, 'nhan_vien');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    owner = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;
    const accs = (await req('GET', '/api/v1/channels', owner)).json().data as { channelAccountId: string; channel: string }[];
    zalo = accs.find((a) => a.channel === 'zalo_personal')!.channelAccountId;
    fb = accs.find((a) => a.channel === 'facebook_page')!.channelAccountId;
  }, 90_000);
  afterAll(async () => { await app?.close(); delete process.env.CAKE_DEV_AUTH; });

  let lan = '', minh = '';
  it('mời: SSO lần đầu nhận đúng vai đã mời + tài khoản kênh; email trùng ⇒ 409; không mời được Chủ', async () => {
    const r = await req('POST', '/api/v1/staff', owner, { email: 'Lan@HoaMai.vn', name: 'Nguyễn Thị Lan', role: 'agent', channelAccountIds: [zalo] });
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toMatchObject({ email: 'lan@hoamai.vn', role: 'agent', active: true, lastLoginAt: null, channelAccountIds: [zalo] });
    expect(r.json().meta.receipt.evidenceId).toBeTruthy();
    lan = r.json().data.userId;
    expect((await req('POST', '/api/v1/staff', owner, { email: 'lan@hoamai.vn', name: 'Lan', role: 'agent' })).statusCode).toBe(409);
    expect((await req('POST', '/api/v1/staff', owner, { email: 'x@hoamai.vn', name: 'X', role: 'owner' })).statusCode).toBe(403);
    const p = await perms(await login('lan@hoamai.vn'));
    expect(p).toContain('cake:inbox-lap');
    expect(p).not.toContain('users:write');
    minh = (await req('POST', '/api/v1/staff', owner, { email: 'minh@hoamai.vn', name: 'Trần Văn Minh', role: 'manager' })).json().data.userId;
  });

  it('vai riêng: nền + Cho / Cấm (Cấm thắng); áp ngay cho phiên đang mở, không cần đăng nhập lại', async () => {
    const created = await req('POST', '/api/v1/roles', owner, { label: 'Trưởng ca', baseRole: 'agent' });
    expect(created.statusCode).toBe(200);
    const key = created.json().data.key as string;
    expect(key).toBe('r-truong-ca');
    expect((await req('POST', '/api/v1/roles', owner, { label: 'Lạ', baseRole: 'owner' })).statusCode).toBe(400);
    expect((await req('PUT', `/api/v1/roles/${key}/rules`, owner, { permission: 'cake:all-inbox-xem', effect: 'allow' })).statusCode).toBe(200);
    const denied = await req('PUT', `/api/v1/roles/${key}/rules`, owner, { permission: 'cake:inbox-lap', effect: 'deny' });
    expect(denied.json().data).toMatchObject({ allow: ['cake:all-inbox-xem'], deny: ['cake:inbox-lap'] });
    expect(denied.json().data.permissions).not.toContain('cake:inbox-lap');

    expect((await req('PATCH', `/api/v1/staff/${lan}`, owner, { role: key })).json().data.role).toBe(key);
    const t = await login('lan@hoamai.vn'); // nền không đổi (agent) ⇒ phiên vẫn sống; đăng nhập lại chỉ để có phiên mới chắc chắn
    expect(await perms(t)).toEqual(expect.arrayContaining(['cake:all-inbox-xem', 'cake:inbox-xem']));
    expect(await perms(t)).not.toContain('cake:inbox-lap');
    // bỏ Cấm ⇒ phiên ĐANG MỞ có lại quyền (authz_version), không đăng nhập lại
    await req('PUT', `/api/v1/roles/${key}/rules`, owner, { permission: 'cake:inbox-lap', effect: 'none' });
    expect(await perms(t)).toContain('cake:inbox-lap');
    // tắt vai riêng ⇒ chỉ còn vai nền
    await req('PATCH', `/api/v1/roles/${key}`, owner, { active: false });
    expect(await perms(t)).not.toContain('cake:all-inbox-xem');
    await req('PATCH', `/api/v1/roles/${key}`, owner, { active: true });

    const list = (await req('GET', '/api/v1/roles', owner)).json().data;
    expect(list.roles.map((r: { key: string }) => r.key)).toEqual(expect.arrayContaining(['owner', 'manager', 'agent', key]));
    expect(list.permissions.find((p: { key: string }) => p.key === 'users:write').risk).toBe('high');
  });

  it('đổi vai chính ⇒ phiên cũ hết (session_version), vào lại nhận vai mới', async () => {
    const old = await login('lan@hoamai.vn');
    expect((await req('PATCH', `/api/v1/staff/${lan}`, owner, { role: 'marketer' })).json().data.role).toBe('marketer');
    expect((await req('GET', '/api/v1/auth/me', old)).statusCode).toBe(401);
    expect(await perms(await login('lan@hoamai.vn'))).toContain('cake:catalog-gia');
    await req('PATCH', `/api/v1/staff/${lan}`, owner, { role: 'agent', channelAccountIds: [zalo, fb] });
  });

  it('R-CAKE-AUTHZ-5: quản lý sửa được nhân viên, không sửa Chủ / chính mình / vai riêng; không cấp quyền mình không có', async () => {
    const m = await login('minh@hoamai.vn');
    expect((await req('GET', '/api/v1/staff', m)).statusCode).toBe(200);
    const ownerId = ((await req('GET', '/api/v1/staff', m)).json().data as { userId: string; role: string }[]).find((s) => s.role === 'owner')!.userId;
    expect((await req('PATCH', `/api/v1/staff/${ownerId}`, m, { role: 'agent' })).statusCode).toBe(403);
    expect((await req('PATCH', `/api/v1/staff/${minh}`, m, { role: 'agent' })).statusCode).toBe(403);
    expect((await req('POST', '/api/v1/roles', m, { label: 'Ca đêm', baseRole: 'agent' })).statusCode).toBe(403);
    // quản lý không có cake:channels-lap ⇒ không cấp vai riêng được Cho quyền đó
    await req('PUT', '/api/v1/roles/r-truong-ca/rules', owner, { permission: 'cake:channels-lap', effect: 'allow' });
    expect((await req('PATCH', `/api/v1/staff/${lan}`, m, { role: 'r-truong-ca' })).statusCode).toBe(403);
    await req('PUT', '/api/v1/roles/r-truong-ca/rules', owner, { permission: 'cake:channels-lap', effect: 'none' });
    expect((await req('PATCH', `/api/v1/staff/${lan}`, m, { channelAccountIds: [zalo] })).json().data.channelAccountIds).toEqual([zalo]);
    // agent không vào được màn
    expect((await req('GET', '/api/v1/staff', await login('lan@hoamai.vn'))).statusCode).toBe(403);
  });

  it('ngưng: phiên hết, gỡ tài khoản kênh, hội thoại về hàng chung, vé WordPress bị chặn; bật lại vào được', async () => {
    const t = await login('lan@hoamai.vn');
    const conv = ((await req('GET', '/api/v1/conversations', owner)).json().data as { conversationId: string }[])[0]!;
    await req('POST', `/api/v1/conversations/${conv.conversationId}/assign`, owner, { userId: lan });
    const off = await req('PUT', `/api/v1/staff/${lan}/active`, owner, { active: false });
    expect(off.json().data).toMatchObject({ removedAccounts: 1, releasedConversations: 1, staff: { active: false, channelAccountIds: [] } });
    expect((await req('GET', '/api/v1/auth/me', t)).statusCode).toBe(401);
    expect((await sso('lan@hoamai.vn')).statusCode).toBe(401);
    expect((await req('PATCH', `/api/v1/staff/${lan}`, owner, { role: 'agent' })).statusCode).toBe(409);
    expect((await req('PUT', `/api/v1/staff/${lan}/active`, owner, { active: true })).json().data.staff.active).toBe(true);
    expect((await sso('lan@hoamai.vn')).statusCode).toBe(200);
  });
});
