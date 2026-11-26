// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-8: ca vàng G1–G4 qua MỘT CỬA bằng fixture bizcity_touch@1 thật; phát lại không trùng; đổi phiên bản = đảo + ghi;
//   phiên bản cũ bị từ chối và quay lui; không ghép theo tên; ghép / tách; contact_state dựng lại khớp (SC-CAKE-5); sổ không sửa được (SC-CAKE-1).
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — thành BỘ KỊCH BẢN DÙNG CHUNG: MemoryRepo (test/kernel.test.ts) và PgCareRepo (apps/api/test/care.pg.test.ts)
//   chạy đúng cùng các ca ⇒ hai bản kho không thể lệch ngữ nghĩa. Phần "soi kho" đi qua Probe (mỗi bản kho tự cung cấp).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KernelError, requestSend, assignConversation, computeState, effectiveRows, mergeContacts, sameState, submitTouchIn, tagContact, unmergeContact, type AccountRow, type KernelDeps, type LedgerRow } from '../src/index.js';

export interface Probe {
  ledger(): Promise<LedgerRow[]>;
  events(): Promise<number>;
  versions(): Promise<number>;
  contactIds(): Promise<string[]>;
  /** Thử sửa trực tiếp một dòng sổ — phải bị chặn (đóng băng / trigger CSDL). */
  mutateLedger(row: LedgerRow): Promise<void>;
  /** [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — giả lập nhân viên sửa tên khách (name_source = staff). */
  markStaffName(contactId: string, name: string): Promise<void>;
}
export type Harness = { deps: KernelDeps; probe: Probe };

export const ACCOUNTS: AccountRow[] = [
  { channelAccountId: 'ACC-PAGE', channel: 'facebook_page', kind: 'page', externalAccountId: '1234567890', label: 'Hoa Mai Fashion', status: 'connected' },
  { channelAccountId: 'ACC-ZALO', channel: 'zalo_personal', kind: 'personal', externalAccountId: '7350219485123001001', label: 'Shop Hoa Mai', status: 'connected' },
];

/** Đồng hồ + sinh id tất định cho test (id đúng khuôn ULID Crockford). */
export function testClockAndIds(offset = 0): Pick<KernelDeps, 'now' | 'newId'> {
  let n = offset; // lệch theo đơn vị khi nhiều đơn vị dùng chung một CSDL (khoá chính toàn cục)
  let clock = Date.parse('2026-11-24T09:00:00Z');
  return { now: () => new Date((clock += 1000)).toISOString(), newId: (k) => `01JDB${({ contact: 'C', conversation: 'V', message: 'M', identity: 'D', event: 'E' } as const)[k]}${String(++n).padStart(20, '0')}` };
}

const fx = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'contracts', 'fixtures', n), 'utf8'));
const comment = () => fx('touch.comment.json');
const pageMsg = () => fx('touch.page-message.json');
const privateReply = () => ({
  ...comment(), eventId: '01JDAB0000000000000000T010', type: 'comment.replied', direction: 'outbound', occurredAt: '2026-11-24T07:45:00Z',
  docKey: 'facebook_comment|1234567890|p_555:c_777|r_1', sender: { scope: 'comment:1234567890', externalId: '1234567890', displayName: 'Hoa Mai Fashion', avatarRef: null },
  content: { type: 'text', text: 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!', attachments: [] },
});

export function defineKernelSuite(label: string, make: () => Promise<Harness>, opts: { replays?: number; timeoutMs?: number } = {}): void {
  let deps: KernelDeps, probe: Probe;
  const submit = (raw: unknown) => submitTouchIn(deps, raw);
  beforeEach(async () => { ({ deps, probe } = await make()); });

  describe(`${label} · ca vàng G1–G4 qua một cửa`, () => {
    it('bình luận → trả lời riêng → tin Fanpage: MỘT contact_id, PSID ghép bằng bằng chứng trả lời riêng', async () => {
      const a = await submit(comment());
      expect(a).toMatchObject({ status: 'accepted', resolved: 'created' });
      expect(await submit(privateReply())).toMatchObject({ status: 'accepted', contactId: a.contactId });
      expect(await submit(pageMsg())).toMatchObject({ status: 'accepted', contactId: a.contactId, resolved: 'proven_private_reply' });
      const ids = await deps.repo.identitiesOf(a.contactId!);
      expect(ids.map((i) => [i.channel, i.confidence, i.proof?.kind ?? null])).toEqual([['facebook_comment', 'asserted', null], ['facebook_page', 'proven', 'fb_private_reply']]);
      expect(await deps.repo.getState(a.contactId!)).toMatchObject({ unanswered: true, channels: { facebook_comment: 2, facebook_page: 1 } });
    });
    it('chưa có trả lời riêng của shop ⇒ không ghép, tạo khách mới (không tin privateReplyOf suông)', async () => {
      const a = await submit(comment());
      const c = await submit(pageMsg());
      expect(c.resolved).toBe('created');
      expect(c.contactId).not.toBe(a.contactId);
    });
    it('trùng tên KHÔNG ghép (R-CAKE-ID-2)', async () => {
      const a = await submit(comment());
      const other = { ...pageMsg(), docKey: 'facebook_page|1234567890|t_9|m_9', thread: { externalThreadId: 't_9', kind: 'dm', anchor: null }, sender: { ...pageMsg().sender, externalId: '9999' }, hints: {} };
      expect((await submit(other)).contactId).not.toBe(a.contactId); // cùng "Nguyễn Thu Hương"
    });
    it('số điện thoại đã xác minh ⇒ ghép proven_phone', async () => {
      const a = await submit(comment());
      await deps.repo.insertIdentity({ identityId: 'P1', contactId: a.contactId!, channel: 'phone', scope: 'global', externalId: '0912345671', displayName: null, confidence: 'proven', proof: { kind: 'phone' }, validFrom: '2026-11-24T00:00:00Z', validTo: null });
      const z = { ...fx('touch.zalo-delivery.json'), type: 'message.received', direction: 'inbound', version: 1, docKey: 'zalo_personal|7350219485123001001|u_1|m_1', thread: { externalThreadId: 'u_1', kind: 'dm', anchor: null }, sender: { scope: 'global', externalId: '880001', displayName: 'Hương', avatarRef: null }, content: { type: 'text', text: 'Chị đây', attachments: [] }, hints: { phone: '0912345671' }, delivery: null };
      expect(await submit(z)).toMatchObject({ contactId: a.contactId, resolved: 'proven_phone' });
    });
  });

  describe(`${label} · một cửa: phát lại, phiên bản, quay lui`, () => {
    const replays = opts.replays ?? 1000;
    it(`phát lại ${replays} lần ⇒ 0 dòng sổ mới`, { timeout: opts.timeoutMs ?? 5000 }, async () => {
      await submit(comment());
      const before = (await probe.ledger()).length;
      for (let i = 0; i < replays; i++) expect((await submit(comment())).status).toBe('unchanged');
      expect((await probe.ledger()).length).toBe(before);
    });
    it('phiên bản mới ⇒ đúng 1 dòng đảo + 1 dòng mới, bản cũ được lưu; phiên bản cũ ⇒ CAKE_TOUCH_VERSION_STALE và không ghi gì', async () => {
      await submit(comment());
      await submit({ ...comment(), version: 2, content: { type: 'text', text: 'Váy này còn size M không?', attachments: [] } });
      const rows = await probe.ledger();
      expect(rows.filter((r) => r.isReversal)).toHaveLength(1);
      expect(effectiveRows(rows)).toHaveLength(1);
      expect(await probe.versions()).toBe(1);
      await expect(submit(comment())).rejects.toBeInstanceOf(KernelError);
      expect((await probe.ledger()).length).toBe(rows.length);
    });
    it('sai khuôn ⇒ không lưu gì; tin ra cho hội thoại chưa có ⇒ lỗi và quay lui sạch', async () => {
      await expect(submit({ ...comment(), channel: 'facebook' })).rejects.toThrow();
      await expect(submit(privateReply())).rejects.toThrow(/hội thoại chưa có/);
      expect(await probe.events()).toBe(0);
      expect(await probe.ledger()).toHaveLength(0);
    });
    it('dòng sổ không sửa được (SC-CAKE-1) và mỗi dòng chỉ đảo một lần', async () => {
      await submit(comment());
      const r = (await probe.ledger())[0]!;
      await expect(probe.mutateLedger(r)).rejects.toThrow();
      await deps.repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId });
      await expect(deps.repo.tx(() => deps.repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId }))).rejects.toThrow();
    });
  });

  // [2026-11-24 08:49 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lệnh của nhân viên đi qua sổ: nhãn là dẫn xuất của sổ, lặp không sinh dòng, giao việc có dòng sổ.
  describe(`${label} · lệnh của nhân viên: nhãn, giao việc`, () => {
    it('gắn / gỡ nhãn ⇒ dòng sổ kind=tag chỉ khi thực sự đổi; nhãn = dẫn xuất (dựng lại khớp)', async () => {
      const a = await submit(comment());
      const conv = (await deps.repo.conversationsOf(a.contactId!))[0]!;
      expect(await tagContact(deps, { conversationId: conv.conversationId, add: ['Khách VIP', 'Đặt hàng'], remove: [], actor: '7' })).toEqual({ tags: ['Khách VIP', 'Đặt hàng'] });
      const n = (await probe.ledger()).length;
      await tagContact(deps, { conversationId: conv.conversationId, add: ['Khách VIP'], remove: ['Chưa có'], actor: '7' }); // không đổi gì
      expect((await probe.ledger()).length).toBe(n);
      expect((await tagContact(deps, { conversationId: conv.conversationId, add: [], remove: ['Đặt hàng'], actor: '7' })).tags).toEqual(['Khách VIP']);
      expect((await probe.ledger()).filter((r) => r.kind === 'tag')).toHaveLength(3);
      const id = a.contactId!;
      expect(sameState(await deps.repo.getState(id), await computeState(deps.repo, id, await deps.repo.mergedFrom(id)))).toBe(true);
    });
    it('giao hội thoại ⇒ người phụ trách + dòng sổ kind=assign; giao lại cùng người ⇒ không ghi thêm', async () => {
      const a = await submit(comment());
      const conv = (await deps.repo.conversationsOf(a.contactId!))[0]!;
      await assignConversation(deps, { conversationId: conv.conversationId, userId: 'wp:12', actor: '7' });
      await assignConversation(deps, { conversationId: conv.conversationId, userId: 'wp:12', actor: '7' });
      expect((await deps.repo.getConversation(conv.conversationId))?.assigneeUserId).toBe('wp:12');
      expect((await probe.ledger()).filter((r) => r.kind === 'assign').map((r) => r.dims.to)).toEqual(['wp:12']);
      await expect(assignConversation(deps, { conversationId: '01JDBV99999999999999999999', userId: null, actor: '7' })).rejects.toBeInstanceOf(KernelError);
    });
  });

  describe(`${label} · ghép / tách và dẫn xuất`, () => {
    it('ghép có người xác nhận ⇒ chuyển danh tính + hội thoại; tách lại khôi phục; contact_state luôn khớp dựng lại', async () => {
      const a = await submit(comment());
      const b = await submit(pageMsg()); // chưa có trả lời riêng ⇒ khách riêng
      await expect(mergeContacts(deps, { from: b.contactId!, into: a.contactId!, proof: { kind: 'name' } as never, actor: '7' })).rejects.toThrow();
      await expect(mergeContacts(deps, { from: a.contactId!, into: a.contactId!, proof: { kind: 'human', userId: '7' }, actor: '7' })).rejects.toThrow(/chính nó/);
      await mergeContacts(deps, { from: b.contactId!, into: a.contactId!, proof: { kind: 'human', userId: '7' }, actor: '7' });
      expect((await deps.repo.identitiesOf(a.contactId!)).map((i) => i.channel).sort()).toEqual(['facebook_comment', 'facebook_page']);
      expect(await deps.repo.getContact(b.contactId!)).toMatchObject({ status: 'merged', mergedInto: a.contactId });
      expect((await deps.repo.getState(a.contactId!))?.channels).toEqual({ facebook_comment: 1, facebook_page: 1 });
      // tin mới tới PSID đã chuyển ⇒ đi thẳng về khách đích
      const next = { ...pageMsg(), eventId: '01JDAB0000000000000000T099', docKey: 'facebook_page|1234567890|t_2468|m_next', hints: {} };
      expect((await submit(next)).contactId).toBe(a.contactId);
      await unmergeContact(deps, { contactId: b.contactId!, actor: '7' });
      expect((await deps.repo.getContact(b.contactId!))?.status).toBe('active');
      expect((await deps.repo.identitiesOf(b.contactId!)).map((i) => i.channel)).toEqual(['facebook_page']);
      for (const id of await probe.contactIds()) {
        expect(sameState(await deps.repo.getState(id), await computeState(deps.repo, id, await deps.repo.mergedFrom(id))), id).toBe(true);
      }
    });
  });

  // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — gửi tin: một lượt chạm lúc bấm gửi; báo giao / tin Cell báo lại không đếm lần hai, không kéo lùi.
  describe(`${label} · gửi tin ra kênh và báo giao`, () => {
    const dlv = () => fx('touch.zalo-delivery.json');
    const zIn = () => ({ ...dlv(), eventId: '01JDAB0000000000000000T020', occurredAt: '2026-11-24T08:00:00Z', type: 'message.received', direction: 'inbound', version: 1, docKey: 'zalo_personal|7350219485123001001|u_8812|m_in1',
      sender: { scope: 'global', externalId: '8812', displayName: 'Vy', avatarRef: null }, content: { type: 'text', text: 'Còn váy không em?', attachments: [] }, hints: {}, delivery: null });
    const outs = async () => effectiveRows(await probe.ledger()).filter((r) => r.direction === 'out');

    it('gửi ⇒ 1 dòng sổ ra + tin "đang gửi" mang khoá lệnh; delivery.updated (commandKey) ⇒ đổi trạng thái + gắn mã thật, không thêm dòng; phát lại không đổi', async () => {
      const a = await submit(zIn());
      const conv = (await deps.repo.conversationsOf(a.contactId!))[0]!;
      const r = await requestSend(deps, { conversationId: conv.conversationId, text: 'Dạ còn ạ', actor: '7', userId: '7' });
      expect(r.commandKey).toBe(`cake:${r.touchId}:send:1`);
      expect(await deps.repo.findMessage(conv.conversationId, r.commandKey)).toMatchObject({ delivery: 'accepted', direction: 'out', sentBy: '7' });
      expect(await deps.repo.getState(a.contactId!)).toMatchObject({ unanswered: false });
      const d = { ...dlv(), hints: { commandKey: r.commandKey } };
      expect(await submit(d)).toMatchObject({ status: 'accepted', touchId: r.touchId, contactId: a.contactId });
      expect(await deps.repo.findMessage(conv.conversationId, 'm_9001')).toMatchObject({ messageId: r.messageId, delivery: 'sent' });
      expect((await submit(d)).status).toBe('unchanged');
      await submit({ ...d, version: 3, delivery: { status: 'read', externalMessageId: 'm_9001' } });
      expect((await deps.repo.findMessage(conv.conversationId, 'm_9001'))?.delivery).toBe('read');
      expect(await outs()).toHaveLength(1);
    });
    it('tin shop gửi từ điện thoại (v1 message.sent) rồi báo giao v2 ⇒ vẫn đúng 1 lượt chạm, không đảo', async () => {
      await submit(zIn());
      const sent = { ...dlv(), type: 'message.sent', version: 1, content: { type: 'text', text: 'Shop gửi từ điện thoại', attachments: [] }, hints: {}, delivery: null };
      await submit(sent);
      await submit({ ...dlv(), hints: {}, delivery: { status: 'delivered', externalMessageId: 'm_9001' } });
      expect(await outs()).toHaveLength(1);
      expect((await probe.ledger()).filter((x) => x.isReversal)).toHaveLength(0);
    });
    it('báo giao cho tin không có trong Cake ⇒ chỉ lưu sự việc, không dòng sổ', async () => {
      await submit(zIn());
      const before = (await probe.ledger()).length;
      expect(await submit({ ...dlv(), docKey: 'zalo_personal|7350219485123001001|u_8812|m_la', hints: {} })).toMatchObject({ status: 'accepted', touchId: null });
      expect((await probe.ledger()).length).toBe(before);
    });
  });

  // [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — năng lực kênh đủ (bizcity_touch@1 0.2): tên / ảnh, danh bạ, nhóm, trích dẫn, @nhắc, thu hồi — không thêm dòng sổ
  describe(`${label} · hồ sơ, nhóm, thu hồi (0.2)`, () => {
    const zMsg = () => fx('touch.zalo-message.json');
    const prof = (o: Record<string, unknown> = {}) => ({ ...zMsg(), eventId: '01JDAB0000000000000000P001', type: 'profile.updated', docKey: 'zalo_personal|7350219485123001001|u_8812|profile', content: { type: 'none', text: null, attachments: [] }, ...o });
    it('tin có tên + ảnh ⇒ danh tính có ảnh; profile.updated đổi tên ⇒ tên khách theo kênh; không thêm dòng sổ', async () => {
      const a = await submit({ ...zMsg(), sender: { scope: 'global', externalId: 'u_8812', displayName: 'Lan Hương', avatarRef: 'https://cell/a/1.jpg' } });
      const idn = (await deps.repo.identitiesOf(a.contactId!))[0]!;
      expect(idn.avatarRef).toBe('https://cell/a/1.jpg');
      const before = (await probe.ledger()).length;
      expect(await submit(prof({ sender: { scope: 'global', externalId: 'u_8812', displayName: 'Lan Hương Mai', avatarRef: 'https://cell/a/2.jpg' } }))).toMatchObject({ status: 'accepted', touchId: null, contactId: a.contactId });
      expect((await deps.repo.identitiesOf(a.contactId!))[0]).toMatchObject({ displayName: 'Lan Hương Mai', avatarRef: 'https://cell/a/2.jpg' });
      expect((await deps.repo.getContact(a.contactId!))?.displayName).toBe('Lan Hương Mai');
      expect((await probe.ledger()).length).toBe(before);
    });
    it('nhân viên đã sửa tên (nameSource staff) ⇒ kênh đổi tên không ghi đè tên khách, chỉ đổi tên danh tính', async () => {
      const a = await submit(zMsg());
      await probe.markStaffName(a.contactId!, 'Chị Lan (khách sỉ)');
      await submit(prof({ sender: { scope: 'global', externalId: 'u_8812', displayName: 'Tên Zalo mới', avatarRef: null } }));
      expect((await deps.repo.getContact(a.contactId!))?.displayName).toBe('Chị Lan (khách sỉ)');
      expect((await deps.repo.identitiesOf(a.contactId!))[0]?.displayName).toBe('Tên Zalo mới');
    });
    it('đồng bộ danh bạ (backfill) ⇒ tạo khách asserted cho người chưa nhắn; người lạ đổi hồ sơ không backfill ⇒ bỏ qua', async () => {
      const r = await submit(prof({ sender: { scope: 'global', externalId: 'u_9999', displayName: 'Thảo Vy', avatarRef: 'https://cell/a/tv.jpg' }, docKey: 'zalo_personal|7350219485123001001|u_9999|profile', history: { backfill: true, cursor: null } }));
      expect(r.contactId).toBeTruthy();
      expect((await deps.repo.identitiesOf(r.contactId!))[0]).toMatchObject({ confidence: 'asserted', displayName: 'Thảo Vy', avatarRef: 'https://cell/a/tv.jpg' });
      expect((await probe.ledger()).filter((x) => x.contactId === r.contactId)).toHaveLength(0);
      const stranger = await submit(prof({ eventId: '01JDAB0000000000000000P002', sender: { scope: 'global', externalId: 'u_7777', displayName: 'Ai đó', avatarRef: null }, docKey: 'zalo_personal|7350219485123001001|u_7777|profile' }));
      expect(stranger).toMatchObject({ status: 'accepted', contactId: null });
    });
    it('nhóm: tin nhóm mang thread.info ⇒ hội thoại có tên / ảnh / số thành viên; thread.updated đổi ⇒ cập nhật; nhóm chưa có hội thoại ⇒ bỏ qua', async () => {
      const g = { ...zMsg(), docKey: 'zalo_personal|7350219485123001001|g_55|m_g1', thread: { externalThreadId: 'g_55', kind: 'group_thread', anchor: null, info: { name: 'Hội yêu váy hoa', avatarRef: 'https://cell/g/55.jpg', memberCount: 248 } } };
      await submit(g);
      const acc = (await deps.repo.findAccount('7350219485123001001', 'personal'))!.channelAccountId; // Postgres lệch id theo đơn vị
      expect(await deps.repo.findConversation(acc, 'g_55')).toMatchObject({ title: 'Hội yêu váy hoa', avatarRef: 'https://cell/g/55.jpg', memberCount: 248 });
      const before = (await probe.ledger()).length;
      const upd = { ...g, eventId: '01JDAB0000000000000000P003', type: 'thread.updated', docKey: 'zalo_personal|7350219485123001001|g_55|info-2', sender: null, content: { type: 'none', text: null, attachments: [] }, thread: { ...g.thread, info: { name: 'Hội yêu váy hoa 🌸', avatarRef: null, memberCount: 250 } } };
      await submit(upd);
      expect(await deps.repo.findConversation(acc, 'g_55')).toMatchObject({ title: 'Hội yêu váy hoa 🌸', memberCount: 250 });
      expect((await probe.ledger()).length).toBe(before);
      const none = { ...upd, eventId: '01JDAB0000000000000000P004', docKey: 'zalo_personal|7350219485123001001|g_99|info', thread: { externalThreadId: 'g_99', kind: 'group_thread', anchor: null, info: { name: 'Nhóm chưa nhắn', avatarRef: null, memberCount: 3 } } };
      expect(await submit(none)).toMatchObject({ status: 'accepted', contactId: null });
    });
    it('trích dẫn + @nhắc lưu theo tin; thu hồi (v2 revoked) ⇒ xoá nội dung, ghi giờ thu hồi, sổ giữ nguyên (không đảo)', async () => {
      const m = { ...zMsg(), content: { type: 'text', text: '@Shop còn size S không', attachments: [], quote: { externalMessageId: 'm_8000', senderExternalId: '7350219485123001001', text: 'Váy mới về' }, mentions: [{ externalId: '7350219485123001001', pos: 0, len: 5 }] } };
      const a = await submit(m);
      const conv = (await deps.repo.conversationsOf(a.contactId!))[0]!;
      const ext = m.docKey.split('|')[3];
      expect(await deps.repo.findMessage(conv.conversationId, ext)).toMatchObject({ quote: { externalMessageId: 'm_8000' }, mentions: [{ pos: 0, len: 5 }], revokedAt: null });
      const before = await probe.ledger();
      await submit({ ...m, version: 2, occurredAt: '2026-11-26T08:05:00.000Z', content: { type: 'revoked', text: null, attachments: [] } });
      expect(await deps.repo.findMessage(conv.conversationId, ext)).toMatchObject({ text: '', quote: null, mentions: [], revokedAt: expect.stringMatching(/^2026-11-26T08:05/) });
      expect((await probe.ledger()).length).toBe(before.length);
      expect((await probe.ledger()).filter((x) => x.isReversal)).toHaveLength(0);
    });
  });
}
