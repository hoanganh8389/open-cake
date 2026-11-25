// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-5/7 — mảnh dùng chung của luồng đơn: đọc tồn Kế Toán (cake.stock.read, máy chủ đệm 60 giây),
//   nhãn Còn n / Hết hàng (mockup-gui-gia-ton), dòng hệ thống của đơn trong chat (mockup-don-trong-chat — không phải tin gửi khách).
import { stockRead, type OrderRequest, type StockRead } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Badge, Ic } from '@open-cake/ui-kit';
import { hhmm, vnd } from '../../app/format.js';
import { t } from '../../i18n/index.js';

const L = t.orders;

/** Tồn theo itemId; `rows` rỗng khi đơn vị chưa nối Kế Toán (giao diện không hiện nhãn). */
export function useStock(itemIds: string[]) {
  const ids = [...new Set(itemIds)].slice(0, 50).sort();
  const q = useQueryAction(stockRead, { itemIds: ids.join(',') }, { enabled: ids.length > 0 });
  const byItem = new Map((q.data?.rows ?? []).map((r) => [r.itemId, r]));
  return { data: q.data as StockRead | undefined, byItem };
}

export function StockBadge({ available }: { available: number | undefined }) {
  if (available === undefined) return null;
  if (available <= 0) return <Badge tone="err" className="stock">{L.stock.out}</Badge>;
  return <Badge tone={available <= 2 ? 'warn' : 'ok'} className="stock">{L.stock.left(available)}</Badge>;
}

const ICON: Record<string, typeof Ic.check> = { 'cake.sent': Ic.send, 'pos.order.confirmed': Ic.check, 'pos.order.shipped': Ic.truck };

/** Một dòng hệ thống cho một bước của đơn. */
export function OrderSysLine({ o, e }: { o: OrderRequest; e: OrderRequest['events'][number] }) {
  const d = e.data as Record<string, string | undefined>;
  const f = L.line as Record<string, (...a: never[]) => string>;
  const text = e.type === 'cake.sent' ? L.line['cake.sent'](o.code, o.lines.length, vnd(o.total))
    : e.type === 'pos.order.confirmed' ? L.line['pos.order.confirmed'](o.code, vnd(o.total))
      : e.type === 'pos.order.shipped' ? L.line['pos.order.shipped'](o.code, d.carrier ?? '', d.waybill ?? '')
        : e.type === 'pos.order_request.rejected' ? L.line['pos.order_request.rejected'](o.code, [d.reasonCode, d.reason].filter(Boolean).join(' '))
          : f[e.type] ? (f[e.type] as (c: string) => string)(o.code) : `${o.code} · ${e.type}`;
  const I = ICON[e.type] ?? Ic.note;
  return <span className="sysline"><I />{text}<span className="xs subtle">{hhmm(e.at)}</span></span>;
}
