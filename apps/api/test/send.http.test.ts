// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3/S006-6 — tin ra kênh trên Postgres thật với Hub GIẢ trong tiến trình:
//   gửi ⇒ lệnh bizcity_channel_command@1 đúng khuôn, ký, Idempotency-Key = khoá lệnh · delivery.updated (commandKey) qua cổng nhận ⇒ "đã gửi", không thêm dòng sổ ·
//   Hub sập ⇒ queued, gửi lại CÙNG khoá · Hub từ chối ⇒ "lỗi" · quá 10 phút ⇒ "chưa rõ đã gửi", không tự gửi khoá mới · chưa kết nối / chưa nối Hub ⇒ chặn · gửi thử ⇒ tested_at.
import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const HUB = { key: 'hub_kiem_thu_0123456789', secret: 'bi-mat-kiem-thu-0123456789-abcdefghijk' };
const SITE_KEY = 'biz-khoa-site-kiem-thu-0123';
const listen = (s: Server) => new Promise<string>((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(s.address() as { port: number }).port}`)));

describe.skipIf(!url)('tin ra kênh qua Hub (open-cake ⇄ Hub giả)', () => {
  let app: FastifyInstance;
  let token = '';
  let sql: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  let retry: () => Promise<number>;
  let sign: (secret: string, body: string) => string;
  let parseCmd: (v: unknown) => unknown;
  const hub = { mode: 'ok' as 'ok' | 'down' | 'reject', got: [] as { body: Record<string, unknown>; key: string; auth: string; sigOk: boolean; path: string }[] };
  let hubServer: Server;
  let conv = { id: '', thread: '', account: '', accountId: '' };

  const call = (method: 'GET' | 'POST', u: string, payload?: object) =>
    app.inject({ method, url: u, payload, headers: { authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'idempotency-key': `s-${Math.random().toString(36).slice(2, 12)}` } : {}) } });
  const send = (text: string) => call('POST', '/api/v1/messages', { conversationId: conv.id, text });
  const msg = async (id: string) => (await sql('SELECT delivery, external_message_id, sent_by FROM messages WHERE message_id = $1', [id])).rows[0]!;
  const cmd = async (messageId: string) => (await sql('SELECT command_key, state, attempts FROM channel_commands WHERE message_id = $1', [messageId])).rows[0]!;

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_HUB_SECRET = HUB.secret;
    process.env.CAKE_HUB_SITE_KEY = SITE_KEY;
    const dbUrl = await freshDb(url!, 'gui_tin');
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    sql = (q, p) => admin.query(q, p as unknown[]);
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    ({ signTouch: sign } = await import('../src/care/ingress.js'));
    ({ retryChannelCommands: retry } = await import('../src/care/send.js'));
    const { ChannelCommandSchema } = await import('@open-cake/contracts');
    parseCmd = (v) => ChannelCommandSchema.parse(v);
    app = await (await import('../src/server.js')).buildApp({ logger: false, hub: HUB });
    token = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;

    hubServer = createServer(async (req, res) => {
      let raw = ''; for await (const c of req) raw += c;
      const out = (s: number, b: object) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); };
      if (hub.mode === 'down') return out(503, { ok: false, error: { code: 'NOT_READY', message: 'Hub bảo trì' } });
      const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(req.headers['x-bizcity-signature'] ?? ''));
      hub.got.push({ body: JSON.parse(raw), key: String(req.headers['idempotency-key']), auth: String(req.headers.authorization), path: req.url!,
        sigOk: !!m && createHmac('sha256', HUB.secret).update(`${m[1]}.${raw}`).digest('hex') === m[2] });
      if (hub.mode === 'reject') return out(422, { ok: false, error: { code: 'CELL_ACCOUNT_GONE', message: 'Cell không còn tài khoản này' } });
      return out(202, { ok: true, data: { accepted: true } });
    });
    process.env.CAKE_HUB_URL = await listen(hubServer);

    const r = (await sql(`SELECT c.conversation_id, c.external_thread_id, a.external_account_id, a.channel_account_id FROM conversations c JOIN channel_accounts a USING (channel_account_id)
      WHERE a.channel = 'zalo_personal' AND c.kind = 'dm' ORDER BY c.conversation_id LIMIT 1`)).rows[0]!;
    conv = { id: String(r.conversation_id), thread: String(r.external_thread_id), account: String(r.external_account_id), accountId: String(r.channel_account_id) };
  }, 90_000);
  afterAll(async () => { await app?.close(); hubServer?.close(); });

  it('gửi ⇒ Hub nhận lệnh đúng khuôn (ký, khoá site, Idempotency-Key = khoá lệnh); delivery.updated ⇒ "đã gửi" + mã thật, không thêm dòng sổ', async () => {
    hub.mode = 'ok'; hub.got = [];
    const r = await send('Dạ còn size M ạ');
    expect(r.statusCode).toBe(200);
    const m = r.json().data;
    expect(m).toMatchObject({ direction: 'out', text: 'Dạ còn size M ạ', delivery: 'accepted' });
    expect(hub.got).toHaveLength(1);
    const g = hub.got[0]!;
    expect(parseCmd(g.body)).toMatchObject({ operation: 'message.send', channel: 'zalo_personal', target: { externalThreadId: conv.thread }, channelAccount: { cellRef: 'cell:dev-gia-lap' } });
    expect(g).toMatchObject({ path: '/channel/v1/commands', auth: `Bearer ${SITE_KEY}`, sigOk: true, key: g.body.idempotencyKey });
    expect(await cmd(m.messageId)).toMatchObject({ state: 'accepted', attempts: 1, command_key: g.body.idempotencyKey });
    expect(await msg(m.messageId)).toMatchObject({ external_message_id: g.body.idempotencyKey, sent_by: expect.any(String) });

    const touchesBefore = (await sql('SELECT count(*)::int n FROM touch_ledger')).rows[0]!.n;
    const body = JSON.stringify({
      contract: 'bizcity_touch@1', eventId: '01JDAB0000000000000000D001', type: 'delivery.updated', occurredAt: new Date().toISOString(), source: 'cell:kiem-thu',
      docKey: `zalo_personal|${conv.account}|${conv.thread}|m_out_1`, version: 2, channel: 'zalo_personal', channelAccount: { externalAccountId: conv.account, kind: 'personal' },
      thread: { externalThreadId: conv.thread, kind: 'dm', anchor: null }, sender: { scope: 'global', externalId: conv.account, displayName: 'Shop', avatarRef: null }, direction: 'outbound',
      content: { type: 'none', text: null, attachments: [] }, hints: { commandKey: g.body.idempotencyKey }, encryption: { e2ee: false, decryptedOnCell: false },
      delivery: { status: 'delivered', externalMessageId: 'm_out_1' }, history: { backfill: false, cursor: null },
    });
    const ing = await app.inject({ method: 'POST', url: '/ingress/v1/touch', payload: body, headers: { 'content-type': 'application/json', authorization: `Bearer ${HUB.key}`, 'x-bizcity-contract': 'bizcity_touch@1', 'x-bizcity-signature': sign(HUB.secret, body) } });
    expect(ing.statusCode).toBe(200);
    expect(await msg(m.messageId)).toMatchObject({ delivery: 'delivered', external_message_id: 'm_out_1' });
    expect((await sql('SELECT count(*)::int n FROM touch_ledger')).rows[0]!.n).toBe(touchesBefore);
    const list = (await call('GET', `/api/v1/conversations/${conv.id}/messages?limit=50`)).json().data as { messageId: string; delivery: string }[];
    expect(list.find((x) => x.messageId === m.messageId)?.delivery).toBe('delivered');
  });

  it('Hub sập ⇒ queued; gửi lại CÙNG khoá khi Hub sống lại ⇒ accepted', async () => {
    hub.mode = 'down'; hub.got = [];
    const m = (await send('Em gửi lại giá ạ')).json().data;
    expect(m.delivery).toBe('accepted');
    const c1 = await cmd(m.messageId);
    expect(c1).toMatchObject({ state: 'queued', attempts: 1 });
    hub.mode = 'ok';
    await sql(`UPDATE channel_commands SET next_at = now() - interval '1 second' WHERE command_key = $1`, [c1.command_key]);
    expect(await retry()).toBeGreaterThanOrEqual(1);
    expect(await cmd(m.messageId)).toMatchObject({ state: 'accepted', attempts: 2 });
    expect(hub.got.map((g) => g.key)).toEqual([c1.command_key]);
  });

  it('Hub từ chối ⇒ tin "lỗi"; quá 10 phút không tới Hub ⇒ "chưa rõ đã gửi", không gửi khoá mới', async () => {
    hub.mode = 'reject';
    const a = (await send('Tin bị từ chối')).json().data;
    expect(await cmd(a.messageId)).toMatchObject({ state: 'rejected' });
    expect((await msg(a.messageId)).delivery).toBe('failed');

    hub.mode = 'down'; hub.got = [];
    const b = (await send('Tin chưa rõ')).json().data;
    const key = (await cmd(b.messageId)).command_key;
    await sql(`UPDATE channel_commands SET created_at = now() - interval '11 minutes', next_at = now() - interval '1 second' WHERE command_key = $1`, [key]);
    await retry();
    expect(await cmd(b.messageId)).toMatchObject({ state: 'given_up' });
    expect((await msg(b.messageId)).delivery).toBe('unknown');
    await retry();
    expect((await sql('SELECT count(*)::int n FROM channel_commands WHERE message_id = $1', [b.messageId])).rows[0]!.n).toBe(1);
  });

  it('chưa nối Hub ⇒ NOT_READY, không ghi tin; tài khoản mất kết nối ⇒ CAKE_CHANNEL_NOT_CONNECTED', async () => {
    hub.mode = 'ok';
    const before = (await sql('SELECT count(*)::int n FROM messages')).rows[0]!.n;
    const saved = process.env.CAKE_HUB_URL; delete process.env.CAKE_HUB_URL;
    const r = await send('không đi đâu');
    process.env.CAKE_HUB_URL = saved;
    expect(r.statusCode).toBe(503);
    expect((await sql('SELECT count(*)::int n FROM messages')).rows[0]!.n).toBe(before);
    await sql(`UPDATE channel_accounts SET status = 'disconnected' WHERE channel_account_id = $1`, [conv.accountId]);
    const d = await send('mất kết nối');
    await sql(`UPDATE channel_accounts SET status = 'connected' WHERE channel_account_id = $1`, [conv.accountId]);
    expect(d.statusCode).toBe(409);
    expect(d.json().error.details.reason).toBe('CAKE_CHANNEL_NOT_CONNECTED');
  });

  it('gửi thử kết nối ⇒ lệnh account.test tới Hub, ghi tested_at; Hub không nhận ⇒ báo lỗi', async () => {
    hub.mode = 'ok'; hub.got = [];
    const r = await call('POST', `/api/v1/channels/${conv.accountId}/test`, {});
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toMatchObject({ testedAt: expect.any(String), twoWay: false });
    expect(parseCmd(hub.got[0]!.body)).toMatchObject({ operation: 'account.test', content: { type: 'none' } });
    expect((await sql('SELECT tested_at FROM channel_accounts WHERE channel_account_id = $1', [conv.accountId])).rows[0]!.tested_at).not.toBeNull();
    hub.mode = 'down';
    expect((await call('POST', `/api/v1/channels/${conv.accountId}/test`, {})).json().error.details.reason).toBe('CAKE_CHANNEL_NOT_CONNECTED');
  });
});
