// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-5: bizcity_touch@1 (docs/contracts/BIZCITY-TOUCH-v1.md 0.1.0-draft) — Cell → Hub → Cake.
//   Thân KHÔNG được có contactId / tenantId / siteId / bí mật (strict ở gốc).
import { z } from 'zod';
import { AccountChannelSchema, ChannelSchema, IdentityKeySchema } from './channel.js';
import { AnchorSchema, AttachmentSchema, DeliverySchema } from './entities.js';

export const TOUCH_TYPES = [
  'message.received', 'message.sent', 'delivery.updated', 'comment.received', 'comment.replied',
  'reaction.added', 'account.status', 'history.sync.completed',
] as const;

/** `channel|externalAccountId|externalThreadId|externalMessageId` — Cell tạo, bất biến. */
export const DOC_KEY_RE = /^[a-z_]+\|[^|]+\|[^|]+\|[^|]+$/;

export const TouchSchema = z.object({
  contract: z.literal('bizcity_touch@1'),
  eventId: z.string().min(10),
  type: z.enum(TOUCH_TYPES),
  occurredAt: z.string().datetime({ offset: true }),
  source: z.string().regex(/^cell:[a-z0-9-]+$/),
  docKey: z.string().regex(DOC_KEY_RE),
  version: z.number().int().min(1),
  channel: ChannelSchema,
  channelAccount: z.object({ externalAccountId: z.string(), kind: z.enum(['personal', 'page', 'group', 'oa']) }).strict(),
  thread: z.object({
    externalThreadId: z.string(),
    kind: z.enum(['dm', 'comment_thread', 'group_thread']),
    anchor: AnchorSchema.nullable(),
  }).strict(),
  sender: z.intersection(
    IdentityKeySchema.innerType().omit({ channel: true }),
    z.object({ displayName: z.string().nullable(), avatarRef: z.string().nullable() }),
  ).nullable(), // account.status không có người gửi
  direction: z.enum(['inbound', 'outbound']),
  content: z.object({
    type: z.enum(['text', 'image', 'file', 'sticker', 'reaction', 'none']),
    text: z.string().max(20000).nullable(),
    attachments: z.array(AttachmentSchema.extend({ ttlSeconds: z.number().int().positive().optional() })),
  }).strict(),
  hints: z.object({
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    privateReplyOf: z.string().nullable().optional(), // comment_id ⇒ resolver ghép proven
    commandKey: z.string().nullable().optional(), // delivery.updated trả lời bizcity_channel_command@1
    surrogate: z.boolean().optional(),
  }).strict(),
  encryption: z.object({ e2ee: z.boolean(), decryptedOnCell: z.boolean() }).strict(),
  delivery: z.object({ status: DeliverySchema, externalMessageId: z.string().optional(), errorCode: z.string().optional() }).nullable(),
  history: z.object({ backfill: z.boolean(), cursor: z.string().nullable() }).strict(),
}).strict().superRefine((t, ctx) => {
  // scope người gửi phải hợp với kênh (dùng lại luật của IdentityKeySchema)
  if (t.sender) {
    const r = IdentityKeySchema.safeParse({ channel: t.channel, scope: t.sender.scope, externalId: t.sender.externalId });
    if (!r.success) ctx.addIssue({ code: 'custom', path: ['sender', 'scope'], message: r.error.issues[0]?.message ?? 'scope sai' });
  }
  if (t.channel === 'facebook_comment' && !t.thread.anchor?.commentId) {
    ctx.addIssue({ code: 'custom', path: ['thread', 'anchor'], message: 'comment cần anchor.commentId' });
  }
  if (t.type === 'delivery.updated' && !t.delivery) ctx.addIssue({ code: 'custom', path: ['delivery'], message: 'delivery.updated cần delivery' });
  if (!t.docKey.startsWith(`${t.channel}|`)) ctx.addIssue({ code: 'custom', path: ['docKey'], message: 'docKey phải bắt đầu bằng kênh' });
  if (t.type !== 'account.status' && !t.sender) ctx.addIssue({ code: 'custom', path: ['sender'], message: 'thiếu người gửi' });
});
export type Touch = z.infer<typeof TouchSchema>;

/** Trả lời của /ingress/v1/touch (bên trong phong bì). */
export const TouchResultSchema = z.object({
  status: z.enum(['accepted', 'unchanged']),
  touchId: z.string(),
  contactId: z.string(),
});

// Giữ AccountChannelSchema để kiểm tài khoản nhắn được (channelAccount thuộc kênh có tài khoản).
export const isAccountChannel = (c: string): boolean => AccountChannelSchema.safeParse(c).success;
