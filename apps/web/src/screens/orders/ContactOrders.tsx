// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-5 — Contact 360 › Đơn (mockup-don-360 đã duyệt): mỗi yêu cầu một thẻ — trạng thái do cửa hàng gửi về,
//   các bước (gửi → xác nhận → bàn giao = ghi nhận bán → giao xong), chờ xác nhận thì huỷ được, bị từ chối hiện lý do. Đọc bằng tham chiếu, không lưu đơn bán.
import { orderRequestCancel, type OrderRequest } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Badge, Btn, Card } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when, vnd } from '../../app/format.js';
import { useCan } from '../../app/permissions.js';
import { t } from '../../i18n/index.js';

const L = t.orders;
const TONE: Record<string, string> = { pending: 'warn', confirmed: 'pri', shipped: 'pri', delivered: 'ok', rejected: 'err', expired: 'err', cancelled: '', returned: 'warn', draft: '' };
const STEPS = [['cake.sent', L.c360.step.sent], ['pos.order.confirmed', L.c360.step.confirmed], ['pos.order.shipped', L.c360.step.shipped], ['pos.order.delivered', L.c360.step.delivered]] as const;

function OrderCard({ o }: { o: OrderRequest }) {
  const cancel = useAction(orderRequestCancel);
  const canOrder = useCan('cake:don-lap');
  const at = (type: string) => o.events.find((e) => e.type === type)?.at;
  const reached = STEPS.filter(([k]) => at(k)).length;
  const showSteps = ['pending', 'confirmed', 'shipped', 'delivered'].includes(o.status) && o.sendState === 'sent';
  return (
    <Card>
      <div className="row gap16" style={{ alignItems: 'center' }}>
        <b>{o.code}</b><Badge tone={TONE[o.status]}>{L.status[o.status] ?? o.status}</Badge>
        {o.sendState === 'queued' && <span className="xs subtle">{L.queued}</span>}
        <span className="grow" />
        <span className="sm muted">
          {o.status === 'rejected' && o.rejectReason ? o.rejectReason : L.c360.summary(o.lines.length, vnd(o.total), o.payment === 'cod')}
          {o.status === 'pending' && o.expiresAt ? ` · ${L.c360.expires(when(o.expiresAt))}` : ''}
        </span>
        {canOrder && ['draft', 'pending'].includes(o.status) && <Btn out sm disabled={cancel.isPending} onClick={() => cancel.mutate({ orderRequestId: o.orderRequestId, reason: '' })}>{L.c360.cancel}</Btn>}
      </div>
      {showSteps && (
        <ul className="steps">
          {STEPS.map(([k, label], i) => (
            <li key={k} className={i < reached ? `done${i === reached - 1 ? ' now' : ''}` : undefined}><i /><span>{label}</span><span className="xs subtle">{at(k) ? when(at(k)!) : '—'}</span></li>
          ))}
        </ul>
      )}
      <ActionErrorNote error={cancel.error} />
    </Card>
  );
}

export function ContactOrders({ orders }: { orders: OrderRequest[] }) {
  if (!orders.length) return <div className="muted">{L.c360.none}</div>;
  return (
    <div className="col gap16">
      {orders.map((o) => <OrderCard key={o.orderRequestId} o={o} />)}
      <div className="xs subtle">{L.c360.footnote}</div>
    </div>
  );
}
