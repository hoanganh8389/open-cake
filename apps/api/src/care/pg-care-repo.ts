// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 S005-1 — CareRepo trên PostgreSQL (0101 + 0104), cùng cổng với MemoryRepo và chạy CÙNG bộ kịch bản
//   (care-kernel/test/scenarios.ts). Chỉ-thêm do trigger CSDL giữ (cake_append_only), UNIQUE reverses_id / danh tính hiệu lực do chỉ mục giữ — repo không tự
//   kiểm lại. Mọi câu kèm tenant_id (và RLS khi chạy bằng vai ứng dụng). tx(): đang trong giao dịch ⇒ dùng luôn; chưa ⇒ mở một giao dịch.
import { sql, type Kysely, type Transaction } from 'kysely';
import type { Database } from '@bizcity/platform/db/types';
import type { AccountRow, CareRepo, ContactRow, ConversationRow, EventRow, IdentityRow, LedgerRow, MessageRow, StateRow } from '@open-cake/care-kernel';
import type { Channel } from '@open-cake/contracts';
import '../db-types.js';

type Conn = Kysely<Database> | Transaction<Database>;
const iso = (d: Date | string) => new Date(d).toISOString();
const isoN = (d: Date | string | null) => (d === null ? null : iso(d));
const js = (v: unknown) => JSON.stringify(v);

/* eslint-disable @typescript-eslint/no-explicit-any -- hàng thô từ CSDL, đổi sang hàng kernel ở các hàm to* dưới */
const toContact = (r: any): ContactRow => ({ contactId: r.contact_id, kind: r.kind, displayName: r.display_name, status: r.status, mergedInto: r.merged_into, createdAt: iso(r.created_at) });
const toIdentity = (r: any): IdentityRow => ({ identityId: r.identity_id, contactId: r.contact_id, channel: r.channel, scope: r.scope, externalId: r.external_id, displayName: r.display_name, confidence: r.confidence, proof: r.proof ?? null, validFrom: iso(r.valid_from), validTo: isoN(r.valid_to) });
const toAccount = (r: any): AccountRow => ({ channelAccountId: r.channel_account_id, channel: r.channel, kind: r.kind, externalAccountId: r.external_account_id, label: r.label, status: r.status });
const toConv = (r: any): ConversationRow => ({ conversationId: r.conversation_id, channelAccountId: r.channel_account_id, externalThreadId: r.external_thread_id, contactId: r.contact_id, kind: r.kind, anchor: r.anchor ?? null, lastAt: isoN(r.last_at), lastDirection: r.last_direction, windowUntil: isoN(r.window_until), assigneeUserId: r.assignee_user_id });
const toEvent = (r: any): EventRow => ({ eventId: r.event_id, source: r.source, docKey: r.doc_key, version: r.version, type: r.type, payload: r.payload, receivedAt: iso(r.received_at), actor: r.actor });
export const toLedger = (r: any): LedgerRow => ({ touchId: Number(r.touch_id), eventId: r.event_id, contactId: r.contact_id, conversationId: r.conversation_id, channelAccountId: r.channel_account_id, channel: r.channel, kind: r.kind, direction: r.direction, qty: r.qty, isReversal: r.is_reversal, reversesId: r.reverses_id === null ? null : Number(r.reverses_id), dims: r.dims ?? {}, at: iso(r.at) });
const toMessage = (r: any): MessageRow => ({ messageId: r.message_id, touchId: Number(r.touch_id), conversationId: r.conversation_id, externalMessageId: r.external_message_id, direction: r.direction, text: r.body, e2ee: r.e2ee, delivery: r.delivery, at: iso(r.at) });
const toState = (r: any): StateRow => ({ contactId: r.contact_id, tags: r.tags, lastInAt: isoN(r.last_in_at), lastOutAt: isoN(r.last_out_at), unanswered: r.unanswered, channels: r.channels ?? {}, rev: r.rev });
/* eslint-enable @typescript-eslint/no-explicit-any */

export class PgCareRepo implements CareRepo {
  private c: Conn;
  constructor(private readonly tenantId: string, private readonly root: Conn) { this.c = root; }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.c.isTransaction) return fn();
    return (this.root as Kysely<Database>).transaction().execute(async (trx) => {
      this.c = trx;
      try { return await fn(); } finally { this.c = this.root; }
    });
  }
  private t<Q extends { where: (...a: any[]) => Q }>(q: Q): Q { return q.where('tenant_id', '=', this.tenantId); } // eslint-disable-line @typescript-eslint/no-explicit-any

  // một cửa
  async findEvent(source: string, docKey: string) {
    const r = await this.t(this.c.selectFrom('touch_events').selectAll()).where('source', '=', source).where('doc_key', '=', docKey).executeTakeFirst();
    return r ? toEvent(r) : undefined;
  }
  async insertEvent(e: EventRow) {
    await this.c.insertInto('touch_events').values({ event_id: e.eventId, tenant_id: this.tenantId, source: e.source, doc_key: e.docKey, version: e.version, type: e.type, payload: js(e.payload), actor: e.actor, received_at: e.receivedAt }).execute();
  }
  async replaceEvent(e: EventRow) {
    await this.t(this.c.updateTable('touch_events').set({ version: e.version, type: e.type, payload: js(e.payload), actor: e.actor, received_at: e.receivedAt })).where('event_id', '=', e.eventId).execute();
  }
  async archiveEventVersion(e: EventRow) {
    await this.c.insertInto('touch_event_versions').values({ tenant_id: this.tenantId, event_id: e.eventId, version: e.version, payload: js(e.payload), archived_at: new Date() }).execute();
  }

  // sổ
  async appendLedger(row: Omit<LedgerRow, 'touchId'>) {
    const r = await this.c.insertInto('touch_ledger').values({
      tenant_id: this.tenantId, event_id: row.eventId, contact_id: row.contactId, conversation_id: row.conversationId, channel_account_id: row.channelAccountId, channel: row.channel,
      kind: row.kind, direction: row.direction, qty: row.qty, is_reversal: row.isReversal, reverses_id: row.reversesId === null ? null : String(row.reversesId), dims: js(row.dims), at: row.at,
    }).returningAll().executeTakeFirstOrThrow();
    return toLedger(r);
  }
  async ledgerByEvent(eventId: string) { return (await this.t(this.c.selectFrom('touch_ledger').selectAll()).where('event_id', '=', eventId).orderBy('touch_id').execute()).map(toLedger); }
  async ledgerByContact(contactId: string) { return (await this.t(this.c.selectFrom('touch_ledger').selectAll()).where('contact_id', '=', contactId).orderBy('touch_id').execute()).map(toLedger); }
  async isReversed(touchId: number) { return !!(await this.t(this.c.selectFrom('touch_ledger').select('touch_id')).where('reverses_id', '=', String(touchId)).executeTakeFirst()); }

  // người, danh tính
  async getContact(id: string) { const r = await this.t(this.c.selectFrom('contacts').selectAll()).where('contact_id', '=', id).executeTakeFirst(); return r ? toContact(r) : undefined; }
  async insertContact(x: ContactRow) {
    await this.c.insertInto('contacts').values({ contact_id: x.contactId, tenant_id: this.tenantId, kind: x.kind, display_name: x.displayName, status: x.status, merged_into: x.mergedInto, created_at: x.createdAt }).execute();
  }
  async updateContact(id: string, p: Partial<Pick<ContactRow, 'status' | 'mergedInto' | 'displayName'>>) {
    const set = Object.fromEntries(Object.entries({ status: p.status, merged_into: p.mergedInto, display_name: p.displayName }).filter(([, v]) => v !== undefined));
    if (Object.keys(set).length) await this.t(this.c.updateTable('contacts').set(set)).where('contact_id', '=', id).execute();
  }
  async mergedFrom(id: string) { return (await this.t(this.c.selectFrom('contacts').select('contact_id')).where('status', '=', 'merged').where('merged_into', '=', id).execute()).map((r) => r.contact_id); }
  async findIdentity(channel: Channel, scope: string, externalId: string) {
    const r = await this.t(this.c.selectFrom('contact_identities').selectAll()).where('channel', '=', channel).where('scope', '=', scope).where('external_id', '=', externalId).where('valid_to', 'is', null).executeTakeFirst();
    return r ? toIdentity(r) : undefined;
  }
  async identitiesOf(contactId: string, includeClosed = false) {
    let q = this.t(this.c.selectFrom('contact_identities').selectAll()).where('contact_id', '=', contactId);
    if (!includeClosed) q = q.where('valid_to', 'is', null);
    return (await q.orderBy('valid_from').orderBy('identity_id').execute()).map(toIdentity);
  }
  async insertIdentity(i: IdentityRow) {
    await this.c.insertInto('contact_identities').values({ identity_id: i.identityId, tenant_id: this.tenantId, contact_id: i.contactId, channel: i.channel, scope: i.scope, external_id: i.externalId,
      display_name: i.displayName, confidence: i.confidence, proof: i.proof ? js(i.proof) : null, valid_from: i.validFrom, valid_to: i.validTo }).execute();
  }
  async closeIdentity(id: string, at: string) { await this.t(this.c.updateTable('contact_identities').set({ valid_to: at })).where('identity_id', '=', id).execute(); }
  async reopenIdentity(id: string) { await this.t(this.c.updateTable('contact_identities').set({ valid_to: null })).where('identity_id', '=', id).execute(); }
  async deleteIdentityRow(id: string) { await this.t(this.c.deleteFrom('contact_identities')).where('identity_id', '=', id).execute(); }

  // kênh, hội thoại, tin
  async findAccount(externalAccountId: string, kind: AccountRow['kind']) {
    const r = await this.t(this.c.selectFrom('channel_accounts').selectAll()).where('external_account_id', '=', externalAccountId).where('kind', '=', kind).executeTakeFirst();
    return r ? toAccount(r) : undefined;
  }
  async getConversation(id: string) {
    const r = await this.t(this.c.selectFrom('conversations').selectAll()).where('conversation_id', '=', id).executeTakeFirst();
    return r ? toConv(r) : undefined;
  }
  async findConversation(acc: string, thread: string) {
    const r = await this.t(this.c.selectFrom('conversations').selectAll()).where('channel_account_id', '=', acc).where('external_thread_id', '=', thread).executeTakeFirst();
    return r ? toConv(r) : undefined;
  }
  async findCommentConversation(acc: string, commentId: string) {
    const r = await this.t(this.c.selectFrom('conversations').selectAll()).where('channel_account_id', '=', acc).where('kind', '=', 'comment_thread')
      .where(sql`anchor->>'commentId'`, '=', commentId).executeTakeFirst();
    return r ? toConv(r) : undefined;
  }
  async conversationsOf(contactId: string) { return (await this.t(this.c.selectFrom('conversations').selectAll()).where('contact_id', '=', contactId).orderBy('conversation_id').execute()).map(toConv); }
  async upsertConversation(x: ConversationRow) {
    const v = { conversation_id: x.conversationId, tenant_id: this.tenantId, channel_account_id: x.channelAccountId, external_thread_id: x.externalThreadId, contact_id: x.contactId,
      kind: x.kind, anchor: x.anchor ? js(x.anchor) : null, last_at: x.lastAt, last_direction: x.lastDirection, window_until: x.windowUntil, ...(x.assigneeUserId !== undefined ? { assignee_user_id: x.assigneeUserId } : {}) };
    await this.c.insertInto('conversations').values(v).onConflict((o) => o.column('conversation_id').doUpdateSet({ contact_id: v.contact_id, last_at: v.last_at, last_direction: v.last_direction, window_until: v.window_until, anchor: v.anchor, ...(x.assigneeUserId !== undefined ? { assignee_user_id: x.assigneeUserId } : {}) })).execute();
  }
  async upsertMessage(m: MessageRow) {
    const v = { message_id: m.messageId, tenant_id: this.tenantId, touch_id: String(m.touchId), conversation_id: m.conversationId, external_message_id: m.externalMessageId, direction: m.direction, body: m.text, delivery: m.delivery, e2ee: m.e2ee, at: m.at };
    await this.c.insertInto('messages').values(v).onConflict((o) => o.columns(['tenant_id', 'conversation_id', 'external_message_id']).doUpdateSet({ touch_id: v.touch_id, body: v.body, delivery: v.delivery, e2ee: v.e2ee })).execute();
  }
  async findMessage(conv: string, ext: string) {
    const r = await this.t(this.c.selectFrom('messages').selectAll()).where('conversation_id', '=', conv).where('external_message_id', '=', ext).executeTakeFirst();
    return r ? toMessage(r) : undefined;
  }

  // dẫn xuất
  async getState(id: string) { const r = await this.t(this.c.selectFrom('contact_state').selectAll()).where('contact_id', '=', id).executeTakeFirst(); return r ? toState(r) : undefined; }
  async putState(s: StateRow) {
    const v = { contact_id: s.contactId, tenant_id: this.tenantId, tags: s.tags, last_in_at: s.lastInAt, last_out_at: s.lastOutAt, unanswered: s.unanswered, channels: js(s.channels), rev: s.rev };
    await this.c.insertInto('contact_state').values(v).onConflict((o) => o.column('contact_id').doUpdateSet({ tags: v.tags, last_in_at: v.last_in_at, last_out_at: v.last_out_at, unanswered: v.unanswered, channels: v.channels, rev: v.rev })).execute();
  }
}
