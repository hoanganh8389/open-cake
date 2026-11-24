// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-3: resolver danh tính (architecture/20-DATA-SPINE §4, R-CAKE-ID-1..3).
//   Thứ tự: danh tính có sẵn → bằng chứng (phone / email / bắt tay trả lời riêng) → tạo khách mới "asserted". KHÔNG BAO GIỜ ghép theo tên.
import type { Channel } from '@open-cake/contracts';
import type { AccountRow, KernelDeps } from './types.js';

export type ResolveInput = {
  channel: Channel; scope: string; externalId: string; displayName: string | null;
  account: AccountRow | null;
  hints: { phone?: string | null; email?: string | null; privateReplyOf?: string | null };
  eventId: string;
};
export type ResolveResult = { contactId: string; how: 'existing' | 'proven_phone' | 'proven_email' | 'proven_private_reply' | 'created' };

/** Có tìm được người qua bằng chứng không — trả contactId + loại bằng chứng. */
function byProof({ repo }: KernelDeps, i: ResolveInput): { contactId: string; kind: 'phone' | 'email' | 'fb_private_reply' } | null {
  if (i.hints.phone) {
    const p = repo.findIdentity('phone', 'global', i.hints.phone);
    if (p?.confidence === 'proven') return { contactId: p.contactId, kind: 'phone' };
  }
  if (i.hints.email) {
    const e = repo.findIdentity('email', 'global', i.hints.email.toLowerCase());
    if (e?.confidence === 'proven') return { contactId: e.contactId, kind: 'email' };
  }
  // Bắt tay trả lời riêng: tin Fanpage đầu tiên trong thread mở từ trả lời riêng của shop cho đúng comment đó
  // ⇒ Meta bảo đảm thread thuộc người đã bình luận (canon §1.5, PHASE-001 §4.4 b). Chỉ cho facebook_page.
  if (i.hints.privateReplyOf && i.channel === 'facebook_page' && i.account) {
    const conv = repo.findCommentConversation(i.account.channelAccountId, i.hints.privateReplyOf);
    const shopReplied = conv && repo.ledgerByContact(conv.contactId).some((r) => r.conversationId === conv.conversationId && r.direction === 'out' && !r.isReversal);
    if (conv && shopReplied) return { contactId: conv.contactId, kind: 'fb_private_reply' };
  }
  return null;
}

export function resolveIdentity(deps: KernelDeps, i: ResolveInput): ResolveResult {
  const { repo, now, newId } = deps;
  const found = repo.findIdentity(i.channel, i.scope, i.externalId);
  if (found) {
    const c = repo.getContact(found.contactId);
    // danh tính trỏ khách đã ghép ⇒ đi theo merged_into (danh tính đã được chuyển khi ghép, đây chỉ là phòng hờ)
    return { contactId: c?.status === 'merged' && c.mergedInto ? c.mergedInto : found.contactId, how: 'existing' };
  }
  const at = now();
  const proof = byProof(deps, i);
  let contactId: string;
  if (proof) {
    contactId = proof.contactId;
  } else {
    contactId = newId('contact');
    repo.insertContact({ contactId, kind: 'person', displayName: i.displayName ?? 'Khách chưa rõ tên', status: 'active', mergedInto: null, createdAt: at });
  }
  repo.insertIdentity({
    identityId: newId('identity'), contactId, channel: i.channel, scope: i.scope, externalId: i.externalId, displayName: i.displayName,
    confidence: proof ? 'proven' : 'asserted', proof: proof ? { kind: proof.kind, eventId: i.eventId } : null, validFrom: at, validTo: null,
  });
  const how = !proof ? 'created' : proof.kind === 'phone' ? 'proven_phone' : proof.kind === 'email' ? 'proven_email' : 'proven_private_reply';
  return { contactId, how };
}
