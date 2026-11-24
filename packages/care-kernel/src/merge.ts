// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-4: ghép / tách người (R-CAKE-ID-2, R-CAKE-SPINE-2, ECP-06).
//   Ghép: bằng chứng bắt buộc (không có loại "name" — schema chặn), đóng danh tính cũ + mở dòng mới trỏ khách đích, chuyển hội thoại, contact nguồn
//   status=merged + merged_into, một dòng sổ kind=merge. Dòng sổ cũ KHÔNG sửa — báo cáo giải merged_into. Tách trong hạn = dòng đảo của dòng ghép.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — bất đồng bộ theo cổng CareRepo mới; thuật toán giữ nguyên.
import { ProofSchema, type Proof } from '@open-cake/contracts';
import { KernelError } from './errors.js';
import { effectiveRows, refreshState } from './state.js';
import type { KernelDeps } from './types.js';

export const UNMERGE_WINDOW_DAYS = 30;

export async function mergeContacts(deps: KernelDeps, input: { from: string; into: string; proof: Proof; actor: string }) {
  const proof = ProofSchema.parse(input.proof);
  const { repo, now, newId } = deps;
  if (input.from === input.into) throw KernelError.of('CAKE_MERGE_SELF');
  return repo.tx(async () => {
    const from = await repo.getContact(input.from), into = await repo.getContact(input.into);
    if (!from || !into) throw new KernelError('NOT_FOUND', 'Không tìm thấy khách.');
    if (from.status !== 'active' || into.status !== 'active') throw new KernelError('CONFLICT', 'Chỉ ghép hai khách đang hoạt động.');
    const at = now();
    const event = { eventId: newId('event'), source: `user:${input.actor}`, docKey: `merge|${input.from}|${input.into}|${at}`, version: 1, type: 'contact.merged', payload: { ...input, proof }, receivedAt: at, actor: input.actor };
    await repo.insertEvent(event);
    const moved: string[] = [];
    for (const idn of await repo.identitiesOf(from.contactId)) {
      await repo.closeIdentity(idn.identityId, at);
      const copy = { ...idn, identityId: newId('identity'), contactId: into.contactId, proof, validFrom: at, validTo: null };
      await repo.insertIdentity(copy);
      moved.push(copy.identityId);
    }
    const convs: string[] = [];
    for (const c of await repo.conversationsOf(from.contactId)) { await repo.upsertConversation({ ...c, contactId: into.contactId }); convs.push(c.conversationId); }
    await repo.updateContact(from.contactId, { status: 'merged', mergedInto: into.contactId });
    const row = await repo.appendLedger({
      eventId: event.eventId, contactId: into.contactId, conversationId: null, channelAccountId: null, channel: null, kind: 'merge', direction: 'none',
      qty: 1, isReversal: false, reversesId: null, dims: { from: from.contactId, proof: proof.kind, movedIdentities: moved, movedConversations: convs, by: input.actor }, at,
    });
    await refreshState(repo, into.contactId);
    const until = new Date(Date.parse(at) + UNMERGE_WINDOW_DAYS * 86400_000).toISOString();
    return { mergeTouchId: row.touchId, unmergeUntil: until };
  });
}

export async function unmergeContact(deps: KernelDeps, input: { contactId: string; actor: string }) {
  const { repo, now } = deps;
  return repo.tx(async () => {
    const c = await repo.getContact(input.contactId);
    if (!c || c.status !== 'merged' || !c.mergedInto) throw new KernelError('NOT_FOUND', 'Khách này chưa bị ghép.');
    const into = c.mergedInto;
    const mergeRow = effectiveRows(await repo.ledgerByContact(into)).filter((r) => r.kind === 'merge' && r.dims.from === c.contactId).pop();
    if (!mergeRow) throw new KernelError('CONFLICT', 'Không tìm thấy dòng ghép còn hiệu lực.');
    const at = now();
    if (Date.parse(at) > Date.parse(mergeRow.at) + UNMERGE_WINDOW_DAYS * 86400_000) throw KernelError.of('CAKE_UNMERGE_EXPIRED');
    for (const id of mergeRow.dims.movedIdentities as string[]) await repo.deleteIdentityRow(id); // dòng do chính lần ghép tạo
    for (const idn of (await repo.identitiesOf(c.contactId, true)).filter((i) => i.validTo === mergeRow.at)) await repo.reopenIdentity(idn.identityId);
    for (const convId of mergeRow.dims.movedConversations as string[]) {
      const conv = (await repo.conversationsOf(into)).find((x) => x.conversationId === convId);
      if (conv) await repo.upsertConversation({ ...conv, contactId: c.contactId });
    }
    await repo.updateContact(c.contactId, { status: 'active', mergedInto: null });
    await repo.appendLedger({ ...mergeRow, qty: -1, isReversal: true, reversesId: mergeRow.touchId, at, dims: { ...mergeRow.dims, reason: 'unmerge', by: input.actor } });
    await refreshState(repo, into);
    await refreshState(repo, c.contactId);
    return { ok: true as const };
  });
}
