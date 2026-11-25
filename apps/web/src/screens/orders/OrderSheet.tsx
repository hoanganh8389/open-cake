// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/8 — sheet "Yêu cầu đặt hàng" (mockup-tao-don đã duyệt): dòng hàng + tồn Kế Toán, vượt tồn chỉ CẢNH BÁO
//   (cửa hàng kiểm lại khi xác nhận), giá công ty KHÔNG sửa ở CRM, COD / chuyển khoản, hãng / lấy tại shop; Lưu nháp (cake.order_request.save) · Gửi (save rồi send).
import { useState } from 'react';
import { orderRequestSave, orderRequestSend, type OrderRequest } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Badge, Btn, Ic, Sheet, cx } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { vnd } from '../../app/format.js';
import { StockBadge, useStock } from './parts.js';
import { t } from '../../i18n/index.js';

export type CartLine = { itemId: string; name: string; sku: string; unit: string; price: number; qty: number };
const L = t.orders.sheet;

export function OrderSheet({ open, onClose, contactId, conversationId, name, cart, setCart }: {
  open: boolean; onClose: () => void; contactId: string; conversationId: string; name: string; cart: CartLine[]; setCart: (c: CartLine[]) => void;
}) {
  const save = useAction(orderRequestSave);
  const send = useAction(orderRequestSend);
  const [draft, setDraft] = useState<OrderRequest | null>(null);
  const [ship, setShip] = useState({ name, phone: '', address: '' });
  const [payment, setPayment] = useState<'cod' | 'bank_transfer'>('cod');
  const [shipping, setShipping] = useState<'carrier' | 'pickup'>('carrier');
  const [note, setNote] = useState('');
  const stock = useStock(cart.map((c) => c.itemId));
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const qty = (i: number, d: number) => setCart(cart.flatMap((c, j) => (j !== i ? [c] : c.qty + d > 0 ? [{ ...c, qty: c.qty + d }] : [])));
  const input = () => ({
    ...(draft ? { orderRequestId: draft.orderRequestId } : {}), contactId, conversationId, lines: cart.map((c) => ({ itemId: c.itemId, qty: c.qty })),
    ...(shipping === 'carrier' ? { shipTo: ship } : {}), payment, shipping, note,
  });
  const done = () => { setCart([]); setDraft(null); onClose(); };
  const doSave = () => save.mutate(input(), { onSuccess: (o) => setDraft(o) });
  const doSend = () => save.mutate(input(), { onSuccess: (o) => { setDraft(o); send.mutate({ orderRequestId: o.orderRequestId }, { onSuccess: done }); } });
  const busy = save.isPending || send.isPending;
  const cust = draft?.customer;
  return (
    <Sheet open={open} onClose={onClose} wide icon={Ic.store} title={L.title} sub={<>{name} · <Badge>{L.status.draft}</Badge></>}
      footer={<><Btn onClick={onClose}>{L.close}</Btn><Btn out disabled={busy || !cart.length} onClick={doSave}>{L.saveDraft}</Btn><Btn pri disabled={busy || !cart.length} onClick={doSend}><Ic.send />{L.send}</Btn></>}>
      <dl className="kv">
        <dt>{L.customer}</dt><dd>{cust ? <>{cust.name}{cust.phone && <> · <b>{cust.phone}</b></>} {cust.verified && <Badge tone="ok">{L.verified}</Badge>} <span className="xs subtle">{L.partner(cust.partnerCode)}</span></> : name}</dd>
        <dt>{L.store}</dt><dd>{draft?.branchCode ?? stock.data?.branchCode ?? <span className="subtle">{L.storeNone}</span>}</dd>
      </dl>
      {cart.length === 0 ? <div className="note mt16">{L.empty}</div> : (
        <table className="tbl mt16">
          <thead><tr><th>{L.item}</th><th>{L.uom}</th><th>{L.qty}</th><th className="r">{L.price}</th><th>{L.stockAt(stock.data?.branchCode ?? '')}</th></tr></thead>
          <tbody>{cart.map((c, i) => {
            const a = stock.byItem.get(c.itemId)?.available;
            return (
              <tr key={c.itemId}>
                <td><b style={{ fontWeight: 500 }}>{c.name}</b><div className="xs subtle">{c.sku}</div></td><td>{c.unit}</td>
                <td><span className="qty"><button type="button" aria-label={L.remove} onClick={() => qty(i, -1)}>−</button><span>{c.qty}</span><button type="button" onClick={() => qty(i, 1)}>+</button></span></td>
                <td className="r">{vnd(c.price)}</td>
                <td><StockBadge available={a} />{a !== undefined && c.qty > a && <div className="xs mt8" style={{ color: 'var(--warning)' }}>{L.over(c.qty - Math.max(a, 0))}</div>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
      <div className="row mt16" style={{ justifyContent: 'flex-end', gap: 24 }}><span className="muted">{L.subtotal}</span><b style={{ fontSize: 20 }}>{vnd(total)}</b></div>
      <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="col gap8"><div className="sm muted">{L.payment}</div>
          {([['cod', L.cod], ['bank_transfer', L.bank]] as const).map(([k, label]) => <button type="button" key={k} className={cx('choice', payment === k && 'on')} onClick={() => setPayment(k)}><span className="dot" /><b>{label}</b></button>)}</div>
        <div className="col gap8"><div className="sm muted">{L.shipping}</div>
          {([['carrier', L.carrier], ['pickup', L.pickup]] as const).map(([k, label]) => <button type="button" key={k} className={cx('choice', shipping === k && 'on')} onClick={() => setShipping(k)}><span className="dot" /><b>{label}</b></button>)}</div>
      </div>
      {shipping === 'carrier' && (
        <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
          <input className="input sm" aria-label={L.shipName} placeholder={L.shipName} value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} />
          <input className="input sm" aria-label={L.shipPhone} placeholder={L.shipPhone} inputMode="tel" value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} />
          <input className="input sm" aria-label={L.shipAddress} placeholder={L.shipAddress} value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} />
        </div>
      )}
      <input className="input sm mt16" style={{ width: '100%' }} aria-label={L.note} placeholder={L.note} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="note mt16">{L.explain}</div>
      <ActionErrorNote error={save.error ?? send.error} />
    </Sheet>
  );
}
