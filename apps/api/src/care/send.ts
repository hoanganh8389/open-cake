// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3/S006-6 · PHASE-007 S007-3/S007-6 — tin ra kênh thật qua Hub (contracts/BIZCITY-CHANNEL-COMMAND-v1):
//   cake.message.send ⇒ kernel requestSend (dòng sổ + tin "đang gửi") + lệnh bizcity_channel_command@1 vào hàng chờ channel_commands CÙNG giao dịch ⇒ gọi Hub ngay.
//   Hub 202 ⇒ accepted (kết quả thật về bằng delivery.updated) · 4xx ⇒ rejected, tin "lỗi" · mạng / 5xx ⇒ queued, gửi lại CÙNG Idempotency-Key mỗi 15 giây (giãn dần);
//   quá 10 phút ⇒ given_up, tin "chưa rõ đã gửi" — KHÔNG tự gửi bằng khoá mới (R-CAKE-SEND-2), nhân viên xem rồi bấm gửi lại.
//   cake.channel.test ⇒ lệnh account.test gọi thẳng Hub (không xếp hàng); Hub nhận ⇒ channel_accounts.tested_at. Cake không gọi Cell trực tiếp (R-CAKE-CELL-1).
//   Hub: CAKE_HUB_URL + khoá site CAKE_HUB_SITE_KEY (biz-…) + chữ ký thân bằng CAKE_HUB_SECRET (cùng bí mật với cổng nhận). Thiếu ⇒ NOT_READY, không giả là đã gửi.
import { db, type Db } from '@bizcity/platform/db/client';
import { withRequestContext } from '@bizcity/platform/core/request-context';
import { requestSend, type KernelDeps } from '@open-cake/care-kernel';
import { ChannelCommandSchema, type ChannelCommand } from '@open-cake/contracts';
import { cakeError, failure, newUlid, type Ctx, type Handler } from '../runtime.js';
import { signBody } from '../orders/clients.js';
import { notifyChanged } from '../stream.js';
import { PgCareRepo } from './pg-care-repo.js';
import { assertConversationVisible } from './scope.js';

export const HUB_COMMANDS_PATH = '/channel/v1/commands';
const GIVE_UP_MS = 10 * 60_000;
const CAPS = ['cake.conversation.manage', 'cake.message.send'];

function hub() {
  const url = process.env.CAKE_HUB_URL ?? '', key = process.env.CAKE_HUB_SITE_KEY ?? '', secret = process.env.CAKE_HUB_SECRET ?? '';
  if (!url || key.length < 16 || secret.length < 32) throw failure('NOT_READY', 'Máy chủ chưa nối Hub kênh (CAKE_HUB_URL, CAKE_HUB_SITE_KEY, CAKE_HUB_SECRET).');
  return { url: url.replace(/\/+$/, ''), key, secret };
}

/** Một lần gọi Hub. null = không tới được (mạng / hết giờ). */
async function callHub(cmd: ChannelCommand): Promise<{ status: number; error: string | null } | null> {
  const h = hub();
  const raw = JSON.stringify(cmd);
  try {
    const res = await fetch(h.url + HUB_COMMANDS_PATH, {
      method: 'POST', body: raw, signal: AbortSignal.timeout(8000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${h.key}`, 'idempotency-key': cmd.idempotencyKey, 'x-bizcity-contract': 'bizcity_channel_command@1', 'x-bizcity-signature': signBody(h.secret, raw) },
    });
    let error: string | null = null;
    if (res.status !== 202) { const j = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null; error = j?.error ? `${j.error.code ?? res.status}: ${j.error.message ?? ''}` : `Hub trả ${res.status}`; }
    return { status: res.status, error };
  } catch { return null; } // nuot-loi: mạng / hết giờ ⇒ queued (gửi lại cùng khoá)
}

type CmdRow = { tenant_id: string; command_key: string; message_id: string | null; body: unknown; attempts: number; created_at: Date };

/** Gửi một lệnh trong hàng chờ và ghi kết quả. */
async function dispatch(tx: Db, r: CmdRow): Promise<'accepted' | 'rejected' | 'queued' | 'given_up'> {
  const res = await callHub(r.body as ChannelCommand);
  const now = new Date();
  const where = <Q extends { where: (...a: any[]) => Q }>(q: Q) => q.where('tenant_id', '=', r.tenant_id).where('command_key', '=', r.command_key); // eslint-disable-line @typescript-eslint/no-explicit-any
  const msg = (delivery: string) => r.message_id ? tx.updateTable('messages').set({ delivery }).where('tenant_id', '=', r.tenant_id).where('message_id', '=', r.message_id).where('delivery', '=', 'accepted').execute() : null;
  if (res?.status === 202) {
    await where(tx.updateTable('channel_commands').set({ state: 'accepted', attempts: r.attempts + 1, last_error: null, done_at: now })).execute();
    return 'accepted';
  }
  if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
    await where(tx.updateTable('channel_commands').set({ state: 'rejected', attempts: r.attempts + 1, last_error: res.error, done_at: now })).execute();
    await msg('failed'); // Hub từ chối hẳn ⇒ chắc chắn chưa tới kênh
    return 'rejected';
  }
  const attempts = r.attempts + 1;
  if (now.getTime() - new Date(r.created_at).getTime() >= GIVE_UP_MS) {
    await where(tx.updateTable('channel_commands').set({ state: 'given_up', attempts, last_error: res?.error ?? 'Không tới được Hub', done_at: now })).execute();
    await msg('unknown'); // có thể Hub đã nhận mà trả lời bị mất ⇒ chưa rõ
    return 'given_up';
  }
  await where(tx.updateTable('channel_commands').set({ attempts, last_error: res?.error ?? 'Không tới được Hub', next_at: new Date(now.getTime() + Math.min(60_000, 5000 * 2 ** Math.min(attempts, 4))) })).execute();
  return 'queued';
}

/** Gửi lại các lệnh queued đến hạn (mọi đơn vị; mỗi lệnh trong ngữ cảnh đơn vị của nó, khoá dòng để hai bản API không gửi trùng lượt). */
export async function retryChannelCommands(limit = 50): Promise<number> {
  const due = await db.selectFrom('channel_commands').select(['tenant_id', 'command_key']).where('state', '=', 'queued').where('next_at', '<=', new Date()).limit(limit).execute();
  for (const d of due) {
    await withRequestContext({ requestId: `cmd-${d.command_key}`, correlationId: d.command_key, tenantId: d.tenant_id }, () => db.transaction().execute(async (tx) => {
      const r = await tx.selectFrom('channel_commands').select(['tenant_id', 'command_key', 'message_id', 'body', 'attempts', 'created_at']).where('tenant_id', '=', d.tenant_id).where('command_key', '=', d.command_key)
        .where('state', '=', 'queued').forUpdate().skipLocked().executeTakeFirst();
      if (r && (await dispatch(tx, r as CmdRow)) !== 'queued') await notifyChanged(tx, d.tenant_id, CAPS);
    }));
  }
  return due.length;
}

async function accountOf(tx: Db, tenantId: string, channelAccountId: string) {
  const a = await tx.selectFrom('channel_accounts').select(['channel_account_id', 'channel', 'external_account_id', 'cell_ref', 'status']).where('tenant_id', '=', tenantId).where('channel_account_id', '=', channelAccountId).executeTakeFirst();
  if (!a) throw failure('NOT_FOUND', 'Không tìm thấy tài khoản kênh.');
  if (a.status !== 'connected' || !a.cell_ref) throw cakeError('CAKE_CHANNEL_NOT_CONNECTED');
  return a as typeof a & { cell_ref: string };
}

const deps = ({ tx, tenantId }: Ctx): KernelDeps => ({ repo: new PgCareRepo(tenantId, tx), now: () => new Date().toISOString(), newId: () => newUlid() });

export const sendHandlers: Record<string, Handler> = {
  'cake.message.send': async (ctx, i) => {
    await assertConversationVisible(ctx, i.conversationId);
    const { tx, tenantId } = ctx;
    const conv = await tx.selectFrom('conversations').select(['channel_account_id', 'external_thread_id', 'kind', 'window_until']).where('tenant_id', '=', tenantId).where('conversation_id', '=', i.conversationId).executeTakeFirstOrThrow();
    const acc = await accountOf(tx, tenantId, conv.channel_account_id);
    if (conv.kind === 'comment_thread') throw failure('VALIDATION_ERROR', 'Hội thoại bình luận trả lời bằng "Trả lời bình luận".');
    if (acc.channel === 'facebook_page' && conv.window_until && new Date(conv.window_until).getTime() < Date.now()) throw cakeError('CAKE_WINDOW_CLOSED');
    hub(); // chưa nối Hub ⇒ báo ngay, không ghi tin "đang gửi" mãi
    const r = await requestSend(deps(ctx), { conversationId: i.conversationId, text: i.text, actor: ctx.actor, userId: ctx.userId });
    const attachments = i.attachments as ChannelCommand['content']['attachments'];
    const body = ChannelCommandSchema.parse({
      contract: 'bizcity_channel_command@1', operation: 'message.send', idempotencyKey: r.commandKey, channel: acc.channel,
      channelAccount: { cellRef: acc.cell_ref, externalAccountId: acc.external_account_id }, target: { externalThreadId: conv.external_thread_id, anchor: null },
      content: { type: attachments.length ? (attachments[0]!.type === 'image' ? 'image' : 'file') : 'text', text: i.text || null, attachments },
      options: { messageTag: null, quoteExternalMessageId: null }, requestedBy: { kind: 'user', id: ctx.userId ?? ctx.actor },
    });
    if (attachments.length) await tx.updateTable('messages').set({ attachments: JSON.stringify(attachments) }).where('tenant_id', '=', tenantId).where('message_id', '=', r.messageId).execute();
    const created_at = new Date();
    await tx.insertInto('channel_commands').values({ tenant_id: tenantId, command_key: r.commandKey, operation: 'message.send', channel_account_id: acc.channel_account_id, message_id: r.messageId, body: JSON.stringify(body), created_by: ctx.actor, created_at }).execute();
    await dispatch(tx, { tenant_id: tenantId, command_key: r.commandKey, message_id: r.messageId, body, attempts: 0, created_at });
    await notifyChanged(tx, tenantId, CAPS);
    const m = await tx.selectFrom('messages').select(['delivery']).where('tenant_id', '=', tenantId).where('message_id', '=', r.messageId).executeTakeFirstOrThrow();
    return { messageId: r.messageId, conversationId: i.conversationId, direction: 'out', text: i.text, attachments, at: r.at, e2ee: false, delivery: m.delivery, reaction: null, sentByUserId: ctx.userId };
  },
  'cake.channel.test': async ({ tx, tenantId, actor, userId }, i) => {
    const acc = await accountOf(tx, tenantId, i.channelAccountId);
    const cmd = ChannelCommandSchema.parse({
      contract: 'bizcity_channel_command@1', operation: 'account.test', idempotencyKey: `cake:0:account_test:${Math.floor(Date.now() / 1000)}`, channel: acc.channel,
      channelAccount: { cellRef: acc.cell_ref, externalAccountId: acc.external_account_id }, target: { externalThreadId: null, anchor: null },
      content: { type: 'none', text: null, attachments: [] }, options: { messageTag: null, quoteExternalMessageId: null }, requestedBy: { kind: 'user', id: userId ?? actor },
    });
    const res = await callHub(cmd);
    if (res?.status !== 202) throw cakeError('CAKE_CHANNEL_NOT_CONNECTED', res ? `Hub không nhận lệnh gửi thử (${res.error}).` : 'Không tới được Hub kênh.');
    const testedAt = new Date();
    await tx.updateTable('channel_accounts').set({ tested_at: testedAt }).where('tenant_id', '=', tenantId).where('channel_account_id', '=', acc.channel_account_id).execute();
    await notifyChanged(tx, tenantId, ['cake.channel.manage']);
    return { testedAt: testedAt.toISOString(), twoWay: false }; // hai chiều chỉ khi tin thử quay về qua cổng nhận — Cell chưa phát (S006-4)
  },
};
