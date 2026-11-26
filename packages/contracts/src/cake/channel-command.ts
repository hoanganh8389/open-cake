// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-5: bizcity_channel_command@1 (docs/contracts/BIZCITY-CHANNEL-COMMAND-v1.md) — Cake → Hub → Cell.
//   Kết quả thật về bằng bizcity_touch@1 delivery.updated; hết giờ chờ = unknown, không tự gửi lại (R-CAKE-SEND-2).
import { z } from 'zod';
import { AccountChannelSchema } from './channel.js';
import { AnchorSchema, AttachmentSchema } from './entities.js';

export const CHANNEL_OPERATIONS = [
  'message.send', 'comment.reply', 'comment.private_reply', 'thread.mark_read', 'history.sync', 'account.test',
  // [2026-11-26 08:43 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — 0.2 (chỉ thêm): thu hồi, thả cảm xúc, đồng bộ danh bạ, tìm người theo SĐT (25-KET-NOI-KENH §3b)
  'message.revoke', 'reaction.add', 'directory.sync', 'contact.find',
] as const;

/** `cake:<touch_id>:<việc>:<lần>` — lần gửi lại do người bấm thì tăng số. */
export const COMMAND_KEY_RE = /^cake:\d+:[a-z_]+:\d+$/;

export const ChannelCommandSchema = z.object({
  contract: z.literal('bizcity_channel_command@1'),
  operation: z.enum(CHANNEL_OPERATIONS),
  idempotencyKey: z.string().regex(COMMAND_KEY_RE),
  channel: AccountChannelSchema,
  channelAccount: z.object({ cellRef: z.string(), externalAccountId: z.string() }).strict(),
  target: z.object({ externalThreadId: z.string().nullable(), anchor: AnchorSchema.nullable(), externalMessageId: z.string().nullable().optional() }).strict(),
  content: z.object({ type: z.enum(['text', 'image', 'file', 'none']), text: z.string().max(5000).nullable(), attachments: z.array(AttachmentSchema) }).strict(),
  options: z.object({
    messageTag: z.string().nullable(),
    quoteExternalMessageId: z.string().nullable(),
    cursor: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    reaction: z.string().min(1).max(8).optional(),
    phone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
  }).strict(),
  /** chỉ là siêu dữ liệu bằng chứng — Hub không cấp quyền dựa trên trường này. */
  requestedBy: z.object({ kind: z.enum(['user', 'ai', 'system']), id: z.string() }).strict(),
}).strict().superRefine((c, ctx) => {
  const needThread = c.operation === 'message.send' || c.operation === 'thread.mark_read';
  if (needThread && !c.target.externalThreadId) ctx.addIssue({ code: 'custom', path: ['target', 'externalThreadId'], message: `${c.operation} cần externalThreadId` });
  const needComment = c.operation === 'comment.reply' || c.operation === 'comment.private_reply';
  if (needComment && !c.target.anchor?.commentId) ctx.addIssue({ code: 'custom', path: ['target', 'anchor'], message: `${c.operation} cần anchor.commentId` });
  if (needComment && c.channel !== 'facebook_page') ctx.addIssue({ code: 'custom', path: ['channel'], message: 'trả lời comment chỉ qua tài khoản facebook_page' });
  const onMessage = c.operation === 'message.revoke' || c.operation === 'reaction.add';
  if (onMessage && (!c.target.externalThreadId || !c.target.externalMessageId)) ctx.addIssue({ code: 'custom', path: ['target'], message: `${c.operation} cần externalThreadId + externalMessageId` });
  if (c.operation === 'reaction.add' && !c.options.reaction) ctx.addIssue({ code: 'custom', path: ['options', 'reaction'], message: 'reaction.add cần options.reaction' });
  if (c.operation === 'contact.find' && !c.options.phone) ctx.addIssue({ code: 'custom', path: ['options', 'phone'], message: 'contact.find cần options.phone' });
  if (c.operation === 'message.send' && !c.content.text && c.content.attachments.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'tin rỗng' });
  }
});
export type ChannelCommand = z.infer<typeof ChannelCommandSchema>;
