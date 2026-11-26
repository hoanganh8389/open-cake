// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-26 08:43 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — năng lực kênh đủ (docs/architecture/25-KET-NOI-KENH.md §3b), mockup ⑤ ⑥ đã duyệt:
//   thu hồi tin của shop, thả cảm xúc, đồng bộ danh bạ (bạn bè + nhóm, tên + ảnh), tìm người theo SĐT. Mỗi action = một lệnh bizcity_channel_command@1 0.2
//   vào hàng chờ channel_commands (cùng đường gửi lại với message.send); kết quả thật về bằng bizcity_touch@1 (revoked / profile.updated / thread.updated).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';
import { ChannelAccountIdSchema, MessageIdSchema } from './channel.js';

export const CommandQueuedSchema = z.object({
  commandKey: z.string(),
  /** accepted = Hub / máy kết nối đã nhận; queued = chưa tới, đang gửi lại; rejected = bị từ chối hẳn. */
  state: z.enum(['accepted', 'queued', 'rejected', 'given_up']),
});
export type CommandQueued = z.infer<typeof CommandQueuedSchema>;

export const messageRevoke = defineActionSpec({
  id: 'cake.message.revoke', capability: 'cake.message.send', title: 'Thu hồi tin của shop', kind: 'command',
  input: z.object({ messageId: MessageIdSchema }), output: CommandQueuedSchema, permission: 'cake:inbox-lap', risk: 'medium', idempotent: true, // ngang message.send — không nâng quyền trả lời tin của nhân viên; giao diện vẫn xác nhận
  reasons: ['CAKE_CHANNEL_NOT_CONNECTED'], expose: { rest: 'POST /api/v1/messages/:messageId/revoke', ui: true },
});
export const messageReact = defineActionSpec({
  id: 'cake.message.react', capability: 'cake.message.send', title: 'Thả cảm xúc', kind: 'command',
  input: z.object({ messageId: MessageIdSchema, reaction: z.string().min(1).max(8) }), output: CommandQueuedSchema, permission: 'cake:inbox-lap', risk: 'low', idempotent: true,
  reasons: ['CAKE_CHANNEL_NOT_CONNECTED'], expose: { rest: 'POST /api/v1/messages/:messageId/react', ui: true },
});
export const directorySync = defineActionSpec({
  id: 'cake.directory.sync', capability: 'cake.channel.manage', title: 'Đồng bộ danh bạ từ kênh', kind: 'command',
  input: z.object({ channelAccountId: ChannelAccountIdSchema }), output: CommandQueuedSchema, permission: 'cake:channels-lap', risk: 'low', idempotent: true,
  reasons: ['CAKE_CHANNEL_NOT_CONNECTED'], expose: { rest: 'POST /api/v1/channels/:channelAccountId/directory-sync', ui: true },
});
export const contactFind = defineActionSpec({
  id: 'cake.contact.find', capability: 'cake.contact.read', title: 'Tìm người trên kênh theo số điện thoại', kind: 'command',
  input: z.object({ channelAccountId: ChannelAccountIdSchema, phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'số điện thoại 8–15 chữ số') }), output: CommandQueuedSchema,
  permission: 'cake:inbox-lap', risk: 'low', idempotent: true, reasons: ['CAKE_CHANNEL_NOT_CONNECTED'], expose: { rest: 'POST /api/v1/channels/:channelAccountId/find', ui: true },
});

export const CHANNEL_OP_ACTIONS = [messageRevoke, messageReact, directorySync, contactFind] as const;
