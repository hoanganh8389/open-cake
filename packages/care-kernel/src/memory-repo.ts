// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — CareRepo trong bộ nhớ: tx() có quay lui khi lỗi (như giao dịch PG); sổ đóng băng từng dòng
//   (Object.freeze) để mô phỏng trigger chỉ-thêm — sửa dòng sổ ⇒ ném lỗi, đúng R-CAKE-LEDGER-1.
import type { AccountRow, CareRepo, ContactRow, ConversationRow, EventRow, IdentityRow, LedgerRow, MessageRow, StateRow } from './types.js';

type Data = {
  events: EventRow[]; versions: EventRow[]; ledger: LedgerRow[]; contacts: ContactRow[]; identities: IdentityRow[];
  accounts: AccountRow[]; conversations: ConversationRow[]; messages: MessageRow[]; states: Record<string, StateRow>; seq: number;
};

const empty = (): Data => ({ events: [], versions: [], ledger: [], contacts: [], identities: [], accounts: [], conversations: [], messages: [], states: {}, seq: 0 });
// structuredClone giữ dòng sổ đóng băng? Không — nên đóng băng lại sau khi khôi phục.
const snapshot = (d: Data): Data => structuredClone(d);

export class MemoryRepo implements CareRepo {
  private d: Data = empty();
  private depth = 0;

  constructor(seed?: { accounts?: AccountRow[] }) { this.d.accounts = seed?.accounts ?? []; }

  /** Đọc thô cho test / chẩn đoán (chỉ đọc). */
  get data(): Readonly<Data> { return this.d; }

  tx<T>(fn: () => T): T {
    if (this.depth > 0) return fn(); // lồng nhau = cùng giao dịch
    const before = snapshot(this.d);
    this.depth++;
    try { return fn(); } catch (e) {
      this.d = before;
      this.d.ledger.forEach((r) => Object.freeze(r));
      throw e;
    } finally { this.depth--; }
  }

  findEvent(source: string, docKey: string) { return this.d.events.find((e) => e.source === source && e.docKey === docKey); }
  insertEvent(e: EventRow) { this.d.events.push(e); }
  replaceEvent(e: EventRow) { this.d.events = this.d.events.map((x) => (x.eventId === e.eventId ? e : x)); }
  archiveEventVersion(e: EventRow) { this.d.versions.push(structuredClone(e)); }

  appendLedger(row: Omit<LedgerRow, 'touchId'>): LedgerRow {
    if (row.reversesId !== null && this.isReversed(row.reversesId)) throw new Error(`dòng sổ ${row.reversesId} đã bị đảo (UNIQUE reverses_id)`);
    const full = Object.freeze({ ...row, touchId: ++this.d.seq });
    this.d.ledger.push(full);
    return full;
  }
  ledgerByEvent(eventId: string) { return this.d.ledger.filter((r) => r.eventId === eventId); }
  ledgerByContact(contactId: string) { return this.d.ledger.filter((r) => r.contactId === contactId); }
  isReversed(touchId: number) { return this.d.ledger.some((r) => r.reversesId === touchId); }

  getContact(id: string) { return this.d.contacts.find((c) => c.contactId === id); }
  insertContact(c: ContactRow) { this.d.contacts.push(c); }
  updateContact(id: string, patch: Partial<ContactRow>) { const c = this.getContact(id); if (c) Object.assign(c, patch); }
  mergedFrom(id: string) { return this.d.contacts.filter((c) => c.status === 'merged' && c.mergedInto === id).map((c) => c.contactId); }
  findIdentity(channel: string, scope: string, externalId: string) {
    return this.d.identities.find((i) => i.channel === channel && i.scope === scope && i.externalId === externalId && i.validTo === null);
  }
  identitiesOf(contactId: string, includeClosed = false) { return this.d.identities.filter((i) => i.contactId === contactId && (includeClosed || i.validTo === null)); }
  insertIdentity(i: IdentityRow) {
    if (this.findIdentity(i.channel, i.scope, i.externalId)) throw new Error(`trùng danh tính hiệu lực ${i.channel}/${i.scope}/${i.externalId} (UNIQUE … WHERE valid_to IS NULL)`);
    this.d.identities.push(i);
  }
  closeIdentity(id: string, at: string) { const i = this.d.identities.find((x) => x.identityId === id); if (i) i.validTo = at; }
  reopenIdentity(id: string) { const i = this.d.identities.find((x) => x.identityId === id); if (i) i.validTo = null; }
  deleteIdentityRow(id: string) { this.d.identities = this.d.identities.filter((x) => x.identityId !== id); }

  findAccount(externalAccountId: string, kind: AccountRow['kind']) { return this.d.accounts.find((a) => a.externalAccountId === externalAccountId && a.kind === kind); }
  findConversation(acc: string, thread: string) { return this.d.conversations.find((c) => c.channelAccountId === acc && c.externalThreadId === thread); }
  findCommentConversation(acc: string, commentId: string) { return this.d.conversations.find((c) => c.channelAccountId === acc && c.kind === 'comment_thread' && c.anchor?.commentId === commentId); }
  conversationsOf(contactId: string) { return this.d.conversations.filter((c) => c.contactId === contactId); }
  upsertConversation(c: ConversationRow) {
    const i = this.d.conversations.findIndex((x) => x.conversationId === c.conversationId);
    if (i >= 0) this.d.conversations[i] = c; else this.d.conversations.push(c);
  }
  upsertMessage(m: MessageRow) {
    const i = this.d.messages.findIndex((x) => x.conversationId === m.conversationId && x.externalMessageId === m.externalMessageId);
    if (i >= 0) this.d.messages[i] = m; else this.d.messages.push(m);
  }
  findMessage(conv: string, ext: string) { return this.d.messages.find((m) => m.conversationId === conv && m.externalMessageId === ext); }

  getState(id: string) { return this.d.states[id]; }
  putState(s: StateRow) { this.d.states[s.contactId] = s; }
}
