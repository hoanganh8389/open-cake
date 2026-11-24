// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: kho trong bộ nhớ của bộ giả lập, nạp từ bộ mẫu "Shop Hoa Mai" (GIẢ LẬP).
//   Thêm một khách "Hương Nguyễn" đến từ Facebook cá nhân để màn Contact 360 diễn được ca vàng G5 (gợi ý cùng người ⇒ Ghép có bằng chứng).
import type { z } from 'zod';
import type { ContactLink, ContactSchema, ContactStateSchema, ConversationSchema, IdentitySchema, MessageSchema, TimelineItemSchema, ChannelAccountSchema } from '@open-cake/contracts';
import * as demo from '@open-cake/contracts/demo';

type In<S extends z.ZodTypeAny> = z.input<S>;
export type Store = {
  accounts: In<typeof ChannelAccountSchema>[];
  contacts: In<typeof ContactSchema>[];
  states: Record<string, In<typeof ContactStateSchema>>;
  meta: Record<string, Record<string, string>>;
  identities: In<typeof IdentitySchema>[];
  links: Record<string, ContactLink[]>;
  conversations: In<typeof ConversationSchema>[];
  messages: Record<string, In<typeof MessageSchema>[]>;
  timeline: Record<string, In<typeof TimelineItemSchema>[]>;
  merges: Record<string, { into: string; until: string; moved: { identities: string[]; conversations: string[] } }>;
  seq: number;
  now: () => Date;
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function createStore(now: () => Date = () => new Date('2026-11-24T10:30:00+07:00')): Store {
  const contacts = clone(demo.contacts);
  const identities = clone(demo.identities);
  const states = Object.fromEntries(clone(demo.contactStates).map((s) => [s.contactId, s]));
  const meta = clone(demo.contactMeta);
  // Khách thứ 9: cùng người với Chị Hương nhưng nhắn từ Facebook cá nhân của chủ shop — chưa có bằng chứng ⇒ khách riêng (asserted).
  const c9 = demo.fid('C', 9);
  contacts.push({ contactId: c9, kind: 'person', displayName: 'Hương Nguyễn', status: 'active', mergedInto: null, createdAt: demo.T0 });
  identities.push({ identityId: '401', contactId: c9, channel: 'facebook_personal', scope: 'global', externalId: '100004455667788', displayName: 'Nguyễn Thu Hương', confidence: 'asserted', proof: null, validFrom: demo.T0, validTo: null });
  states[c9] = { contactId: c9, stage: null, tags: [], ownerUserId: null, lastInAt: '2026-11-24T10:05:00+07:00', lastOutAt: null, unanswered: true, channels: { facebook_personal: 1 } };
  meta[c9] = { 'cake.contact.real_name': 'Nguyễn Thu Hương', 'cake.contact.gender': 'Nữ' };

  const conversations = clone(demo.conversations);
  const messages: Store['messages'] = clone(demo.messagesByConversation);
  // Hội thoại chưa có tin chi tiết: dựng một tin từ dòng xem trước để khung chat không rỗng.
  conversations.forEach((c, i) => {
    if (!messages[c.conversationId]) {
      messages[c.conversationId] = [{ messageId: demo.fid('M', 500 + i), conversationId: c.conversationId, direction: c.lastDirection, text: c.lastText, attachments: [], at: c.lastAt, e2ee: false, delivery: c.lastDirection === 'out' ? 'sent' : null, reaction: null, sentByUserId: c.lastDirection === 'out' ? '7' : null }];
    }
  });
  const timeline: Store['timeline'] = { [demo.contacts[0]!.contactId]: clone(demo.timelineHuong) };
  timeline[c9] = [{ touchId: '88201', contactId: c9, kind: 'message', channel: 'facebook_personal', channelAccountId: demo.fid('A', 5), conversationId: null, direction: 'in', summary: 'Nhắn Facebook cá nhân của chủ shop: hỏi lịch giao', docRef: null, isReversal: false, at: '2026-11-24T10:05:00+07:00' }];

  return { accounts: clone(demo.channelAccounts), contacts, states, meta, identities, links: {}, conversations, messages, timeline, merges: {}, seq: 1000, now };
}

/** ID giả đúng khuôn ULID cho bản ghi mới tạo trong giả lập. */
export const nextId = (s: Store, kind: 'C' | 'M' | 'V') => demo.fid(kind, ++s.seq);
export const iso = (d: Date) => d.toISOString();

/** Đánh dấu kết quả có phân trang (meta riêng) — tránh đoán theo tên khoá. */
export const PAGED = Symbol('paged');
export type Paged = { [PAGED]: true; data: unknown; meta: Record<string, unknown> };
export const paged = (data: unknown, meta: Record<string, unknown>): Paged => ({ [PAGED]: true, data, meta });
export const isPaged = (x: unknown): x is Paged => typeof x === 'object' && x !== null && PAGED in x;

/** So thời điểm thật, không so chuỗi — dữ liệu có thể trộn "+07:00" và "Z". Mới nhất trước. */
export const byTimeDesc = (a: string | null | undefined, b: string | null | undefined) => Date.parse(b ?? '1970-01-01T00:00:00Z') - Date.parse(a ?? '1970-01-01T00:00:00Z');
