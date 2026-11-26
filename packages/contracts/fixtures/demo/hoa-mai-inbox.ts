// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer fixtures
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-7: hội thoại, tin, dòng thời gian của bộ mẫu "Shop Hoa Mai" (GIẢ LẬP).
import type { z } from 'zod';
import type { ConversationSchema, MessageSchema, TimelineItemSchema } from '../../src/index.js';
import { contacts, fid } from './hoa-mai-people.js';

type Conversation = z.input<typeof ConversationSchema>;
type Message = z.input<typeof MessageSchema>;
type TimelineItem = z.input<typeof TimelineItemSchema>;

const at = (hhmm: string, day = '24') => `2026-11-${day}T${hhmm}:00+07:00`;
type C = [n: number, account: number, contact: number, kind: Conversation['kind'], title: string, last: string, time: string, unread: number, tags: string[], dir: 'in' | 'out'];
const rows: C[] = [
  [1, 1, 1, 'dm', 'Chị Hương (váy hoa)', 'Dạ chị chuyển khoản rồi nhé, em check giúp chị', '10:28', 0, ['Khách VIP', 'Đặt hàng'], 'in'],
  [2, 3, 2, 'dm', 'Anh Khoa - sỉ HN', 'Anh lấy 20 bộ, báo giá sỉ giúp anh nha', '10:16', 2, ['Khách sỉ'], 'in'],
  [3, 1, 3, 'dm', 'Lê Thảo Vy', '[Hình ảnh]', '10:03', 1, ['Đặt hàng'], 'in'],
  [4, 2, 5, 'dm', 'Quỳnh Chi (phụ kiện)', 'Lấy 2 cái có freeship không shop?', '09:42', 0, ['Khách VIP'], 'out'],
  [5, 4, 1, 'dm', 'Chị Hương (váy hoa)', 'Còn hàng không shop?', '08:00', 1, ['Khách VIP'], 'in'],
  [6, 4, 1, 'comment_thread', 'Bình luận: Váy hoa Thu – Đông', 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!', '07:45', 0, [], 'out'],
  [7, 1, 4, 'dm', 'Phạm Gia Bảo', 'File: Bao-gia-si-T10.pdf', '08:20', 0, ['Chờ phản hồi'], 'out'],
  [8, 2, 6, 'dm', 'Võ Thanh Tùng', 'Mẫu này còn size 42 không ạ?', '07:20', 0, [], 'out'],
  [9, 1, 7, 'dm', 'Hoàng Mỹ Linh', 'Cảm ơn shop, váy đẹp lắm ạ', '05:30', 0, ['Đặt hàng'], 'out'],
  // [2026-11-26 08:35 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — nhóm Zalo (mockup ⑥): tên / số thành viên theo kênh
  [10, 1, 3, 'group_thread', 'Hội yêu váy hoa', 'Shop gửi nhầm link, mọi người bỏ qua nhé', '10:40', 3, [], 'out'],
];

export const conversations: Conversation[] = rows.map(([n, a, c, kind, title, last, time, unread, tags, dir]) => ({
  conversationId: fid('V', n), channelAccountId: fid('A', a), externalThreadId: `t_${n}`, contactId: contacts[c - 1]!.contactId,
  kind, anchor: kind === 'comment_thread' ? { postId: 'p_555', commentId: 'c_777' } : null, title, lastText: last, lastAt: at(time),
  lastDirection: dir, unread, tags, assigneeUserId: n === 1 ? '7' : null, windowUntil: a === 4 ? '2026-11-25T08:00:00+07:00' : null, pinned: n === 1,
  ...(kind === 'group_thread' ? { avatarRef: null, memberCount: 248 } : {}),
}));

type Mm = [out: boolean, time: string, text: string, extra?: Partial<Message>];
const thread1: Mm[] = [
  [true, '09:14', 'Dạ còn chị ơi! Mẫu này shop có 3 màu: hồng, xanh mint và vàng ạ'],
  [true, '09:14', '', { attachments: [{ type: 'image', ref: 'demo://vay-hoa-3-mau.png', name: 'Váy hoa Thu – Đông · 3 màu' }] }],
  [false, '09:18', 'Chị lấy 2 cái màu hồng size M nhé. Có freeship không em?', { reaction: '♥' }],
  [true, '09:19', 'Đơn từ 2 sản phẩm shop freeship toàn quốc luôn ạ. Tổng 2 váy là 780.000đ, chị gửi giúp em địa chỉ nhận hàng nhé!', { reaction: '👍' }],
  [false, '09:22', '12 Nguyễn Trãi, P. Bến Thành, Q.1, TP.HCM — 0912 345 671'],
  [true, '09:24', '', { attachments: [{ type: 'file', ref: 'demo://Hoa-don-HM1024.pdf', name: 'Hoa-don-HM1024.pdf', size: 182129 }] }],
  [false, '10:28', 'Dạ chị chuyển khoản rồi nhé, em check giúp chị'],
];

const one = (conv: number, n: number, out: boolean, time: string, text: string): Message => ({
  messageId: fid('M', n), conversationId: fid('V', conv), direction: out ? 'out' : 'in', text, attachments: [], at: at(time),
  e2ee: false, delivery: out ? 'sent' : null, reaction: null, sentByUserId: out ? '7' : null,
});

const who = (c: number) => ({ contactId: contacts[c - 1]!.contactId, name: contacts[c - 1]!.displayName, avatarRef: null });
export const messagesByConversation: Record<string, Message[]> = {
  // [2026-11-26 08:35 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — nhóm: người gửi từng tin, @nhắc, trích dẫn, tin đã thu hồi (mockup ⑥)
  [fid('V', 10)]: [
    { ...one(10, 101, false, '10:32', '@Shop Hoa Mai còn váy hoa size S không ạ? Màu hồng nha'), sender: who(3), mentions: [{ externalId: 'shop', pos: 0, len: 13 }], reaction: '❤️ 3' },
    { ...one(10, 102, true, '10:34', 'Dạ còn 2 cái size S màu hồng ạ, chị inbox shop để giữ hàng nhé 🌸'), quote: { externalMessageId: 'm_101', senderExternalId: null, text: '@Shop Hoa Mai còn váy hoa size S không ạ? Màu hồng nha' }, delivery: 'read' },
    { ...one(10, 103, false, '10:36', ''), sender: who(2), revokedAt: at('10:37') },
    one(10, 104, true, '10:40', 'Shop gửi nhầm link, mọi người bỏ qua nhé'),
  ],
  // Ca vàng G1–G4: bình luận dưới bài → shop trả lời riêng → khách nhắn Fanpage (thread mở từ trả lời riêng)
  [fid('V', 6)]: [one(6, 61, false, '07:40', 'Váy hoa này giá sao shop?'), one(6, 62, true, '07:45', 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!')],
  [fid('V', 5)]: [one(5, 51, true, '07:45', 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!'), one(5, 52, false, '08:00', 'Còn hàng không shop?')],
  [fid('V', 1)]: thread1.map(([out, time, text, extra], i) => ({
    messageId: fid('M', i + 1), conversationId: fid('V', 1), direction: out ? 'out' : 'in', text, attachments: [], at: at(time),
    e2ee: false, delivery: out ? 'sent' : null, reaction: null, sentByUserId: out ? '7' : null, ...extra,
  })),
};

/** Dòng thời gian Contact 360 của Chị Hương: một người, bốn mặt, một contact_id. */
const t = (n: number, kind: TimelineItem['kind'], channel: TimelineItem['channel'], acc: number | null, conv: number | null, dir: TimelineItem['direction'], summary: string, time: string, docRef: string | null = null): TimelineItem => ({
  touchId: String(88100 + n), contactId: contacts[0]!.contactId, kind, channel, channelAccountId: acc ? fid('A', acc) : null,
  conversationId: conv ? fid('V', conv) : null, direction: dir, summary, docRef, isReversal: false, at: at(time),
});
export const timelineHuong: TimelineItem[] = [
  t(1, 'comment', 'facebook_comment', 4, 6, 'in', 'Bình luận dưới bài "Váy hoa Thu – Đông": hỏi giá', '07:40'),
  t(2, 'comment', 'facebook_comment', 4, 6, 'out', 'Shop trả lời riêng (private reply)', '07:45'),
  t(3, 'identity', 'facebook_page', 4, 5, 'none', 'Ghép Messenger Page vào khách — bằng chứng: trả lời riêng', '08:00'),
  t(4, 'message', 'facebook_page', 4, 5, 'in', 'Nhắn Fanpage: hỏi còn hàng', '08:00'),
  t(5, 'message', 'zalo_personal', 1, 1, 'in', 'Nhắn Zalo: chốt 2 váy hồng size M', '09:18'),
  t(6, 'tag', null, null, 1, 'none', 'Gắn nhãn "Đặt hàng"', '09:20'),
  t(7, 'document', null, null, 1, 'none', 'Tạo yêu cầu đặt hàng YC-0001 (780.000đ)', '09:23', 'cake.order_request:1'),
  t(8, 'message', 'zalo_personal', 1, 1, 'in', 'Báo đã chuyển khoản', '10:28'),
];
