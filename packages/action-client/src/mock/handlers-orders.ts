// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — giả lập luồng đơn theo luật máy chủ (apps/api/src/orders): tồn chỉ có khi nguồn danh mục = ketoan (?catalog=ketoan),
//   giá lấy từ bảng giá công ty, gửi cần nối Kế Toán + kết nối cửa hàng, đã gửi thì không sửa; cửa hàng giả nhận ngay (pending + posRef). Mọi số liệu là GIẢ LẬP.
import { orderCode, type OrderRequest, type PosLink } from '@open-cake/contracts';
import { ApiError } from '../client.js';
import { iso, type Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
type S = Store & { orders?: OrderRequest[]; posLink?: PosLink; partners?: Record<string, string> };
const STOCK = [4, 1, 0, 12];
const reason = (r: string, message: string) => new ApiError({ code: 'CONFLICT', message, reason: r });
const link = (s: S): PosLink => (s.posLink ??= {
  baseUrl: null, keyPrefix: null, hasSecret: false, branchCode: 'CN01', ketoanLinked: s.catalog.source === 'ketoan', lastOkAt: null, lastSentAt: null, lastError: null, eventsPath: '/ingress/v1/pos-events',
});
const orders = (s: S) => (s.orders ??= []);
const find = (s: S, id: string) => {
  const o = orders(s).find((x) => x.orderRequestId === id);
  if (!o) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy yêu cầu đặt hàng.' });
  return o;
};
const ulid = (s: S) => `01JDAQ${String(++s.seq).padStart(20, '0')}`;

const partnerCode = (s: S, contactId: string) => {
  const c = s.contacts.find((x) => x.contactId === contactId);
  if (!c) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy khách.' });
  const ph = s.identities.find((x) => x.contactId === contactId && x.channel === 'phone' && x.confidence === 'proven' && !x.validTo);
  return { code: ph ? ph.externalId : `CAKE-${contactId}`, kind: ph ? 'phone' as const : 'contact' as const, name: c.displayName, phone: ph?.externalId ?? null, verified: !!ph };
};
const partnerView = (s: S, contactId: string) => {
  const p = partnerCode(s, contactId);
  const ref = s.partners?.[contactId] ?? null;
  const on = s.catalog.source === 'ketoan';
  const accounts = [{ accountCode: '131', accountName: 'Phải thu của khách hàng', balance: 2340000 }, { accountCode: '1388', accountName: 'Phải thu khác', balance: 150000 }];
  return {
    source: on ? 'ketoan' as const : 'none' as const, linked: on && !!ref, refCode: on ? ref : null,
    proposed: { code: p.code, kind: p.kind, name: p.name, phone: p.phone, verified: p.verified }, branchCode: on ? link(s).branchCode : null,
    balances: on && ref ? { asOf: new Date().toISOString().slice(0, 10), readAt: new Date().toISOString(), accounts, total: 2490000 } : null, error: null,
  };
};

export const orderHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.stock.read': (st, i) => {
    const s = st as S;
    if (s.catalog.source !== 'ketoan') return { source: 'none', branchCode: link(s).branchCode, asOf: null, rows: [] };
    const ids = String(i.itemIds).split(',');
    return {
      source: 'ketoan', branchCode: link(s).branchCode, asOf: iso(s.now()),
      rows: s.catalog.items.filter((it) => ids.includes(it.itemId)).map((it) => {
        const n = STOCK[s.catalog.items.indexOf(it) % STOCK.length]!;
        return { itemId: it.itemId, onHand: n, pendingOut: 0, held: 0, available: n, error: null };
      }),
    };
  },
  'cake.order_request.list': (st, i) => orders(st as S).filter((o) => (i.contactId ? o.contactId === i.contactId : true) && (i.conversationId ? o.conversationId === i.conversationId : true)),
  'cake.order_request.save': (st, i) => {
    const s = st as S;
    const prev = i.orderRequestId ? find(s, i.orderRequestId) : null;
    if (prev && prev.status !== 'draft') throw reason('CAKE_ORDER_LOCKED', 'Yêu cầu đã gửi cửa hàng — huỷ rồi tạo yêu cầu mới nếu cần đổi.');
    const lines = (i.lines as { itemId: string; qty: number }[]).map((l, n) => {
      const it = s.catalog.items.find((x) => x.itemId === l.itemId);
      const p = s.catalog.prices.find((x) => x.itemId === l.itemId && x.priceListCode === 'CONGTY');
      if (!it || !p) throw new ApiError({ code: 'VALIDATION_ERROR', message: `${it?.name ?? 'Mặt hàng'} chưa có giá bán của công ty.`, reason: 'CAKE_ITEM_NO_PRICE', field: `lines.${n}.itemId` });
      return { line: n + 1, itemId: it.itemId, sku: it.sku, name: it.name, uom: p.unit, qty: l.qty, price: p.price, amount: p.price * l.qty };
    });
    const c = s.contacts.find((x) => x.contactId === i.contactId);
    const phone = s.identities.find((x) => x.contactId === i.contactId && x.channel === 'phone' && !x.validTo);
    const now = iso(s.now());
    const o: OrderRequest = {
      orderRequestId: prev?.orderRequestId ?? ulid(s), code: '', contactId: i.contactId, conversationId: i.conversationId ?? null, status: 'draft', sendState: 'none', lastError: null, version: 1,
      branchCode: link(s).branchCode, customer: { name: c?.displayName ?? 'Khách', phone: phone?.externalId ?? null, partnerCode: phone?.confidence === 'proven' ? phone.externalId : `CAKE-${i.contactId}`, verified: phone?.confidence === 'proven' },
      shipTo: i.shipTo ?? null, lines, payment: i.payment, shipping: i.shipping, preferredCarrier: i.preferredCarrier ?? null, note: i.note ?? '', total: lines.reduce((a, l) => a + l.amount, 0),
      posRef: null, orderRef: null, rejectReason: null, events: [], createdAt: prev?.createdAt ?? now, updatedAt: now, expiresAt: null,
    };
    o.code = orderCode(o.orderRequestId);
    if (prev) Object.assign(prev, o); else orders(s).unshift(o);
    return prev ?? o;
  },
  'cake.order_request.send': (st, i) => {
    const s = st as S;
    const o = find(s, i.orderRequestId);
    if (o.status !== 'draft') throw reason('CAKE_ORDER_LOCKED', 'Yêu cầu đã tới cửa hàng.');
    if (s.catalog.source !== 'ketoan') throw reason('CAKE_KETOAN_REQUIRED', 'Gửi đơn sang cửa hàng cần nối Kế Toán trước.');
    if (!link(s).hasSecret) throw reason('CAKE_POS_NOT_LINKED', 'Chưa kết nối cửa hàng (Open POS).');
    const at = iso(s.now());
    Object.assign(o, { status: 'pending', sendState: 'sent', posRef: `pos.order_request:${++s.seq}`, updatedAt: at, events: [...o.events, { type: 'cake.sent', at, data: {} }] });
    return o;
  },
  'cake.order_request.cancel': (st, i) => {
    const o = find(st as S, i.orderRequestId);
    if (!['draft', 'pending', 'cancelled'].includes(o.status)) throw reason('CAKE_ORDER_LOCKED', 'Cửa hàng đã xác nhận — huỷ ở Open POS.');
    const at = iso(st.now());
    Object.assign(o, { status: 'cancelled', updatedAt: at, events: [...o.events, { type: 'cake.cancelled', at, data: { reason: i.reason } }] });
    return o;
  },
  // [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-2/3 — khách công nợ giả lập theo luật máy chủ: chỉ có khi nguồn danh mục = ketoan; mã = SĐT đã xác minh → CAKE-<id>; số dư là SỐ GIẢ LẬP.
  'cake.partner.get': (st, i) => partnerView(st as S, i.contactId),
  'cake.partner.create': (st, i) => {
    const s = st as S;
    if (s.catalog.source !== 'ketoan') throw reason('CAKE_KETOAN_REQUIRED', 'Cần nối Kế Toán trước.');
    const code = partnerCode(s, i.contactId).code;
    (s.partners ??= {})[i.contactId] = code;
    const links = (s.links[i.contactId] ??= []); // Contact 360 › "Liên kết app anh em" thấy ngay, như contact_links ở máy chủ
    if (!links.some((l) => l.app === 'ketoan' && l.kind === 'partner')) links.push({ app: 'ketoan', kind: 'partner', refCode: code, refId: null });
    return partnerView(s, i.contactId);
  },
  'cake.pos_link.get': (st) => ({ ...link(st as S), ketoanLinked: st.catalog.source === 'ketoan' }),
  'cake.pos_link.set': (st, i) => {
    const s = st as S;
    if (s.catalog.source !== 'ketoan') throw reason('CAKE_KETOAN_REQUIRED', 'Gửi đơn sang cửa hàng cần nối Kế Toán trước.');
    if (!link(s).hasSecret && (!i.key || !i.secret)) throw reason('CAKE_POS_NOT_LINKED', 'Lần đầu cần dán cả khoá cửa hàng và bí mật ký.');
    Object.assign(link(s), { baseUrl: i.baseUrl, branchCode: i.branchCode, keyPrefix: i.key ? i.key.slice(0, 10) : link(s).keyPrefix, hasSecret: true, ketoanLinked: true });
    return link(s);
  },
  'cake.pos_link.test': (st) => {
    const s = st as S;
    if (!link(s).hasSecret) throw reason('CAKE_POS_NOT_LINKED', 'Chưa kết nối cửa hàng (Open POS).');
    return Object.assign(link(s), { lastOkAt: iso(s.now()), lastError: null });
  },
};
