// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-3: danh mục action của open-cake (architecture/15 §1). Mỗi spec là hợp đồng duy nhất cho
//   REST, MCP, React; giao diện PHASE-003 gọi đúng các id này qua ActionClient, backend 007 hiện thực đúng các id này.
import { z } from 'zod';
import { createActionCatalog, defineActionSpec } from '../base/action.js';
import { ChannelAccountIdSchema, ContactIdSchema, ConversationIdSchema, IdentityKeySchema, ProofSchema, AccountChannelSchema } from './channel.js';
import {
  ChannelAccountSchema, ContactSchema, ContactStateSchema, ConversationSchema, IdentitySchema, MessageSchema, TimelineItemSchema, AttachmentSchema,
} from './entities.js';
import {
  ContactLinkSchema, ContactLookupInputSchema, ContactLookupResultSchema, ContactResolveInputSchema, ContactResolveResultSchema,
} from './contact-contract.js';

const cursor = { cursor: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) };
const page = { page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(200).default(50) };
const ok = z.object({ ok: z.literal(true) });

// ── Kênh ────────────────────────────────────────────────────────────────
export const channelList = defineActionSpec({
  id: 'cake.channel.list', capability: 'cake.channel.manage', title: 'Danh sách tài khoản kênh', kind: 'query',
  input: z.object({}), output: z.array(ChannelAccountSchema),
  permission: 'cake:channels-xem', risk: 'read', expose: { rest: 'GET /api/v1/channels', mcp: 'read', ui: true },
});
export const channelConnectStart = defineActionSpec({
  id: 'cake.channel.connect_start', capability: 'cake.channel.manage', title: 'Bắt đầu kết nối kênh', kind: 'command',
  input: z.object({ channel: AccountChannelSchema, label: z.string().min(1).max(100) }),
  output: z.object({ flowId: z.string(), nextStep: z.enum(['qr', 'oauth', 'approve_on_device', 'choose_page', 'choose_group']), qrRef: z.string().nullable() }),
  permission: 'cake:channels-lap', risk: 'high', idempotent: true, reasons: ['CAKE_CHANNEL_NOT_CONNECTED'],
  expose: { rest: 'POST /api/v1/channels/connect', ui: true },
});
export const channelTest = defineActionSpec({
  id: 'cake.channel.test', capability: 'cake.channel.manage', title: 'Gửi thử để xác nhận kết nối', kind: 'command',
  input: z.object({ channelAccountId: ChannelAccountIdSchema }), output: z.object({ testedAt: z.string(), twoWay: z.boolean() }),
  permission: 'cake:channels-lap', risk: 'medium', idempotent: true, expose: { rest: 'POST /api/v1/channels/:channelAccountId/test', ui: true },
});

// [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh = ai thấy hội thoại của tài khoản đó (40-SECURITY §2: nhân viên chỉ thấy
//   tài khoản được giao hoặc hội thoại được giao; cake:all-inbox-xem thấy hết). Đặt thành viên là quyền rủi ro cao (quyết định ai đọc được tin của khách).
const ChannelMemberSchema = z.object({ userId: z.string().regex(/^[1-9][0-9]{0,18}$/), name: z.string(), role: z.string() });
export const channelMembers = defineActionSpec({
  id: 'cake.channel.members', capability: 'cake.channel.manage', title: 'Nhân viên của tài khoản kênh', kind: 'query',
  input: z.object({ channelAccountId: ChannelAccountIdSchema }), output: z.array(ChannelMemberSchema),
  permission: 'cake:channels-xem', risk: 'read', expose: { rest: 'GET /api/v1/channels/:channelAccountId/members', ui: true },
});
export const channelMembersSet = defineActionSpec({
  id: 'cake.channel.members_set', capability: 'cake.channel.manage', title: 'Giao tài khoản kênh cho nhân viên', kind: 'command',
  input: z.object({ channelAccountId: ChannelAccountIdSchema, userIds: z.array(z.string().regex(/^[1-9][0-9]{0,18}$/)).max(200) }),
  output: z.array(ChannelMemberSchema), permission: 'users:write', risk: 'high', idempotent: true, /* [2026-11-24 10:15 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — quyền nền users:write (chủ, quản lý), 40-SECURITY §2. */
  emits: ['bizcity.cake.channel.members_changed'], expose: { rest: 'PUT /api/v1/channels/:channelAccountId/members', ui: true },
});

// ── Hộp thư ─────────────────────────────────────────────────────────────
export const conversationList = defineActionSpec({
  id: 'cake.conversation.list', capability: 'cake.conversation.manage', title: 'Danh sách hội thoại', kind: 'query',
  input: z.object({ channelAccountId: ChannelAccountIdSchema.optional(), filter: z.enum(['all', 'unread', 'mine', 'unanswered']).default('all'), tag: z.string().optional(), q: z.string().max(100).optional(), ...cursor }),
  output: z.array(ConversationSchema), permission: 'cake:inbox-xem', risk: 'read', expose: { rest: 'GET /api/v1/conversations', mcp: 'read', ui: true },
});
export const messageList = defineActionSpec({
  id: 'cake.message.list', capability: 'cake.conversation.manage', title: 'Tin trong hội thoại', kind: 'query',
  input: z.object({ conversationId: ConversationIdSchema, ...cursor }), output: z.array(MessageSchema),
  permission: 'cake:inbox-xem', risk: 'read', expose: { rest: 'GET /api/v1/conversations/:conversationId/messages', mcp: 'read', ui: true },
});
export const messageSend = defineActionSpec({
  id: 'cake.message.send', capability: 'cake.message.send', title: 'Gửi tin', kind: 'command',
  input: z.object({ conversationId: ConversationIdSchema, text: z.string().max(5000).default(''), attachments: z.array(AttachmentSchema).max(10).default([]) })
    .refine((v) => v.text.trim() !== '' || v.attachments.length > 0, { message: 'tin rỗng' }),
  output: MessageSchema, permission: 'cake:inbox-lap', risk: 'medium', idempotent: true,
  emits: ['bizcity.cake.message.requested'], reasons: ['CAKE_WINDOW_CLOSED', 'CAKE_SEND_CAP_REACHED', 'CAKE_SEND_CAP_MISSING', 'CAKE_CHANNEL_NOT_CONNECTED'],
  expose: { rest: 'POST /api/v1/messages', mcp: 'propose', ui: true },
});
export const messageDraft = defineActionSpec({
  id: 'cake.message.draft', capability: 'cake.message.send', title: 'Soạn nháp trả lời (gợi ý AI)', kind: 'command',
  input: z.object({ conversationId: ConversationIdSchema, text: z.string().min(1).max(5000) }),
  output: z.object({ draftId: z.string(), text: z.string() }), permission: 'cake:inbox-lap', risk: 'low',
  expose: { rest: 'POST /api/v1/messages/drafts', mcp: 'propose', ui: true },
});
export const commentReply = defineActionSpec({
  id: 'cake.comment.reply', capability: 'cake.comment.reply', title: 'Trả lời comment công khai / riêng', kind: 'command',
  input: z.object({ conversationId: ConversationIdSchema, mode: z.enum(['public', 'private']), text: z.string().min(1).max(5000) }),
  output: MessageSchema, permission: 'cake:inbox-lap', risk: 'medium', idempotent: true, emits: ['bizcity.cake.message.requested'],
  reasons: ['CAKE_WINDOW_CLOSED', 'CAKE_CHANNEL_NOT_CONNECTED'], expose: { rest: 'POST /api/v1/comments/reply', mcp: 'propose', ui: true },
});
export const conversationAssign = defineActionSpec({
  id: 'cake.conversation.assign', capability: 'cake.conversation.manage', title: 'Giao hội thoại', kind: 'command',
  input: z.object({ conversationId: ConversationIdSchema, userId: z.string().nullable() }), output: ok,
  permission: 'cake:inbox-lap', risk: 'low', idempotent: true, emits: ['bizcity.cake.touch.recorded'],
  expose: { rest: 'POST /api/v1/conversations/:conversationId/assign', mcp: 'propose', ui: true },
});
export const conversationTag = defineActionSpec({
  id: 'cake.conversation.tag', capability: 'cake.conversation.manage', title: 'Gắn / gỡ nhãn', kind: 'command',
  input: z.object({ conversationId: ConversationIdSchema, add: z.array(z.string()).default([]), remove: z.array(z.string()).default([]) }),
  output: z.object({ tags: z.array(z.string()) }), permission: 'cake:inbox-lap', risk: 'low', idempotent: true,
  emits: ['bizcity.cake.touch.recorded'], expose: { rest: 'POST /api/v1/conversations/:conversationId/tags', mcp: 'propose', ui: true },
});

// ── Khách (Contact 360) ─────────────────────────────────────────────────
const ContactRowSchema = z.object({ contact: ContactSchema, state: ContactStateSchema, phone: z.string().nullable(), gender: z.string().nullable(), birthday: z.string().nullable(),
  realName: z.string().nullable().default(null) }); // [2026-11-25 12:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 S007-8 — tên thật (meta cake.contact.real_name) dưới tên hiển thị, như ảnh chuẩn danh bạ
export const contactList = defineActionSpec({
  id: 'cake.contact.list', capability: 'cake.contact.read', title: 'Danh bạ', kind: 'query',
  input: z.object({ tag: z.string().optional(), gender: z.string().optional(), birthday: z.enum(['today', 'month']).optional(), q: z.string().max(100).optional(), sort: z.enum(['name', 'last']).default('last'), ...page }),
  output: z.array(ContactRowSchema), permission: 'cake:contacts-xem', risk: 'read', expose: { rest: 'GET /api/v1/contacts', mcp: 'read', ui: true },
});
export const contactGet = defineActionSpec({
  id: 'cake.contact.get', capability: 'cake.contact.read', title: 'Hồ sơ khách', kind: 'query',
  input: z.object({ contactId: ContactIdSchema }),
  output: z.object({ contact: ContactSchema, state: ContactStateSchema, identities: z.array(IdentitySchema), links: z.array(ContactLinkSchema), meta: z.record(z.unknown()) }),
  permission: 'cake:contacts-xem', risk: 'read', expose: { rest: 'GET /api/v1/contacts/:contactId', mcp: 'read', ui: true },
});
export const contactTimeline = defineActionSpec({
  id: 'cake.contact.timeline', capability: 'cake.contact.read', title: 'Dòng thời gian mọi kênh', kind: 'query',
  input: z.object({ contactId: ContactIdSchema, ...cursor }), output: z.array(TimelineItemSchema),
  permission: 'cake:contacts-xem', risk: 'read', expose: { rest: 'GET /api/v1/contacts/:contactId/timeline', mcp: 'read', ui: true },
});
export const contactLookup = defineActionSpec({
  id: 'cake.contact.lookup', capability: 'cake.contact.read', title: 'Tra khách (bizcity_contact@1)', kind: 'query',
  input: ContactLookupInputSchema, output: ContactLookupResultSchema, permission: 'cake:contacts-xem', risk: 'read',
  expose: { rest: 'GET /api/v1/contacts/lookup', mcp: 'read' },
});
export const contactResolve = defineActionSpec({
  id: 'cake.contact.resolve', capability: 'cake.contact.resolve', title: 'Tìm hoặc tạo khách theo danh tính', kind: 'command',
  input: ContactResolveInputSchema, output: ContactResolveResultSchema, permission: 'cake:contacts-sua', risk: 'low', idempotent: true,
  emits: ['bizcity.cake.contact.created'], expose: { rest: 'POST /api/v1/contacts/resolve', mcp: 'propose' },
});
export const contactSuggestions = defineActionSpec({
  id: 'cake.contact.suggestions', capability: 'cake.contact.merge', title: 'Gợi ý có thể là cùng người', kind: 'query',
  input: z.object({ contactId: ContactIdSchema }),
  output: z.array(z.object({ contactId: ContactIdSchema, displayName: z.string(), why: z.array(z.enum(['same_name', 'same_avatar', 'same_page', 'same_phone_unverified'])), identity: IdentityKeySchema })),
  permission: 'cake:contacts-xem', risk: 'read', expose: { rest: 'GET /api/v1/contacts/:contactId/suggestions', ui: true },
});
export const contactMerge = defineActionSpec({
  id: 'cake.contact.merge', capability: 'cake.contact.merge', title: 'Ghép hai khách', kind: 'command',
  input: z.object({ contactId: ContactIdSchema, intoContactId: ContactIdSchema, proof: ProofSchema })
    .refine((v) => v.contactId !== v.intoContactId, { message: 'CAKE_MERGE_SELF', path: ['intoContactId'] }),
  output: z.object({ intoContactId: ContactIdSchema, unmergeUntil: z.string() }),
  permission: 'cake:contacts-gop', risk: 'high', idempotent: true, emits: ['bizcity.cake.contact.merged'],
  reasons: ['CAKE_MERGE_NO_PROOF', 'CAKE_MERGE_SELF'], expose: { rest: 'POST /api/v1/contacts/:contactId/merge', ui: true },
});
export const contactUnmerge = defineActionSpec({
  id: 'cake.contact.unmerge', capability: 'cake.contact.merge', title: 'Tách khách đã ghép', kind: 'command',
  input: z.object({ contactId: ContactIdSchema }), output: ok, permission: 'cake:contacts-gop', risk: 'high', idempotent: true,
  emits: ['bizcity.cake.contact.unmerged'], reasons: ['CAKE_UNMERGE_EXPIRED'], expose: { rest: 'POST /api/v1/contacts/:contactId/unmerge', ui: true },
});
export const contactLink = defineActionSpec({
  id: 'cake.contact.link', capability: 'cake.contact.link', title: 'Liên kết khách với app anh em', kind: 'command',
  input: z.object({ contactId: ContactIdSchema, link: ContactLinkSchema }), output: ok, permission: 'cake:contacts-sua', risk: 'low', idempotent: true,
  emits: ['bizcity.cake.contact.partner_linked'], expose: { rest: 'POST /api/v1/contacts/:contactId/links' },
});

export const CAKE_ACTIONS = [
  channelList, channelConnectStart, channelTest, channelMembers, channelMembersSet, conversationList, messageList, messageSend, messageDraft, commentReply,
  conversationAssign, conversationTag, contactList, contactGet, contactTimeline, contactLookup, contactResolve,
  contactSuggestions, contactMerge, contactUnmerge, contactLink,
] as const;

export const cakeCatalog = createActionCatalog(CAKE_ACTIONS);
