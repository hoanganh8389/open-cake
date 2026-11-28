// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-5 — cổng nhận sự kiện trạng thái đơn từ cửa hàng (bizcity_order_flow@1 §5):
//   POST /ingress/v1/pos-events, không phiên; đơn vị suy từ `tenant` của sự kiện ⇒ kiểm Bizcity-Signature bằng bí mật cặp của đơn vị đó (sai / lệch giờ ⇒ 401);
//   chống lặp theo id sự kiện (R-STD-ORD-18); không lùi trạng thái; mỗi sự kiện = một dấu chạm kind=document trên sổ khách (R-STD-ORD-19) + gợi ý realtime.
import type { FastifyInstance } from 'fastify';
import { db } from '@bizcity/platform/db/client';
import { withRequestContext } from '@bizcity/platform/core/request-context';
import { ok } from '@bizcity/platform/core/http';
import { failure, newUlid } from '../runtime.js';
import { notifyChanged } from '../stream.js';
import { PgCareRepo } from '../care/pg-care-repo.js';
import { open, verifyBody } from './clients.js';
import { addEvent, loadRow } from './service.js';
import { mirrorOrderRequest } from './document.js';
import { EVENTS_PATH } from './link.js';

const STATUS: Record<string, string> = {
  'pos.order_request.received': 'pending', 'pos.order_request.rejected': 'rejected', 'pos.order_request.expired': 'expired',
  'pos.order.confirmed': 'confirmed', 'pos.order.shipped': 'shipped', 'pos.order.delivered': 'delivered', 'pos.order.returned': 'returned', 'pos.order.cancelled': 'cancelled',
};
/** Thứ bậc: chỉ tiến, không lùi. Ba trạng thái kết thúc không đổi nữa. */
const RANK: Record<string, number> = { draft: 0, pending: 1, confirmed: 2, shipped: 3, delivered: 4, returned: 5, rejected: 9, expired: 9, cancelled: 9 };
const moves = (from: string, to: string) => RANK[from]! < 9 && (RANK[to]! > RANK[from]! || (from === 'pending' && to === 'pending'));

type Ev = { id?: string; type?: string; occurredAt?: string; tenant?: string; data?: Record<string, unknown> };

export function registerPosEvents(app: FastifyInstance): void {
  void app.register(async (r) => {
    r.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 64 * 1024 }, (req, body, done) => {
      (req as unknown as { rawBody: string }).rawBody = String(body);
      try { done(null, JSON.parse(String(body))); } catch { done(failure('VALIDATION_ERROR', 'Thân không phải JSON.'), undefined); }
    });
    r.post(EVENTS_PATH, { config: { public: true } }, async (req) => {
      const ev = req.body as Ev;
      if (!ev?.id || !ev.type || !STATUS[ev.type] || !ev.tenant || !ev.data || typeof ev.data.docRef !== 'string') throw failure('VALIDATION_ERROR', 'Sự kiện sai khuôn bizcity_order_flow@1 §5.');
      const t = await db.selectFrom('tenants').select('id').where('code', '=', ev.tenant).executeTakeFirst();
      const link = t ? await db.selectFrom('pos_links').select('secret_sealed').where('tenant_id', '=', String(t.id)).executeTakeFirst() : undefined;
      if (!t || !link || !verifyBody(open(link.secret_sealed), (req as unknown as { rawBody: string }).rawBody, req.headers['bizcity-signature'] as string | undefined)) throw failure('UNAUTHORIZED', 'Chữ ký cửa hàng không hợp lệ hoặc lệch giờ.');
      const tenantId = String(t.id);
      const id = /^cake\.order_request:([0-9A-HJKMNP-TV-Z]{26})$/.exec(ev.data.docRef as string)?.[1];
      if (!id) throw failure('VALIDATION_ERROR', 'docRef không phải yêu cầu của Open CRM.');
      return withRequestContext({ requestId: String(req.id), correlationId: ev.id, tenantId }, () => db.transaction().execute(async (tx) => {
        const row = await loadRow(tx, tenantId, id);
        if (!row) throw failure('NOT_FOUND', 'Không có yêu cầu đặt hàng này.');
        const at = ev.occurredAt ? new Date(ev.occurredAt) : new Date();
        if (!(await addEvent(tx, tenantId, id, ev.id!, ev.type!, ev.data!, at))) return ok({ status: 'duplicate' });
        const to = STATUS[ev.type!]!;
        const fresh = !row.status_at || at >= new Date(row.status_at);
        if (moves(row.status, to) && fresh) {
          const d = ev.data!;
          await tx.updateTable('order_requests').set({
            status: to, status_at: at, updated_at: new Date(), send_state: 'sent', next_send_at: null,
            ...(typeof d.posRef === 'string' ? { pos_ref: d.posRef } : {}), ...(typeof d.orderRef === 'string' ? { order_ref: d.orderRef } : {}),
            ...(typeof d.expiresAt === 'string' ? { expires_at: d.expiresAt } : {}), ...(typeof d.total === 'number' ? { total: d.total } : {}),
            ...(to === 'rejected' ? { reject_reason: [d.reasonCode, d.reason].filter(Boolean).join(' — ') || null } : {}),
          }).where('tenant_id', '=', tenantId).where('order_request_id', '=', id).execute();
          await mirrorOrderRequest(tx, tenantId, id, 'pos', to === 'rejected' ? [d.reasonCode, d.reason].filter(Boolean).join(' — ') : null); // S003-14b
        }
        // Dấu chạm kind=document: Contact 360 thấy đơn bằng tham chiếu (không sao chép đơn).
        const repo = new PgCareRepo(tenantId, tx);
        const touchEvent = { eventId: newUlid(), source: 'pos', docKey: ev.id!, version: 1, type: ev.type!, payload: { docRef: ev.data!.docRef, type: ev.type }, receivedAt: new Date().toISOString(), actor: 'pos' };
        await repo.insertEvent(touchEvent);
        await repo.appendLedger({ eventId: touchEvent.eventId, contactId: row.contact_id, conversationId: row.conversation_id, channelAccountId: null, channel: null,
          kind: 'document', direction: 'none', qty: 1, isReversal: false, reversesId: null, dims: { doc_ref: ev.data!.docRef, stage: to, pos_ref: ev.data!.posRef ?? null }, at: at.toISOString() });
        await notifyChanged(tx, tenantId, ['cake.order.manage', 'cake.contact.read']);
        return ok({ status: moves(row.status, to) && fresh ? 'applied' : 'kept' });
      }));
    });
  });
}
