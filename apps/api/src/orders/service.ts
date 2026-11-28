// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/7/8 — yêu cầu đặt hàng của CRM theo bizcity_order_flow@1 (mockup đã duyệt):
//   lưu nháp (giá lấy từ bảng giá công ty, không cho CRM sửa) → gửi sang cửa hàng (Idempotency-Key = docRef@version; cửa hàng chưa tới được ⇒ queued, tự gửi lại RC-ORDER-1)
//   → trạng thái do cửa hàng gửi về (pos-events.ts). Không ghi tồn, không tạo đơn bán / chứng từ kế toán (R-STD-ORD-5, R-STD-ORD-15).
import { createHash } from 'node:crypto';
import { sql } from 'kysely';
import { db, type Db } from '@bizcity/platform/db/client';
import { withRequestContext } from '@bizcity/platform/core/request-context';
import { orderCode, type OrderRequest } from '@open-cake/contracts';
import { cakeError, failure, newUlid, type Ctx } from '../runtime.js';
import { notifyChanged } from '../stream.js';
import { POS_PATH, open, posCall, type PosTarget } from './clients.js';
import { mirrorOrderRequest } from './document.js';

type Row = Awaited<ReturnType<typeof loadRow>>;
const iso = (d: Date | string | null) => (d === null ? null : new Date(d).toISOString());
const CAPS = ['cake.order.manage'];

async function loadRow(tx: Db, tenantId: string, id: string) {
  return tx.selectFrom('order_requests').selectAll().where('tenant_id', '=', tenantId).where('order_request_id', '=', id).executeTakeFirst();
}

export async function toOrders(tx: Db, tenantId: string, rows: NonNullable<Row>[]): Promise<OrderRequest[]> {
  const ids = rows.map((r) => r.order_request_id);
  const evs = ids.length ? await tx.selectFrom('order_request_events').selectAll().where('tenant_id', '=', tenantId).where('order_request_id', 'in', ids).orderBy('at').execute() : [];
  return rows.map((r) => ({
    orderRequestId: r.order_request_id, code: orderCode(r.order_request_id), contactId: r.contact_id, conversationId: r.conversation_id,
    status: r.status as OrderRequest['status'], sendState: r.send_state as OrderRequest['sendState'], lastError: r.last_error,
    version: r.version, branchCode: r.branch_code, customer: r.customer as OrderRequest['customer'], shipTo: (r.ship_to ?? null) as OrderRequest['shipTo'],
    lines: r.lines as OrderRequest['lines'], payment: r.payment as OrderRequest['payment'], shipping: r.shipping as OrderRequest['shipping'], preferredCarrier: r.preferred_carrier,
    note: r.note, total: Number(r.total), posRef: r.pos_ref, orderRef: r.order_ref, rejectReason: r.reject_reason,
    events: evs.filter((e) => e.order_request_id === r.order_request_id).map((e) => ({ type: e.type, at: iso(e.at)!, data: (e.data ?? {}) as Record<string, unknown> })),
    createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!, expiresAt: iso(r.expires_at),
  }));
}
const one = async (tx: Db, tenantId: string, id: string) => {
  const r = await loadRow(tx, tenantId, id);
  if (!r) throw failure('NOT_FOUND', 'Không tìm thấy yêu cầu đặt hàng.');
  return (await toOrders(tx, tenantId, [r]))[0]!;
};

/** Khách lúc lưu: SĐT đang hiệu lực; mã đối tượng công nợ = SĐT đã xác minh → CAKE-<contact_id> (SPINE §2, R-STD-ORD-10). */
async function customerOf(tx: Db, tenantId: string, contactId: string) {
  const c = await tx.selectFrom('contacts').select(['display_name']).where('tenant_id', '=', tenantId).where('contact_id', '=', contactId).executeTakeFirst();
  if (!c) throw failure('NOT_FOUND', 'Không tìm thấy khách.');
  const p = await tx.selectFrom('contact_identities').select(['external_id', 'confidence']).where('tenant_id', '=', tenantId).where('contact_id', '=', contactId)
    .where('channel', '=', 'phone').where('valid_to', 'is', null).orderBy(sql`confidence = 'proven'`, 'desc').executeTakeFirst();
  const verified = p?.confidence === 'proven';
  return { name: c.display_name, phone: p?.external_id ?? null, partnerCode: verified ? p!.external_id : `CAKE-${contactId}`, verified };
}

/** Giá bán công ty theo ĐVT bán mặc định (cùng nguồn với "Gửi giá" trong chat). */
async function priced(tx: Db, tenantId: string, lines: { itemId: string; qty: number; note?: string }[]) {
  const ids = [...new Set(lines.map((l) => l.itemId))];
  const items = await tx.selectFrom('catalog_items').select(['item_id', 'sku', 'name', 'base_unit']).where('tenant_id', '=', tenantId).where('item_id', 'in', ids).where('status', '=', 'active').execute();
  const units = await tx.selectFrom('catalog_item_units').select(['item_id', 'unit']).where('tenant_id', '=', tenantId).where('item_id', 'in', ids).where('is_default_sale', '=', true).execute();
  const prices = await tx.selectFrom('catalog_prices as p').innerJoin('catalog_price_lists as l', (j) => j.onRef('l.tenant_id', '=', 'p.tenant_id').onRef('l.code', '=', 'p.price_list_code'))
    .select(['p.item_id', 'p.unit', 'p.price']).where('p.tenant_id', '=', tenantId).where('l.is_company', '=', true).where('p.item_id', 'in', ids).execute();
  return lines.map((l, i) => {
    const it = items.find((x) => x.item_id === l.itemId);
    if (!it) throw failure('VALIDATION_ERROR', 'Mặt hàng không còn bán.', { field: `lines.${i}.itemId` });
    const uom = units.find((u) => u.item_id === l.itemId)?.unit ?? it.base_unit;
    const p = prices.find((x) => x.item_id === l.itemId && x.unit === uom);
    if (!p) throw cakeError('CAKE_ITEM_NO_PRICE', `${it.name} chưa có giá bán của công ty.`, { field: `lines.${i}.itemId` });
    const price = Number(p.price);
    return { line: i + 1, itemId: it.item_id, sku: it.sku, name: it.name, uom, qty: l.qty, price, amount: Math.round(price * l.qty * 100) / 100, ...(l.note ? { note: l.note } : {}) };
  });
}

async function addEvent(tx: Db, tenantId: string, orderRequestId: string, eventId: string, type: string, data: Record<string, unknown>, at = new Date()) {
  const r = await tx.insertInto('order_request_events').values({ tenant_id: tenantId, event_id: eventId, order_request_id: orderRequestId, type, data: JSON.stringify(data), at })
    .onConflict((o) => o.columns(['tenant_id', 'event_id']).doNothing()).returning('event_id').executeTakeFirst();
  return !!r;
}

async function posTarget(tx: Db, tenantId: string): Promise<(PosTarget & { branchCode: string }) | null> {
  const l = await tx.selectFrom('pos_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
  return l ? { baseUrl: l.base_url, key: open(l.key_sealed), secret: open(l.secret_sealed), branchCode: l.branch_code } : null;
}
export async function ketoanLinked(tx: Db, tenantId: string) {
  const l = await tx.selectFrom('tenant_links').select(['catalog_source', 'okt_base_url', 'branch_code']).where('tenant_id', '=', tenantId).executeTakeFirst();
  return l?.catalog_source === 'ketoan' ? l : null;
}

/** Thân bizcity_order_request@1 (§3). item.id chỉ gửi khi là id CỦA Kế Toán (ext_id) — R-SPINE-1; còn lại gửi mã. */
async function payloadOf(tx: Db, tenantId: string, r: NonNullable<Row>, actor: string) {
  const t = await tx.selectFrom('tenants').select('code').where('id', '=', tenantId).executeTakeFirstOrThrow();
  const lines = r.lines as { line: number; itemId: string; sku: string; uom: string; qty: number; price: number; note?: string }[];
  const ext = await tx.selectFrom('catalog_items').select(['item_id', 'ext_id']).where('tenant_id', '=', tenantId).where('item_id', 'in', lines.map((l) => l.itemId)).execute();
  const cust = r.customer as { name: string; phone: string | null; partnerCode: string; verified: boolean };
  const conv = r.conversation_id ? await tx.selectFrom('conversations as c').innerJoin('channel_accounts as a', 'a.channel_account_id', 'c.channel_account_id').select('a.channel').where('c.conversation_id', '=', r.conversation_id).executeTakeFirst() : null;
  const channel = (['zalo', 'facebook', 'website', 'phone'] as const).find((c) => conv?.channel?.startsWith(c)) ?? 'other';
  const shipTo = r.ship_to as { name: string; phone: string; address: string } | null;
  const uid = /^user:([1-9][0-9]*)$/.exec(actor)?.[1];
  return {
    docRef: `cake.order_request:${r.order_request_id}`, version: r.version, tenant: t.code, branchCode: r.branch_code!, channel,
    customer: {
      partner: { code: cust.partnerCode },
      ...(cust.phone && cust.verified ? { identity: { kind: 'phone', value: `sha256:${createHash('sha256').update(cust.phone).digest('hex')}`, proof: 'channel' } } : {}),
      name: cust.name, ...(shipTo ? { shipTo } : {}),
    },
    lines: lines.map((l) => {
      const id = ext.find((e) => e.item_id === l.itemId)?.ext_id;
      return { line: l.line, item: { ...(id && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id) ? { id } : {}), code: l.sku }, uom: l.uom, qty: l.qty, proposedPrice: l.price, ...(l.note ? { note: l.note } : {}) };
    }),
    payment: { method: r.payment }, shipping: { method: r.shipping, ...(r.preferred_carrier ? { preferredCarrier: r.preferred_carrier } : {}) },
    ...(r.note ? { note: r.note } : {}), createdBy: { sub: uid ? `biz:user-${uid}` : 'biz:open-cake' },
  };
}

/** Gửi một yêu cầu sang cửa hàng. 202 ⇒ sent; 4xx (mã lạ, sai chi nhánh…) ⇒ trả về nháp kèm lỗi để nhân viên sửa; mạng / 5xx ⇒ queued, gửi lại sau. */
export async function deliver(tx: Db, tenantId: string, r: NonNullable<Row>, actor: string) {
  const target = await posTarget(tx, tenantId);
  if (!target) throw cakeError('CAKE_POS_NOT_LINKED');
  const body = await payloadOf(tx, tenantId, r, actor);
  let res: Awaited<ReturnType<typeof posCall>> | null = null;
  try { res = await posCall(target, 'POST', POS_PATH, body, `${body.docRef}@${body.version}`); } catch { res = null; } // nuot-loi: mạng hỏng ⇒ queued (R-SPINE-7 gửi sau)
  const now = new Date();
  if (res && res.status === 202 && res.json?.data?.posRef) {
    const d = res.json.data as { posRef: string; expiresAt?: string };
    await tx.updateTable('order_requests').set({ status: 'pending', send_state: 'sent', last_error: null, next_send_at: null, pos_ref: d.posRef, expires_at: d.expiresAt ?? null, updated_at: now })
      .where('tenant_id', '=', tenantId).where('order_request_id', '=', r.order_request_id).execute();
    await addEvent(tx, tenantId, r.order_request_id, `local:sent:${r.order_request_id}:${r.version}`, 'cake.sent', { posRef: d.posRef, by: actor }, now);
    await tx.updateTable('pos_links').set({ last_sent_at: now, last_ok_at: now, last_error: null }).where('tenant_id', '=', tenantId).execute();
  } else if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
    const msg = res.json?.error?.message ?? `Cửa hàng từ chối (${res.status}).`;
    await tx.updateTable('order_requests').set({ status: 'draft', send_state: 'none', last_error: `${res.json?.error?.code ?? res.status}: ${msg}`, next_send_at: null, updated_at: now })
      .where('tenant_id', '=', tenantId).where('order_request_id', '=', r.order_request_id).execute();
  } else {
    const attempts = r.send_attempts + 1;
    const wait = Math.min(60, 2 ** Math.min(attempts - 1, 6)) * 60_000; // 1 → 60 phút, như bridge
    await tx.updateTable('order_requests').set({ status: 'pending', send_state: 'queued', send_attempts: attempts, next_send_at: new Date(now.getTime() + wait),
      last_error: res ? `Cửa hàng trả ${res.status}` : 'Không tới được cửa hàng', updated_at: now }).where('tenant_id', '=', tenantId).where('order_request_id', '=', r.order_request_id).execute();
    await tx.updateTable('pos_links').set({ last_error: res ? `HTTP ${res.status}` : 'không tới được' }).where('tenant_id', '=', tenantId).execute();
  }
  await mirrorOrderRequest(tx, tenantId, r.order_request_id, actor);
}

/** RC-ORDER-1: gửi lại các yêu cầu đang queued đến hạn (mọi đơn vị; mỗi yêu cầu chạy trong ngữ cảnh đơn vị của nó). */
export async function retryQueuedOrders(limit = 20): Promise<number> {
  const due = await db.selectFrom('order_requests').select(['tenant_id', 'order_request_id', 'created_by']).where('send_state', '=', 'queued').where('next_send_at', '<=', new Date()).limit(limit).execute();
  for (const d of due) {
    await withRequestContext({ requestId: `retry-${d.order_request_id}`, correlationId: d.order_request_id, tenantId: d.tenant_id }, () => db.transaction().execute(async (tx) => {
      const r = await loadRow(tx, d.tenant_id, d.order_request_id);
      if (r?.send_state === 'queued') { await deliver(tx, d.tenant_id, r, d.created_by); await notifyChanged(tx, d.tenant_id, CAPS); }
    }));
  }
  return due.length;
}

/**
 * [2026-11-26 11:31 AM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-6 — RC-ORDER-1 (bizcity_order_flow@1 §6): yêu cầu đã gửi > 15 phút mà cửa hàng chưa báo gì
 * phải CÓ trạng thái ở cửa hàng (GET ?docRefs=); thiếu ⇒ gửi lại CÙNG khoá `docRef@version` (cửa hàng chống lặp ⇒ cùng posRef). Có rồi ⇒ chỉ ghi dấu đã kiểm
 * (updated_at) để 15 phút sau mới kiểm lại. Không tới được cửa hàng ⇒ để nguyên, lượt sau thử lại. Không tự sửa trạng thái — trạng thái chỉ đến từ sự kiện POS.
 */
export async function reconcileSentOrders(limit = 20, olderThanMs = 15 * 60_000): Promise<{ checked: number; resent: number }> {
  const due = await db.selectFrom('order_requests').select(['tenant_id', 'order_request_id', 'created_by'])
    .where('send_state', '=', 'sent').where('status', '=', 'pending').where('status_at', 'is', null).where('updated_at', '<=', new Date(Date.now() - olderThanMs))
    .orderBy('updated_at').limit(limit).execute();
  let resent = 0;
  const byTenant = new Map<string, typeof due>();
  for (const d of due) byTenant.set(d.tenant_id, [...(byTenant.get(d.tenant_id) ?? []), d]);
  for (const [tenantId, rows] of byTenant) {
    await withRequestContext({ requestId: `reconcile-${tenantId}`, correlationId: `reconcile-${tenantId}`, tenantId }, () => db.transaction().execute(async (tx) => {
      const target = await posTarget(tx, tenantId);
      if (!target) return;
      const docRefs = rows.map((d) => `cake.order_request:${d.order_request_id}`);
      let known: Set<string>;
      try {
        const res = await posCall(target, 'GET', `${POS_PATH}?docRefs=${encodeURIComponent(docRefs.join(','))}`);
        if (res.status !== 200 || !Array.isArray(res.json?.data)) return; // không đọc được ⇒ không kết luận "thiếu"
        known = new Set((res.json!.data as { docRef?: string }[]).map((x) => String(x.docRef)));
      } catch { return; } // nuot-loi: mạng hỏng ⇒ lượt sau thử lại
      for (const d of rows) {
        const r = await loadRow(tx, tenantId, d.order_request_id);
        if (!r || r.send_state !== 'sent' || r.status !== 'pending' || r.status_at) continue; // đã đổi trong lúc chờ
        if (known.has(`cake.order_request:${d.order_request_id}`)) {
          await tx.updateTable('order_requests').set({ updated_at: new Date() }).where('tenant_id', '=', tenantId).where('order_request_id', '=', d.order_request_id).execute();
          continue;
        }
        await addEvent(tx, tenantId, d.order_request_id, `local:reconcile:${d.order_request_id}:${r.version}:${Date.now()}`, 'cake.resent', { reason: 'RC-ORDER-1' });
        await deliver(tx, tenantId, r, d.created_by);
        resent++;
      }
      await notifyChanged(tx, tenantId, CAPS);
    }));
  }
  return { checked: due.length, resent };
}

export const orderHandlers: Record<string,(ctx: Ctx, i: Record<string, any>) => Promise<unknown>> = { // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod của spec
  'cake.order_request.list': async ({ tx, tenantId }, i) => {
    let q = tx.selectFrom('order_requests').selectAll().where('tenant_id', '=', tenantId);
    if (i.contactId) q = q.where('contact_id', '=', i.contactId);
    if (i.conversationId) q = q.where('conversation_id', '=', i.conversationId);
    return toOrders(tx, tenantId, await q.orderBy('created_at', 'desc').limit(100).execute());
  },
  'cake.order_request.save': async ({ tx, tenantId, actor }, i) => {
    const id = i.orderRequestId ?? newUlid();
    const prev = i.orderRequestId ? await loadRow(tx, tenantId, id) : undefined;
    if (i.orderRequestId && !prev) throw failure('NOT_FOUND', 'Không tìm thấy yêu cầu đặt hàng.');
    if (prev && prev.status !== 'draft') throw cakeError('CAKE_ORDER_LOCKED', 'Yêu cầu đã gửi cửa hàng — huỷ rồi tạo yêu cầu mới nếu cần đổi.');
    const lines = await priced(tx, tenantId, i.lines);
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const branch = (await posTarget(tx, tenantId).catch(() => null))?.branchCode ?? (await ketoanLinked(tx, tenantId))?.branch_code ?? null;
    const v = {
      contact_id: i.contactId, conversation_id: i.conversationId ?? null, customer: JSON.stringify(await customerOf(tx, tenantId, i.contactId)), ship_to: i.shipTo ? JSON.stringify(i.shipTo) : null,
      lines: JSON.stringify(lines), payment: i.payment, shipping: i.shipping, preferred_carrier: i.preferredCarrier ?? null, note: i.note, total, branch_code: branch, last_error: null, updated_at: new Date(),
    };
    if (prev) await tx.updateTable('order_requests').set(v).where('tenant_id', '=', tenantId).where('order_request_id', '=', id).execute();
    else await tx.insertInto('order_requests').values({ ...v, tenant_id: tenantId, order_request_id: id, created_by: actor }).execute();
    await mirrorOrderRequest(tx, tenantId, id, actor); // [2026-11-28 08:18 PM Johnny Chu - Chu Hoàng Anh] S003-14b — đầu phiếu lên trục chứng từ chung
    return one(tx, tenantId, id);
  },
  'cake.order_request.send': async ({ tx, tenantId, actor }, i) => {
    const r = await loadRow(tx, tenantId, i.orderRequestId);
    if (!r) throw failure('NOT_FOUND', 'Không tìm thấy yêu cầu đặt hàng.');
    if (!(r.status === 'draft' || (r.status === 'pending' && r.send_state === 'queued'))) throw cakeError('CAKE_ORDER_LOCKED', 'Yêu cầu đã tới cửa hàng.');
    if (!(await ketoanLinked(tx, tenantId))) throw cakeError('CAKE_KETOAN_REQUIRED');
    if (!r.branch_code) throw cakeError('CAKE_POS_NOT_LINKED', 'Chưa có cửa hàng xuất — lưu Kết nối cửa hàng rồi lưu lại yêu cầu.');
    await deliver(tx, tenantId, r, actor);
    return one(tx, tenantId, r.order_request_id);
  },
  'cake.order_request.cancel': async ({ tx, tenantId, actor }, i) => {
    const r = await loadRow(tx, tenantId, i.orderRequestId);
    if (!r) throw failure('NOT_FOUND', 'Không tìm thấy yêu cầu đặt hàng.');
    if (r.status === 'cancelled') return one(tx, tenantId, r.order_request_id);
    if (!['draft', 'pending'].includes(r.status)) throw cakeError('CAKE_ORDER_LOCKED', 'Cửa hàng đã xác nhận — huỷ ở Open POS.');
    if (r.status === 'pending') {
      const target = await posTarget(tx, tenantId);
      if (!target) throw cakeError('CAKE_POS_NOT_LINKED');
      const res = await posCall(target, 'POST', `${POS_PATH}/cancel`, { docRef: `cake.order_request:${r.order_request_id}`, ...(i.reason ? { reason: i.reason } : {}) });
      if (res.status === 409) throw cakeError('CAKE_ORDER_LOCKED', 'Cửa hàng đã xác nhận — huỷ ở Open POS.');
      if (res.status !== 200 && !(res.status === 404 && r.send_state === 'queued')) throw failure('NOT_READY', `Cửa hàng chưa huỷ được (${res.status}) — thử lại sau.`);
    }
    await tx.updateTable('order_requests').set({ status: 'cancelled', send_state: r.send_state === 'queued' ? 'none' : r.send_state, next_send_at: null, updated_at: new Date() })
      .where('tenant_id', '=', tenantId).where('order_request_id', '=', r.order_request_id).execute();
    await addEvent(tx, tenantId, r.order_request_id, `local:cancel:${r.order_request_id}`, 'cake.cancelled', { by: actor, reason: i.reason });
    await mirrorOrderRequest(tx, tenantId, r.order_request_id, actor, i.reason);
    return one(tx, tenantId, r.order_request_id);
  },
};

export { addEvent, customerOf, loadRow };
