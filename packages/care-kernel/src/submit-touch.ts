// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-2: MỘT CỬA submitTouchIn (R-CAKE-EVENT-1, chép thuật toán postDocumentIn của open-ketoan):
//   khoá (source, doc_key) → cùng version ⇒ unchanged · cũ hơn ⇒ CAKE_TOUCH_VERSION_STALE · mới hơn ⇒ lưu bản cũ + đảo dòng sổ cũ rồi ghi.
//   Mỗi phiên bản được nhận sinh đúng MỘT dòng sổ (trừ account.status / history.sync.completed). Toàn bộ trong một giao dịch.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — bất đồng bộ theo cổng CareRepo mới; thuật toán giữ nguyên.
import { TouchSchema, type Touch } from '@open-cake/contracts';
import { KernelError } from './errors.js';
import { resolveIdentity, type ResolveResult } from './identity.js';
import { effectiveRows, refreshState } from './state.js';
import type { ConversationRow, KernelDeps, LedgerRow } from './types.js';

export type SubmitResult = { status: 'accepted' | 'unchanged'; touchId: number | null; contactId: string | null; resolved?: ResolveResult['how'] };

const KIND: Record<string, string | null> = {
  'message.received': 'message', 'message.sent': 'message', 'delivery.updated': 'message',
  'comment.received': 'comment', 'comment.replied': 'comment', 'reaction.added': 'reaction',
  'account.status': null, 'history.sync.completed': null,
};
const PAGE_WINDOW_MS = 24 * 3600_000;

export async function submitTouchIn(deps: KernelDeps, raw: unknown): Promise<SubmitResult> {
  const t: Touch = TouchSchema.parse(raw); // kiểm khuôn ở cửa (R-OC-EVENT-4) — sai khuôn không lưu gì
  const { repo, now, newId } = deps;
  return repo.tx(async (): Promise<SubmitResult> => {
    const prev = await repo.findEvent(t.source, t.docKey);
    if (prev && t.version === prev.version) {
      const row = effectiveRows(await repo.ledgerByEvent(prev.eventId))[0] ?? null;
      return { status: 'unchanged', touchId: row?.touchId ?? null, contactId: row?.contactId ?? null };
    }
    if (prev && t.version < prev.version) throw KernelError.of('CAKE_TOUCH_VERSION_STALE');

    const at = now();
    const event = { eventId: prev?.eventId ?? newId('event'), source: t.source, docKey: t.docKey, version: t.version, type: t.type, payload: t, receivedAt: at, actor: `service:hub via ${t.source}` };
    if (prev) {
      await repo.archiveEventVersion(prev);
      for (const r of effectiveRows(await repo.ledgerByEvent(prev.eventId))) {
        await repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId, at, dims: { ...r.dims, reason: 'version' } });
      }
      await repo.replaceEvent(event);
    } else await repo.insertEvent(event);

    const kind = KIND[t.type] ?? null;
    if (!kind || !t.sender) return { status: 'accepted', touchId: null, contactId: null };

    const account = (await repo.findAccount(t.channelAccount.externalAccountId, t.channelAccount.kind)) ?? null;
    if (!account) throw new KernelError('NOT_FOUND', 'Không tìm thấy tài khoản kênh của sự việc này.', 'CAKE_CHANNEL_NOT_CONNECTED', 'Kết nối tài khoản kênh trước khi nhận tin.');

    // Tin do shop gửi (outbound): người gửi là tài khoản shop ⇒ khách là chủ hội thoại, không tạo danh tính cho shop.
    const conv0 = await repo.findConversation(account.channelAccountId, t.thread.externalThreadId);
    let contactId: string, how: ResolveResult['how'] | undefined;
    if (t.direction === 'outbound') {
      if (!conv0) throw new KernelError('CONFLICT', 'Tin ra cho hội thoại chưa có.', undefined, 'Hội thoại phải bắt đầu từ một tin / bình luận của khách.');
      contactId = conv0.contactId;
    } else {
      const r = await resolveIdentity(deps, {
        channel: t.channel, scope: t.sender.scope, externalId: t.sender.externalId, displayName: t.sender.displayName,
        account, hints: { phone: t.hints.phone, email: t.hints.email, privateReplyOf: t.hints.privateReplyOf }, eventId: event.eventId,
      });
      contactId = r.contactId; how = r.how;
    }

    const conv: ConversationRow = conv0 ?? {
      conversationId: newId('conversation'), channelAccountId: account.channelAccountId, externalThreadId: t.thread.externalThreadId, contactId,
      kind: t.thread.kind, anchor: t.thread.anchor, lastAt: null, lastDirection: null, windowUntil: null,
    };
    const dir = t.direction === 'inbound' ? 'in' : 'out';
    const isNewer = !conv.lastAt || Date.parse(t.occurredAt) >= Date.parse(conv.lastAt);
    await repo.upsertConversation({
      ...conv,
      lastAt: isNewer ? t.occurredAt : conv.lastAt, lastDirection: isNewer ? dir : conv.lastDirection,
      windowUntil: t.channel === 'facebook_page' && dir === 'in' ? new Date(Date.parse(t.occurredAt) + PAGE_WINDOW_MS).toISOString() : conv.windowUntil,
    });

    const row: LedgerRow = await repo.appendLedger({
      eventId: event.eventId, contactId, conversationId: conv.conversationId, channelAccountId: account.channelAccountId, channel: t.channel,
      kind, direction: dir, qty: 1, isReversal: false, reversesId: null, dims: { backfill: t.history.backfill, type: t.type }, at: t.occurredAt,
    });

    const extId = t.docKey.split('|')[3]!;
    const old = await repo.findMessage(conv.conversationId, extId);
    await repo.upsertMessage({
      messageId: old?.messageId ?? newId('message'), touchId: row.touchId, conversationId: conv.conversationId, externalMessageId: extId, direction: dir,
      text: t.content.text ?? old?.text ?? '', e2ee: t.encryption.e2ee, delivery: t.delivery?.status ?? old?.delivery ?? (dir === 'out' ? 'sent' : null), at: old?.at ?? t.occurredAt,
    });

    await refreshState(repo, contactId);
    return { status: 'accepted', touchId: row.touchId, contactId, resolved: how };
  });
}
