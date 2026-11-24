// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — MỘT chỗ quyết "ai thấy hội thoại nào" (40-SECURITY §2), dùng chung cho mọi action đọc / ghi:
//   có cake:all-inbox-xem ⇒ thấy hết · không ⇒ hội thoại của tài khoản kênh mình là thành viên, hoặc được giao cho mình · khoá API không có quyền này ⇒ không thấy hội thoại.
//   Ngoài phạm vi ⇒ 404 (không lộ là có tồn tại).
import { sql, type SqlBool, type Expression } from 'kysely';
import { failure, type Ctx } from '../runtime.js';

export const ALL_INBOX = 'cake:all-inbox-xem';

/** null = thấy hết; còn lại = điều kiện SQL trên bảng conversations (bí danh v). */
export function scopeSql(ctx: Ctx, alias = 'v'): Expression<SqlBool> | null {
  if (ctx.can(ALL_INBOX)) return null;
  if (!ctx.userId) return sql<SqlBool>`false`;
  const v = sql.ref(alias);
  return sql<SqlBool>`(${v}.assignee_user_id = ${ctx.userId} OR ${v}.channel_account_id IN (
    SELECT m.channel_account_id FROM channel_account_members m WHERE m.tenant_id = ${ctx.tenantId} AND m.user_id = ${ctx.userId}))`;
}

/** Tài khoản kênh người này thấy (null = hết). */
export async function visibleAccounts(ctx: Ctx): Promise<Set<string> | null> {
  if (ctx.can(ALL_INBOX)) return null;
  if (!ctx.userId) return new Set();
  const rows = await ctx.tx.selectFrom('channel_account_members').select('channel_account_id').where('tenant_id', '=', ctx.tenantId).where('user_id', '=', ctx.userId).execute();
  return new Set(rows.map((r) => r.channel_account_id));
}

/** Hội thoại phải trong phạm vi, không thì 404 (không lộ là có tồn tại). */
export async function assertConversationVisible(ctx: Ctx, conversationId: string): Promise<void> {
  const cond = scopeSql(ctx);
  let q = ctx.tx.selectFrom('conversations as v').select('v.conversation_id').where('v.tenant_id', '=', ctx.tenantId).where('v.conversation_id', '=', conversationId);
  if (cond) q = q.where(cond);
  if (!(await q.executeTakeFirst())) throw failure('NOT_FOUND', 'Không tìm thấy hội thoại.');
}
