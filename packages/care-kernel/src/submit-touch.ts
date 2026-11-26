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
import { deliveryAdvances } from './send.js';

export type SubmitResult = { status: 'accepted' | 'unchanged'; touchId: number | null; contactId: string | null; resolved?: ResolveResult['how'] };

const KIND: Record<string, string | null> = {
  'message.received': 'message', 'message.sent': 'message', 'delivery.updated': 'message',
  'comment.received': 'comment', 'comment.replied': 'comment', 'reaction.added': 'reaction',
  'account.status': null, 'history.sync.completed': null, 'profile.updated': null, 'thread.updated': null,
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
      // báo giao (v2 của cùng tin) không thay nội dung lượt chạm ⇒ không đảo dòng sổ của v1
      // [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — thu hồi cũng không thay lượt chạm (khách đã nhắn thật) ⇒ không đảo; chỉ xoá nội dung tin
      if (t.type !== 'delivery.updated' && t.content.type !== 'revoked') for (const r of effectiveRows(await repo.ledgerByEvent(prev.eventId))) {
        await repo.appendLedger({ ...r, qty: -1, isReversal: true, reversesId: r.touchId, at, dims: { ...r.dims, reason: 'version' } });
      }
      await repo.replaceEvent(event);
    } else await repo.insertEvent(event);

    // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — delivery.updated KHÔNG phải lượt chạm mới: chỉ đổi trạng thái giao của tin đã có
    //   (tin Cake gửi tìm theo hints.commandKey, tin khác theo mã tin) — trước đây mỗi báo giao cộng thêm một dòng sổ.
    if (t.type === 'delivery.updated') return applyDelivery(deps, t);
    // [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — hồ sơ / nhóm / thu hồi: cập nhật dữ liệu đọc, KHÔNG thêm dòng sổ
    if (t.type === 'profile.updated') return applyProfile(deps, t, event.eventId);
    if (t.type === 'thread.updated') return applyThreadInfo(deps, t);
    if (t.content.type === 'revoked') return applyRevoke(deps, t);

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
      await syncProfile(deps, t, contactId); // tên + ảnh người gửi theo kênh (KN-CAP)
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
      ...(t.thread.info ? { title: t.thread.info.name, avatarRef: t.thread.info.avatarRef, memberCount: t.thread.info.memberCount } : {}),
      windowUntil: t.channel === 'facebook_page' && dir === 'in' ? new Date(Date.parse(t.occurredAt) + PAGE_WINDOW_MS).toISOString() : conv.windowUntil,
    });

    // Tin ra đã có (Cake gửi rồi Cell báo lại, hoặc Cell gửi lại cùng mã) ⇒ không đếm lần hai, chỉ cập nhật trạng thái.
    if (dir === 'out' && conv0) {
      const mine = await findOwn(deps, conv0.conversationId, t);
      if (mine) return { status: 'accepted', touchId: mine.touchId, contactId };
    }

    const row: LedgerRow = await repo.appendLedger({
      eventId: event.eventId, contactId, conversationId: conv.conversationId, channelAccountId: account.channelAccountId, channel: t.channel,
      kind, direction: dir, qty: 1, isReversal: false, reversesId: null, dims: { backfill: t.history.backfill, type: t.type }, at: t.occurredAt,
    });

    const extId = t.docKey.split('|')[3]!;
    const old = await repo.findMessage(conv.conversationId, extId);
    await repo.upsertMessage({
      messageId: old?.messageId ?? newId('message'), touchId: row.touchId, conversationId: conv.conversationId, externalMessageId: extId, direction: dir,
      text: t.content.text ?? old?.text ?? '', e2ee: t.encryption.e2ee, delivery: t.delivery?.status ?? old?.delivery ?? (dir === 'out' ? 'sent' : null), at: old?.at ?? t.occurredAt,
      quote: t.content.quote ?? old?.quote ?? null, mentions: t.content.mentions ?? old?.mentions ?? [], revokedAt: old?.revokedAt ?? null,
    });

    await refreshState(repo, contactId);
    return { status: 'accepted', touchId: row.touchId, contactId, resolved: how };
  });
}

const extOf = (t: Touch) => t.docKey.split('|')[3]!;

/** [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — tên + ảnh người gửi theo kênh: đổi danh tính; đổi tên khách chỉ khi tên đang theo kênh (nhân viên chưa sửa tay). */
async function syncProfile({ repo }: KernelDeps, t: Touch, contactId: string) {
  if (!t.sender) return;
  const idn = await repo.findIdentity(t.channel, t.sender.scope, t.sender.externalId);
  if (!idn) return;
  const name = t.sender.displayName?.trim() || null;
  const patch: { displayName?: string | null; avatarRef?: string | null } = {};
  if (name && name !== idn.displayName) patch.displayName = name;
  if (t.sender.avatarRef !== null && t.sender.avatarRef !== undefined && t.sender.avatarRef !== (idn.avatarRef ?? null)) patch.avatarRef = t.sender.avatarRef;
  if (Object.keys(patch).length) await repo.updateIdentityProfile(idn.identityId, patch);
  if (patch.displayName) {
    const c = await repo.getContact(contactId);
    if (c && (c.nameSource ?? 'channel') === 'channel' && c.displayName !== name) await repo.updateContact(contactId, { displayName: name! });
  }
}

/** profile.updated — người đổi tên / ảnh; đồng bộ danh bạ (backfill) tạo khách `asserted` cho người chưa từng nhắn (KN-CAP-4/5). */
async function applyProfile(deps: KernelDeps, t: Touch, eventId: string): Promise<SubmitResult> {
  const { repo } = deps;
  if (!t.sender) return { status: 'accepted', touchId: null, contactId: null };
  const account = await repo.findAccount(t.channelAccount.externalAccountId, t.channelAccount.kind);
  if (!account) throw new KernelError('NOT_FOUND', 'Không tìm thấy tài khoản kênh của sự việc này.', 'CAKE_CHANNEL_NOT_CONNECTED', 'Kết nối tài khoản kênh trước khi nhận tin.');
  const idn = await repo.findIdentity(t.channel, t.sender.scope, t.sender.externalId);
  let contactId = idn?.contactId ?? null;
  if (!idn) {
    if (!t.history.backfill) return { status: 'accepted', touchId: null, contactId: null }; // người lạ đổi hồ sơ ⇒ bỏ qua
    const r = await resolveIdentity(deps, {
      channel: t.channel, scope: t.sender.scope, externalId: t.sender.externalId, displayName: t.sender.displayName,
      account, hints: { phone: t.hints.phone, email: t.hints.email, privateReplyOf: null }, eventId,
    });
    contactId = r.contactId;
  }
  await syncProfile(deps, t, contactId!);
  return { status: 'accepted', touchId: null, contactId };
}

/** thread.updated — tên / ảnh / số thành viên nhóm. Hội thoại chưa có (nhóm chưa ai nhắn) ⇒ bỏ qua; tin nhóm sau mang thread.info. */
async function applyThreadInfo({ repo }: KernelDeps, t: Touch): Promise<SubmitResult> {
  const account = await repo.findAccount(t.channelAccount.externalAccountId, t.channelAccount.kind);
  const conv = account ? await repo.findConversation(account.channelAccountId, t.thread.externalThreadId) : undefined;
  if (conv && t.thread.info) await repo.upsertConversation({ ...conv, title: t.thread.info.name, avatarRef: t.thread.info.avatarRef, memberCount: t.thread.info.memberCount });
  return { status: 'accepted', touchId: null, contactId: conv?.contactId ?? null };
}

/** Thu hồi (version ≥ 2, content.type = revoked): xoá nội dung + trích dẫn của tin, ghi giờ thu hồi; sổ chạm khách giữ nguyên. */
async function applyRevoke({ repo }: KernelDeps, t: Touch): Promise<SubmitResult> {
  const account = await repo.findAccount(t.channelAccount.externalAccountId, t.channelAccount.kind);
  const conv = account ? await repo.findConversation(account.channelAccountId, t.thread.externalThreadId) : undefined;
  const m = conv ? await repo.findMessage(conv.conversationId, extOf(t)) : undefined;
  if (m && !m.revokedAt) await repo.upsertMessage({ ...m, text: '', quote: null, mentions: [], revokedAt: t.occurredAt });
  return { status: 'accepted', touchId: m?.touchId ?? null, contactId: conv?.contactId ?? null };
}

/** Tin ra của chính hội thoại này mà sự việc đang nói tới: theo khoá lệnh Cake (hints.commandKey) rồi theo mã tin của kênh. Có thì đổi trạng thái + gắn mã thật. */
async function findOwn({ repo }: KernelDeps, conversationId: string, t: Touch) {
  const key = t.hints.commandKey ?? null;
  const realExt = t.delivery?.externalMessageId ?? extOf(t);
  const m = (key ? await repo.findMessage(conversationId, key) : undefined) ?? (await repo.findMessage(conversationId, realExt));
  if (!m) return undefined;
  const status = t.delivery?.status ?? (t.type === 'message.sent' ? 'sent' : null);
  const attach = m.externalMessageId.startsWith('cake:') && !realExt.startsWith('cake:') ? realExt : undefined;
  if ((status && deliveryAdvances(m.delivery, status)) || attach) await repo.setDelivery(m.messageId, status && deliveryAdvances(m.delivery, status) ? status : (m.delivery ?? 'sent'), attach);
  return m;
}

async function applyDelivery(deps: KernelDeps, t: Touch): Promise<SubmitResult> {
  const account = await deps.repo.findAccount(t.channelAccount.externalAccountId, t.channelAccount.kind);
  const conv = account ? await deps.repo.findConversation(account.channelAccountId, t.thread.externalThreadId) : undefined;
  const m = conv ? await findOwn(deps, conv.conversationId, t) : undefined;
  return { status: 'accepted', touchId: m?.touchId ?? null, contactId: m && conv ? conv.contactId : null };
}
