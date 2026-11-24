// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-8: ca vàng G1–G4 qua MỘT CỬA bằng fixture bizcity_touch@1 thật; phát lại không trùng; đổi phiên bản = đảo + ghi;
//   phiên bản cũ bị từ chối và quay lui; không ghép theo tên; ghép / tách; contact_state dựng lại khớp (SC-CAKE-5); sổ không sửa được (SC-CAKE-1).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KernelError, MemoryRepo, computeState, mergeContacts, sameState, submitTouchIn, unmergeContact, type KernelDeps } from '../src/index.js';

const fx = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'contracts', 'fixtures', n), 'utf8'));
const comment = () => fx('touch.comment.json');
const pageMsg = () => fx('touch.page-message.json');
const privateReply = () => ({
  ...comment(), eventId: '01JDAB0000000000000000T010', type: 'comment.replied', direction: 'outbound', occurredAt: '2026-11-24T07:45:00Z',
  docKey: 'facebook_comment|1234567890|p_555:c_777|r_1', sender: { scope: 'comment:1234567890', externalId: '1234567890', displayName: 'Hoa Mai Fashion', avatarRef: null },
  content: { type: 'text', text: 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!', attachments: [] },
});

let deps: KernelDeps & { repo: MemoryRepo };
let n = 0;
beforeEach(() => {
  n = 0;
  let clock = Date.parse('2026-11-24T09:00:00Z');
  const repo = new MemoryRepo({ accounts: [
    { channelAccountId: 'ACC-PAGE', channel: 'facebook_page', kind: 'page', externalAccountId: '1234567890', label: 'Hoa Mai Fashion', status: 'connected' },
    { channelAccountId: 'ACC-ZALO', channel: 'zalo_personal', kind: 'personal', externalAccountId: '7350219485123001001', label: 'Shop Hoa Mai', status: 'connected' },
  ] });
  deps = { repo, now: () => new Date((clock += 1000)).toISOString(), newId: (k) => `01JDB${k[0]!.toUpperCase()}${String(++n).padStart(20, '0')}` };
});
const effective = () => deps.repo.data.ledger.filter((r) => !r.isReversal && !deps.repo.isReversed(r.touchId));

describe('ca vàng G1–G4 qua một cửa', () => {
  it('bình luận → trả lời riêng → tin Fanpage: MỘT contact_id, PSID ghép bằng bằng chứng trả lời riêng', () => {
    const a = submitTouchIn(deps, comment());
    expect(a).toMatchObject({ status: 'accepted', resolved: 'created' });
    expect(submitTouchIn(deps, privateReply())).toMatchObject({ status: 'accepted', contactId: a.contactId });
    const c = submitTouchIn(deps, pageMsg());
    expect(c).toMatchObject({ status: 'accepted', contactId: a.contactId, resolved: 'proven_private_reply' });
    const ids = deps.repo.identitiesOf(a.contactId!);
    expect(ids.map((i) => [i.channel, i.confidence, i.proof?.kind ?? null])).toEqual([['facebook_comment', 'asserted', null], ['facebook_page', 'proven', 'fb_private_reply']]);
    expect(deps.repo.getState(a.contactId!)).toMatchObject({ unanswered: true, channels: { facebook_comment: 2, facebook_page: 1 } });
  });
  it('chưa có trả lời riêng của shop ⇒ không ghép, tạo khách mới (không tin privateReplyOf suông)', () => {
    const a = submitTouchIn(deps, comment());
    const c = submitTouchIn(deps, pageMsg());
    expect(c.resolved).toBe('created');
    expect(c.contactId).not.toBe(a.contactId);
  });
  it('trùng tên KHÔNG ghép (R-CAKE-ID-2)', () => {
    const a = submitTouchIn(deps, comment());
    const other = { ...pageMsg(), docKey: 'facebook_page|1234567890|t_9|m_9', thread: { externalThreadId: 't_9', kind: 'dm', anchor: null }, sender: { ...pageMsg().sender, externalId: '9999' }, hints: {} };
    expect(submitTouchIn(deps, other).contactId).not.toBe(a.contactId); // cùng "Nguyễn Thu Hương"
  });
  it('số điện thoại đã xác minh ⇒ ghép proven_phone', () => {
    const a = submitTouchIn(deps, comment());
    deps.repo.insertIdentity({ identityId: 'P1', contactId: a.contactId!, channel: 'phone', scope: 'global', externalId: '0912345671', displayName: null, confidence: 'proven', proof: { kind: 'phone' }, validFrom: '2026-11-24T00:00:00Z', validTo: null });
    const z = { ...fx('touch.zalo-delivery.json'), type: 'message.received', direction: 'inbound', version: 1, docKey: 'zalo_personal|7350219485123001001|u_1|m_1', thread: { externalThreadId: 'u_1', kind: 'dm', anchor: null }, sender: { scope: 'global', externalId: '880001', displayName: 'Hương', avatarRef: null }, content: { type: 'text', text: 'Chị đây', attachments: [] }, hints: { phone: '0912345671' }, delivery: null };
    expect(submitTouchIn(deps, z)).toMatchObject({ contactId: a.contactId, resolved: 'proven_phone' });
  });
});

describe('một cửa: phát lại, phiên bản, quay lui', () => {
  it('phát lại 1 000 lần ⇒ 0 dòng sổ mới', () => {
    submitTouchIn(deps, comment());
    const before = deps.repo.data.ledger.length;
    for (let i = 0; i < 1000; i++) expect(submitTouchIn(deps, comment()).status).toBe('unchanged');
    expect(deps.repo.data.ledger.length).toBe(before);
  });
  it('phiên bản mới ⇒ đúng 1 dòng đảo + 1 dòng mới, bản cũ được lưu; phiên bản cũ ⇒ CAKE_TOUCH_VERSION_STALE và không ghi gì', () => {
    submitTouchIn(deps, comment());
    submitTouchIn(deps, { ...comment(), version: 2, content: { type: 'text', text: 'Váy này còn size M không?', attachments: [] } });
    const rows = deps.repo.data.ledger;
    expect(rows.filter((r) => r.isReversal)).toHaveLength(1);
    expect(effective()).toHaveLength(1);
    expect(deps.repo.data.versions).toHaveLength(1);
    const len = rows.length;
    expect(() => submitTouchIn(deps, comment())).toThrow(KernelError);
    expect(deps.repo.data.ledger.length).toBe(len);
  });
  it('sai khuôn ⇒ không lưu gì; tin ra cho hội thoại chưa có ⇒ lỗi và quay lui sạch', () => {
    expect(() => submitTouchIn(deps, { ...comment(), channel: 'facebook' })).toThrow();
    expect(() => submitTouchIn(deps, privateReply())).toThrow(/hội thoại chưa có/);
    expect(deps.repo.data.events).toHaveLength(0);
    expect(deps.repo.data.ledger).toHaveLength(0);
  });
  it('dòng sổ không sửa được (trigger chỉ-thêm mô phỏng) và mỗi dòng chỉ đảo một lần', () => {
    submitTouchIn(deps, comment());
    const r = deps.repo.data.ledger[0]!;
    expect(() => { (r as { qty: number }).qty = 5; }).toThrow();
    expect(() => deps.repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId })).not.toThrow();
    expect(() => deps.repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId })).toThrow(/đã bị đảo/);
  });
});

describe('ghép / tách và dẫn xuất', () => {
  it('ghép có người xác nhận ⇒ chuyển danh tính + hội thoại; tách lại khôi phục; contact_state luôn khớp dựng lại', () => {
    const a = submitTouchIn(deps, comment());
    const b = submitTouchIn(deps, pageMsg()); // chưa có trả lời riêng ⇒ khách riêng
    expect(() => mergeContacts(deps, { from: b.contactId!, into: a.contactId!, proof: { kind: 'name' } as never, actor: '7' })).toThrow();
    expect(() => mergeContacts(deps, { from: a.contactId!, into: a.contactId!, proof: { kind: 'human', userId: '7' }, actor: '7' })).toThrow(/chính nó/);
    mergeContacts(deps, { from: b.contactId!, into: a.contactId!, proof: { kind: 'human', userId: '7' }, actor: '7' });
    expect(deps.repo.identitiesOf(a.contactId!).map((i) => i.channel).sort()).toEqual(['facebook_comment', 'facebook_page']);
    expect(deps.repo.getContact(b.contactId!)).toMatchObject({ status: 'merged', mergedInto: a.contactId });
    expect(deps.repo.getState(a.contactId!)?.channels).toEqual({ facebook_comment: 1, facebook_page: 1 });
    // tin mới tới PSID đã chuyển ⇒ đi thẳng về khách đích
    const next = { ...pageMsg(), eventId: '01JDAB0000000000000000T099', docKey: 'facebook_page|1234567890|t_2468|m_next', hints: {} };
    expect(submitTouchIn(deps, next).contactId).toBe(a.contactId);
    unmergeContact(deps, { contactId: b.contactId!, actor: '7' });
    expect(deps.repo.getContact(b.contactId!)?.status).toBe('active');
    expect(deps.repo.identitiesOf(b.contactId!).map((i) => i.channel)).toEqual(['facebook_page']);
    for (const c of deps.repo.data.contacts) {
      expect(sameState(deps.repo.getState(c.contactId), computeState(deps.repo, c.contactId, deps.repo.mergedFrom(c.contactId))), c.contactId).toBe(true);
    }
  });
});
