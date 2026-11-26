// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 08:44 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — năng lực kênh đủ (25-KET-NOI-KENH §3b): thu hồi tin của shop, thả cảm xúc, đồng bộ danh bạ, tìm người theo SĐT.
//   Mỗi việc = một lệnh bizcity_channel_command@1 0.2 vào hàng chờ channel_commands (cùng dispatch / gửi lại / bỏ cuộc với message.send). Không đổi dữ liệu tại chỗ:
//   kết quả thật về bằng bizcity_touch@1 — thu hồi (content.type revoked), hồ sơ / nhóm (profile.updated, thread.updated backfill) — kernel đã xử lý (K2b-1).
import type { Db } from '@bizcity/platform/db/client';
import { ChannelCommandSchema, type ChannelCommand } from '@open-cake/contracts';
import { failure, type Ctx, type Handler } from '../runtime.js';
import { notifyChanged } from '../stream.js';
import { assertConversationVisible } from './scope.js';
import { CAPS, accountOf, dispatch, hub } from './send.js';

type Acc = Awaited<ReturnType<typeof accountOf>>;
const unix = () => Math.floor(Date.now() / 1000);

/** Xếp một lệnh vào hàng chờ + gửi ngay. Cùng khoá đã có ⇒ trả trạng thái cũ, không gửi lần hai (Hub / máy kết nối chống trùng theo khoá). */
async function queueCommand(ctx: Ctx, acc: Acc, operation: ChannelCommand['operation'], key: string, target: Partial<ChannelCommand['target']>, options: Partial<ChannelCommand['options']>) {
  const { tx, tenantId } = ctx;
  await hub(tx as Db, tenantId); // chưa có đích lệnh (Hub / máy kết nối) ⇒ NOT_READY ngay
  const old = await tx.selectFrom('channel_commands').select(['state']).where('tenant_id', '=', tenantId).where('command_key', '=', key).executeTakeFirst();
  if (old) return { commandKey: key, state: old.state as 'accepted' };
  const body = ChannelCommandSchema.parse({
    contract: 'bizcity_channel_command@1', operation, idempotencyKey: key, channel: acc.channel,
    channelAccount: { cellRef: acc.cell_ref, externalAccountId: acc.external_account_id }, target: { externalThreadId: null, anchor: null, ...target },
    content: { type: 'none', text: null, attachments: [] }, options: { messageTag: null, quoteExternalMessageId: null, ...options }, requestedBy: { kind: 'user', id: ctx.userId ?? ctx.actor },
  });
  const created_at = new Date();
  await tx.insertInto('channel_commands').values({ tenant_id: tenantId, command_key: key, operation, channel_account_id: acc.channel_account_id, message_id: null, body: JSON.stringify(body), created_by: ctx.actor, created_at }).execute();
  const state = await dispatch(tx, { tenant_id: tenantId, command_key: key, message_id: null, body, attempts: 0, created_at });
  await notifyChanged(tx, tenantId, CAPS);
  return { commandKey: key, state };
}

/** Tin + hội thoại + tài khoản của một tin (đã kiểm quyền thấy hội thoại). */
async function messageCtx(ctx: Ctx, messageId: string) {
  const m = await ctx.tx.selectFrom('messages as m').innerJoin('conversations as v', 'v.conversation_id', 'm.conversation_id')
    .select(['m.message_id', 'm.touch_id', 'm.direction', 'm.external_message_id', 'm.revoked_at', 'm.conversation_id', 'v.external_thread_id', 'v.channel_account_id'])
    .where('m.tenant_id', '=', ctx.tenantId).where('m.message_id', '=', messageId).executeTakeFirst();
  if (!m) throw failure('NOT_FOUND', 'Không tìm thấy tin.');
  await assertConversationVisible(ctx, m.conversation_id);
  if (m.external_message_id.startsWith('cake:')) throw failure('VALIDATION_ERROR', 'Tin chưa có mã của kênh (đang gửi) — đợi kênh báo đã gửi rồi thử lại.');
  return { m, acc: await accountOf(ctx.tx as Db, ctx.tenantId, m.channel_account_id) };
}

export const channelOpHandlers: Record<string, Handler> = {
  'cake.message.revoke': async (ctx, i) => {
    const { m, acc } = await messageCtx(ctx, i.messageId);
    if (m.direction !== 'out') throw failure('VALIDATION_ERROR', 'Chỉ thu hồi được tin của shop.');
    if (m.revoked_at) throw failure('CONFLICT', 'Tin đã được thu hồi.');
    return queueCommand(ctx, acc, 'message.revoke', `cake:${m.touch_id}:revoke:1`, { externalThreadId: m.external_thread_id, externalMessageId: m.external_message_id }, {});
  },
  'cake.message.react': async (ctx, i) => {
    const { m, acc } = await messageCtx(ctx, i.messageId);
    return queueCommand(ctx, acc, 'reaction.add', `cake:${m.touch_id}:react:${unix()}`, { externalThreadId: m.external_thread_id, externalMessageId: m.external_message_id }, { reaction: i.reaction });
  },
  'cake.directory.sync': async (ctx, i) => queueCommand(ctx, await accountOf(ctx.tx as Db, ctx.tenantId, i.channelAccountId), 'directory.sync', `cake:0:directory_sync:${unix()}`, {}, {}),
  'cake.contact.find': async (ctx, i) => queueCommand(ctx, await accountOf(ctx.tx as Db, ctx.tenantId, i.channelAccountId), 'contact.find', `cake:0:contact_find:${unix()}`, {}, { phone: i.phone }),
};
