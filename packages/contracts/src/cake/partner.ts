// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-2/3 — khách công nợ ở Kế Toán (mockup ⑥ ⑦ đã duyệt 2026-11-26):
//   cake.partner.get   = Contact 360 › Công nợ: số dư theo tài khoản đọc từ Kế Toán (GET /partners/:code/balances, đệm ≤ 5 phút) — Cake KHÔNG lưu số dư;
//   cake.partner.create = "Tạo khách công nợ": PUT /partners/<mã> rồi lưu liên kết mã ↔ khách ở contact_links (R-CAKE-MASTER-5). Không gửi contact_id ra ngoài mã CAKE-<id>.
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';

const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const Iso = z.string();

export const PartnerDebtSchema = z.object({
  /** `none`: đơn vị chưa nối Kế Toán (hoặc chưa có khoá đọc) ⇒ giao diện nói rõ, không hiện số dư. */
  source: z.enum(['ketoan', 'none']),
  /** đã liên kết đối tượng công nợ ở Kế Toán chưa. */
  linked: z.boolean(), refCode: z.string().nullable(),
  /** thứ sẽ gửi khi bấm Tạo: mã theo R-CAKE-MASTER-5 (SĐT đã xác minh → CAKE-<contact_id>). */
  proposed: z.object({ code: z.string(), kind: z.enum(['phone', 'contact']), name: z.string(), phone: z.string().nullable(), verified: z.boolean() }),
  branchCode: z.string().nullable(),
  balances: z.object({
    asOf: z.string(), readAt: Iso,
    accounts: z.array(z.object({ accountCode: z.string(), accountName: z.string(), balance: z.number() })), total: z.number(),
  }).nullable(),
  /** Kế Toán không trả lời: có `balances` ⇒ là số lần đọc gần nhất; không có ⇒ chưa đọc được lần nào. */
  error: z.string().nullable(),
});
export type PartnerDebt = z.infer<typeof PartnerDebtSchema>;

export const partnerGet = defineActionSpec({
  id: 'cake.partner.get', capability: 'cake.order.manage', title: 'Công nợ khách ở Kế Toán', kind: 'query',
  input: z.object({ contactId: Ulid, refresh: z.boolean().default(false) }),
  output: PartnerDebtSchema, permission: 'cake:don-xem', risk: 'read', expose: { rest: 'GET /api/v1/contacts/:contactId/partner', mcp: 'read', ui: true },
});
export const partnerCreate = defineActionSpec({
  id: 'cake.partner.create', capability: 'cake.order.manage', title: 'Tạo khách công nợ ở Kế Toán', kind: 'command',
  input: z.object({ contactId: Ulid, name: z.string().trim().min(1).max(255).optional() }),
  output: PartnerDebtSchema, permission: 'cake:don-lap', risk: 'medium', idempotent: true, reasons: ['CAKE_KETOAN_REQUIRED', 'CAKE_PARTNER_FAILED'],
  emits: ['bizcity.cake.partner.linked'], expose: { rest: 'POST /api/v1/contacts/:contactId/partner', ui: true },
});

export const PARTNER_ACTIONS = [partnerGet, partnerCreate] as const;
