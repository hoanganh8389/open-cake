// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-1/2: hàng (row) của care-kernel đúng cột architecture/20-DATA-SPINE §1 và cổng kho CareRepo.
//   Kernel chỉ nói chuyện với CareRepo; bản trong bộ nhớ (test) và bản PostgreSQL (PHASE-016) cùng hiện thực cổng này. Mọi lệnh của một sự việc chạy
//   trong MỘT giao dịch: CareRepo.tx(fn) — bản PG khoá pg_advisory_xact_lock theo doc_key.
import type { Channel, Confidence, Proof } from '@open-cake/contracts';

export type ContactRow = { contactId: string; kind: 'person' | 'org'; displayName: string; status: 'active' | 'merged' | 'archived'; mergedInto: string | null; createdAt: string };
export type IdentityRow = { identityId: string; contactId: string; channel: Channel; scope: string; externalId: string; displayName: string | null; confidence: Confidence; proof: Proof | null; validFrom: string; validTo: string | null };
export type AccountRow = { channelAccountId: string; channel: string; kind: 'personal' | 'page' | 'group' | 'oa'; externalAccountId: string; label: string; status: string };
export type ConversationRow = { conversationId: string; channelAccountId: string; externalThreadId: string; contactId: string; kind: 'dm' | 'comment_thread' | 'group_thread'; anchor: { postId: string; commentId?: string; parentId?: string } | null; lastAt: string | null; lastDirection: 'in' | 'out' | null; windowUntil: string | null };
export type EventRow = { eventId: string; source: string; docKey: string; version: number; type: string; payload: unknown; receivedAt: string; actor: string };
export type LedgerRow = {
  touchId: number; eventId: string; contactId: string; conversationId: string | null; channelAccountId: string | null; channel: Channel | null;
  kind: string; direction: 'in' | 'out' | 'none'; qty: 1 | -1; isReversal: boolean; reversesId: number | null; dims: Record<string, unknown>; at: string;
};
export type MessageRow = { messageId: string; touchId: number; conversationId: string; externalMessageId: string; direction: 'in' | 'out'; text: string; e2ee: boolean; delivery: string | null; at: string };
export type StateRow = { contactId: string; tags: string[]; lastInAt: string | null; lastOutAt: string | null; unanswered: boolean; channels: Record<string, number>; rev: number };

/** Cổng kho. Hàm ghi chỉ THÊM, trừ các chỗ được luật cho phép sửa (đóng identity bằng validTo, cập nhật dẫn xuất, trạng thái giao tin). */
export interface CareRepo {
  tx<T>(fn: () => T): T;
  // một cửa
  findEvent(source: string, docKey: string): EventRow | undefined;
  insertEvent(e: EventRow): void;
  replaceEvent(e: EventRow): void; // bản cũ đã vào archiveEventVersion trước
  archiveEventVersion(e: EventRow): void;
  // sổ
  appendLedger(row: Omit<LedgerRow, 'touchId'>): LedgerRow;
  ledgerByEvent(eventId: string): LedgerRow[];
  ledgerByContact(contactId: string): LedgerRow[];
  isReversed(touchId: number): boolean;
  // người, danh tính
  getContact(contactId: string): ContactRow | undefined;
  insertContact(c: ContactRow): void;
  updateContact(contactId: string, patch: Partial<Pick<ContactRow, 'status' | 'mergedInto' | 'displayName'>>): void;
  /** các khách đã ghép vào contactId (status = merged, merged_into = contactId). */
  mergedFrom(contactId: string): string[];
  findIdentity(channel: Channel, scope: string, externalId: string): IdentityRow | undefined; // chỉ dòng còn hiệu lực
  identitiesOf(contactId: string, includeClosed?: boolean): IdentityRow[];
  insertIdentity(i: IdentityRow): void;
  closeIdentity(identityId: string, at: string): void;
  reopenIdentity(identityId: string): void;
  deleteIdentityRow(identityId: string): void; // chỉ dùng khi tách lại dòng do chính lần ghép tạo ra
  // kênh, hội thoại, tin
  findAccount(externalAccountId: string, kind: AccountRow['kind']): AccountRow | undefined;
  findConversation(channelAccountId: string, externalThreadId: string): ConversationRow | undefined;
  findCommentConversation(channelAccountId: string, commentId: string): ConversationRow | undefined;
  conversationsOf(contactId: string): ConversationRow[];
  upsertConversation(c: ConversationRow): void;
  upsertMessage(m: MessageRow): void;
  findMessage(conversationId: string, externalMessageId: string): MessageRow | undefined;
  // dẫn xuất
  getState(contactId: string): StateRow | undefined;
  putState(s: StateRow): void;
}

export interface KernelDeps {
  repo: CareRepo;
  now: () => string;
  /** sinh ULID (bản thật: thư viện ulid; test: tuần tự đúng khuôn). */
  newId: (kind: 'contact' | 'conversation' | 'message' | 'identity' | 'event') => string;
}
