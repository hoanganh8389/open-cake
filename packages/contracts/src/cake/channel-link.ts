// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh của đơn vị (25-KET-NOI-KENH §3, mockup kết nối ① đã duyệt):
//   hub = BizCity Hub (mặc định cũ) · self = Tự cài, máy kết nối gọn zalo-hub-connector. Khoá nối + bí mật ký do Cake sinh, trả MỘT lần (issued), lưu mã hoá.
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';

export const ChannelLinkSchema = z.object({
  mode: z.enum(['hub', 'self']),
  connectorUrl: z.string().nullable(),
  /** vài ký tự đầu của khoá nối để nhận ra; khoá đầy đủ không bao giờ trả lại sau lần sinh. */
  keyPrefix: z.string().nullable(),
  hasSecret: z.boolean(),
  /** máy chủ đã có cấu hình Hub (CAKE_HUB_URL / SITE_KEY / SECRET) chưa. */
  hubReady: z.boolean(),
  lastOkAt: z.string().nullable(), lastError: z.string().nullable(),
  /** CHỈ có ngay sau lần sinh / đổi khoá: dán vào biến môi trường của máy kết nối (open-setup tự làm). */
  issued: z.object({ key: z.string(), secret: z.string() }).nullable(),
});
export type ChannelLink = z.infer<typeof ChannelLinkSchema>;

export const channelLinkGet = defineActionSpec({
  id: 'cake.channel_link.get', capability: 'cake.channel.manage', title: 'Cách kết nối kênh', kind: 'query',
  input: z.object({}), output: ChannelLinkSchema, permission: 'settings:write', risk: 'read', expose: { rest: 'GET /api/v1/channel-link', ui: true },
});
export const channelLinkSet = defineActionSpec({
  id: 'cake.channel_link.set', capability: 'cake.channel.manage', title: 'Đổi cách kết nối kênh', kind: 'command',
  input: z.object({
    mode: z.enum(['hub', 'self']),
    connectorUrl: z.string().url().regex(/^https?:\/\//).max(200).optional(),
    /** sinh khoá nối + bí mật mới (khoá cũ hết hiệu lực ngay). Lần đầu chuyển sang self luôn sinh. */
    rotate: z.boolean().default(false),
  }).refine((v) => v.mode === 'hub' || !!v.connectorUrl, { message: 'Tự cài cần địa chỉ máy kết nối', path: ['connectorUrl'] }),
  output: ChannelLinkSchema, permission: 'settings:write', risk: 'high', idempotent: true,
  emits: ['bizcity.cake.channel_link.saved'], expose: { rest: 'POST /api/v1/channel-link', ui: true },
});
export const channelLinkTest = defineActionSpec({
  id: 'cake.channel_link.test', capability: 'cake.channel.manage', title: 'Kiểm máy kết nối', kind: 'command',
  input: z.object({}), output: ChannelLinkSchema, permission: 'settings:write', risk: 'low', reasons: ['CAKE_CHANNEL_NOT_CONNECTED'],
  expose: { rest: 'POST /api/v1/channel-link/test', ui: true },
});

export const CHANNEL_LINK_ACTIONS = [channelLinkGet, channelLinkSet, channelLinkTest] as const;

// [2026-11-26 10:06 PM Johnny Chu - Chu Hoàng Anh] KN K7 — bước ③ của 4 bước (Tự cài): cake.channel.connect_start (đã có) tạo số trên máy kết nối + bắt đầu QR ⇒
//   connect_status (chỉ đọc, giao diện hỏi lại) ⇒ quét xong ⇒ connect_finish ghi channel_accounts (uid Zalo, cell_ref = id số trên máy kết nối, người phụ trách = người đang đăng nhập).
export const ConnectStatusSchema = z.object({
  flowId: z.string(),
  status: z.enum(['idle', 'starting', 'waiting_scan', 'scanned', 'success', 'declined', 'expired', 'error']),
  /** ảnh QR (data URI) — chỉ có khi đang chờ quét. */
  qrRef: z.string().nullable(),
  error: z.string().nullable(),
});
export type ConnectStatus = z.infer<typeof ConnectStatusSchema>;
export const channelConnectStatus = defineActionSpec({
  id: 'cake.channel.connect_status', capability: 'cake.channel.manage', title: 'Trạng thái quét QR', kind: 'query',
  input: z.object({ flowId: z.string().min(1).max(64) }), output: ConnectStatusSchema, permission: 'cake:channels-lap', risk: 'read',
  expose: { rest: 'GET /api/v1/channels/connect/:flowId', ui: true },
});
export const channelConnectFinish = defineActionSpec({
  id: 'cake.channel.connect_finish', capability: 'cake.channel.manage', title: 'Hoàn tất kết nối số', kind: 'command',
  input: z.object({ flowId: z.string().min(1).max(64) }),
  output: z.object({ channelAccountId: z.string(), externalAccountId: z.string(), label: z.string(), status: z.enum(['connected', 'connecting']) }),
  permission: 'cake:channels-lap', risk: 'medium', idempotent: true, reasons: ['CAKE_CHANNEL_NOT_CONNECTED'],
  expose: { rest: 'POST /api/v1/channels/connect/:flowId/finish', ui: true },
});
// [2026-11-26 10:39 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2 — đăng nhập Facebook cá nhân trên máy kết nối (Tự cài), cùng hợp đồng với /wp/accounts/:id/fb-login của cell:
//   start (email / số + mật khẩu) ⇒ có thể need_code / waiting_approval ⇒ submit (answers) ⇒ success. "cookies" là đường dự phòng khi Facebook từ chối mật khẩu.
//   Mật khẩu / mã / cookie CHỈ đi qua thân MỘT yêu cầu tới máy kết nối: không lưu, không vào bằng chứng (runtime băm đầu vào đã bỏ các khoá này), không trả lại.
export const FbLoginViewSchema = z.object({
  status: z.enum(['idle', 'waiting_approval', 'need_code', 'success', 'checkpoint', 'error']),
  message: z.string().nullable(),
  /** các ô người dùng phải nhập (mã 2FA, chọn cách xác minh…). */
  fields: z.array(z.object({ id: z.string(), type: z.string(), name: z.string().nullable(), description: z.string().nullable(), options: z.array(z.string()).nullable() })).nullable(),
  uid: z.string().nullable(),
});
export type FbLoginView = z.infer<typeof FbLoginViewSchema>;
const flow = z.string().min(1).max(64);
export const channelFbLogin = defineActionSpec({
  id: 'cake.channel.fb_login', capability: 'cake.channel.manage', title: 'Đăng nhập Facebook cá nhân', kind: 'command',
  input: z.discriminatedUnion('action', [
    z.object({ flowId: flow, action: z.literal('start'), identifier: z.string().min(3).max(200), password: z.string().min(1).max(200) }),
    z.object({ flowId: flow, action: z.literal('submit'), answers: z.record(z.string().max(64), z.string().max(200)).refine((o) => Object.keys(o).length > 0) }),
    z.object({ flowId: flow, action: z.literal('wait') }),
    z.object({ flowId: flow, action: z.literal('cancel') }),
    z.object({ flowId: flow, action: z.literal('cookies'), cookies: z.record(z.string().max(16), z.string().max(700)) }),
  ]),
  output: FbLoginViewSchema, permission: 'cake:channels-lap', risk: 'high', reasons: ['CAKE_CHANNEL_NOT_CONNECTED'],
  expose: { rest: 'POST /api/v1/channels/connect/:flowId/fb-login', ui: true },
});
export const CHANNEL_CONNECT_ACTIONS = [channelConnectStatus, channelConnectFinish, channelFbLogin] as const;
