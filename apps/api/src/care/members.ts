// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 09:51 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh: xem / đặt lại cả danh sách (PUT, idempotent).
//   Chỉ nhận người dùng ĐANG HOẠT ĐỘNG của chính đơn vị (users của nền); đặt lại = xoá + chèn trong cùng giao dịch, bằng chứng do runCommand ghi.
import { sql } from 'kysely';
import { failure, type Ctx, type Handler } from '../runtime.js';

async function list({ tx, tenantId }: Ctx, channelAccountId: string) {
  const rows = await sql<{ user_id: string; full_name: string; role: string }>`
    SELECT m.user_id, u.full_name, u.role FROM channel_account_members m JOIN users u ON u.id = m.user_id::bigint AND u.tenant_id = m.tenant_id
    WHERE m.tenant_id = ${tenantId} AND m.channel_account_id = ${channelAccountId} ORDER BY u.full_name`.execute(tx);
  return rows.rows.map((r) => ({ userId: String(r.user_id), name: r.full_name, role: r.role }));
}

async function assertAccount({ tx, tenantId }: Ctx, channelAccountId: string) {
  const a = await tx.selectFrom('channel_accounts').select('channel_account_id').where('tenant_id', '=', tenantId).where('channel_account_id', '=', channelAccountId).executeTakeFirst();
  if (!a) throw failure('NOT_FOUND', 'Không tìm thấy tài khoản kênh.');
}

export const memberHandlers: Record<string, Handler> = {
  'cake.channel.members': async (ctx, i) => { await assertAccount(ctx, i.channelAccountId); return list(ctx, i.channelAccountId); },
  'cake.channel.members_set': async (ctx, i) => {
    await assertAccount(ctx, i.channelAccountId);
    const ids = [...new Set<string>(i.userIds)];
    if (ids.length) {
      const ok = await sql<{ id: string }>`SELECT id::text AS id FROM users WHERE tenant_id = ${ctx.tenantId} AND is_active AND id::text IN (${sql.join(ids)})`.execute(ctx.tx);
      const miss = ids.filter((x) => !ok.rows.some((r) => r.id === x));
      if (miss.length) throw failure('VALIDATION_ERROR', `Không phải nhân viên đang hoạt động của đơn vị: ${miss.join(', ')}.`);
    }
    await ctx.tx.deleteFrom('channel_account_members').where('tenant_id', '=', ctx.tenantId).where('channel_account_id', '=', i.channelAccountId).execute();
    if (ids.length) await ctx.tx.insertInto('channel_account_members').values(ids.map((u) => ({ tenant_id: ctx.tenantId, channel_account_id: i.channelAccountId, user_id: u, added_by: ctx.actor }))).execute();
    return list(ctx, i.channelAccountId);
  },
};
