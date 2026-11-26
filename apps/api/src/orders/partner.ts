// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-2/3 — khách công nợ ở Kế Toán (mockup ⑥ ⑦ đã duyệt):
//   get    = liên kết + số dư theo tài khoản đọc từ Kế Toán (đệm 5 phút theo đơn vị × mã; "Đọc lại" bỏ đệm; Kế Toán không trả lời ⇒ giữ số lần đọc gần nhất + báo lỗi);
//   create = PUT /partners/<mã> rồi lưu contact_links (mã: SĐT đã xác minh → CAKE-<contact_id>, R-CAKE-MASTER-5). Số dư KHÔNG lưu ở Cake (R-MD-2, R-STD-ORD-3).
import type { Db } from '@bizcity/platform/db/client';
import type { PartnerDebt } from '@open-cake/contracts';
import { cakeError, failure, type Ctx } from '../runtime.js';
import { ketoanBalances, ketoanPutPartner, type KetoanBalances } from './clients.js';
import { customerOf, ketoanLinked } from './service.js';

const TTL = 5 * 60_000;
const cache = new Map<string, { at: number; data: KetoanBalances }>();
const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10); // ngày theo giờ Việt Nam
const round2 = (n: number) => Math.round(n * 100) / 100;
const toBalances = (c: { at: number; data: KetoanBalances }): NonNullable<PartnerDebt['balances']> => ({
  asOf: c.data.asOf, readAt: new Date(c.at).toISOString(), accounts: c.data.accounts, total: round2(c.data.accounts.reduce((s, a) => s + a.balance, 0)),
});

async function view(tx: Db, tenantId: string, contactId: string, refresh: boolean): Promise<PartnerDebt> {
  const [c, k, link] = await Promise.all([
    customerOf(tx, tenantId, contactId), ketoanLinked(tx, tenantId),
    tx.selectFrom('contact_links').select(['ref_code', 'push_status']).where('tenant_id', '=', tenantId).where('contact_id', '=', contactId).where('app', '=', 'ketoan').where('kind', '=', 'partner').executeTakeFirst(),
  ]);
  const linked = link?.push_status === 'accepted';
  const out: PartnerDebt = {
    source: k?.okt_base_url && process.env.CAKE_OKT_API_KEY ? 'ketoan' : 'none', linked, refCode: link?.ref_code ?? null,
    proposed: { code: c.partnerCode, kind: c.verified ? 'phone' : 'contact', name: c.name, phone: c.phone, verified: c.verified },
    branchCode: k?.branch_code ?? null, balances: null, error: null,
  };
  if (out.source === 'none' || !linked || !k?.okt_base_url) return out;
  const key = `${tenantId}|${k.branch_code ?? ''}|${link!.ref_code}`;
  const hit = cache.get(key);
  if (!refresh && hit && Date.now() - hit.at < TTL) return { ...out, balances: toBalances(hit) };
  const got = await ketoanBalances(k.okt_base_url, link!.ref_code, today(), k.branch_code ?? null);
  if (got?.data) {
    const fresh = { at: Date.now(), data: got.data };
    cache.set(key, fresh);
    return { ...out, balances: toBalances(fresh) };
  }
  const error = got?.status === 404 ? `Kế Toán chưa có đối tượng mã ${link!.ref_code}.` : got ? `Kế Toán trả lỗi ${got.status}.` : 'Kế Toán không trả lời.';
  return { ...out, balances: hit ? toBalances(hit) : null, error };
}

export const partnerHandlers: Record<string, (ctx: Ctx, i: Record<string, any>) => Promise<unknown>> = { // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod của spec
  'cake.partner.get': ({ tx, tenantId }, i) => view(tx, tenantId, i.contactId, !!i.refresh),
  'cake.partner.create': async ({ tx, tenantId }, i) => {
    const k = await ketoanLinked(tx, tenantId);
    if (!k?.okt_base_url || !process.env.CAKE_OKT_API_KEY) throw cakeError('CAKE_KETOAN_REQUIRED');
    const c = await customerOf(tx, tenantId, i.contactId);
    // một mã đối tượng chỉ gắn một khách (chỉ mục contact_links_ref) — trùng SĐT giữa hai khách ⇒ ghép khách trước
    const other = await tx.selectFrom('contact_links').select('contact_id').where('tenant_id', '=', tenantId).where('app', '=', 'ketoan').where('kind', '=', 'partner').where('ref_code', '=', c.partnerCode).where('contact_id', '<>', i.contactId).executeTakeFirst();
    if (other) throw failure('CONFLICT', `Mã ${c.partnerCode} đã gắn với một khách khác — ghép hai khách trước khi tạo.`, { reason: 'CAKE_PARTNER_FAILED' });
    const res = await ketoanPutPartner(k.okt_base_url, c.partnerCode, { name: i.name ?? c.name, ...(c.verified && c.phone ? { phone: c.phone } : {}) });
    if (!res || res.status >= 300) throw cakeError('CAKE_PARTNER_FAILED', res ? `Kế Toán từ chối (${res.status})${res.message ? `: ${res.message}` : '.'}` : 'Không tới được Kế Toán.');
    const v = { ref_code: c.partnerCode, ref_id: res.id, push_status: 'accepted' as const, push_error: null, linked_at: new Date() };
    await tx.insertInto('contact_links').values({ tenant_id: tenantId, contact_id: i.contactId, app: 'ketoan', kind: 'partner', ...v })
      .onConflict((o) => o.columns(['tenant_id', 'contact_id', 'app', 'kind']).doUpdateSet(v)).execute();
    return view(tx, tenantId, i.contactId, true);
  },
};
