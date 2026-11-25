// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — 6 action ĐỌC của hộp thư / danh bạ / Contact 360 trên Postgres (bảng 0101 do care-kernel ghi qua PgCareRepo):
//   kênh, hội thoại, tin, danh bạ, hồ sơ, dòng thời gian. Chỉ đọc — mọi ghi vào sổ đi MỘT CỬA submitTouchIn (ingress) hoặc lệnh kernel. Đếm / ghép theo lô, không truy vấn từng dòng.
import { sql } from 'kysely';
import '../db-types.js';
import { failure, paged, type Ctx, type Handler } from '../runtime.js';
import { assertConversationVisible, scopeSql, visibleAccounts } from './scope.js';

const iso = (d: Date | string) => new Date(d).toISOString();
// [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: con trỏ keyset (thời điểm, id) — ổn định khi có dòng mới chen vào; mờ với client (base64url).
const encCursor = (at: Date | string, id: string) => Buffer.from(JSON.stringify([iso(at), id])).toString('base64url');
function decCursor(raw: string | undefined): [string, string] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (Array.isArray(v) && typeof v[0] === 'string' && !Number.isNaN(Date.parse(v[0])) && typeof v[1] === 'string' && v[1].length <= 64) return [v[0], v[1]];
  } catch { /* rơi xuống lỗi */ }
  throw failure('VALIDATION_ERROR', 'Con trỏ trang không hợp lệ — tải lại danh sách.', { field: 'cursor' });
}
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
    // [2026-11-24 09:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — chỉ tài khoản mình là thành viên (hoặc có hội thoại được giao); số chưa đọc chỉ tính hội thoại trong phạm vi.
    const scope = scopeSql(ctx);
    let cq = ctx.tx.selectFrom('conversations as v').select(['v.conversation_id', 'v.channel_account_id']).where('v.tenant_id', '=', ctx.tenantId);
    if (scope) cq = cq.where(scope);
    const [all, convs, mine] = await Promise.all([ctx.tx.selectFrom('channel_accounts').selectAll().where('tenant_id', '=', ctx.tenantId).orderBy('label').execute(), cq.execute(), visibleAccounts(ctx)]);
    const accs = mine ? all.filter((a) => mine.has(a.channel_account_id) || convs.some((c) => c.channel_account_id === a.channel_account_id)) : all;
    const unread = await unreadOf(ctx, convs.map((c) => c.conversation_id));
    return accs.map((a) => ({
      channelAccountId: a.channel_account_id, channel: a.channel, kind: a.kind, externalAccountId: a.external_account_id, label: a.label, ownerUserId: a.owner_user_id, status: a.status,
      testedAt: isoN(a.tested_at), unread: convs.filter((c) => c.channel_account_id === a.channel_account_id).reduce((s, c) => s + (unread.get(c.conversation_id) ?? 0), 0),
    }));
  },
  'cake.conversation.list': async (ctx, i) => {
    let q = ctx.tx.selectFrom('conversations as v').innerJoin('contacts as c', 'c.contact_id', 'v.contact_id').where('v.tenant_id', '=', ctx.tenantId).where('v.last_at', 'is not', null);
    const scope = scopeSql(ctx); // [2026-11-24 09:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5
    if (scope) q = q.where(scope);
    if (i.channelAccountId) q = q.where('v.channel_account_id', '=', i.channelAccountId);
    if (i.q) q = q.where('c.display_name', 'ilike', `%${i.q}%`);
    if (i.filter === 'unanswered') q = q.where('v.last_direction', '=', 'in');
    if (i.filter === 'mine') q = q.where('v.assignee_user_id', '=', ctx.userId ?? '-');
    if (i.tag) q = q.where(sql<boolean>`EXISTS (SELECT 1 FROM contact_state s WHERE s.tenant_id = v.tenant_id AND s.contact_id = v.contact_id AND ${i.tag} = ANY(s.tags))`); // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: lọc nhãn trong SQL để trang đủ dòng
    const after = decCursor(i.cursor);
    if (after) q = q.where(sql<boolean>`(v.last_at, v.conversation_id) < (${after[0]}::timestamptz, ${after[1]})`); // [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — "của tôi" = người đăng nhập
    const rows = await q.selectAll('v').select('c.display_name').orderBy('v.last_at', 'desc').orderBy('v.conversation_id', 'desc').limit(i.limit).execute();
    const tail = rows.length === i.limit ? rows[rows.length - 1]! : null;
    const ids = rows.map((r) => r.conversation_id);
    const [unread, state, last] = await Promise.all([
      unreadOf(ctx, ids), statesOf(ctx, rows.map((r) => r.contact_id)),
      ids.length ? sql<{ conversation_id: string; body: string }>`SELECT DISTINCT ON (conversation_id) conversation_id, body FROM messages WHERE tenant_id = ${ctx.tenantId} AND conversation_id IN (${sql.join(ids)}) ORDER BY conversation_id, at DESC`.execute(ctx.tx) : { rows: [] },
    ]);
    const lastText = new Map(last.rows.map((r) => [r.conversation_id, r.body]));
    return paged(rows
      .map((r) => ({
        conversationId: r.conversation_id, channelAccountId: r.channel_account_id, externalThreadId: r.external_thread_id, contactId: r.contact_id, kind: r.kind, anchor: r.anchor ?? null,
        title: r.display_name, lastText: lastText.get(r.conversation_id) ?? '', lastAt: iso(r.last_at!), lastDirection: r.last_direction ?? 'in', unread: unread.get(r.conversation_id) ?? 0,
        tags: state(r.contact_id).tags, assigneeUserId: r.assignee_user_id, windowUntil: isoN(r.window_until), pinned: false,
      }))
      .filter((c) => i.filter !== 'unread' || c.unread > 0), { nextCursor: tail ? encCursor(tail.last_at!, tail.conversation_id) : null }); // 'chưa đọc' lọc sau ⇒ trang có thể ngắn hơn limit, con trỏ vẫn đúng
  },
  'cake.message.list': async (ctx, i) => {
    await assertConversationVisible(ctx, i.conversationId); // [2026-11-24 09:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5
    const { tx, tenantId } = ctx;
    // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: trang MỚI NHẤT trước, con trỏ đi lùi về tin cũ hơn (cuộn lên); trong trang vẫn xếp cũ → mới.
    const before = decCursor(i.cursor);
    let mq = tx.selectFrom('messages').selectAll().where('tenant_id', '=', tenantId).where('conversation_id', '=', i.conversationId);
    if (before) mq = mq.where(sql<boolean>`(at, message_id) < (${before[0]}::timestamptz, ${before[1]})`);
    const rows = await mq.orderBy('at', 'desc').orderBy('message_id', 'desc').limit(i.limit).execute();
    const oldest = rows.length === i.limit ? rows[rows.length - 1]! : null;
    return paged(rows.reverse().map((m) => ({ messageId: m.message_id, conversationId: m.conversation_id, direction: m.direction, text: m.body, attachments: (m.attachments as unknown[]) ?? [], at: iso(m.at), e2ee: m.e2ee, delivery: m.delivery, reaction: null, sentByUserId: null })), { nextCursor: oldest ? encCursor(oldest.at, oldest.message_id) : null });
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
  'cake.contact.timeline': async (ctx, i) => {
    const { tx, tenantId } = ctx;
    const merged = (await tx.selectFrom('contacts').select('contact_id').where('tenant_id', '=', tenantId).where('merged_into', '=', i.contactId).execute()).map((r) => r.contact_id);
    const rows = await tx.selectFrom('touch_ledger as l').leftJoin('messages as m', 'm.touch_id', 'l.touch_id').where('l.tenant_id', '=', tenantId).where('l.contact_id', 'in', [i.contactId, ...merged])
      .select(['l.touch_id', 'l.kind', 'l.channel', 'l.channel_account_id', 'l.conversation_id', 'l.direction', 'l.is_reversal', 'l.at', 'm.body']).orderBy('l.at', 'desc').orderBy('l.touch_id', 'desc').limit(i.limit).execute();
    // [2026-11-24 09:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — tin của hội thoại ngoài phạm vi: vẫn thấy CÓ chạm (kênh, giờ), không thấy nội dung.
    const convIds = [...new Set(rows.map((r) => r.conversation_id).filter((x): x is string => !!x))];
    const scope = scopeSql(ctx);
    let vq = tx.selectFrom('conversations as v').select('v.conversation_id').where('v.tenant_id', '=', tenantId).where('v.conversation_id', 'in', convIds.length ? convIds : ['-']);
    if (scope) vq = vq.where(scope);
    const seen = new Set((await vq.execute()).map((r) => r.conversation_id));
    return rows.map((r) => ({ ...r, body: !r.conversation_id || seen.has(r.conversation_id) ? r.body : null })).map((r) => ({
      touchId: String(r.touch_id), contactId: i.contactId, kind: r.kind, channel: r.channel, channelAccountId: r.channel_account_id, conversationId: r.conversation_id, direction: r.direction,
      summary: `${KIND_LABEL[r.kind] ?? r.kind}${r.body ? `: ${r.body.slice(0, 80)}` : ''}`, docRef: null, isReversal: r.is_reversal, at: iso(r.at),
    }));
  },
};
