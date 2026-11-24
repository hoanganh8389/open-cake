// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Nhân viên + Vai & quyền trên bảng của NỀN (users · tenant_roles · tenant_role_rules · user_role_assignments),
//   quyền hiệu lực tính bằng hàm của nền (rolePermissions / effectivePermissionsWithTenantRoles) — Cake không có bộ tính riêng (40-SECURITY §2).
//   Một vai kiểu WordPress: chọn vai riêng ⇒ users.role = vai nền của nó + một lần gán tenant_role_id; chọn vai hệ thống ⇒ thu hồi lần gán vai riêng.
//   R-CAKE-AUTHZ-5: không cấp / sửa / ngưng Chủ, không tự sửa mình, không cấp vai có quyền mình không có. R-CAKE-SSO-6: đổi vai chính ⇒ session_version++.
import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import { effectivePermissionsWithTenantRoles, isHighRiskPermission, rolePermissions } from '@bizcity/platform/core/auth';
import { isKnownRole, listRoles, OWNER_ROLE, roleDef } from '@bizcity/platform/core/roles';
import { forgetAllRoles, forgetRoles } from '@bizcity/platform/core/security/role-assignments';
import { hashPassword } from '@bizcity/platform/core/security/password';
import type { RoleInfo, Staff } from '@open-cake/contracts';
import { failure, type Ctx, type Handler } from '../runtime.js';
import { cakePermissions } from './authz.js';

const CORE_LABEL: Record<string, string> = {
  'users:write': 'Mời, đổi vai, ngưng nhân viên; giao tài khoản kênh', 'settings:write': 'Sửa vai riêng & cài đặt đơn vị', 'reports:read': 'Xem báo cáo, bằng chứng',
};
const forbid = (m: string) => failure('FORBIDDEN', m);
const sorted = (s: Iterable<string>) => [...s].sort();

/** Vai hệ thống của Cake (+ Chủ của nền) — khai bằng registerRoles, màn chỉ xem. */
const systemRoles = () => listRoles().filter((r) => r.key === OWNER_ROLE || r.app === 'cake');
const isCakeRole = (k: string) => isKnownRole(k) && roleDef(k)?.app === 'cake';

type TenantRole = { id: string; code: string; label: string; base_role: string; is_active: boolean; allow: string[]; deny: string[] };
async function tenantRoles({ tx, tenantId }: Ctx, code?: string): Promise<TenantRole[]> {
  const r = await sql<TenantRole>`
    SELECT r.id::text, r.code, r.label, r.base_role, r.is_active,
      COALESCE(array_agg(x.permission ORDER BY x.permission) FILTER (WHERE x.effect = 'allow'), '{}') AS allow,
      COALESCE(array_agg(x.permission ORDER BY x.permission) FILTER (WHERE x.effect = 'deny'), '{}') AS deny
    FROM tenant_roles r LEFT JOIN tenant_role_rules x ON x.tenant_role_id = r.id AND x.tenant_id = r.tenant_id AND x.removed_at IS NULL
    WHERE r.tenant_id = ${tenantId} AND r.base_role IS NOT NULL ${code ? sql`AND r.code = ${code}` : sql``}
    GROUP BY r.id ORDER BY r.created_at`.execute(tx);
  return r.rows;
}
const customPerms = (r: Pick<TenantRole, 'base_role' | 'allow' | 'deny'>) => effectivePermissionsWithTenantRoles([], { baseRoles: [r.base_role], allow: r.allow, deny: r.deny });
const customInfo = (r: TenantRole): RoleInfo => ({ key: r.code, label: r.label, kind: 'custom', baseRole: r.base_role, active: r.is_active, permissions: sorted(customPerms(r)), allow: r.allow, deny: r.deny });

async function customRole(ctx: Ctx, key: string): Promise<TenantRole> {
  const r = (await tenantRoles(ctx, key))[0];
  if (!r) throw failure('NOT_FOUND', 'Không có vai riêng này.');
  return r;
}

/** Vai (hệ thống hoặc riêng) ⇒ vai chính lưu ở users.role, vai riêng (nếu có), tập quyền. */
async function resolveRole(ctx: Ctx, key: string) {
  if (key === OWNER_ROLE) throw forbid('Không cấp vai Chủ ở đây — chủ đơn vị do nền quản.');
  if (isCakeRole(key)) return { base: key, customId: null, perms: rolePermissions(key) as Set<string> };
  const r = await customRole(ctx, key);
  if (!r.is_active) throw failure('VALIDATION_ERROR', 'Vai riêng này đang tắt.', { field: 'role' });
  return { base: r.base_role, customId: r.id, perms: customPerms(r) as Set<string> };
}

/** R-CAKE-AUTHZ-5: không cấp quá quyền của chính mình. */
function assertWithin(ctx: Ctx, perms: Iterable<string>, what: string) {
  const over = [...perms].filter((p) => !ctx.can(p));
  if (over.length) throw forbid(`${what} có quyền bạn không có: ${over.slice(0, 5).join(', ')}.`);
}

// ── Nhân viên ───────────────────────────────────────────────────────────
type Row = { id: string; email: string; full_name: string; role: string; is_active: boolean; last_login_at: Date | null; custom: string | null; accounts: string[] };
async function staffRows({ tx, tenantId }: Ctx, userId?: string): Promise<Row[]> {
  const r = await sql<Row>`
    SELECT u.id::text, u.email, u.full_name, u.role, u.is_active, u.last_login_at,
      (SELECT r.code FROM user_role_assignments a JOIN tenant_roles r ON r.id = a.tenant_role_id AND r.tenant_id = a.tenant_id
        WHERE a.tenant_id = u.tenant_id AND a.user_id = u.id AND a.revoked_at IS NULL ORDER BY a.granted_at DESC LIMIT 1) AS custom,
      COALESCE((SELECT array_agg(m.channel_account_id ORDER BY m.channel_account_id) FROM channel_account_members m
        WHERE m.tenant_id = u.tenant_id AND m.user_id = u.id::text), '{}') AS accounts
    FROM users u WHERE u.tenant_id = ${tenantId} ${userId ? sql`AND u.id = ${userId}` : sql``}
    ORDER BY (u.role = 'owner') DESC, u.is_active DESC, u.full_name`.execute(tx);
  return r.rows;
}
const toStaff = (r: Row): Staff => ({
  userId: r.id, email: r.email, name: r.full_name, role: r.custom ?? r.role, active: r.is_active,
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null, channelAccountIds: r.accounts as Staff['channelAccountIds'],
});
async function one(ctx: Ctx, userId: string): Promise<Row> {
  const r = (await staffRows(ctx, userId))[0];
  if (!r) throw failure('NOT_FOUND', 'Không có nhân viên này trong đơn vị.');
  return r;
}

/** Người được sửa: không phải Chủ, không phải chính mình, không có quyền vượt người sửa. */
async function target(ctx: Ctx, userId: string): Promise<Row> {
  const u = await one(ctx, userId);
  if (u.role === OWNER_ROLE) throw forbid('Không sửa / ngưng Chủ ở đây.');
  if (u.id === ctx.userId) throw forbid('Không tự đổi vai hay ngưng chính mình — nhờ người quản lý khác.');
  assertWithin(ctx, u.custom ? customPerms((await customRole(ctx, u.custom))) : rolePermissions(u.role), 'Nhân viên này');
  return u;
}

async function setRole(ctx: Ctx, u: Pick<Row, 'id' | 'role'>, key: string) {
  const r = await resolveRole(ctx, key);
  assertWithin(ctx, r.perms, 'Vai này');
  await sql`UPDATE user_role_assignments SET revoked_at = now(), revoked_by = ${ctx.actor}, revoke_reason = 'Đổi vai ở Cài đặt › Nhân viên'
    WHERE tenant_id = ${ctx.tenantId} AND user_id = ${u.id} AND revoked_at IS NULL AND tenant_role_id IS NOT NULL
      AND tenant_role_id IS DISTINCT FROM ${r.customId}::bigint`.execute(ctx.tx);
  if (r.customId) {
    await sql`INSERT INTO user_role_assignments (tenant_id, user_id, tenant_role_id, reason, granted_by)
      SELECT ${ctx.tenantId}, ${u.id}, ${r.customId}, 'Giao vai ở Cài đặt › Nhân viên', ${ctx.actor}
      WHERE NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE tenant_id = ${ctx.tenantId} AND user_id = ${u.id} AND tenant_role_id = ${r.customId} AND revoked_at IS NULL)`.execute(ctx.tx);
  }
  // vai chính nằm trong phiên ⇒ đổi thì phiên cũ hết hạn (R-CAKE-SSO-6)
  if (u.role !== r.base) await sql`UPDATE users SET role = ${r.base}, session_version = session_version + 1 WHERE tenant_id = ${ctx.tenantId} AND id = ${u.id}`.execute(ctx.tx);
  forgetRoles(u.id);
}

async function setAccounts(ctx: Ctx, userId: string, ids: string[]) {
  const want = [...new Set(ids)];
  if (want.length) {
    const ok = await ctx.tx.selectFrom('channel_accounts').select('channel_account_id').where('tenant_id', '=', ctx.tenantId).where('channel_account_id', 'in', want).execute();
    const miss = want.filter((x) => !ok.some((r) => r.channel_account_id === x));
    if (miss.length) throw failure('VALIDATION_ERROR', `Không có tài khoản kênh: ${miss.join(', ')}.`, { field: 'channelAccountIds' });
  }
  let del = ctx.tx.deleteFrom('channel_account_members').where('tenant_id', '=', ctx.tenantId).where('user_id', '=', userId);
  if (want.length) del = del.where('channel_account_id', 'not in', want);
  const removed = Number((await del.executeTakeFirst()).numDeletedRows);
  if (want.length) {
    await ctx.tx.insertInto('channel_account_members').values(want.map((a) => ({ tenant_id: ctx.tenantId, channel_account_id: a, user_id: userId, added_by: ctx.actor })))
      .onConflict((oc) => oc.doNothing()).execute();
  }
  return removed;
}

// ── Vai ─────────────────────────────────────────────────────────────────
function permissionList() {
  const m = cakePermissions();
  const keys = new Set([...m.keys(), ...Object.keys(CORE_LABEL)]);
  return [...keys].map((key) => ({ key, label: m.get(key)?.label ?? CORE_LABEL[key] ?? key, risk: isHighRiskPermission(key) || m.get(key)?.risk === 'high' ? 'high' as const : 'low' as const }));
}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'vai';

export const staffHandlers: Record<string, Handler> = {
  'cake.staff.list': async (ctx) => (await staffRows(ctx)).map(toStaff),
  'cake.staff.invite': async (ctx, i) => {
    const r = await resolveRole(ctx, i.role);
    assertWithin(ctx, r.perms, 'Vai này');
    const dup = await sql`SELECT 1 FROM users WHERE tenant_id = ${ctx.tenantId} AND lower(email) = ${i.email}`.execute(ctx.tx);
    if (dup.rows.length) throw failure('CONFLICT', 'Email này đã là nhân viên của đơn vị.', { field: 'email' });
    // không có mật khẩu dùng được: vào bằng SSO WordPress cùng email (R-CAKE-SSO-4, -7)
    const id = (await sql<{ id: string }>`INSERT INTO users (tenant_id, email, full_name, role, password_hash, is_active)
      VALUES (${ctx.tenantId}, ${i.email}, ${i.name}, ${r.base}, ${await hashPassword(randomBytes(24).toString('base64url'))}, true) RETURNING id::text`.execute(ctx.tx)).rows[0]!.id;
    await setRole(ctx, { id, role: r.base }, i.role);
    await setAccounts(ctx, id, i.channelAccountIds);
    return toStaff(await one(ctx, id));
  },
  'cake.staff.update': async (ctx, i) => {
    const u = await target(ctx, i.userId);
    if (!u.is_active) throw failure('CONFLICT', 'Nhân viên đang ngưng — bật lại trước khi sửa.');
    if (i.role !== undefined && i.role !== (u.custom ?? u.role)) await setRole(ctx, u, i.role);
    if (i.channelAccountIds !== undefined) await setAccounts(ctx, u.id, i.channelAccountIds);
    return toStaff(await one(ctx, u.id));
  },
  'cake.staff.set_active': async (ctx, i) => {
    const u = await target(ctx, i.userId);
    let removedAccounts = 0, releasedConversations = 0;
    if (!i.active && u.is_active) {
      // ngưng: đăng xuất mọi máy, gỡ tài khoản kênh, hội thoại đang giữ về hàng chung; lịch sử giữ nguyên (40-SECURITY §3.3)
      await sql`UPDATE users SET is_active = false, session_version = session_version + 1 WHERE tenant_id = ${ctx.tenantId} AND id = ${u.id}`.execute(ctx.tx);
      removedAccounts = await setAccounts(ctx, u.id, []);
      releasedConversations = Number((await ctx.tx.updateTable('conversations').set({ assignee_user_id: null }).where('tenant_id', '=', ctx.tenantId).where('assignee_user_id', '=', u.id).executeTakeFirst()).numUpdatedRows);
    } else if (i.active && !u.is_active) {
      await sql`UPDATE users SET is_active = true WHERE tenant_id = ${ctx.tenantId} AND id = ${u.id}`.execute(ctx.tx);
    }
    forgetRoles(u.id);
    return { staff: toStaff(await one(ctx, u.id)), removedAccounts, releasedConversations };
  },

  'cake.role.list': async (ctx) => ({
    permissions: permissionList(),
    roles: [
      ...systemRoles().map((r): RoleInfo => ({ key: r.key, label: r.key === OWNER_ROLE ? 'Chủ' : r.label, kind: 'system', baseRole: null, active: true, permissions: sorted(rolePermissions(r.key)), allow: [], deny: [] })),
      ...(await tenantRoles(ctx)).map(customInfo),
    ],
  }),
  'cake.role.create': async (ctx, i) => {
    if (!isCakeRole(i.baseRole)) throw failure('VALIDATION_ERROR', 'Vai nền phải là một vai hệ thống của Open CRM (không phải Chủ).', { field: 'baseRole' });
    assertWithin(ctx, rolePermissions(i.baseRole), 'Vai nền');
    const taken = new Set((await tenantRoles(ctx)).map((r) => r.code));
    const stem = `r-${slug(i.label)}`;
    let code = stem;
    for (let n = 2; taken.has(code); n++) code = `${stem}-${n}`;
    await sql`INSERT INTO tenant_roles (tenant_id, code, label, kind, base_role, created_by) VALUES (${ctx.tenantId}, ${code}, ${i.label}, 'job', ${i.baseRole}, ${ctx.actor})`.execute(ctx.tx);
    forgetAllRoles();
    return customInfo(await customRole(ctx, code));
  },
  'cake.role.update': async (ctx, i) => {
    const r = await customRole(ctx, i.roleKey);
    await sql`UPDATE tenant_roles SET label = ${i.label ?? r.label}, is_active = ${i.active ?? r.is_active}, version = version + 1, updated_by = ${ctx.actor}, updated_at = now()
      WHERE tenant_id = ${ctx.tenantId} AND id = ${r.id}`.execute(ctx.tx);
    forgetAllRoles();
    return customInfo(await customRole(ctx, r.code));
  },
  'cake.role.rule_set': async (ctx, i) => {
    const r = await customRole(ctx, i.roleKey);
    if (!permissionList().some((p) => p.key === i.permission)) throw failure('VALIDATION_ERROR', `Không có quyền ${i.permission} trong sổ quyền.`, { field: 'permission' });
    if (i.effect === 'allow') assertWithin(ctx, [i.permission], 'Quyền này');
    await sql`UPDATE tenant_role_rules SET removed_at = now(), removed_by = ${ctx.actor}, remove_reason = 'Đổi ở ma trận Vai & quyền'
      WHERE tenant_id = ${ctx.tenantId} AND tenant_role_id = ${r.id} AND permission = ${i.permission} AND removed_at IS NULL`.execute(ctx.tx);
    if (i.effect !== 'none') {
      await sql`INSERT INTO tenant_role_rules (tenant_id, tenant_role_id, permission, effect, created_by) VALUES (${ctx.tenantId}, ${r.id}, ${i.permission}, ${i.effect}, ${ctx.actor})`.execute(ctx.tx);
    }
    forgetAllRoles();
    return customInfo(await customRole(ctx, r.code));
  },
};
