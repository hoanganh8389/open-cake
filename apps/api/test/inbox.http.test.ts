// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-006/007 — test tích hợp trên Postgres thật: cổng nhận bizcity_touch@1 (khoá + HMAC thân thô + lệch giờ + hợp đồng),
//   phát lại không trùng, và 6 action đọc qua createHttpClient của WEB — ca vàng G1 nhìn từ API: bình luận + Fanpage về MỘT khách. Không có TEST_DATABASE_URL ⇒ bỏ qua.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ActionClient } from '@open-cake/action-client';
import { freshDb } from './fresh-db.js';
import { clientFor, devToken } from './http-client.js';

const url = process.env.TEST_DATABASE_URL;
const HUB = { key: 'hub_kiem_thu_0123456789', secret: 'bi-mat-kiem-thu-0123456789-abcdefghijk' };

describe.skipIf(!url)('cổng nhận Hub + hộp thư / danh bạ trên Postgres', () => {
  let app: FastifyInstance;
  let token: string;
  let c: ActionClient;
  let sign: (secret: string, body: string, t?: number) => string;
  const C = () => import('@open-cake/contracts');
  const post = (body: string, headers: Record<string, string>) => app.inject({ method: 'POST', url: '/ingress/v1/touch', payload: body, headers: { 'content-type': 'application/json', ...headers } });
  const ok = (body: string, t?: number) => ({ authorization: `Bearer ${HUB.key}`, 'x-bizcity-contract': 'bizcity_touch@1', 'x-bizcity-signature': sign(HUB.secret, body, t) });

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    await freshDb(url!, 'inbox');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    ({ signTouch: sign } = await import('../src/care/ingress.js'));
    app = await (await import('../src/server.js')).buildApp({ logger: false, hub: HUB });
    token = await devToken(app);
    c = await clientFor(app, token);
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

  // [2026-11-24 08:49 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — 4 lệnh ghi không cần Cell qua HTTP, đi qua sổ.
  it('gắn nhãn, giao việc, ghép (cần bằng chứng) và tách khách qua API', { timeout: 30_000 }, async () => {
    const { conversationList, conversationTag, conversationAssign, contactList, contactMerge, contactUnmerge, contactGet } = await C();
    const convs = (await c.call(conversationList, { filter: 'all', limit: 50 })).data;
    const khoa = convs.find((v) => v.title === 'Anh Khoa - sỉ HN')!;
    const huong = convs.find((v) => v.title === 'Nguyễn Thu Hương')!;
    expect((await c.call(conversationTag, { conversationId: khoa.conversationId, add: ['Khách sỉ'], remove: [] })).data.tags).toEqual(['Khách sỉ']);
    expect((await c.call(contactList, { tag: 'Khách sỉ', sort: 'name', page: 1, pageSize: 50 })).data.map((r) => r.contact.displayName)).toEqual(['Anh Khoa - sỉ HN']);
    const me = (await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { authorization: `Bearer ${token}` } })).json().data.actor.slice('user:'.length);
    await c.call(conversationAssign, { conversationId: khoa.conversationId, userId: me }); // "của tôi" = người đăng nhập
    expect((await c.call(conversationList, { filter: 'mine', limit: 50 })).data.map((v) => v.conversationId)).toEqual([khoa.conversationId]);
    // ghép theo TÊN bị chặn ở cả hai lớp: hợp đồng phía web (trước khi gửi) và máy chủ (gọi thẳng, bỏ qua web)
    await expect(c.call(contactMerge, { contactId: khoa.contactId, intoContactId: huong.contactId, proof: { kind: 'name' } } as never)).rejects.toThrow(/received 'name'/);
    const raw = await app.inject({ method: 'POST', url: `/api/v1/contacts/${khoa.contactId}/merge`, payload: { intoContactId: huong.contactId, proof: { kind: 'name' } }, headers: { authorization: `Bearer ${token}` } });
    expect([raw.statusCode, raw.json().error.code]).toEqual([400, 'VALIDATION_ERROR']);
    const before = (await c.call(contactList, { sort: 'name', page: 1, pageSize: 50 })).meta?.total as number;
    const m = await c.call(contactMerge, { contactId: khoa.contactId, intoContactId: huong.contactId, proof: { kind: 'human', userId: '7' } });
    expect(m.data.intoContactId).toBe(huong.contactId);
    expect((await c.call(contactList, { sort: 'name', page: 1, pageSize: 50 })).meta?.total).toBe(before - 1);
    expect((await c.call(contactGet, { contactId: huong.contactId })).data.identities.map((d) => d.channel).sort()).toEqual(['facebook_comment', 'facebook_page', 'zalo_personal']);
    await c.call(contactUnmerge, { contactId: khoa.contactId });
    expect((await c.call(contactGet, { contactId: khoa.contactId })).data.contact.status).toBe('active');
    expect((await c.call(contactList, { sort: 'name', page: 1, pageSize: 50 })).meta?.total).toBe(before);
  });

  // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 — gửi tin đã có máy chủ (test/send.http.test.ts); trả lời bình luận vẫn chờ PHASE-008.
  it('trả lời bình luận chưa có máy chủ ⇒ 501 CAKE_NOT_ON_SERVER (PHASE-008)', async () => {
    const { commentReply, conversationList } = await C();
    const v = (await c.call(conversationList, { filter: 'all', limit: 1 })).data[0]!;
    await expect(c.call(commentReply, { conversationId: v.conversationId, mode: 'public', text: 'Dạ' })).rejects.toMatchObject({ reason: 'CAKE_NOT_ON_SERVER' });
  });
  // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: con trỏ keyset — đi hết trang bằng limit 1 khớp đúng danh sách đầy đủ, không trùng, không sót.
  it('con trỏ: hội thoại (mới → cũ) và tin (trang mới nhất trước, lùi về cũ) khớp danh sách đầy đủ; con trỏ hỏng ⇒ 400', async () => {
    const { conversationList, messageList } = await C();
    const full = (await c.call(conversationList, { filter: 'all', limit: 200 })).data.map((v) => v.conversationId);
    const walked: string[] = [];
    let cur: string | undefined;
    for (let n = 0; n < 50; n++) {
      const r = await c.call(conversationList, { filter: 'all', limit: 1, cursor: cur });
      walked.push(...r.data.map((v) => v.conversationId));
      if (!r.meta.nextCursor) break;
      cur = r.meta.nextCursor;
    }
    expect(walked).toEqual(full);
    const sizes = await Promise.all(full.map(async (id) => [id, (await c.call(messageList, { conversationId: id, limit: 200 })).data.length] as const));
    const [convId] = sizes.sort((a, b) => b[1] - a[1])[0]!;
    const all = (await c.call(messageList, { conversationId: convId, limit: 200 })).data.map((m) => m.messageId);
    expect(all.length).toBeGreaterThan(1);
    const pages: string[][] = [];
    cur = undefined;
    for (let n = 0; n < 50; n++) {
      const r = await c.call(messageList, { conversationId: convId, limit: 1, cursor: cur });
      pages.push(r.data.map((m) => m.messageId));
      if (!r.meta.nextCursor) break;
      cur = r.meta.nextCursor;
    }
    expect(pages.reverse().flat()).toEqual(all);
    await expect(c.call(conversationList, { filter: 'all', limit: 1, cursor: 'khong-phai-con-tro' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  // [2026-11-26 08:33 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — mô hình đọc mockup ⑤ ⑥: ảnh theo kênh, nhóm (tên / ảnh / số thành viên), người gửi từng tin nhóm, trích dẫn, @nhắc, thu hồi
  it('nhóm: tên / ảnh / số thành viên; tin nhóm có người gửi + ảnh; trích dẫn, @nhắc; thu hồi ⇒ nội dung rỗng + giờ thu hồi; danh bạ có ảnh', { timeout: 30_000 }, async () => {
    const { conversationList, messageList, contactList, contactGet } = await C();
    const g = (msg: string, who: string, name: string, extra: Record<string, unknown> = {}) => JSON.stringify({
      contract: 'bizcity_touch@1', eventId: `01JDAB00000000000000${msg.padStart(6, '0')}`, type: 'message.received', occurredAt: new Date().toISOString(), source: 'cell:kiem-thu',
      docKey: `zalo_personal|7350219485123001001|g_77|${msg}`, version: 1, channel: 'zalo_personal', channelAccount: { externalAccountId: '7350219485123001001', kind: 'personal' },
      thread: { externalThreadId: 'g_77', kind: 'group_thread', anchor: null, info: { name: 'Hội yêu váy hoa', avatarRef: 'https://cell/g/77.jpg', memberCount: 248 } },
      sender: { scope: 'global', externalId: who, displayName: name, avatarRef: `https://cell/a/${who}.jpg` }, direction: 'inbound',
      content: { type: 'text', text: '@Shop Hoa Mai còn size S không', attachments: [], mentions: [{ externalId: '7350219485123001001', pos: 0, len: 13 }] },
      hints: {}, encryption: { e2ee: false, decryptedOnCell: false }, delivery: null, history: { backfill: false, cursor: null }, ...extra,
    });
    for (const b of [g('gm1', '770001', 'Thảo Vy'), g('gm2', '770002', 'Anh Khoa', { content: { type: 'text', text: 'mình cũng hỏi', attachments: [], quote: { externalMessageId: 'gm1', senderExternalId: '770001', text: '@Shop Hoa Mai còn size S không' } } })]) {
      expect((await post(b, ok(b))).statusCode).toBe(200);
    }
    const conv = (await c.call(conversationList, { filter: 'all', limit: 50 })).data.find((x) => x.externalThreadId === 'g_77')!;
    expect(conv).toMatchObject({ kind: 'group_thread', title: 'Hội yêu váy hoa', avatarRef: 'https://cell/g/77.jpg', memberCount: 248 });
    let msgs = (await c.call(messageList, { conversationId: conv.conversationId, limit: 50 })).data;
    expect(msgs.map((m) => m.sender?.name)).toEqual(['Thảo Vy', 'Anh Khoa']);
    expect(msgs[0]).toMatchObject({ mentions: [{ pos: 0, len: 13 }], sender: { avatarRef: 'https://cell/a/770001.jpg' }, revokedAt: null });
    expect(msgs[1]!.quote).toMatchObject({ externalMessageId: 'gm1' });
    // thu hồi tin của Anh Khoa (v2)
    const rv = JSON.stringify({ ...JSON.parse(g('gm2', '770002', 'Anh Khoa')), version: 2, content: { type: 'revoked', text: null, attachments: [] } });
    expect((await post(rv, ok(rv))).statusCode).toBe(200);
    msgs = (await c.call(messageList, { conversationId: conv.conversationId, limit: 50 })).data;
    expect(msgs[1]).toMatchObject({ text: '', quote: null, revokedAt: expect.any(String) });
    // danh bạ + hồ sơ: ảnh theo kênh
    const vy = (await c.call(contactList, { q: 'Thảo Vy', page: 1, pageSize: 10, sort: 'last' })).data.find((r) => r.contact.displayName === 'Thảo Vy')!;
    expect(vy.avatarRef).toBe('https://cell/a/770001.jpg');
    expect((await c.call(contactGet, { contactId: vy.contact.contactId })).data.identities[0]).toMatchObject({ avatarRef: 'https://cell/a/770001.jpg' });
  });
});
