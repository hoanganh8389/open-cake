// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — 6 action ĐỌC của hộp thư / danh bạ / Contact 360 trên Postgres (bảng 0101 do care-kernel ghi qua PgCareRepo):
//   kênh, hội thoại, tin, danh bạ, hồ sơ, dòng thời gian. Chỉ đọc — mọi ghi vào sổ đi MỘT CỬA submitTouchIn (ingress) hoặc lệnh kernel. Đếm / ghép theo lô, không truy vấn từng dòng.
import { sql } from 'kysely';
import '../db-types.js';
import { failure, paged, type Ctx, type Handler } from '../runtime.js';

const iso = (d: Date | string) => new Date(d).toISOString();
const isoN = (d: Date | string | null) => (d === null ? null : iso(d));
const META = { gender: 'cake.contact.gender', birthday: 'cake.contact.birthday' } as const;
const KIND_LABEL: Record<string, string> = { message: 'Tin nhắn', comment: 'Bình luận', reaction: 'Bày tỏ cảm xúc', tag: 'Gắn nhãn', merge: 'Ghép khách', note: 'Ghi chú' };

/** Trạng thái (dẫn xuất) của nhiều khách một lượt — khách chưa có dòng nào thì trạng thái rỗng. */
async function statesOf({ tx, tenantId }: Ctx, ids: string[]) {
  const rows = ids.length ? await tx.selectFrom('contact_state').selectAll().where('tenant_id', '=', tenantId).where('contact_id', 'in', ids).execute() : [];
  const by = new Map(rows.map((r) => [r.contact_id, r]));
  return (id: string) => {
    const s = by.get(id);
    return { contactId: id, stage: null, tags: s?.tags ?? [], ownerUserId: null, lastInAt: isoN(s?.last_in_at ?? null), lastOutAt: isoN(s?.last_out_at ?? null), unanswered: s?.unanswered ?? false, channels: (s?.channels as Record<string, number>) ?? {} };
  };
}
const toContact = (c: { contact_id: string; kind: string; display_name: string; status: string; merged_into: string | null; created_at: Date }) =>
  ({ contactId: c.contact_id, kind: c.kind, displayName: c.display_name, status: c.status, mergedInto: c.merged_into, createdAt: iso(c.created_at) });

/** Tin vào chưa trả lời của từng hội thoại = tin vào sau tin ra cuối. */
async function unreadOf({ tx, tenantId }: Ctx, convIds: string[]) {
  if (!convIds.length) return new Map<string, number>();
  const rows = await sql<{ conversation_id: string; n: string }>`
    SELECT m.conversation_id, count(*) AS n FROM messages m
    WHERE m.tenant_id = ${tenantId} AND m.conversation_id IN (${sql.join(convIds)}) AND m.direction = 'in'
      AND m.at > COALESCE((SELECT max(o.at) FROM messages o WHERE o.tenant_id = m.tenant_id AND o.conversation_id = m.conversation_id AND o.direction = 'out'), '-infinity')
    GROUP BY m.conversation_id`.execute(tx);
  return new Map(rows.rows.map((r) => [r.conversation_id, Number(r.n)]));
}

export const inboxHandlers: Record<string, Handler> = {
  'cake.channel.list': async (ctx) => {
    const accs = await ctx.tx.selectFrom('channel_accounts').selectAll().where('tenant_id', '=', ctx.tenantId).orderBy('label').execute();
    const convs = await ctx.tx.selectFrom('conversations').select(['conversation_id', 'channel_account_id']).where('tenant_id', '=', ctx.tenantId).execute();
    const unread = await unreadOf(ctx, convs.map((c) => c.conversation_id));
    return accs.map((a) => ({
      channelAccountId: a.channel_account_id, channel: a.channel, kind: a.kind, externalAccountId: a.external_account_id, label: a.label, ownerUserId: a.owner_user_id, status: a.status,
      testedAt: isoN(a.tested_at), unread: convs.filter((c) => c.channel_account_id === a.channel_account_id).reduce((s, c) => s + (unread.get(c.conversation_id) ?? 0), 0),
    }));
  },
  'cake.conversation.list': async (ctx, i) => {
    let q = ctx.tx.selectFrom('conversations as v').innerJoin('contacts as c', 'c.contact_id', 'v.contact_id').where('v.tenant_id', '=', ctx.tenantId).where('v.last_at', 'is not', null);
    if (i.channelAccountId) q = q.where('v.channel_account_id', '=', i.channelAccountId);
    if (i.q) q = q.where('c.display_name', 'ilike', `%${i.q}%`);
    if (i.filter === 'unanswered') q = q.where('v.last_direction', '=', 'in');
    if (i.filter === 'mine') q = q.where('v.assignee_user_id', 'is not', null); // PHASE-004: = người đăng nhập
    const rows = await q.selectAll('v').select('c.display_name').orderBy('v.last_at', 'desc').limit(i.limit).execute();
    const ids = rows.map((r) => r.conversation_id);
    const [unread, state, last] = await Promise.all([
      unreadOf(ctx, ids), statesOf(ctx, rows.map((r) => r.contact_id)),
      ids.length ? sql<{ conversation_id: string; body: string }>`SELECT DISTINCT ON (conversation_id) conversation_id, body FROM messages WHERE tenant_id = ${ctx.tenantId} AND conversation_id IN (${sql.join(ids)}) ORDER BY conversation_id, at DESC`.execute(ctx.tx) : { rows: [] },
    ]);
    const lastText = new Map(last.rows.map((r) => [r.conversation_id, r.body]));
    return rows
      .map((r) => ({
        conversationId: r.conversation_id, channelAccountId: r.channel_account_id, externalThreadId: r.external_thread_id, contactId: r.contact_id, kind: r.kind, anchor: r.anchor ?? null,
        title: r.display_name, lastText: lastText.get(r.conversation_id) ?? '', lastAt: iso(r.last_at!), lastDirection: r.last_direction ?? 'in', unread: unread.get(r.conversation_id) ?? 0,
        tags: state(r.contact_id).tags, assigneeUserId: r.assignee_user_id, windowUntil: isoN(r.window_until), pinned: false,
      }))
      .filter((c) => (i.filter !== 'unread' || c.unread > 0) && (!i.tag || c.tags.includes(i.tag)));
  },
  'cake.message.list': async ({ tx, tenantId }, i) => {
    const rows = await tx.selectFrom('messages').selectAll().where('tenant_id', '=', tenantId).where('conversation_id', '=', i.conversationId).orderBy('at', 'desc').limit(i.limit).execute();
    return rows.reverse().map((m) => ({ messageId: m.message_id, conversationId: m.conversation_id, direction: m.direction, text: m.body, attachments: (m.attachments as unknown[]) ?? [], at: iso(m.at), e2ee: m.e2ee, delivery: m.delivery, reaction: null, sentByUserId: null }));
  },
  'cake.contact.list': async (ctx, i) => {
    let q = ctx.tx.selectFrom('contacts as c').leftJoin('contact_state as s', 's.contact_id', 'c.contact_id').where('c.tenant_id', '=', ctx.tenantId).where('c.status', '=', 'active');
    if (i.q) q = q.where((e) => e.or([e('c.display_name', 'ilike', `%${i.q}%`), e.exists(e.selectFrom('contact_identities as p').select('p.identity_id').whereRef('p.contact_id', '=', 'c.contact_id').where('p.channel', '=', 'phone').where('p.external_id', 'like', `%${i.q}%`))]));
    if (i.tag) q = q.where(sql<boolean>`${i.tag} = ANY(s.tags)`);
    if (i.gender) q = q.where((e) => e.exists(e.selectFrom('entity_meta as g').select('g.key').whereRef('g.entity_id', '=', 'c.contact_id').where('g.key', '=', META.gender).where(sql`g.value #>> '{}'`, '=', i.gender)));
    if (i.birthday) q = q.where((e) => e.exists(e.selectFrom('entity_meta as b').select('b.key').whereRef('b.entity_id', '=', 'c.contact_id').where('b.key', '=', META.birthday)
      .where(sql<boolean>`to_char((b.value #>> '{}')::date, ${i.birthday === 'today' ? 'MM-DD' : 'MM'}) = to_char(now(), ${i.birthday === 'today' ? 'MM-DD' : 'MM'})`)));
    const [{ n }] = await q.select((e) => e.fn.countAll<string>().as('n')).execute() as [{ n: string }];
    const rows = await q.selectAll('c').orderBy(i.sort === 'name' ? sql`c.display_name` : sql`s.last_in_at DESC NULLS LAST`).limit(i.pageSize).offset((i.page - 1) * i.pageSize).execute();
    const ids = rows.map((r) => r.contact_id);
    const [state, phones, meta] = await Promise.all([
      statesOf(ctx, ids),
      ids.length ? ctx.tx.selectFrom('contact_identities').select(['contact_id', 'external_id']).where('tenant_id', '=', ctx.tenantId).where('contact_id', 'in', ids).where('channel', '=', 'phone').where('valid_to', 'is', null).execute() : [],
      ids.length ? ctx.tx.selectFrom('entity_meta').select(['entity_id', 'key', 'value']).where('tenant_id', '=', ctx.tenantId).where('entity_type', '=', 'contact').where('entity_id', 'in', ids).execute() : [],
    ]);
    const m = (id: string, k: string) => (meta.find((x) => x.entity_id === id && x.key === k)?.value as string | undefined) ?? null;
    return paged(rows.map((r) => ({ contact: toContact(r), state: state(r.contact_id), phone: phones.find((p) => p.contact_id === r.contact_id)?.external_id ?? null, gender: m(r.contact_id, META.gender), birthday: m(r.contact_id, META.birthday) })),
      { page: i.page, pageSize: i.pageSize, total: Number(n) });
  },
  'cake.contact.get': async (ctx, i) => {
    const c = await ctx.tx.selectFrom('contacts').selectAll().where('tenant_id', '=', ctx.tenantId).where('contact_id', '=', i.contactId).executeTakeFirst();
    if (!c) throw failure('NOT_FOUND', 'Không tìm thấy khách.');
    const [state, ids, links, meta] = await Promise.all([
      statesOf(ctx, [c.contact_id]),
      ctx.tx.selectFrom('contact_identities').selectAll().where('tenant_id', '=', ctx.tenantId).where('contact_id', '=', c.contact_id).where('valid_to', 'is', null).orderBy('valid_from').execute(),
      sql<{ app: string; kind: string; ref_code: string; ref_id: string | null }>`SELECT app, kind, ref_code, ref_id FROM contact_links WHERE tenant_id = ${ctx.tenantId} AND contact_id = ${c.contact_id}`.execute(ctx.tx),
      ctx.tx.selectFrom('entity_meta').select(['key', 'value']).where('tenant_id', '=', ctx.tenantId).where('entity_type', '=', 'contact').where('entity_id', '=', c.contact_id).execute(),
    ]);
    return {
      contact: toContact(c), state: state(c.contact_id), links: links.rows.map((l) => ({ app: l.app, kind: l.kind, refCode: l.ref_code, refId: l.ref_id })), meta: Object.fromEntries(meta.map((x) => [x.key, x.value])),
      identities: ids.map((d) => ({ identityId: d.identity_id, contactId: d.contact_id, channel: d.channel, scope: d.scope, externalId: d.external_id, displayName: d.display_name, confidence: d.confidence, proof: d.proof ?? null, validFrom: iso(d.valid_from), validTo: isoN(d.valid_to) })),
    };
  },
  // Gợi ý (KHÔNG ghép): khách khác cùng tên hiển thị hoặc cùng "tên thật" (lớp mềm) — như bộ giả lập; ghép thật cần bằng chứng (cake.contact.merge).
  'cake.contact.suggestions': async ({ tx, tenantId }, i) => {
    const me = await tx.selectFrom('contacts').select(['contact_id', 'display_name']).where('tenant_id', '=', tenantId).where('contact_id', '=', i.contactId).executeTakeFirst();
    if (!me) throw failure('NOT_FOUND', 'Không tìm thấy khách.');
    const realName = sql<string>`(SELECT value #>> '{}' FROM entity_meta WHERE tenant_id = c.tenant_id AND entity_type = 'contact' AND entity_id = c.contact_id AND key = 'cake.contact.real_name')`;
    const names = [me.display_name.toLowerCase()];
    const rows = await tx.selectFrom('contacts as c').innerJoin('contact_identities as d', (j) => j.onRef('d.contact_id', '=', 'c.contact_id').on('d.valid_to', 'is', null))
      .select(['c.contact_id', 'c.display_name', 'd.channel', 'd.scope', 'd.external_id']).where('c.tenant_id', '=', tenantId).where('c.status', '=', 'active').where('c.contact_id', '<>', me.contact_id)
      .where((e) => e.or([e(sql`lower(c.display_name)`, 'in', names), e(sql`lower(${realName})`, 'in', names)])).orderBy('c.contact_id').orderBy('d.valid_from').execute();
    const seen = new Set<string>();
    return rows.filter((r) => !seen.has(r.contact_id) && seen.add(r.contact_id))
      .map((r) => ({ contactId: r.contact_id, displayName: r.display_name, why: ['same_name'], identity: { channel: r.channel, scope: r.scope, externalId: r.external_id } }));
  },
  'cake.contact.timeline': async ({ tx, tenantId }, i) => {
    const merged = (await tx.selectFrom('contacts').select('contact_id').where('tenant_id', '=', tenantId).where('merged_into', '=', i.contactId).execute()).map((r) => r.contact_id);
    const rows = await tx.selectFrom('touch_ledger as l').leftJoin('messages as m', 'm.touch_id', 'l.touch_id').where('l.tenant_id', '=', tenantId).where('l.contact_id', 'in', [i.contactId, ...merged])
      .select(['l.touch_id', 'l.kind', 'l.channel', 'l.channel_account_id', 'l.conversation_id', 'l.direction', 'l.is_reversal', 'l.at', 'm.body']).orderBy('l.at', 'desc').orderBy('l.touch_id', 'desc').limit(i.limit).execute();
    return rows.map((r) => ({
      touchId: String(r.touch_id), contactId: i.contactId, kind: r.kind, channel: r.channel, channelAccountId: r.channel_account_id, conversationId: r.conversation_id, direction: r.direction,
      summary: `${KIND_LABEL[r.kind] ?? r.kind}${r.body ? `: ${r.body.slice(0, 80)}` : ''}`, docRef: null, isReversal: r.is_reversal, at: iso(r.at),
    }));
  },
};
