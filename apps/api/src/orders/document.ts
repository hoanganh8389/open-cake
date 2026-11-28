// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-28 08:18 PM Johnny Chu - Chu Hoàng Anh] S003-14b (open-core 0.5.0, NC-007 §3) — yêu cầu đặt hàng lên trục chứng từ chung theo cách PHẢN CHIẾU:
//   order_requests vẫn là bảng nguồn + trạng thái (do cửa hàng gửi về, bizcity_order_flow@1); lõi giữ đầu phiếu cake.order_request:<ULID> trong
//   business_documents + dòng hoạt động — tìm chứng từ toàn hệ (⌘K, core.document.list) và lịch sử trạng thái dùng chung với mọi app.
import type { Db } from '@bizcity/platform/db/client';
import { defineDocumentType, documentSpine } from '@bizcity/platform/core/document-spine';
import { orderCode } from '@open-cake/contracts';

export const ORDER_REQUEST_DOC = defineDocumentType({
  type: 'cake.order_request',
  label: 'Yêu cầu đặt hàng',
  // Trạng thái của app → sáu nhóm chuẩn (STD-DOC-4, bizcity_document@1 §5). returned = hàng bị trả SAU khi đã giao: đơn gốc vẫn hoàn tất (done), việc trả là chứng từ riêng
  // nối `reverses`; không gán cancelled (cancelled = đã huỷ, kéo bút toán đảo, và làm báo cáo đếm đơn đã giao thành đơn huỷ). status_raw vẫn giữ 'returned'.
  mirror: { statuses: { draft: 'draft', pending: 'pending', confirmed: 'approved', shipped: 'in_progress', delivered: 'done', returned: 'done', rejected: 'cancelled', expired: 'cancelled', cancelled: 'cancelled' } },
});

const dayVN = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(d));

/** Phản chiếu đầu phiếu sau mỗi lần ghi order_requests (lưu, gửi, huỷ, sự kiện cửa hàng). Cùng giao dịch với lần ghi. */
export async function mirrorOrderRequest(tx: Db, tenantId: string, orderRequestId: string, actor: string, reason?: string | null): Promise<void> {
  const r = await tx.selectFrom('order_requests').select(['status', 'version', 'total', 'branch_code', 'customer', 'created_at']).where('tenant_id', '=', tenantId)
    .where('order_request_id', '=', orderRequestId).executeTakeFirst();
  if (!r) return;
  const c = r.customer as { name?: string; partnerCode?: string };
  await documentSpine.mirror(tx, tenantId, ORDER_REQUEST_DOC.type, {
    key: orderRequestId, docNo: orderCode(orderRequestId), status: r.status, version: r.version, date: dayVN(r.created_at),
    title: c.name ?? '', partnerRef: c.partnerCode ?? '', orgUnitCode: r.branch_code ?? '', total: Number(r.total),
  }, actor, reason ? { reason } : {});
}
