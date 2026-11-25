// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — nhân viên gửi tin (contracts/BIZCITY-CHANNEL-COMMAND-v1):
//   một sự việc nguồn user:<actor> + MỘT dòng sổ kind=message direction=out (lượt chạm tính lúc nhân viên bấm gửi, không đợi kênh) + tin với
//   external_message_id = khoá lệnh `cake:<touch_id>:send:1` và delivery = accepted ("đang gửi"). Khi Cell báo delivery.updated (hints.commandKey)
//   submitTouchIn tìm lại đúng tin này, đổi trạng thái + gắn mã tin thật — KHÔNG thêm dòng sổ.
import { KernelError } from './errors.js';
import { refreshState } from './state.js';
import type { ConversationRow, KernelDeps } from './types.js';

export type SendResult = { messageId: string; touchId: number; commandKey: string; at: string; conversation: ConversationRow };

export async function requestSend(deps: KernelDeps, input: { conversationId: string; text: string; operation?: 'send' | 'reply' | 'private_reply'; actor: string; userId: string | null }): Promise<SendResult> {
  const { repo, now, newId } = deps;
  return repo.tx(async () => {
    const conv = await repo.getConversation(input.conversationId);
    if (!conv) throw new KernelError('NOT_FOUND', 'Không tìm thấy hội thoại.');
    const at = now();
    const messageId = newId('message');
    const op = input.operation ?? 'send';
    const event = { eventId: newId('event'), source: `user:${input.actor}`, docKey: `${op}|${conv.conversationId}|${messageId}`, version: 1, type: 'message.requested', payload: { conversationId: conv.conversationId, messageId }, receivedAt: at, actor: input.actor };
    await repo.insertEvent(event);
    const row = await repo.appendLedger({ eventId: event.eventId, contactId: conv.contactId, conversationId: conv.conversationId, channelAccountId: conv.channelAccountId, channel: null,
      kind: conv.kind === 'comment_thread' ? 'comment' : 'message', direction: 'out', qty: 1, isReversal: false, reversesId: null, dims: { type: 'message.requested', by: input.actor }, at });
    const commandKey = `cake:${row.touchId}:${op}:1`;
    await repo.upsertMessage({ messageId, touchId: row.touchId, conversationId: conv.conversationId, externalMessageId: commandKey, direction: 'out', text: input.text, e2ee: false, delivery: 'accepted', at, sentBy: input.userId });
    await repo.upsertConversation({ ...conv, lastAt: at, lastDirection: 'out' });
    await refreshState(repo, conv.contactId);
    return { messageId, touchId: row.touchId, commandKey, at, conversation: conv };
  });
}

/** Thứ bậc trạng thái giao: tin báo muộn không kéo lùi (đã đọc rồi mới tới "đã gửi" ⇒ giữ "đã đọc"). */
const RANK: Record<string, number> = { accepted: 0, unknown: 1, failed: 2, sent: 3, delivered: 4, read: 5 };
export const deliveryAdvances = (from: string | null, to: string) => (RANK[to] ?? 0) > (from === null ? -1 : (RANK[from] ?? 0));
