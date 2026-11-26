// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-1/2: hàng (row) của care-kernel đúng cột architecture/20-DATA-SPINE §1 và cổng kho CareRepo.
//   Kernel chỉ nói chuyện với CareRepo; bản trong bộ nhớ (test) và bản PostgreSQL (PHASE-016) cùng hiện thực cổng này. Mọi lệnh của một sự việc chạy
//   trong MỘT giao dịch: CareRepo.tx(fn) — bản PG khoá pg_advisory_xact_lock theo doc_key.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — cổng BẤT ĐỒNG BỘ (Promise): bản PostgreSQL không hiện thực được cổng đồng bộ;
//   bản bộ nhớ và bản PG cùng chạy một bộ test kịch bản (test/scenarios.ts).
import type { Channel, Confidence, Proof } from '@open-cake/contracts';

export type ContactRow = { contactId: string; kind: 'person' | 'org'; displayName: string; status: 'active' | 'merged' | 'archived'; mergedInto: string | null; createdAt: string; nameSource?: 'channel' | 'staff' };
export type IdentityRow = { identityId: string; contactId: string; channel: Channel; scope: string; externalId: string; displayName: string | null; confidence: Confidence; proof: Proof | null; validFrom: string; validTo: string | null; avatarRef?: string | null };
export type AccountRow = { channelAccountId: string; channel: string; kind: 'personal' | 'page' | 'group' | 'oa'; externalAccountId: string; label: string; status: string };
// [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — title / avatarRef / memberCount: thông tin nhóm do kênh giữ (thread.updated).
export type ConversationRow = { title?: string | null; avatarRef?: string | null; memberCount?: number | null; conversationId: string; channelAccountId: string; externalThreadId: string; contactId: string; kind: 'dm' | 'comment_thread' | 'group_thread'; anchor: { postId: string; commentId?: string; parentId?: string } | null; lastAt: string | null; lastDirection: 'in' | 'out' | null; windowUntil: string | null; assigneeUserId?: string | null };
export type EventRow = { eventId: string; source: string; docKey: string; version: number; type: string; payload: unknown; receivedAt: string; actor: string };
export type LedgerRow = {
  touchId: number; eventId: string; contactId: string; conversationId: string | null; channelAccountId: string | null; channel: Channel | null;
  kind: string; direction: 'in' | 'out' | 'none'; qty: 1 | -1; isReversal: boolean; reversesId: number | null; dims: Record<string, unknown>; at: string;
};
export type MessageRow = { messageId: string; touchId: number; conversationId: string; externalMessageId: string; direction: 'in' | 'out'; text: string; e2ee: boolean; delivery: string | null; at: string; sentBy?: string | null;
  quote?: { externalMessageId: string; senderExternalId: string | null; text: string | null } | null; mentions?: { externalId: string; pos: number; len: number }[]; revokedAt?: string | null };
export type StateRow = { contactId: string; tags: string[]; lastInAt: string | null; lastOutAt: string | null; unanswered: boolean; channels: Record<string, number>; rev: number };

/** Cổng kho. Hàm ghi chỉ THÊM, trừ các chỗ được luật cho phép sửa (đóng identity bằng validTo, cập nhật dẫn xuất, trạng thái giao tin). */
export interface CareRepo {
  tx<T>(fn: () => Promise<T>): Promise<T>;
  // một cửa
  findEvent(source: string, docKey: string): Promise<EventRow | undefined>;
  insertEvent(e: EventRow): Promise<void>;
  replaceEvent(e: EventRow): Promise<void>; // bản cũ đã vào archiveEventVersion trước
  archiveEventVersion(e: EventRow): Promise<void>;
  // sổ
  appendLedger(row: Omit<LedgerRow, 'touchId'>): Promise<LedgerRow>;
  ledgerByEvent(eventId: string): Promise<LedgerRow[]>;
  ledgerByContact(contactId: string): Promise<LedgerRow[]>;
  isReversed(touchId: number): Promise<boolean>;
  // người, danh tính
  getContact(contactId: string): Promise<ContactRow | undefined>;
  insertContact(c: ContactRow): Promise<void>;
  updateContact(contactId: string, patch: Partial<Pick<ContactRow, 'status' | 'mergedInto' | 'displayName'>>): Promise<void>;
  /** [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — profile.updated: đổi tên / ảnh của danh tính kênh (không đóng / mở dòng). */
  updateIdentityProfile(identityId: string, patch: { displayName?: string | null; avatarRef?: string | null }): Promise<void>;
  /** các khách đã ghép vào contactId (status = merged, merged_into = contactId). */
  mergedFrom(contactId: string): Promise<string[]>;
  findIdentity(channel: Channel, scope: string, externalId: string): Promise<IdentityRow | undefined>; // chỉ dòng còn hiệu lực
  identitiesOf(contactId: string, includeClosed?: boolean): Promise<IdentityRow[]>;
  insertIdentity(i: IdentityRow): Promise<void>;
  closeIdentity(identityId: string, at: string): Promise<void>;
  reopenIdentity(identityId: string): Promise<void>;
  deleteIdentityRow(identityId: string): Promise<void>; // chỉ dùng khi tách lại dòng do chính lần ghép tạo ra
  // kênh, hội thoại, tin
  findAccount(externalAccountId: string, kind: AccountRow['kind']): Promise<AccountRow | undefined>;
  getConversation(conversationId: string): Promise<ConversationRow | undefined>;
  findConversation(channelAccountId: string, externalThreadId: string): Promise<ConversationRow | undefined>;
  findCommentConversation(channelAccountId: string, commentId: string): Promise<ConversationRow | undefined>;
  conversationsOf(contactId: string): Promise<ConversationRow[]>;
  upsertConversation(c: ConversationRow): Promise<void>;
  upsertMessage(m: MessageRow): Promise<void>;
  findMessage(conversationId: string, externalMessageId: string): Promise<MessageRow | undefined>;
  /** [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — delivery.updated: đổi trạng thái giao + gắn mã tin thật của kênh (thay khoá lệnh). */
  setDelivery(messageId: string, delivery: string, externalMessageId?: string): Promise<void>;
  // dẫn xuất
  getState(contactId: string): Promise<StateRow | undefined>;
  putState(s: StateRow): Promise<void>;
}

export interface KernelDeps {
  repo: CareRepo;
  now: () => string;
  /** sinh ULID (bản thật: thư viện ulid; test: tuần tự đúng khuôn). */
  newId: (kind: 'contact' | 'conversation' | 'message' | 'identity' | 'event') => string;
}
