// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/5/7/8 — luồng đơn xuyên app (bizcity_order_flow@1, bizcity-platform PHASE-001; mockup đã duyệt 2026-11-25):
//   đọc tồn Kế Toán (cake.stock.read), yêu cầu đặt hàng cake.order_request (nháp → gửi cửa hàng → trạng thái theo POS; KHÔNG phải chứng từ kế toán),
//   kết nối cửa hàng (cake.pos_link.*). Giá trên yêu cầu lấy từ bảng giá công ty, nhân viên CRM không sửa (giá cuối do cửa hàng chốt).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';

const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const BranchCode = z.string().regex(/^[A-Z0-9_.-]{1,20}$/);
const Iso = z.string();

export const ORDER_STATUSES = ['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'returned', 'rejected', 'expired', 'cancelled'] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const StockRowSchema = z.object({
  itemId: Ulid, onHand: z.number(), pendingOut: z.number(), held: z.number(), available: z.number(), error: z.string().nullable(),
});
export const StockReadSchema = z.object({
  /** `none`: đơn vị chưa nối Kế Toán hoặc Kế Toán không trả lời ⇒ giao diện không hiện nhãn tồn. */
  source: z.enum(['ketoan', 'none']), branchCode: BranchCode.nullable(), asOf: Iso.nullable(), rows: z.array(StockRowSchema),
});
export type StockRead = z.infer<typeof StockReadSchema>;

export const ShipToSchema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().regex(/^\+?[0-9]{8,15}$/), address: z.string().trim().min(5).max(300) });
export const OrderLineSchema = z.object({
  line: z.number().int().min(1), itemId: Ulid, sku: z.string(), name: z.string(), uom: z.string(), qty: z.number().positive(), price: z.number().min(0), amount: z.number().min(0),
});
export const OrderEventSchema = z.object({ type: z.string(), at: Iso, data: z.record(z.unknown()) });
export const OrderRequestSchema = z.object({
  orderRequestId: Ulid,
  /** Mã ngắn để đọc: `YC-` + 6 ký tự cuối của id. */
  code: z.string(),
  contactId: Ulid, conversationId: Ulid.nullable(),
  status: OrderStatusSchema,
  /** gửi sang cửa hàng: `queued` = chưa tới được, tự gửi lại (RC-ORDER-1). */
  sendState: z.enum(['none', 'queued', 'sent']), lastError: z.string().nullable(),
  version: z.number().int().min(1), branchCode: BranchCode.nullable(),
  customer: z.object({ name: z.string(), phone: z.string().nullable(), partnerCode: z.string(), verified: z.boolean() }),
  shipTo: ShipToSchema.nullable(),
  lines: z.array(OrderLineSchema),
  payment: z.enum(['cod', 'bank_transfer']), shipping: z.enum(['carrier', 'pickup']), preferredCarrier: z.string().nullable(),
  note: z.string(), total: z.number(),
  posRef: z.string().nullable(), orderRef: z.string().nullable(), rejectReason: z.string().nullable(),
  events: z.array(OrderEventSchema),
  createdAt: Iso, updatedAt: Iso, expiresAt: Iso.nullable(),
});
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

export const PosLinkSchema = z.object({
  baseUrl: z.string().nullable(), keyPrefix: z.string().nullable(), hasSecret: z.boolean(), branchCode: BranchCode.nullable(),
  /** điều kiện Q-ORD-6: đơn vị đã nối Kế Toán (`catalog_source = ketoan`). */
  ketoanLinked: z.boolean(),
  lastOkAt: Iso.nullable(), lastSentAt: Iso.nullable(), lastError: z.string().nullable(),
  /** địa chỉ để dán sang Open POS (nhận sự kiện trạng thái đơn). */
  eventsPath: z.string(),
});
export type PosLink = z.infer<typeof PosLinkSchema>;

export const stockRead = defineActionSpec({
  id: 'cake.stock.read', capability: 'cake.order.manage', title: 'Tồn kho theo Kế Toán', kind: 'query',
  input: z.object({ itemIds: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}(,[0-9A-HJKMNP-TV-Z]{26}){0,49}$/, 'tối đa 50 mã hàng, cách nhau dấu phẩy') }),
  output: StockReadSchema, permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/stock', mcp: 'read', ui: true },
});
export const orderRequestList = defineActionSpec({
  id: 'cake.order_request.list', capability: 'cake.order.manage', title: 'Yêu cầu đặt hàng', kind: 'query',
  input: z.object({ contactId: Ulid.optional(), conversationId: Ulid.optional() }).refine((v) => !!(v.contactId ?? v.conversationId), { message: 'cần contactId hoặc conversationId' }),
  output: z.array(OrderRequestSchema), permission: 'cake:don-xem', risk: 'read', expose: { rest: 'GET /api/v1/order-requests', mcp: 'read', ui: true },
});
export const orderRequestSave = defineActionSpec({
  id: 'cake.order_request.save', capability: 'cake.order.manage', title: 'Lưu yêu cầu đặt hàng (nháp)', kind: 'command',
  input: z.object({
    orderRequestId: Ulid.optional(), contactId: Ulid, conversationId: Ulid.optional(),
    lines: z.array(z.object({ itemId: Ulid, qty: z.number().positive().max(100000), note: z.string().max(200).optional() })).min(1).max(200),
    shipTo: ShipToSchema.optional(), payment: z.enum(['cod', 'bank_transfer']).default('cod'),
    shipping: z.enum(['carrier', 'pickup']).default('carrier'), preferredCarrier: z.string().regex(/^[A-Z0-9_]{2,20}$/).optional(), note: z.string().max(500).default(''),
  }).refine((v) => v.shipping === 'pickup' || !!v.shipTo, { message: 'gửi hãng vận chuyển cần địa chỉ giao', path: ['shipTo'] }),
  output: OrderRequestSchema, permission: 'cake:don-lap', risk: 'medium', idempotent: true, reasons: ['CAKE_ORDER_LOCKED', 'CAKE_ITEM_NO_PRICE'],
  emits: ['bizcity.cake.order_request.saved'], expose: { rest: 'POST /api/v1/order-requests', mcp: 'propose', ui: true },
});
export const orderRequestSend = defineActionSpec({
  id: 'cake.order_request.send', capability: 'cake.order.manage', title: 'Gửi yêu cầu đặt hàng sang cửa hàng', kind: 'command',
  input: z.object({ orderRequestId: Ulid }), output: OrderRequestSchema, permission: 'cake:don-lap', risk: 'medium', idempotent: true,
  reasons: ['CAKE_ORDER_LOCKED', 'CAKE_POS_NOT_LINKED', 'CAKE_KETOAN_REQUIRED'], emits: ['bizcity.cake.order_request.sent'],
  expose: { rest: 'POST /api/v1/order-requests/:orderRequestId/send', ui: true },
});
export const orderRequestCancel = defineActionSpec({
  id: 'cake.order_request.cancel', capability: 'cake.order.manage', title: 'Huỷ yêu cầu đặt hàng', kind: 'command',
  input: z.object({ orderRequestId: Ulid, reason: z.string().max(300).default('') }), output: OrderRequestSchema, permission: 'cake:don-lap', risk: 'medium', idempotent: true,
  reasons: ['CAKE_ORDER_LOCKED'], emits: ['bizcity.cake.order_request.cancelled'], expose: { rest: 'POST /api/v1/order-requests/:orderRequestId/cancel', ui: true },
});
export const posLinkGet = defineActionSpec({
  id: 'cake.pos_link.get', capability: 'cake.order.manage', title: 'Kết nối cửa hàng', kind: 'query',
  input: z.object({}), output: PosLinkSchema, permission: 'settings:write', risk: 'read', expose: { rest: 'GET /api/v1/pos-link', ui: true },
});
export const posLinkSet = defineActionSpec({
  id: 'cake.pos_link.set', capability: 'cake.order.manage', title: 'Lưu kết nối cửa hàng', kind: 'command',
  input: z.object({
    baseUrl: z.string().url().regex(/^https?:\/\//).max(200), branchCode: BranchCode,
    /** bỏ trống = giữ khoá / bí mật cũ. */
    key: z.string().regex(/^opb_[A-Za-z0-9_-]{16,128}$/).optional(), secret: z.string().min(32).max(200).optional(),
  }),
  output: PosLinkSchema, permission: 'settings:write', risk: 'high', idempotent: true, reasons: ['CAKE_KETOAN_REQUIRED'],
  emits: ['bizcity.cake.pos_link.saved'], expose: { rest: 'POST /api/v1/pos-link', ui: true },
});
export const posLinkTest = defineActionSpec({
  id: 'cake.pos_link.test', capability: 'cake.order.manage', title: 'Thử kết nối cửa hàng', kind: 'command',
  input: z.object({}), output: PosLinkSchema, permission: 'settings:write', risk: 'low', reasons: ['CAKE_POS_NOT_LINKED'],
  expose: { rest: 'POST /api/v1/pos-link/test', ui: true },
});

export const ORDER_ACTIONS = [stockRead, orderRequestList, orderRequestSave, orderRequestSend, orderRequestCancel, posLinkGet, posLinkSet, posLinkTest] as const;

/** Mã ngắn hiển thị (mockup đã duyệt): `YC-` + 6 ký tự cuối. */
export const orderCode = (orderRequestId: string) => `YC-${orderRequestId.slice(-6)}`;
