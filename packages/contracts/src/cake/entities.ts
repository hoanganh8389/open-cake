// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-4: hình đọc của các thực thể trục (đúng cột architecture/20-DATA-SPINE §1),
//   dùng chung cho REST, MCP, giao diện. camelCase ở dây; cột SQL là snake_case.
import { z } from 'zod';
import {
  AccountChannelSchema, ChannelAccountIdSchema, ChannelSchema, ConfidenceSchema, ContactIdSchema,
  ConversationIdSchema, IdentityKeySchema, MessageIdSchema, ProofSchema,
} from './channel.js';

const iso = z.string().datetime({ offset: true });

export const ContactSchema = z.object({
  contactId: ContactIdSchema,
  kind: z.enum(['person', 'org']),
  displayName: z.string().min(1).max(200),
  status: z.enum(['active', 'merged', 'archived']),
  mergedInto: ContactIdSchema.nullable(),
  createdAt: iso,
}).refine((c) => (c.status === 'merged') === (c.mergedInto !== null), { message: 'merged ⇔ có mergedInto' });
export type Contact = z.infer<typeof ContactSchema>;

export const IdentitySchema = z.intersection(IdentityKeySchema, z.object({
  identityId: z.string(),
  contactId: ContactIdSchema,
  displayName: z.string().nullable(),
  confidence: ConfidenceSchema,
  proof: ProofSchema.nullable(),
  validFrom: iso,
  validTo: iso.nullable(),
}));
export type Identity = z.infer<typeof IdentitySchema>;

/** Tài khoản kênh của doanh nghiệp. **Không** có cookie / token (R-CAKE-CELL-1). */
export const ChannelAccountSchema = z.object({
  channelAccountId: ChannelAccountIdSchema,
  channel: AccountChannelSchema,
  kind: z.enum(['personal', 'page', 'group', 'oa']),
  externalAccountId: z.string(),
  label: z.string(),
  ownerUserId: z.string().nullable(),
  status: z.enum(['connected', 'connecting', 'auth_required', 'checkpoint', 'degraded', 'disconnected']),
  testedAt: iso.nullable(),
  unread: z.number().int().min(0),
}).strict();
export type ChannelAccount = z.infer<typeof ChannelAccountSchema>;

export const AnchorSchema = z.object({ postId: z.string(), commentId: z.string().optional(), parentId: z.string().optional() });

export const ConversationSchema = z.object({
  conversationId: ConversationIdSchema,
  channelAccountId: ChannelAccountIdSchema,
  externalThreadId: z.string(),
  contactId: ContactIdSchema,
  kind: z.enum(['dm', 'comment_thread', 'group_thread']),
  anchor: AnchorSchema.nullable(),
  title: z.string(),
  lastText: z.string(),
  lastAt: iso,
  lastDirection: z.enum(['in', 'out']),
  unread: z.number().int().min(0),
  tags: z.array(z.string()),
  assigneeUserId: z.string().nullable(),
  windowUntil: iso.nullable(), // Page: hết 24 h thì chặn gửi
  pinned: z.boolean(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const AttachmentSchema = z.object({
  type: z.enum(['image', 'file', 'video', 'audio', 'sticker']),
  ref: z.string(),
  name: z.string().optional(),
  mime: z.string().optional(),
  size: z.number().int().min(0).optional(),
});

export const DeliverySchema = z.enum(['accepted', 'sent', 'delivered', 'read', 'failed', 'unknown']);

export const MessageSchema = z.object({
  messageId: MessageIdSchema,
  conversationId: ConversationIdSchema,
  direction: z.enum(['in', 'out']),
  text: z.string(),
  attachments: z.array(AttachmentSchema),
  at: iso,
  e2ee: z.boolean(),
  delivery: DeliverySchema.nullable(), // null với tin vào
  reaction: z.string().nullable(),
  sentByUserId: z.string().nullable(),
});
export type Message = z.infer<typeof MessageSchema>;

/** Một dòng sổ chạm khách như giao diện / MCP thấy (đã giải merge). */
export const TOUCH_KINDS = [
  'message', 'comment', 'reaction', 'call', 'note', 'tag', 'stage', 'assign',
  'merge', 'identity', 'document', 'task', 'broadcast_target',
] as const;
export const TimelineItemSchema = z.object({
  touchId: z.string(),
  contactId: ContactIdSchema,
  kind: z.enum(TOUCH_KINDS),
  channel: ChannelSchema.nullable(),
  channelAccountId: ChannelAccountIdSchema.nullable(),
  conversationId: ConversationIdSchema.nullable(),
  direction: z.enum(['in', 'out', 'none']),
  summary: z.string(), // câu ngắn đã che PII khi người xem không có cake:inbox-xem
  docRef: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*:.+$/).nullable(),
  isReversal: z.boolean(),
  at: iso,
});
export type TimelineItem = z.infer<typeof TimelineItemSchema>;

export const ContactStateSchema = z.object({
  contactId: ContactIdSchema,
  stage: z.string().nullable(),
  tags: z.array(z.string()),
  ownerUserId: z.string().nullable(),
  lastInAt: iso.nullable(),
  lastOutAt: iso.nullable(),
  unanswered: z.boolean(),
  channels: z.record(ChannelSchema, z.number().int().min(0)),
});
export type ContactState = z.infer<typeof ContactStateSchema>;
