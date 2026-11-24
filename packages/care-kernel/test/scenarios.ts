// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-8: ca vàng G1–G4 qua MỘT CỬA bằng fixture bizcity_touch@1 thật; phát lại không trùng; đổi phiên bản = đảo + ghi;
//   phiên bản cũ bị từ chối và quay lui; không ghép theo tên; ghép / tách; contact_state dựng lại khớp (SC-CAKE-5); sổ không sửa được (SC-CAKE-1).
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — thành BỘ KỊCH BẢN DÙNG CHUNG: MemoryRepo (test/kernel.test.ts) và PgCareRepo (apps/api/test/care.pg.test.ts)
//   chạy đúng cùng các ca ⇒ hai bản kho không thể lệch ngữ nghĩa. Phần "soi kho" đi qua Probe (mỗi bản kho tự cung cấp).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KernelError, computeState, effectiveRows, mergeContacts, sameState, submitTouchIn, unmergeContact, type AccountRow, type KernelDeps, type LedgerRow } from '../src/index.js';

export interface Probe {
  ledger(): Promise<LedgerRow[]>;
  events(): Promise<number>;
  versions(): Promise<number>;
  contactIds(): Promise<string[]>;
  /** Thử sửa trực tiếp một dòng sổ — phải bị chặn (đóng băng / trigger CSDL). */
  mutateLedger(row: LedgerRow): Promise<void>;
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
}
