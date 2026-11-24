// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — CareRepo trong bộ nhớ: tx() có quay lui khi lỗi (như giao dịch PG); sổ đóng băng từng dòng
//   (Object.freeze) để mô phỏng trigger chỉ-thêm — sửa dòng sổ ⇒ ném lỗi, đúng R-CAKE-LEDGER-1.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — theo cổng bất đồng bộ: mọi hàm trả Promise, tx(fn async). Một tiến trình test ⇒ không có hai giao dịch chen nhau.
import type { AccountRow, CareRepo, ContactRow, ConversationRow, EventRow, IdentityRow, LedgerRow, MessageRow, StateRow } from './types.js';

type Data = {
  events: EventRow[]; versions: EventRow[]; ledger: LedgerRow[]; contacts: ContactRow[]; identities: IdentityRow[];
  accounts: AccountRow[]; conversations: ConversationRow[]; messages: MessageRow[]; states: Record<string, StateRow>; seq: number;
};

const empty = (): Data => ({ events: [], versions: [], ledger: [], contacts: [], identities: [], accounts: [], conversations: [], messages: [], states: {}, seq: 0 });

export class MemoryRepo implements CareRepo {
  private d: Data = empty();
  private depth = 0;

  constructor(seed?: { accounts?: AccountRow[] }) { this.d.accounts = seed?.accounts ?? []; }

  /** Đọc thô cho test / chẩn đoán (chỉ đọc). */
  get data(): Readonly<Data> { return this.d; }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return fn(); // lồng nhau = cùng giao dịch
    const before = structuredClone(this.d);
    this.depth++;
    try { return await fn(); } catch (e) {
      this.d = before;
      this.d.ledger.forEach((r) => Object.freeze(r)); // structuredClone bỏ đóng băng ⇒ đóng lại
      throw e;
    } finally { this.depth--; }
  }

  async findEvent(source: string, docKey: string) { return this.d.events.find((e) => e.source === source && e.docKey === docKey); }
  async insertEvent(e: EventRow) { this.d.events.push(e); }
  async replaceEvent(e: EventRow) { this.d.events = this.d.events.map((x) => (x.eventId === e.eventId ? e : x)); }
  async archiveEventVersion(e: EventRow) { this.d.versions.push(structuredClone(e)); }

  async appendLedger(row: Omit<LedgerRow, 'touchId'>): Promise<LedgerRow> {
    if (row.reversesId !== null && (await this.isReversed(row.reversesId))) throw new Error(`dòng sổ ${row.reversesId} đã bị đảo (UNIQUE reverses_id)`);
    const full = Object.freeze({ ...row, touchId: ++this.d.seq });
    this.d.ledger.push(full);
    return full;
  }
  async ledgerByEvent(eventId: string) { return this.d.ledger.filter((r) => r.eventId === eventId); }
  async ledgerByContact(contactId: string) { return this.d.ledger.filter((r) => r.contactId === contactId); }
  async isReversed(touchId: number) { return this.d.ledger.some((r) => r.reversesId === touchId); }

  async getContact(id: string) { return this.d.contacts.find((c) => c.contactId === id); }
  async insertContact(c: ContactRow) { this.d.contacts.push(c); }
  async updateContact(id: string, patch: Partial<ContactRow>) { const c = this.d.contacts.find((x) => x.contactId === id); if (c) Object.assign(c, patch); }
  async mergedFrom(id: string) { return this.d.contacts.filter((c) => c.status === 'merged' && c.mergedInto === id).map((c) => c.contactId); }
  async findIdentity(channel: string, scope: string, externalId: string) { return this.live(channel, scope, externalId); }
  async identitiesOf(contactId: string, includeClosed = false) { return this.d.identities.filter((i) => i.contactId === contactId && (includeClosed || i.validTo === null)); }
  async insertIdentity(i: IdentityRow) {
    if (this.live(i.channel, i.scope, i.externalId)) throw new Error(`trùng danh tính hiệu lực ${i.channel}/${i.scope}/${i.externalId} (UNIQUE … WHERE valid_to IS NULL)`);
    this.d.identities.push(i);
  }
  async closeIdentity(id: string, at: string) { const i = this.d.identities.find((x) => x.identityId === id); if (i) i.validTo = at; }
  async reopenIdentity(id: string) { const i = this.d.identities.find((x) => x.identityId === id); if (i) i.validTo = null; }
  async deleteIdentityRow(id: string) { this.d.identities = this.d.identities.filter((x) => x.identityId !== id); }

  async findAccount(externalAccountId: string, kind: AccountRow['kind']) { return this.d.accounts.find((a) => a.externalAccountId === externalAccountId && a.kind === kind); }
  async findConversation(acc: string, thread: string) { return this.d.conversations.find((c) => c.channelAccountId === acc && c.externalThreadId === thread); }
  async findCommentConversation(acc: string, commentId: string) { return this.d.conversations.find((c) => c.channelAccountId === acc && c.kind === 'comment_thread' && c.anchor?.commentId === commentId); }
  async conversationsOf(contactId: string) { return this.d.conversations.filter((c) => c.contactId === contactId); }
  async upsertConversation(c: ConversationRow) {
    const i = this.d.conversations.findIndex((x) => x.conversationId === c.conversationId);
    if (i >= 0) this.d.conversations[i] = c; else this.d.conversations.push(c);
  }
  async upsertMessage(m: MessageRow) {
    const i = this.d.messages.findIndex((x) => x.conversationId === m.conversationId && x.externalMessageId === m.externalMessageId);
    if (i >= 0) this.d.messages[i] = m; else this.d.messages.push(m);
  }
  async findMessage(conv: string, ext: string) { return this.d.messages.find((m) => m.conversationId === conv && m.externalMessageId === ext); }

  async getState(id: string) { return this.d.states[id]; }
  async putState(s: StateRow) { this.d.states[s.contactId] = s; }

  private live(channel: string, scope: string, externalId: string) {
    return this.d.identities.find((i) => i.channel === channel && i.scope === scope && i.externalId === externalId && i.validTo === null);
  }
}
