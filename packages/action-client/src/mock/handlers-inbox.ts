// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: handler giả lập cho kênh + hộp thư — làm đúng luật hợp đồng để giao diện gặp đúng lỗi
//   sẽ gặp ở máy chủ thật (CAKE_CHANNEL_NOT_CONNECTED, CAKE_WINDOW_CLOSED); không thay được máy chủ, chỉ thay được dữ liệu.
import * as demo from '@open-cake/contracts/demo';
import { ApiError } from '../client.js';
import { byTimeDesc, iso, nextId, paged, type Store } from './store.js';

/** Nhân viên mẫu (GIẢ LẬP) cho màn giao tài khoản kênh. */
const STAFF = [{ userId: '1', name: 'Chủ shop', role: 'owner' }, { userId: '2', name: 'Lan (chăm sóc khách)', role: 'agent' }, { userId: '3', name: 'Minh (bán hàng)', role: 'agent' }];
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — đã mở màn Nhân viên (s.staff) thì giao theo đúng danh sách đó, không lệch hai nguồn.
const people = (s: Store) => s.staff?.map(({ userId, name, role }) => ({ userId, name, role })) ?? STAFF;

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
const NEXT_STEP = { zalo_personal: 'qr', zalo_oa: 'oauth', facebook_page: 'choose_page', facebook_personal: 'approve_on_device', facebook_group: 'choose_group' } as const;

const conv = (s: Store, id: string) => {
  const c = s.conversations.find((x) => x.conversationId === id);
  if (!c) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy hội thoại.', hint: 'Hội thoại có thể đã bị ghép sang khách khác.' });
  return c;
};
const FLOWS = new Map<string, { label: string; polls: number; fbUid?: string }>();
const flow = (id: string) => {
  const f = FLOWS.get(id);
  if (!f) throw new ApiError({ code: 'NOT_FOUND', message: 'Không có phiên quét QR này — bấm Bắt đầu lại.' });
  return f;
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

type Link = { mode: 'hub' | 'self'; connectorUrl: string | null; keyPrefix: string | null; hasSecret: boolean; hubReady: boolean; lastOkAt: string | null; lastError: string | null; issued: null };
const link = (s: Store): Link => ((s as Store & { channelLink?: Link }).channelLink ??= { mode: 'self', connectorUrl: 'http://cake-connector:3901', keyPrefix: 'ckn.1.gia-lap…', hasSecret: true, hubReady: false, lastOkAt: null, lastError: null, issued: null });

export const inboxHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.channel.list': (s) => s.accounts,
  // [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh trên nhân viên mẫu GIẢ LẬP.
  'cake.channel.members': (s, i) => (s.members[i.channelAccountId] ?? []).map((id) => people(s).find((x) => x.userId === id)!),
  'cake.channel.members_set': (s, i) => {
    const bad = i.userIds.filter((id: string) => !people(s).some((x) => x.userId === id));
    if (bad.length) throw new ApiError({ code: 'VALIDATION_ERROR', message: `Không có nhân viên ${bad.join(', ')}.`, field: 'userIds' });
    s.members[i.channelAccountId] = [...new Set<string>(i.userIds)];
    return s.members[i.channelAccountId]!.map((id) => people(s).find((x) => x.userId === id)!);
  },
  'cake.channel.connect_start': (s, i) => {
    const flowId = i.flowId && FLOWS.has(i.flowId) ? i.flowId : `flow-${++s.seq}`;
    FLOWS.set(flowId, { label: i.label, polls: 0 });
    if (i.channel === 'facebook_personal') return { flowId, nextStep: NEXT_STEP.facebook_personal, qrRef: null };
    return { flowId, nextStep: NEXT_STEP[i.channel as keyof typeof NEXT_STEP], qrRef: i.channel === 'zalo_personal' ? 'demo://qr' : null };
  },
  // [2026-11-26 10:09 PM Johnny Chu - Chu Hoàng Anh] KN K7 — QR giả lập: mỗi lần hỏi tiến một nấc chờ quét → đã quét → xong; hoàn tất ⇒ thêm số vào danh sách.
  'cake.channel.connect_status': (_s, i) => {
    const f = flow(i.flowId);
    const status = (['waiting_scan', 'scanned', 'success'] as const)[Math.min(f.polls++, 2)];
    return { flowId: i.flowId, status, qrRef: status === 'waiting_scan' ? 'demo://qr' : null, error: null };
  },
  // [2026-11-26 10:41 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2 — Facebook giả lập: start ⇒ hỏi mã 2FA ⇒ submit mã "123456" ⇒ xong (mã khác ⇒ lỗi, mật khẩu "checkpoint" ⇒ Facebook kiểm tra). Không nhớ mật khẩu / mã.
  'cake.channel.fb_login': (_s, i) => {
    const f = flow(i.flowId);
    const view = (status: string, extra: Record<string, unknown> = {}) => ({ status, message: null, fields: null, uid: null, ...extra });
    if (i.action === 'cancel') { delete f.fbUid; return view('idle'); }
    if (i.action === 'wait') return view(f.fbUid ? 'success' : 'idle', { uid: f.fbUid ?? null });
    if (i.action === 'cookies') { f.fbUid = '100089000000001'; return view('success', { uid: f.fbUid }); }
    if (i.action === 'start') return i.password === 'checkpoint' ? view('checkpoint', { message: 'Facebook yêu cầu xác minh nick trên điện thoại / web.' })
      : view('need_code', { message: 'Nhập mã xác minh Facebook gửi cho bạn.', fields: [{ id: 'code', type: 'text', name: 'Mã xác minh', description: null, options: null }] });
    if (i.answers.code !== '123456') return view('need_code', { message: 'Mã chưa đúng — thử lại.', fields: [{ id: 'code', type: 'text', name: 'Mã xác minh', description: null, options: null }] });
    f.fbUid = '100089000000001';
    return view('success', { uid: f.fbUid });
  },
  'cake.channel.connect_finish': (s, i) => {
    const f = flow(i.flowId);
    const fb = f.fbUid !== undefined;
    if (fb ? !f.fbUid : f.polls < 3) throw ApiError.reason('CAKE_CHANNEL_NOT_CONNECTED');
    const externalAccountId = fb ? f.fbUid! : `zl_${i.flowId}`;
    let a = s.accounts.find((x) => x.externalAccountId === externalAccountId);
    if (!a) { a = { channelAccountId: demo.fid('A', ++s.seq), channel: fb ? 'facebook_personal' : 'zalo_personal', kind: 'personal', externalAccountId, label: f.label, ownerUserId: '7', status: 'connected', testedAt: null, unread: 0 }; s.accounts.push(a); }
    return { channelAccountId: a.channelAccountId, externalAccountId, label: a.label, status: 'connected' };
  },
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
    // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: như máy chủ — trang MỚI NHẤT trước, con trỏ lùi về tin cũ; trong trang xếp cũ → mới.
    const xs = s.messages[i.conversationId] ?? [];
    const end = i.cursor ? Number(i.cursor) : xs.length, from = Math.max(0, end - (i.limit ?? 50));
    return paged(xs.slice(from, end), { nextCursor: from > 0 ? String(from) : null });
  },
  'cake.message.send': (s, i) => appendOut(s, i.conversationId, i.text, i.attachments, 'message'),
  // [2026-11-26 08:46 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — giả lập không có kênh thật ⇒ áp ngay điều kênh sẽ báo lại (thu hồi / thả tim)
  'cake.message.revoke': (s, i) => {
    const m = Object.values(s.messages).flat().find((x) => x.messageId === i.messageId);
    if (!m) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy tin.' });
    if (m.direction !== 'out') throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Chỉ thu hồi được tin của shop.' });
    if (m.revokedAt) throw new ApiError({ code: 'CONFLICT', message: 'Tin đã được thu hồi.' });
    Object.assign(m, { revokedAt: iso(s.now()), text: '', quote: null, mentions: [] });
    return { commandKey: `cake:0:revoke:${++s.seq}`, state: 'accepted' };
  },
  'cake.message.react': (s, i) => {
    const m = Object.values(s.messages).flat().find((x) => x.messageId === i.messageId);
    if (!m) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy tin.' });
    m.reaction = i.reaction;
    return { commandKey: `cake:0:react:${++s.seq}`, state: 'accepted' };
  },
  // [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh; giả lập mặc định Tự cài (25-KET-NOI-KENH §4: Tự cài chạy sẵn sau khi cài)
  'cake.channel_link.get': (s) => link(s),
  'cake.channel_link.set': (s, i) => {
    const l = link(s);
    const issue = i.mode === 'self' && (i.rotate || !l.hasSecret);
    Object.assign(l, { mode: i.mode, connectorUrl: i.mode === 'self' ? i.connectorUrl : l.connectorUrl, ...(issue ? { keyPrefix: 'ckn.1.gia-lap…', hasSecret: true } : {}) });
    return { ...l, issued: issue ? { key: `ckn.1.gia-lap-${++s.seq}-0123456789abcdef`, secret: 'bi-mat-gia-lap-0123456789-0123456789-ab' } : null };
  },
  // [2026-11-27 11:21 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-4 — tải tệp giả lập: cùng giới hạn cỡ như máy chủ (ảnh 10 MB, tệp 25 MB); loại đoán theo đuôi (máy chủ thật đoán theo đầu tệp).
  'cake.file.upload': (s, i) => {
    const size = (i.data as Uint8Array).length, ext = String(i.name).split('.').pop()!.toLowerCase();
    const image = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    if (['exe', 'bat', 'cmd', 'js', 'msi', 'sh'].includes(ext)) throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Loại tệp không được gửi (tệp chạy được).', field: 'file' });
    if (size > (image ? 10 : 25) * 1024 * 1024) throw new ApiError({ code: 'VALIDATION_ERROR', message: `Vượt giới hạn ${image ? 10 : 25} MB.`, field: 'file' });
    return { fileId: demo.fid('M', ++s.seq), area: i.area, kind: image ? 'image' : 'file', contentType: image ? 'image/jpeg' : 'application/octet-stream', size, name: i.name, sha256: '0'.repeat(64), createdAt: iso(s.now()), deduped: false };
  },
  'cake.channel_link.test': (s) => Object.assign(link(s), { lastOkAt: iso(s.now()), lastError: null }),
  'cake.directory.sync': (s) => ({ commandKey: `cake:0:directory_sync:${++s.seq}`, state: 'accepted' }),
  'cake.contact.find': (s) => ({ commandKey: `cake:0:contact_find:${++s.seq}`, state: 'accepted' }),
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
