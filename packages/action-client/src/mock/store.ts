// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: kho trong bộ nhớ của bộ giả lập, nạp từ bộ mẫu "Shop Hoa Mai" (GIẢ LẬP).
//   Thêm một khách "Hương Nguyễn" đến từ Facebook cá nhân để màn Contact 360 diễn được ca vàng G5 (gợi ý cùng người ⇒ Ghép có bằng chứng).
import type { z } from 'zod';
import type { ContactLink, RecordRow, ContactSchema, ContactStateSchema, ConversationSchema, IdentitySchema, MessageSchema, TimelineItemSchema, ChannelAccountSchema } from '@open-cake/contracts';
import * as demo from '@open-cake/contracts/demo';
import { seedCatalog, type CatalogStore } from './handlers-catalog.js';

type In<S extends z.ZodTypeAny> = z.input<S>;
export type Store = {
  accounts: In<typeof ChannelAccountSchema>[];
  // [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh (GIẢ LẬP).
  members: Record<string, string[]>;
  contacts: In<typeof ContactSchema>[];
  states: Record<string, In<typeof ContactStateSchema>>;
  meta: Record<string, Record<string, string>>;
  identities: In<typeof IdentitySchema>[];
  links: Record<string, ContactLink[]>;
  conversations: In<typeof ConversationSchema>[];
  messages: Record<string, In<typeof MessageSchema>[]>;
  timeline: Record<string, In<typeof TimelineItemSchema>[]>;
  merges: Record<string, { into: string; until: string; moved: { identities: string[]; conversations: string[] } }>;
  records: RecordRow[];
  catalog: CatalogStore;
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

  return { accounts: clone(demo.channelAccounts), members: {}, contacts, states, meta, identities, links: {}, conversations, messages, timeline, merges: {}, records: seedRecords(), catalog: seedCatalog(), seq: 1000, now };
}

/** Bản ghi lớp mềm mẫu (GIẢ LẬP): tin nhắn nhanh, nhãn, tài khoản ngân hàng — thay các bảng nhỏ của bản WP. */
function seedRecords(): RecordRow[] {
  const at = '2026-11-23T09:00:00+07:00';
  const r = (n: number, type: string, title: string, data: Record<string, unknown>): RecordRow => ({ recordId: `rec-${n}`, type, title, status: 'active', data, updatedAt: at, updatedBy: '7' });
  return [
    r(1, 'cake.quick_reply', 'Chào khách mới', { title: 'Chào khách mới', shortcut: '/chao', body: 'Dạ shop chào chị ạ! Chị cần tư vấn mẫu nào ạ?' }),
    r(2, 'cake.quick_reply', 'Báo phí ship', { title: 'Báo phí ship', shortcut: '/ship', body: 'Đơn từ 2 sản phẩm shop freeship toàn quốc ạ.' }),
    r(3, 'cake.quick_reply', 'Xin địa chỉ', { title: 'Xin địa chỉ', shortcut: '/dc', body: 'Chị gửi giúp em địa chỉ và số điện thoại nhận hàng nhé!' }),
    r(4, 'cake.label', 'Khách VIP', { name: 'Khách VIP', tone: 'warn' }),
    r(5, 'cake.label', 'Đặt hàng', { name: 'Đặt hàng', tone: 'pri' }),
    r(6, 'cake.label', 'Khách sỉ', { name: 'Khách sỉ', tone: 'out' }),
    r(7, 'cake.saved_bank', 'Vietcombank', { bank: 'Vietcombank', account_no: '0071000123456', holder: 'NGUYEN THI LAN' }),
  ];
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
