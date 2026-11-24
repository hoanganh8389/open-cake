// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-4: ID trục, kênh, scope, độ tin, bằng chứng (architecture/20-DATA-SPINE §2, §4;
//   R-CAKE-ID-1..3). Luật then chốt nằm ở schema: không có kênh "facebook" trơn, scope bắt buộc và đúng loại theo kênh, không có bằng chứng "name".
import { z } from 'zod';

/** ULID 26 ký tự Crockford base32 (không I, L, O, U). */
export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const ulid = <B extends string>(brand: B) => z.string().regex(ULID_RE, 'phải là ULID').brand(brand);

export const ContactIdSchema = ulid('ContactId');
export const ChannelAccountIdSchema = ulid('ChannelAccountId');
export const ConversationIdSchema = ulid('ConversationId');
export const MessageIdSchema = ulid('MessageId');
export type ContactId = z.infer<typeof ContactIdSchema>;
export type ChannelAccountId = z.infer<typeof ChannelAccountIdSchema>;
export type ConversationId = z.infer<typeof ConversationIdSchema>;
export type MessageId = z.infer<typeof MessageIdSchema>;

/** Kênh **của khách** (danh tính). Không bao giờ "facebook" trơn. */
export const CHANNELS = [
  'zalo_personal', 'zalo_oa',
  'facebook_personal', 'facebook_page', 'facebook_comment', 'facebook_group',
  'phone', 'email', 'tax_code', 'bank_account', 'web',
] as const;
export const ChannelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof ChannelSchema>;

/** Kênh mà doanh nghiệp có **tài khoản** để nhắn (channel_accounts). */
export const ACCOUNT_CHANNELS = ['zalo_personal', 'zalo_oa', 'facebook_personal', 'facebook_page', 'facebook_group'] as const;
export const AccountChannelSchema = z.enum(ACCOUNT_CHANNELS);
export type AccountChannel = z.infer<typeof AccountChannelSchema>;

/** Scope của một danh tính: id chỉ có nghĩa trong scope đó (PSID theo Page, from.id comment theo Page…). */
export const SCOPE_RULE: Record<Channel, RegExp> = {
  zalo_personal: /^global$/,
  zalo_oa: /^oa:[A-Za-z0-9_-]+$/,
  facebook_personal: /^global$/,
  facebook_page: /^page:\d+$/,
  facebook_comment: /^comment:\d+$/,
  facebook_group: /^group:\d+$/,
  phone: /^global$/,
  email: /^global$/,
  tax_code: /^global$/,
  bank_account: /^global$/,
  web: /^site$/,
};
export const ScopeSchema = z.string().regex(/^(global|site|(oa|page|comment|group|account):[A-Za-z0-9_-]+)$/);

export const ConfidenceSchema = z.enum(['proven', 'asserted', 'guessed']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Bằng chứng để ghép / gắn danh tính. **Không có `name`** (R-CAKE-ID-2). */
export const PROOF_KINDS = ['phone', 'email', 'tax_code', 'fb_private_reply', 'human', 'channel'] as const;
export const ProofSchema = z.object({
  kind: z.enum(PROOF_KINDS),
  eventId: z.string().optional(),
  userId: z.string().optional(),
  note: z.string().max(500).optional(),
}).superRefine((p, ctx) => {
  if (p.kind === 'human' && !p.userId) ctx.addIssue({ code: 'custom', message: 'bằng chứng "human" cần userId người xác nhận' });
});
export type Proof = z.infer<typeof ProofSchema>;

/** Một danh tính kênh: (channel, scope, externalId) — kiểm scope đúng loại theo kênh. */
export const IdentityKeySchema = z.object({
  channel: ChannelSchema,
  scope: ScopeSchema,
  externalId: z.string().min(1).max(200),
}).superRefine((v, ctx) => {
  if (!SCOPE_RULE[v.channel].test(v.scope)) {
    ctx.addIssue({ code: 'custom', path: ['scope'], message: `scope "${v.scope}" không hợp với kênh ${v.channel}` });
  }
});
export type IdentityKey = z.infer<typeof IdentityKeySchema>;
