// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh theo đơn vị trên Postgres thật với MÁY KẾT NỐI GIẢ (zalo-hub-connector):
//   chưa có đích ⇒ NOT_READY · chọn Tự cài ⇒ Cake sinh khoá `ckn.<đơn vị>.…` + bí mật MỘT lần (lưu mã hoá) · lệnh gửi tới máy kết nối đúng khoá + chữ ký ·
//   touch từ máy kết nối (khoá của nó) ⇒ nhận; sai bí mật ⇒ 401 · đổi khoá ⇒ khoá cũ hết hiệu lực · kiểm máy kết nối ⇒ last_ok_at.
import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const listen = (s: Server) => new Promise<string>((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(s.address() as { port: number }).port}`)));
const sign = (secret: string, body: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

describe.skipIf(!url)('cách kết nối kênh: Tự cài (máy kết nối) ⇄ Open CRM', () => {
  let app: FastifyInstance;
  let token = '';
  let sql: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  let connServer: Server, connUrl = '';
  let issued = { key: '', secret: '' };
  const got: { path: string; auth: string; body: string; sig: string }[] = [];
  let conv = { id: '', thread: '', account: '' };
  let scanned = false;
  let fbDone = false;

  const call = (method: 'GET' | 'POST', u: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'idempotency-key': `k-${Math.random().toString(36).slice(2, 12)}` } : {}) } });
  const touch = (msg: string) => JSON.stringify({
    contract: 'bizcity_touch@1', eventId: `01JDAB0000000000000000K${msg.padStart(3, '0')}`, type: 'message.received', occurredAt: new Date().toISOString(), source: 'cell:zh-conn-1',
    docKey: `zalo_personal|${conv.account}|u_k5|${msg}`, version: 1, channel: 'zalo_personal', channelAccount: { externalAccountId: conv.account, kind: 'personal' },
    thread: { externalThreadId: 'u_k5', kind: 'dm', anchor: null }, sender: { scope: 'global', externalId: 'u_k5', displayName: 'Khách K5', avatarRef: null }, direction: 'inbound',
    content: { type: 'text', text: 'chào shop', attachments: [] }, hints: {}, encryption: { e2ee: false, decryptedOnCell: false }, delivery: null, history: { backfill: false, cursor: null },
  });
  const ingress = (body: string, key: string, secret: string) => app.inject({ method: 'POST', url: '/ingress/v1/touch', payload: body, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, 'x-bizcity-contract': 'bizcity_touch@1', 'x-bizcity-signature': sign(secret, body) } });

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123';
    for (const k of ['CAKE_HUB_URL', 'CAKE_HUB_SITE_KEY', 'CAKE_HUB_SECRET']) delete process.env[k];
    const dbUrl = await freshDb(url!, 'ket_noi_kenh');
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    sql = (q, p) => admin.query(q, p as unknown[]);
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;
    connServer = createServer(async (req, res) => {
      let raw = ''; for await (const c of req) raw += c;
      got.push({ path: req.url!, auth: String(req.headers.authorization), body: raw, sig: String(req.headers['x-bizcity-signature'] ?? '') });
      // [2026-11-26 10:09 PM Johnny Chu - Chu Hoàng Anh] KN K7 — API tài khoản của máy kết nối: thêm số, QR (chờ quét → quét xong khi test bật `scanned`), danh sách.
      const json = (code: number, b: object) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); };
      // [2026-11-26 10:42 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2 — Facebook cá nhân trên máy kết nối giả: tạo nick, đăng nhập (start ⇒ need_code ⇒ submit ⇒ success), danh sách có fbUid
      if (req.method === 'POST' && req.url === '/accounts' && JSON.parse(raw).platform === 'facebook_personal') return json(200, { ok: true, account: { id: 'acc-fb1', label: JSON.parse(raw).label } });
      if (req.method === 'POST' && req.url === '/accounts/acc-fb1/fb-login') {
        const b = JSON.parse(raw);
        if (b.action === 'start') return json(200, { ok: true, login: { status: 'need_code', message: 'Nhập mã', fields: [{ id: 'code', type: 'text', name: 'Mã' }] } });
        if (b.action === 'submit' && b.input?.code === '123456') { fbDone = true; return json(200, { ok: true, login: { status: 'success', uid: '100089000000001' } }); }
        return json(200, { ok: true, login: { status: 'need_code', message: 'Mã sai', fields: [{ id: 'code', type: 'text' }] } });
      }
      if (req.method === 'POST' && req.url === '/accounts') return json(200, { ok: true, account: { id: 'acc-q1', label: JSON.parse(raw).label } });
      if (req.url === '/accounts/acc-q1/qr') return json(200, { ok: true, ...(scanned ? { status: 'success' } : { status: 'waiting_scan', qrDataUri: 'data:image/png;base64,QR' }) });
      if (req.url === '/accounts/nope/qr') return json(404, { ok: false, error: { code: 'account_not_found', message: 'Không có số này' } });
      if (req.method === 'GET' && req.url === '/accounts') return json(200, { ok: true, accounts: [{ id: 'acc-q1', label: 'Zalo bán hàng 2', platform: 'zalo_personal', status: scanned ? 'active' : 'pending', zaloUid: scanned ? 'zl_k7_999' : null, running: scanned }, { id: 'acc-fb1', label: 'FB Shop', platform: 'facebook_personal', status: fbDone ? 'connected' : 'pending', zaloUid: null, fbUid: fbDone ? '100089000000001' : null, running: fbDone }] });
      res.writeHead(req.url === '/health' ? 200 : 202, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, accepted: true }));
    });
    connUrl = await listen(connServer);
    const r = (await sql(`SELECT c.conversation_id, c.external_thread_id, a.external_account_id FROM conversations c JOIN channel_accounts a USING (channel_account_id)
      WHERE a.channel = 'zalo_personal' AND c.kind = 'dm' ORDER BY c.conversation_id LIMIT 1`)).rows[0]!;
    conv = { id: String(r.conversation_id), thread: String(r.external_thread_id), account: String(r.external_account_id) };
  }, 90_000);
  afterAll(async () => { await app?.close(); connServer?.close(); delete process.env.CAKE_SECRET_KEY; });

  it('chưa có đích lệnh ⇒ gửi tin NOT_READY, không ghi tin; mặc định hub, hubReady=false', async () => {
    expect((await call('GET', '/api/v1/channel-link')).json().data).toMatchObject({ mode: 'hub', hubReady: false, issued: null });
    const r = await call('POST', '/api/v1/messages', { conversationId: conv.id, text: 'thử' });
    expect(r.json().error.code).toBe('NOT_READY');
  });

  it('chọn Tự cài ⇒ sinh khoá + bí mật một lần (mã hoá trong CSDL); lưu lại không đổi khoá; kiểm máy kết nối ⇒ last_ok_at', async () => {
    const r = (await call('POST', '/api/v1/channel-link', { mode: 'self', connectorUrl: connUrl })).json().data;
    expect(r.mode).toBe('self');
    expect(r.issued.key).toMatch(/^ckn\.\d+\.[A-Za-z0-9_-]{20,}$/);
    expect(r.issued.secret.length).toBeGreaterThanOrEqual(32);
    issued = r.issued;
    const row = (await sql('SELECT key_sealed, secret_sealed FROM channel_links')).rows[0]!;
    expect(String(row.key_sealed)).toMatch(/^v1:/);
    expect(String(row.key_sealed)).not.toContain(issued.key);
    expect((await call('POST', '/api/v1/channel-link', { mode: 'self', connectorUrl: connUrl })).json().data.issued).toBeNull();
    expect((await call('GET', '/api/v1/channel-link')).json().data).toMatchObject({ mode: 'self', connectorUrl: connUrl, hasSecret: true, issued: null });
    got.length = 0;
    expect((await call('POST', '/api/v1/channel-link/test', {})).json().data.lastOkAt).toEqual(expect.any(String));
    expect(got[0]).toMatchObject({ path: '/health', auth: `Bearer ${issued.key}` });
  });

  it('gửi tin ⇒ lệnh tới máy kết nối /channel/v1/commands, Bearer khoá nối + chữ ký bằng bí mật nối', async () => {
    got.length = 0;
    const r = await call('POST', '/api/v1/messages', { conversationId: conv.id, text: 'Dạ còn ạ' });
    expect(r.statusCode).toBe(200);
    const g = got.find((x) => x.path === '/channel/v1/commands')!;
    expect(g.auth).toBe(`Bearer ${issued.key}`);
    const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(g.sig)!;
    expect(createHmac('sha256', issued.secret).update(`${m[1]}.${g.body}`).digest('hex')).toBe(m[2]);
    expect(JSON.parse(g.body)).toMatchObject({ operation: 'message.send', content: { text: 'Dạ còn ạ' } });
  });

  it('touch từ máy kết nối (khoá của nó) ⇒ nhận; sai bí mật ⇒ 401; đổi khoá ⇒ khoá cũ 401, khoá mới nhận', async () => {
    const b1 = touch('1');
    const ok1 = await ingress(b1, issued.key, issued.secret);
    expect(ok1.statusCode).toBe(200);
    expect(ok1.json().data.status).toBe('accepted');
    expect((await ingress(touch('2'), issued.key, 'bi-mat-sai-0123456789-0123456789-abcd')).statusCode).toBe(401);
    const rot = (await call('POST', '/api/v1/channel-link', { mode: 'self', connectorUrl: connUrl, rotate: true })).json().data.issued;
    expect(rot.key).not.toBe(issued.key);
    expect((await ingress(touch('3'), issued.key, issued.secret)).statusCode).toBe(401);
    expect((await ingress(touch('4'), rot.key, rot.secret)).statusCode).toBe(200);
  });

  it('bước ③ Tự cài: bắt đầu ⇒ số trên máy kết nối + QR (POST có chữ ký); chưa quét ⇒ hoàn tất CONFLICT; quét xong ⇒ ghi channel_accounts, lặp lại không nhân đôi', async () => {
    got.length = 0;
    const s = (await call('POST', '/api/v1/channels/connect', { channel: 'zalo_personal', label: 'Zalo bán hàng 2' })).json().data;
    expect(s).toEqual({ flowId: 'acc-q1', nextStep: 'qr', qrRef: 'data:image/png;base64,QR' });
    const add = got.find((x) => x.path === '/accounts')!;
    expect(add.sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect((await call('GET', '/api/v1/channels/connect/acc-q1')).json().data).toMatchObject({ status: 'waiting_scan', qrRef: 'data:image/png;base64,QR', error: null });
    expect((await call('GET', '/api/v1/channels/connect/nope')).json().error.code).toBe('NOT_FOUND');
    expect((await call('POST', '/api/v1/channels/connect/acc-q1/finish', {})).json().error.code).toBe('CONFLICT');
    got.length = 0; // "Tạo mã mới" gửi flowId ⇒ chỉ xin lại QR của đúng số, không thêm số mới
    expect((await call('POST', '/api/v1/channels/connect', { channel: 'zalo_personal', label: 'Zalo bán hàng 2', flowId: 'acc-q1' })).json().data.flowId).toBe('acc-q1');
    expect(got.map((x) => x.path)).toEqual(['/accounts/acc-q1/qr']);
    scanned = true;
    expect((await call('GET', '/api/v1/channels/connect/acc-q1')).json().data.status).toBe('success');
    const f = (await call('POST', '/api/v1/channels/connect/acc-q1/finish', {})).json().data;
    expect(f).toMatchObject({ externalAccountId: 'zl_k7_999', label: 'Zalo bán hàng 2', status: 'connected' });
    expect((await call('POST', '/api/v1/channels/connect/acc-q1/finish', {})).json().data.channelAccountId).toBe(f.channelAccountId);
    const rows = (await sql(`SELECT cell_ref, status, owner_user_id FROM channel_accounts WHERE external_account_id = 'zl_k7_999'`)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ cell_ref: 'acc-q1', status: 'connected' });
    expect(rows[0]!.owner_user_id).not.toBeNull();
    expect((await call('GET', '/api/v1/channels')).json().data.some((a: { externalAccountId: string }) => a.externalAccountId === 'zl_k7_999')).toBe(true);
  });

  it('Facebook cá nhân: tạo nick ⇒ đăng nhập (need_code ⇒ mã sai ⇒ mã đúng) ⇒ hoàn tất ghi channel_accounts facebook_personal; mật khẩu / mã không lọt vào CSDL', async () => {
    const s = (await call('POST', '/api/v1/channels/connect', { channel: 'facebook_personal', label: 'FB Shop' })).json().data;
    expect(s).toEqual({ flowId: 'acc-fb1', nextStep: 'approve_on_device', qrRef: null });
    expect((await call('POST', '/api/v1/channels/connect/acc-fb1/finish', {})).json().error.code).toBe('CONFLICT'); // chưa đăng nhập
    const L = (b: object) => call('POST', '/api/v1/channels/connect/acc-fb1/fb-login', b);
    got.length = 0;
    const a = (await L({ action: 'start', identifier: 'shop@example.com', password: 'MatKhau-Bi-Mat-9' })).json().data;
    expect(a).toMatchObject({ status: 'need_code', fields: [{ id: 'code', name: 'Mã' }], uid: null });
    const sent = got.find((x) => x.path === '/accounts/acc-fb1/fb-login')!;
    expect(sent.sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(JSON.parse(sent.body)).toEqual({ action: 'start', identifier: 'shop@example.com', password: 'MatKhau-Bi-Mat-9' }); // thân đi nguyên sang máy kết nối
    expect((await L({ action: 'submit', answers: { code: '000000' } })).json().data.message).toBe('Mã sai');
    expect((await L({ action: 'submit', answers: { code: '123456' } })).json().data).toMatchObject({ status: 'success', uid: '100089000000001' });
    const f = (await call('POST', '/api/v1/channels/connect/acc-fb1/finish', {})).json().data;
    expect(f).toMatchObject({ externalAccountId: '100089000000001', label: 'FB Shop', status: 'connected' });
    expect((await sql(`SELECT channel, kind, cell_ref FROM channel_accounts WHERE external_account_id = '100089000000001'`)).rows).toEqual([{ channel: 'facebook_personal', kind: 'personal', cell_ref: 'acc-fb1' }]);
    for (const t of ['audit_logs', 'action_requests']) {
      const all = JSON.stringify((await sql(`SELECT * FROM ${t}`)).rows);
      expect(all, t).not.toContain('MatKhau-Bi-Mat-9');
      expect(all, t).not.toContain('123456');
    }
    const h = (await sql(`SELECT input_hash FROM audit_logs WHERE action = 'cake.channel.fb_login' ORDER BY id LIMIT 1`)).rows[0]!.input_hash;
    const { createHash } = await import('node:crypto');
    const naive = createHash('sha256').update(JSON.stringify({ flowId: 'acc-fb1', action: 'start', identifier: 'shop@example.com', password: 'MatKhau-Bi-Mat-9' })).digest('hex');
    expect(h).not.toBe(`sha256:${naive}`); // băm đã bỏ mật khẩu, không dò ngược được
  });

  it('đơn vị dùng Hub ⇒ bước ③ báo rõ chưa có (không gọi máy kết nối)', async () => {
    await call('POST', '/api/v1/channel-link', { mode: 'hub' });
    got.length = 0;
    const r = (await call('POST', '/api/v1/channels/connect', { channel: 'zalo_personal', label: 'x' })).json();
    expect(r.error.code).toMatch(/CONFLICT|NOT_READY/);
    expect(got).toHaveLength(0);
  });
});
