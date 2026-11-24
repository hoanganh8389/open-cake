// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 08:49 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — 4 lệnh ghi không cần Cell: gắn / gỡ nhãn, giao hội thoại, ghép, tách khách — gọi kernel (cùng bộ kịch bản
//   với bản bộ nhớ) trên PgCareRepo dùng CHUNG giao dịch của lệnh ⇒ idempotency (action_requests) và dòng sổ cùng commit / cùng quay lui.
//   Người thao tác = người đăng nhập (ctx.actor, PHASE-004).
import { assignConversation, mergeContacts, tagContact, unmergeContact, type KernelDeps } from '@open-cake/care-kernel';
import { newUlid, type Ctx, type Handler } from '../runtime.js';
import { PgCareRepo } from './pg-care-repo.js';

const deps = ({ tx, tenantId }: Ctx): KernelDeps => ({ repo: new PgCareRepo(tenantId, tx), now: () => new Date().toISOString(), newId: () => newUlid() });

export const careCommandHandlers: Record<string, Handler> = {
  'cake.conversation.tag': (ctx, i) => tagContact(deps(ctx), { conversationId: i.conversationId, add: i.add, remove: i.remove, actor: ctx.actor }),
  'cake.conversation.assign': (ctx, i) => assignConversation(deps(ctx), { conversationId: i.conversationId, userId: i.userId, actor: ctx.actor }),
  'cake.contact.merge': async (ctx, i) => {
    const r = await mergeContacts(deps(ctx), { from: i.contactId, into: i.intoContactId, proof: i.proof, actor: ctx.actor });
    return { intoContactId: i.intoContactId, unmergeUntil: r.unmergeUntil };
  },
  'cake.contact.unmerge': (ctx, i) => unmergeContact(deps(ctx), { contactId: i.contactId, actor: ctx.actor }),
};
