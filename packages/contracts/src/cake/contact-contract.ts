// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-5: bizcity_contact@1 (docs/contracts/BIZCITY-CONTACT-v1.md) — tra / tạo / liên kết người
//   cho app anh em (POS, Kế Toán, Twin Brain). Cake là chủ contact_id; app khác chỉ giữ contact_ref.
import { z } from 'zod';
import { ChannelSchema, ConfidenceSchema, ContactIdSchema, IdentityKeySchema, ScopeSchema } from './channel.js';

/** Tra theo một trong: phone / email / taxCode (chỉ khớp identity proven) hoặc (channel, scope, externalId). */
export const ContactLookupInputSchema = z.union([
  z.object({ phone: z.string().regex(/^0\d{9,10}$/) }).strict(),
  z.object({ email: z.string().email() }).strict(),
  z.object({ taxCode: z.string().regex(/^\d{10}(-\d{3})?$/) }).strict(),
  z.object({ channel: ChannelSchema, scope: ScopeSchema, externalId: z.string() }).strict(),
]);

export const ContactLookupResultSchema = z.object({
  contactId: ContactIdSchema,
  displayName: z.string(),
  status: z.enum(['active', 'merged', 'archived']),
  mergedInto: ContactIdSchema.nullable(), // khác null ⇒ bên gọi phải đổi tham chiếu
  confidence: ConfidenceSchema,
}).nullable();

export const ContactLinkSchema = z.object({
  app: z.enum(['ketoan', 'pos', 'kiot']),
  kind: z.enum(['partner', 'customer']),
  refCode: z.string().min(1).max(64),
  refId: z.string().nullable(),
}).strict();
export type ContactLink = z.infer<typeof ContactLinkSchema>;

/** POS / Twin Brain: trả contact có sẵn (proven) hoặc tạo mới (asserted). */
export const ContactResolveInputSchema = z.object({
  identities: z.array(IdentityKeySchema).min(1).max(10),
  displayName: z.string().min(1).max(200),
}).strict();

export const ContactResolveResultSchema = z.object({
  contactId: ContactIdSchema,
  created: z.boolean(),
  confidence: ConfidenceSchema,
});

/** Mã đối tượng công nợ Cake gửi sang Kế Toán (R-CAKE-SIB-3, một chiều). */
export const partnerCodeOf = (contactId: string): string => `CAKE-${contactId}`;
