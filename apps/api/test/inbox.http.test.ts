// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-006/007 — test tích hợp trên Postgres thật: cổng nhận bizcity_touch@1 (khoá + HMAC thân thô + lệch giờ + hợp đồng),
//   phát lại không trùng, và 6 action đọc qua createHttpClient của WEB — ca vàng G1 nhìn từ API: bình luận + Fanpage về MỘT khách. Không có TEST_DATABASE_URL ⇒ bỏ qua.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ActionClient } from '@open-cake/action-client';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const HUB = { key: 'hub_kiem_thu_0123456789', secret: 'bi-mat-kiem-thu-0123456789-abcdefghijk' };

describe.skipIf(!url)('cổng nhận Hub + hộp thư / danh bạ trên Postgres', () => {
  let app: FastifyInstance;
  let c: ActionClient;
  let sign: (secret: string, body: string, t?: number) => string;
  const C = () => import('@open-cake/contracts');
  const post = (body: string, headers: Record<string, string>) => app.inject({ method: 'POST', url: '/ingress/v1/touch', payload: body, headers: { 'content-type': 'application/json', ...headers } });
  const ok = (body: string, t?: number) => ({ authorization: `Bearer ${HUB.key}`, 'x-bizcity-contract': 'bizcity_touch@1', 'x-bizcity-signature': sign(HUB.secret, body, t) });

  beforeAll(async () => {
    await freshDb(url!, 'inbox');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    ({ signTouch: sign } = await import('../src/care/ingress.js'));
    app = await (await import('../src/server.js')).buildApp({ logger: false, hub: HUB });
    const { createHttpClient } = await import('@open-cake/action-client');
    c = createHttpClient({ fetchImpl: (async (u: string, init: RequestInit) => {
      const r = await app.inject({ method: init.method as 'GET', url: u, headers: init.headers as Record<string, string>, payload: init.body as string | undefined });
      return new Response(r.body, { status: r.statusCode, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch });
  }, 90_000);
  afterAll(async () => { await app?.close(); });

  const zaloTouch = (msg: string, text: string) => JSON.stringify({
    contract: 'bizcity_touch@1', eventId: '01JDAB0000000000000000Z001', type: 'message.received', occurredAt: new Date().toISOString(), source: 'cell:kiem-thu',
    docKey: `zalo_personal|7350219485123001001|u_990001|${msg}`, version: 1, channel: 'zalo_personal', channelAccount: { externalAccountId: '7350219485123001001', kind: 'personal' },
    thread: { externalThreadId: 'u_990001', kind: 'dm', anchor: null }, sender: { scope: 'global', externalId: '990001', displayName: 'Lê Thảo Vy', avatarRef: null }, direction: 'inbound',
    content: { type: 'text', text, attachments: [] }, hints: {}, encryption: { e2ee: false, decryptedOnCell: false }, delivery: null, history: { backfill: false, cursor: null },
  });

  it('cổng nhận: chữ ký đúng ⇒ accepted; phát lại ⇒ unchanged; sai khoá / chữ ký / lệch giờ / hợp đồng ⇒ bị chặn', async () => {
    const b = zaloTouch('v_1', 'Chị muốn đặt 2 váy hoa');
    const a = await post(b, ok(b));
    expect(a.statusCode).toBe(200);
    expect(a.json()).toMatchObject({ ok: true, data: { status: 'accepted', touchId: expect.any(String) } });
    expect((await post(b, ok(b))).json().data.status).toBe('unchanged');
    const bad = await post(b, { ...ok(b), 'x-bizcity-signature': sign('bi-mat-khac-0123456789-abcdefghijklmnop', b) });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error.details.reason).toBe('CAKE_SIGNATURE_INVALID');
    expect((await post(b, { ...ok(b), authorization: 'Bearer sai' })).statusCode).toBe(401);
    expect((await post(b, ok(b, Math.floor(Date.now() / 1000) - 3600))).json().error.message).toMatch(/lệch giờ/);
    const tampered = b.replace('2 váy', '20 váy'); // thân bị sửa sau khi ký
    expect((await post(tampered, ok(b))).statusCode).toBe(401);
    expect((await post(b, { ...ok(b), 'x-bizcity-contract': 'khac@1' })).statusCode).toBe(400);
  });

  it('ca vàng G1 qua API: bình luận + tin Fanpage của cùng người ⇒ MỘT khách, danh tính có bằng chứng trả lời riêng', async () => {
    const { conversationList, contactGet, contactList, contactTimeline, messageList, channelList, contactSuggestions } = await C();
    const convs = (await c.call(conversationList, { filter: 'all', limit: 50 })).data;
    const huong = convs.filter((v) => v.title === 'Nguyễn Thu Hương');
    expect(huong.map((v) => v.kind).sort()).toEqual(['comment_thread', 'dm']);
    expect(new Set(huong.map((v) => v.contactId)).size).toBe(1);
    const g = (await c.call(contactGet, { contactId: huong[0]!.contactId })).data;
    expect(g.identities.map((i) => [i.channel, i.confidence, i.proof?.kind ?? null])).toEqual([['facebook_comment', 'asserted', null], ['facebook_page', 'proven', 'fb_private_reply']]);
    expect(g.state.unanswered).toBe(true);
    expect((await c.call(contactSuggestions, { contactId: g.contact.contactId })).data).toEqual([]); // không ai trùng tên; gợi ý không bao giờ tự ghép
    const dm = huong.find((v) => v.kind === 'dm')!;
    expect((await c.call(messageList, { conversationId: dm.conversationId, limit: 50 })).data.map((m) => m.text)).toEqual(['Còn size M không shop?']);
    expect(dm.unread).toBe(1);
    const tl = (await c.call(contactTimeline, { contactId: g.contact.contactId, limit: 50 })).data;
    expect(tl.map((x) => x.kind)).toEqual(['message', 'comment', 'comment']);
    const people = await c.call(contactList, { sort: 'last', page: 1, pageSize: 50 });
    expect(people.meta).toMatchObject({ total: 3 }); // Hương, Anh Khoa, Thảo Vy (ca trên)
    expect((await c.call(contactList, { q: 'Khoa', sort: 'name', page: 1, pageSize: 50 })).data.map((r) => r.contact.displayName)).toEqual(['Anh Khoa - sỉ HN']);
    const chans = (await c.call(channelList, {})).data;
    expect(chans.map((x) => x.channel).sort()).toEqual(['facebook_page', 'zalo_personal']);
    expect(chans.find((x) => x.channel === 'zalo_personal')!.unread).toBe(2); // Anh Khoa 1 (sau tin ra) + Thảo Vy 1
  });

  it('lệnh gửi tin chưa có máy chủ ⇒ 501 CAKE_NOT_ON_SERVER (Cell / Hub ở PHASE-006, 008)', async () => {
    const { messageSend, conversationList } = await C();
    const v = (await c.call(conversationList, { filter: 'all', limit: 1 })).data[0]!;
    await expect(c.call(messageSend, { conversationId: v.conversationId, text: 'Dạ', attachments: [] })).rejects.toMatchObject({ reason: 'CAKE_NOT_ON_SERVER' });
  });
});
