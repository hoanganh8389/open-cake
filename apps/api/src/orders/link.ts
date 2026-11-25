// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-7/8 — đọc tồn Kế Toán (bizcity_stock_read@1, đệm 60 giây theo đơn vị × chi nhánh × mã — R-STD-ORD-3,
//   không ghi vào danh mục) và kết nối cửa hàng (khoá / bí mật lưu mã hoá; chỉ lưu được khi đơn vị đã nối Kế Toán — Q-ORD-6).
import type { Db } from '@bizcity/platform/db/client';
import type { PosLink, StockRead } from '@open-cake/contracts';
import { cakeError, type Ctx } from '../runtime.js';
import { POS_PATH, ketoanStock, open, posCall, seal } from './clients.js';
import { ketoanLinked } from './service.js';

const cache = new Map<string, { at: number; row: StockRead['rows'][number] | null; asOf: string }>();
const TTL = 60_000;
export const EVENTS_PATH = '/ingress/v1/pos-events';

async function linkOf(tx: Db, tenantId: string): Promise<PosLink> {
  const [l, k] = await Promise.all([tx.selectFrom('pos_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst(), ketoanLinked(tx, tenantId)]);
  const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
  return {
    baseUrl: l?.base_url ?? null, keyPrefix: l?.key_prefix ?? null, hasSecret: !!l, branchCode: l?.branch_code ?? k?.branch_code ?? null, ketoanLinked: !!k,
    lastOkAt: iso(l?.last_ok_at), lastSentAt: iso(l?.last_sent_at), lastError: l?.last_error ?? null, eventsPath: EVENTS_PATH,
  };
}

export const linkHandlers: Record<string, (ctx: Ctx, i: Record<string, any>) => Promise<unknown>> = { // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod của spec
  'cake.stock.read': async ({ tx, tenantId }, i) => {
    const ids = String(i.itemIds).split(',');
    const k = await ketoanLinked(tx, tenantId);
    const branch = (await tx.selectFrom('pos_links').select('branch_code').where('tenant_id', '=', tenantId).executeTakeFirst())?.branch_code ?? k?.branch_code ?? null;
    if (!k?.okt_base_url || !branch) return { source: 'none', branchCode: branch, asOf: null, rows: [] };
    const items = await tx.selectFrom('catalog_items').select(['item_id', 'sku']).where('tenant_id', '=', tenantId).where('item_id', 'in', ids).execute();
    const key = (id: string) => `${tenantId}|${branch}|${id}`;
    const now = Date.now();
    const miss = items.filter((it) => !((cache.get(key(it.item_id))?.at ?? 0) > now - TTL));
    if (miss.length) {
      const got = await ketoanStock(k.okt_base_url, branch, miss.map((m) => m.sku));
      if (!got && miss.length === items.length) return { source: 'none', branchCode: branch, asOf: null, rows: [] };
      for (const m of miss) {
        const r = got?.rows.find((x) => x.item.code === m.sku);
        cache.set(key(m.item_id), { at: now, asOf: got?.asOf ?? new Date(now).toISOString(), row: r ? { itemId: m.item_id, onHand: r.onHand, pendingOut: r.pendingOut, held: r.held, available: r.available, error: r.error ?? null } : null });
      }
    }
    const hits = items.map((it) => cache.get(key(it.item_id))!).filter((c) => c?.row);
    return { source: 'ketoan', branchCode: branch, asOf: hits.map((h) => h.asOf).sort()[0] ?? null, rows: hits.map((h) => h.row!) };
  },
  'cake.pos_link.get': async ({ tx, tenantId }) => linkOf(tx, tenantId),
  'cake.pos_link.set': async ({ tx, tenantId, actor }, i) => {
    if (!(await ketoanLinked(tx, tenantId))) throw cakeError('CAKE_KETOAN_REQUIRED');
    const prev = await tx.selectFrom('pos_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
    if (!prev && (!i.key || !i.secret)) throw cakeError('CAKE_POS_NOT_LINKED', 'Lần đầu cần dán cả khoá cửa hàng và bí mật ký.', { field: i.key ? 'secret' : 'key' });
    const v = {
      base_url: i.baseUrl, branch_code: i.branchCode, updated_by: actor, updated_at: new Date(),
      key_sealed: i.key ? seal(i.key) : prev!.key_sealed, key_prefix: i.key ? i.key.slice(0, 10) : prev!.key_prefix, secret_sealed: i.secret ? seal(i.secret) : prev!.secret_sealed,
    };
    if (prev) await tx.updateTable('pos_links').set(v).where('tenant_id', '=', tenantId).execute();
    else await tx.insertInto('pos_links').values({ ...v, tenant_id: tenantId }).execute();
    return linkOf(tx, tenantId);
  },
  'cake.pos_link.test': async ({ tx, tenantId }) => {
    const l = await tx.selectFrom('pos_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
    if (!l) throw cakeError('CAKE_POS_NOT_LINKED');
    // Đọc trạng thái một docRef không có: máy nhận đúng khoá + chữ ký trả 200 (danh sách rỗng); sai khoá ⇒ 401.
    let status = 0;
    try { status = (await posCall({ baseUrl: l.base_url, key: open(l.key_sealed), secret: open(l.secret_sealed) }, 'GET', `${POS_PATH}?docRefs=cake.order_request:00000000000000000000000000`)).status; } catch { status = 0; } // nuot-loi: ghi vào last_error ngay dưới
    await tx.updateTable('pos_links').set(status === 200 ? { last_ok_at: new Date(), last_error: null } : { last_error: status ? `HTTP ${status}` : 'không tới được' }).where('tenant_id', '=', tenantId).execute();
    return linkOf(tx, tenantId);
  },
};
