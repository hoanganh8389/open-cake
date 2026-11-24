// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-4: ghép / tách người (R-CAKE-ID-2, R-CAKE-SPINE-2, ECP-06).
//   Ghép: bằng chứng bắt buộc (không có loại "name" — schema chặn), đóng danh tính cũ + mở dòng mới trỏ khách đích, chuyển hội thoại, contact nguồn
//   status=merged + merged_into, một dòng sổ kind=merge. Dòng sổ cũ KHÔNG sửa — báo cáo giải merged_into. Tách trong hạn = dòng đảo của dòng ghép.
import { ProofSchema, type Proof } from '@open-cake/contracts';
import { KernelError } from './errors.js';
import { computeState } from './state.js';
import type { KernelDeps } from './types.js';

export const UNMERGE_WINDOW_DAYS = 30;

export function mergeContacts(deps: KernelDeps, input: { from: string; into: string; proof: Proof; actor: string }) {
  const proof = ProofSchema.parse(input.proof);
  const { repo, now, newId } = deps;
  if (input.from === input.into) throw KernelError.of('CAKE_MERGE_SELF');
  return repo.tx(() => {
    const from = repo.getContact(input.from), into = repo.getContact(input.into);
    if (!from || !into) throw new KernelError('NOT_FOUND', 'Không tìm thấy khách.');
    if (from.status !== 'active' || into.status !== 'active') throw new KernelError('CONFLICT', 'Chỉ ghép hai khách đang hoạt động.');
    const at = now();
    const event = { eventId: newId('event'), source: `user:${input.actor}`, docKey: `merge|${input.from}|${input.into}|${at}`, version: 1, type: 'contact.merged', payload: { ...input, proof }, receivedAt: at, actor: input.actor };
    repo.insertEvent(event);
    const moved: string[] = [];
    for (const idn of repo.identitiesOf(from.contactId)) {
      repo.closeIdentity(idn.identityId, at);
      const copy = { ...idn, identityId: newId('identity'), contactId: into.contactId, proof, validFrom: at, validTo: null };
      repo.insertIdentity(copy);
      moved.push(copy.identityId);
    }
    const convs: string[] = [];
    for (const c of repo.conversationsOf(from.contactId)) { repo.upsertConversation({ ...c, contactId: into.contactId }); convs.push(c.conversationId); }
    repo.updateContact(from.contactId, { status: 'merged', mergedInto: into.contactId });
    const row = repo.appendLedger({
      eventId: event.eventId, contactId: into.contactId, conversationId: null, channelAccountId: null, channel: null, kind: 'merge', direction: 'none',
      qty: 1, isReversal: false, reversesId: null, dims: { from: from.contactId, proof: proof.kind, movedIdentities: moved, movedConversations: convs, by: input.actor }, at,
    });
    repo.putState(computeState(repo, into.contactId, repo.mergedFrom(into.contactId)));
    const until = new Date(Date.parse(at) + UNMERGE_WINDOW_DAYS * 86400_000).toISOString();
    return { mergeTouchId: row.touchId, unmergeUntil: until };
  });
}

export function unmergeContact(deps: KernelDeps, input: { contactId: string; actor: string }) {
  const { repo, now } = deps;
  return repo.tx(() => {
    const c = repo.getContact(input.contactId);
    if (!c || c.status !== 'merged' || !c.mergedInto) throw new KernelError('NOT_FOUND', 'Khách này chưa bị ghép.');
    const into = c.mergedInto;
    const mergeRow = repo.ledgerByContact(into).filter((r) => r.kind === 'merge' && !r.isReversal && !repo.isReversed(r.touchId) && r.dims.from === c.contactId).pop();
    if (!mergeRow) throw new KernelError('CONFLICT', 'Không tìm thấy dòng ghép còn hiệu lực.');
    const at = now();
    if (Date.parse(at) > Date.parse(mergeRow.at) + UNMERGE_WINDOW_DAYS * 86400_000) throw KernelError.of('CAKE_UNMERGE_EXPIRED');
    for (const id of mergeRow.dims.movedIdentities as string[]) repo.deleteIdentityRow(id); // dòng do chính lần ghép tạo
    for (const idn of repo.identitiesOf(c.contactId, true).filter((i) => i.validTo === mergeRow.at)) repo.reopenIdentity(idn.identityId);
    for (const convId of mergeRow.dims.movedConversations as string[]) {
      const conv = repo.conversationsOf(into).find((x) => x.conversationId === convId);
      if (conv) repo.upsertConversation({ ...conv, contactId: c.contactId });
    }
    repo.updateContact(c.contactId, { status: 'active', mergedInto: null });
    repo.appendLedger({ ...mergeRow, qty: -1, isReversal: true, reversesId: mergeRow.touchId, at, dims: { ...mergeRow.dims, reason: 'unmerge', by: input.actor } });
    repo.putState(computeState(repo, into, repo.mergedFrom(into)));
    repo.putState(computeState(repo, c.contactId, repo.mergedFrom(c.contactId)));
    return { ok: true as const };
  });
}
