// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: handler giả lập cho kênh + hộp thư — làm đúng luật hợp đồng để giao diện gặp đúng lỗi
//   sẽ gặp ở máy chủ thật (CAKE_CHANNEL_NOT_CONNECTED, CAKE_WINDOW_CLOSED); không thay được máy chủ, chỉ thay được dữ liệu.
import { ApiError } from '../client.js';
import { byTimeDesc, iso, nextId, paged, type Store } from './store.js';

/** Nhân viên mẫu (GIẢ LẬP) cho màn giao tài khoản kênh. */
const STAFF = [{ userId: '1', name: 'Chủ shop', role: 'owner' }, { userId: '2', name: 'Lan (chăm sóc khách)', role: 'agent' }, { userId: '3', name: 'Minh (bán hàng)', role: 'agent' }];

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
const NEXT_STEP = { zalo_personal: 'qr', zalo_oa: 'oauth', facebook_page: 'choose_page', facebook_personal: 'approve_on_device', facebook_group: 'choose_group' } as const;

const conv = (s: Store, id: string) => {
  const c = s.conversations.find((x) => x.conversationId === id);
  if (!c) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy hội thoại.', hint: 'Hội thoại có thể đã bị ghép sang khách khác.' });
  return c;
};
const accountOf = (s: Store, channelAccountId: string) => s.accounts.find((a) => a.channelAccountId === channelAccountId)!;

/** Phân trang con trỏ đơn giản: con trỏ = vị trí. */
export const sliceCursor = <T,>(xs: T[], input: Any) => {
  const start = input.cursor ? Number(input.cursor) : 0;
  const end = start + (input.limit ?? 50);
  return paged(xs.slice(start, end), { nextCursor: end < xs.length ? String(end) : null });
};

function appendOut(s: Store, conversationId: string, text: string, attachments: Store['messages'][string][number]['attachments'], kind: 'message' | 'comment') {
  const c = conv(s, conversationId);
  const acc = accountOf(s, c.channelAccountId);
  if (acc.status !== 'connected') throw ApiError.reason('CAKE_CHANNEL_NOT_CONNECTED');
  if (c.windowUntil && new Date(c.windowUntil) < s.now()) throw ApiError.reason('CAKE_WINDOW_CLOSED');
  const at = iso(s.now());
  const m = { messageId: nextId(s, 'M'), conversationId, direction: 'out' as const, text, attachments, at, e2ee: false, delivery: 'accepted' as const, reaction: null, sentByUserId: '7' };
  (s.messages[conversationId] ??= []).push(m);
  Object.assign(c, { lastText: text || '[Tệp đính kèm]', lastAt: at, lastDirection: 'out', unread: 0 });
  (s.timeline[c.contactId] ??= []).push({ touchId: String(++s.seq), contactId: c.contactId, kind, channel: acc.channel, channelAccountId: acc.channelAccountId, conversationId, direction: 'out', summary: text.slice(0, 80) || 'Gửi tệp', docRef: null, isReversal: false, at });
  const st = s.states[c.contactId];
  if (st) Object.assign(st, { lastOutAt: at, unanswered: false });
  return m;
}

export const inboxHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.channel.list': (s) => s.accounts,
  // [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh trên nhân viên mẫu GIẢ LẬP.
  'cake.channel.members': (s, i) => (s.members[i.channelAccountId] ?? []).map((id) => STAFF.find((x) => x.userId === id)!),
  'cake.channel.members_set': (s, i) => {
    const bad = i.userIds.filter((id: string) => !STAFF.some((x) => x.userId === id));
    if (bad.length) throw new ApiError({ code: 'VALIDATION_ERROR', message: `Không có nhân viên ${bad.join(', ')}.`, field: 'userIds' });
    s.members[i.channelAccountId] = [...new Set<string>(i.userIds)];
    return s.members[i.channelAccountId]!.map((id) => STAFF.find((x) => x.userId === id)!);
  },
  'cake.channel.connect_start': (s, i) => ({ flowId: `flow-${++s.seq}`, nextStep: NEXT_STEP[i.channel as keyof typeof NEXT_STEP], qrRef: i.channel === 'zalo_personal' ? 'demo://qr' : null }),
  'cake.channel.test': (s, i) => {
    const a = s.accounts.find((x) => x.channelAccountId === i.channelAccountId);
    if (!a) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy tài khoản kênh.' });
    if (a.status !== 'connected') throw ApiError.reason('CAKE_CHANNEL_NOT_CONNECTED');
    a.testedAt = iso(s.now());
    return { testedAt: a.testedAt, twoWay: true };
  },
  'cake.conversation.list': (s, i) => {
    let xs = s.conversations.filter((c) => !i.channelAccountId || c.channelAccountId === i.channelAccountId);
    if (i.filter === 'unread') xs = xs.filter((c) => c.unread > 0);
    if (i.filter === 'mine') xs = xs.filter((c) => c.assigneeUserId === '7');
    if (i.filter === 'unanswered') xs = xs.filter((c) => c.lastDirection === 'in');
    if (i.tag) xs = xs.filter((c) => c.tags.includes(i.tag));
    if (i.q) xs = xs.filter((c) => c.title.toLowerCase().includes(String(i.q).toLowerCase()));
    xs = [...xs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || byTimeDesc(a.lastAt, b.lastAt));
    return sliceCursor(xs, i);
  },
  'cake.message.list': (s, i) => {
    const c = conv(s, i.conversationId);
    c.unread = 0;
    return sliceCursor(s.messages[i.conversationId] ?? [], i);
  },
  'cake.message.send': (s, i) => appendOut(s, i.conversationId, i.text, i.attachments, 'message'),
  'cake.message.draft': (s, i) => ({ draftId: `draft-${++s.seq}`, text: i.text }),
  'cake.comment.reply': (s, i) => {
    const c = conv(s, i.conversationId);
    if (c.kind !== 'comment_thread') throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Hội thoại này không phải bình luận.', field: 'conversationId' });
    return appendOut(s, i.conversationId, i.text, [], 'comment');
  },
  'cake.conversation.assign': (s, i) => { conv(s, i.conversationId).assigneeUserId = i.userId; return { ok: true }; },
  'cake.conversation.tag': (s, i) => {
    const c = conv(s, i.conversationId);
    c.tags = [...new Set([...c.tags.filter((t) => !i.remove.includes(t)), ...i.add])];
    const st = s.states[c.contactId];
    if (st) st.tags = [...new Set([...st.tags.filter((t) => !i.remove.includes(t)), ...i.add])];
    return { tags: c.tags };
  },
};
