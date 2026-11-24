// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Cài đặt › Nhân viên + Vai & quyền theo mockup đã duyệt và 40-SECURITY §2–3 (R-CAKE-AUTHZ):
//   nhân viên = users của nền (một vai, kiểu WordPress) + tài khoản kênh được giao · vai riêng = tenant_roles (dựa trên một vai hệ thống) + Cho / Cấm (tenant_role_rules).
//   Quyền nền giữ tên nền: users:write (chủ, quản lý) cho nhân viên; settings:write (chủ) cho vai riêng. Khoá vai riêng có dấu "-" (r-…) nên không trùng vai hệ thống.
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';
import { ChannelAccountIdSchema } from './channel.js';

export const UserIdSchema = z.string().regex(/^[1-9][0-9]{0,18}$/);
/** Vai hệ thống `agent` / vai riêng `r-truong-ca`. */
export const RoleKeySchema = z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/);
const PermissionKeySchema = z.string().regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);

export const StaffSchema = z.object({
  userId: UserIdSchema, email: z.string(), name: z.string(), role: RoleKeySchema, active: z.boolean(),
  lastLoginAt: z.string().nullable(), channelAccountIds: z.array(ChannelAccountIdSchema),
});
export const RoleSchema = z.object({
  key: RoleKeySchema, label: z.string(), kind: z.enum(['system', 'custom']), baseRole: RoleKeySchema.nullable(), active: z.boolean(),
  /** quyền hiệu lực của vai (đã cộng Cho, trừ Cấm). */
  permissions: z.array(z.string()), allow: z.array(z.string()), deny: z.array(z.string()),
});
export const PermissionInfoSchema = z.object({ key: z.string(), label: z.string(), risk: z.enum(['low', 'high']) });
export type Staff = z.infer<typeof StaffSchema>;
export type RoleInfo = z.infer<typeof RoleSchema>;

const staffPath = { userId: UserIdSchema };

export const staffList = defineActionSpec({
  id: 'cake.staff.list', capability: 'cake.staff.manage', title: 'Danh sách nhân viên', kind: 'query',
  input: z.object({}), output: z.array(StaffSchema), permission: 'users:write', risk: 'read', expose: { rest: 'GET /api/v1/staff', ui: true },
});
export const staffInvite = defineActionSpec({
  id: 'cake.staff.invite', capability: 'cake.staff.manage', title: 'Mời nhân viên', kind: 'command',
  input: z.object({ email: z.string().trim().toLowerCase().email().max(255), name: z.string().trim().min(1).max(255), role: RoleKeySchema, channelAccountIds: z.array(ChannelAccountIdSchema).max(100).default([]) }),
  output: StaffSchema, permission: 'users:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.staff.invited'], expose: { rest: 'POST /api/v1/staff', ui: true },
});
export const staffUpdate = defineActionSpec({
  id: 'cake.staff.update', capability: 'cake.staff.manage', title: 'Đổi vai / tài khoản kênh của nhân viên', kind: 'command',
  input: z.object({ ...staffPath, role: RoleKeySchema.optional(), channelAccountIds: z.array(ChannelAccountIdSchema).max(100).optional() }),
  output: StaffSchema, permission: 'users:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.staff.changed'], expose: { rest: 'PATCH /api/v1/staff/:userId', ui: true },
});
export const staffSetActive = defineActionSpec({
  id: 'cake.staff.set_active', capability: 'cake.staff.manage', title: 'Ngưng / bật lại nhân viên', kind: 'command',
  input: z.object({ ...staffPath, active: z.boolean() }),
  output: z.object({ staff: StaffSchema, removedAccounts: z.number().int(), releasedConversations: z.number().int() }),
  permission: 'users:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.staff.changed'], expose: { rest: 'PUT /api/v1/staff/:userId/active', ui: true },
});

export const roleList = defineActionSpec({
  id: 'cake.role.list', capability: 'cake.role.manage', title: 'Vai & quyền', kind: 'query',
  input: z.object({}), output: z.object({ permissions: z.array(PermissionInfoSchema), roles: z.array(RoleSchema) }),
  permission: 'users:write', risk: 'read', expose: { rest: 'GET /api/v1/roles', ui: true },
});
export const roleCreate = defineActionSpec({
  id: 'cake.role.create', capability: 'cake.role.manage', title: 'Tạo vai riêng', kind: 'command',
  input: z.object({ label: z.string().trim().min(1).max(120), baseRole: RoleKeySchema }),
  output: RoleSchema, permission: 'settings:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.role.changed'], expose: { rest: 'POST /api/v1/roles', ui: true },
});
export const roleUpdate = defineActionSpec({
  id: 'cake.role.update', capability: 'cake.role.manage', title: 'Đổi tên / tắt vai riêng', kind: 'command',
  input: z.object({ roleKey: RoleKeySchema, label: z.string().trim().min(1).max(120).optional(), active: z.boolean().optional() }),
  output: RoleSchema, permission: 'settings:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.role.changed'], expose: { rest: 'PATCH /api/v1/roles/:roleKey', ui: true },
});
export const roleRuleSet = defineActionSpec({
  id: 'cake.role.rule_set', capability: 'cake.role.manage', title: 'Cho / Cấm một quyền của vai riêng', kind: 'command',
  input: z.object({ roleKey: RoleKeySchema, permission: PermissionKeySchema, effect: z.enum(['allow', 'deny', 'none']) }),
  output: RoleSchema, permission: 'settings:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.role.changed'], expose: { rest: 'PUT /api/v1/roles/:roleKey/rules', ui: true },
});

export const STAFF_ACTIONS = [staffList, staffInvite, staffUpdate, staffSetActive, roleList, roleCreate, roleUpdate, roleRuleSet] as const;
