// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: handler giả lập cho khách / Contact 360 / ghép — đúng luật R-CAKE-ID-2
//   (ghép cần bằng chứng, đã kiểm ở schema), UNMERGE trong thời hạn, chuyển danh tính + hội thoại, không sửa dòng sổ cũ.
import { ApiError } from '../client.js';
import { sliceCursor } from './handlers-inbox.js';
import { byTimeDesc, iso, nextId, paged, type Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
const live = (s: Store, id: string) => {
  const c = s.contacts.find((x) => x.contactId === id);
  if (!c) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy khách.' });
  return c;
};
const phoneOf = (s: Store, id: string) => s.identities.find((x) => x.contactId === id && x.channel === 'phone' && !x.validTo)?.externalId ?? null;
const row = (s: Store, id: string) => {
  const m = s.meta[id] ?? {};
  return { contact: live(s, id), state: s.states[id]!, phone: phoneOf(s, id), gender: m['cake.contact.gender'] ?? null, birthday: m['cake.contact.birthday'] ?? null, realName: m['cake.contact.real_name'] ?? null };
};

export const contactHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.contact.list': (s, i) => {
    let xs = s.contacts.filter((c) => c.status === 'active').map((c) => row(s, c.contactId));
    if (i.tag) xs = xs.filter((r) => r.state.tags.includes(i.tag));
    if (i.gender) xs = xs.filter((r) => r.gender === i.gender);
    if (i.q) { const q = String(i.q).toLowerCase(); xs = xs.filter((r) => r.contact.displayName.toLowerCase().includes(q) || (r.phone ?? '').includes(q)); }
    if (i.birthday === 'month') { const mm = String(s.now().getMonth() + 1).padStart(2, '0'); xs = xs.filter((r) => r.birthday?.slice(5, 7) === mm); }
    xs.sort((a, b) => (i.sort === 'name' ? a.contact.displayName.localeCompare(b.contact.displayName, 'vi') : byTimeDesc(a.state.lastInAt, b.state.lastInAt)));
    const start = (i.page - 1) * i.pageSize;
    return paged(xs.slice(start, start + i.pageSize), { page: i.page, pageSize: i.pageSize, total: xs.length });
  },
  'cake.contact.get': (s, i) => ({
    contact: live(s, i.contactId), state: s.states[i.contactId]!,
    identities: s.identities.filter((x) => x.contactId === i.contactId && !x.validTo),
    links: s.links[i.contactId] ?? [], meta: s.meta[i.contactId] ?? {},
  }),
  'cake.contact.timeline': (s, i) => {
    // Dòng thời gian của khách gồm cả khách đã ghép vào (giải merged_into, không sửa dòng cũ).
    const ids = [i.contactId, ...s.contacts.filter((c) => c.mergedInto === i.contactId).map((c) => c.contactId)];
    const xs = ids.flatMap((id) => s.timeline[id] ?? []).sort((a, b) => byTimeDesc(a.at, b.at));
    return sliceCursor(xs, i);
  },
  'cake.contact.lookup': (s, i) => {
    const key = i.phone ? ['phone', 'global', i.phone] : i.email ? ['email', 'global', i.email] : i.taxCode ? ['tax_code', 'global', i.taxCode] : [i.channel, i.scope, i.externalId];
    const idn = s.identities.find((x) => x.channel === key[0] && x.scope === key[1] && x.externalId === key[2] && !x.validTo && (i.channel || x.confidence === 'proven'));
    if (!idn) return null;
    const c = live(s, idn.contactId);
    return { contactId: c.contactId, displayName: c.displayName, status: c.status, mergedInto: c.mergedInto, confidence: idn.confidence };
  },
  'cake.contact.resolve': (s, i) => {
    for (const k of i.identities) {
      const idn = s.identities.find((x) => x.channel === k.channel && x.scope === k.scope && x.externalId === k.externalId && !x.validTo);
      if (idn) return { contactId: idn.contactId, created: false, confidence: idn.confidence };
    }
    const contactId = nextId(s, 'C');
    const at = iso(s.now());
    s.contacts.push({ contactId, kind: 'person', displayName: i.displayName, status: 'active', mergedInto: null, createdAt: at });
    s.states[contactId] = { contactId, stage: null, tags: [], ownerUserId: null, lastInAt: null, lastOutAt: null, unanswered: false, channels: {} };
    for (const k of i.identities) s.identities.push({ ...k, identityId: String(++s.seq), contactId, displayName: null, confidence: 'asserted', proof: null, validFrom: at, validTo: null });
    return { contactId, created: true, confidence: 'asserted' };
  },
  'cake.contact.suggestions': (s, i) => {
    const me = live(s, i.contactId);
    const names = new Set([me.displayName, s.meta[me.contactId]?.['cake.contact.real_name']].filter(Boolean).map((n) => String(n).toLowerCase()));
    return s.contacts
      .filter((c) => c.contactId !== me.contactId && c.status === 'active')
      .filter((c) => names.has(c.displayName.toLowerCase()) || names.has(String(s.meta[c.contactId]?.['cake.contact.real_name'] ?? '').toLowerCase()))
      .map((c) => {
        const idn = s.identities.find((x) => x.contactId === c.contactId && !x.validTo)!;
        return { contactId: c.contactId, displayName: c.displayName, why: ['same_name'], identity: { channel: idn.channel, scope: idn.scope, externalId: idn.externalId } };
      });
  },
  'cake.contact.merge': (s, i) => {
    const from = live(s, i.contactId), into = live(s, i.intoContactId);
    if (from.status !== 'active' || into.status !== 'active') throw new ApiError({ code: 'CONFLICT', message: 'Chỉ ghép hai khách đang hoạt động.' });
    const at = iso(s.now());
    const until = iso(new Date(s.now().getTime() + 30 * 86400_000));
    const moved = { identities: [] as string[], conversations: [] as string[] };
    for (const x of s.identities.filter((y) => y.contactId === from.contactId && !y.validTo)) {
      x.validTo = at; // đóng dòng cũ, mở dòng mới trỏ khách đích (không sửa lịch sử)
      const copy = { ...x, identityId: String(++s.seq), contactId: into.contactId, proof: i.proof, validFrom: at, validTo: null };
      s.identities.push(copy);
      moved.identities.push(copy.identityId);
    }
    for (const c of s.conversations.filter((y) => y.contactId === from.contactId)) { c.contactId = into.contactId; moved.conversations.push(c.conversationId); }
    Object.assign(from, { status: 'merged', mergedInto: into.contactId });
    s.merges[from.contactId] = { into: into.contactId, until, moved };
    (s.timeline[into.contactId] ??= []).push({ touchId: String(++s.seq), contactId: into.contactId, kind: 'merge', channel: null, channelAccountId: null, conversationId: null, direction: 'none', summary: `Ghép "${from.displayName}" vào khách này — bằng chứng: ${i.proof.kind}`, docRef: null, isReversal: false, at });
    return { intoContactId: into.contactId, unmergeUntil: until };
  },
  'cake.contact.unmerge': (s, i) => {
    const m = s.merges[i.contactId];
    if (!m) throw new ApiError({ code: 'NOT_FOUND', message: 'Khách này chưa bị ghép.' });
    if (new Date(m.until) < s.now()) throw ApiError.reason('CAKE_UNMERGE_EXPIRED');
    const at = iso(s.now());
    s.identities = s.identities.filter((x) => !m.moved.identities.includes(x.identityId));
    for (const x of s.identities.filter((y) => y.contactId === i.contactId && y.validTo)) x.validTo = null;
    for (const c of s.conversations.filter((y) => m.moved.conversations.includes(y.conversationId))) c.contactId = i.contactId;
    Object.assign(live(s, i.contactId), { status: 'active', mergedInto: null });
    (s.timeline[m.into] ??= []).push({ touchId: String(++s.seq), contactId: m.into, kind: 'merge', channel: null, channelAccountId: null, conversationId: null, direction: 'none', summary: 'Tách lại khách đã ghép (dòng đảo)', docRef: null, isReversal: true, at });
    delete s.merges[i.contactId];
    return { ok: true };
  },
  'cake.contact.link': (s, i) => { live(s, i.contactId); (s.links[i.contactId] ??= []).push(i.link); return { ok: true }; },
};
