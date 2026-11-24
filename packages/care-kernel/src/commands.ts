// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 08:49 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lệnh ghi của nhân viên đi qua SỔ (R-CAKE-LEDGER-1/2): gắn / gỡ nhãn ⇒ mỗi nhãn THỰC SỰ đổi một dòng kind=tag
//   (nhãn hiện trên màn là dẫn xuất của sổ, computeState đã tính); giao hội thoại ⇒ cột vận hành + một dòng kind=assign. Mỗi lệnh một sự việc nguồn user:<actor>.
import { KernelError } from './errors.js';
import { refreshState } from './state.js';
import type { KernelDeps } from './types.js';

export async function tagContact(deps: KernelDeps, input: { conversationId: string; add: string[]; remove: string[]; actor: string }) {
  const { repo, now, newId } = deps;
  return repo.tx(async () => {
    const conv = await repo.getConversation(input.conversationId);
    if (!conv) throw new KernelError('NOT_FOUND', 'Không tìm thấy hội thoại.');
    const before = new Set((await repo.getState(conv.contactId))?.tags ?? []);
    const changes = [
      ...input.add.filter((t) => t && !before.has(t)).map((tag) => ({ tag, op: 'add' as const })),
      ...input.remove.filter((t) => before.has(t)).map((tag) => ({ tag, op: 'remove' as const })),
    ];
    if (changes.length) {
      const at = now();
      const event = { eventId: newId('event'), source: `user:${input.actor}`, docKey: `tag|${conv.conversationId}|${at}`, version: 1, type: 'contact.tagged', payload: input, receivedAt: at, actor: input.actor };
      await repo.insertEvent(event);
      for (const ch of changes) {
        await repo.appendLedger({ eventId: event.eventId, contactId: conv.contactId, conversationId: conv.conversationId, channelAccountId: conv.channelAccountId, channel: null,
          kind: 'tag', direction: 'none', qty: 1, isReversal: false, reversesId: null, dims: { ...ch, by: input.actor }, at });
      }
      await refreshState(repo, conv.contactId);
    }
    return { tags: (await repo.getState(conv.contactId))?.tags ?? [...before] };
  });
}

export async function assignConversation(deps: KernelDeps, input: { conversationId: string; userId: string | null; actor: string }) {
  const { repo, now, newId } = deps;
  return repo.tx(async () => {
    const conv = await repo.getConversation(input.conversationId);
    if (!conv) throw new KernelError('NOT_FOUND', 'Không tìm thấy hội thoại.');
    if ((conv.assigneeUserId ?? null) === input.userId) return { ok: true as const };
    const at = now();
    const event = { eventId: newId('event'), source: `user:${input.actor}`, docKey: `assign|${conv.conversationId}|${at}`, version: 1, type: 'conversation.assigned', payload: input, receivedAt: at, actor: input.actor };
    await repo.insertEvent(event);
    await repo.upsertConversation({ ...conv, assigneeUserId: input.userId });
    await repo.appendLedger({ eventId: event.eventId, contactId: conv.contactId, conversationId: conv.conversationId, channelAccountId: conv.channelAccountId, channel: null,
      kind: 'assign', direction: 'none', qty: 1, isReversal: false, reversesId: null, dims: { from: conv.assigneeUserId ?? null, to: input.userId, by: input.actor }, at });
    return { ok: true as const };
  });
}
