// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — giả lập Nhân viên + Vai & quyền theo đúng luật máy chủ (apps/api/src/auth/staff.ts):
//   không sửa Chủ, vai riêng = vai nền + Cho − Cấm (Cấm thắng), email trùng ⇒ CONFLICT, ngưng ⇒ gỡ tài khoản kênh. Sổ quyền ở đây là ẢNH CHỤP để xem màn — máy chủ là nguồn thật.
import { ApiError } from '../client.js';
import type { Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
const PERMS: [string, string, 'low' | 'high'][] = [
  ['cake:inbox-xem', 'Xem hội thoại được giao', 'low'], ['cake:inbox-lap', 'Trả lời, gắn nhãn', 'low'], ['cake:all-inbox-xem', 'Xem mọi hộp thư', 'high'],
  ['cake:contacts-xem', 'Xem khách', 'low'], ['cake:contacts-sua', 'Sửa khách', 'low'], ['cake:contacts-gop', 'Ghép / tách khách', 'high'],
  ['cake:catalog-xem', 'Xem hàng hoá', 'low'], ['cake:catalog-lap', 'Thêm, sửa hàng', 'low'], ['cake:catalog-gia', 'Sửa giá', 'low'],
  ['cake:channels-xem', 'Xem kênh', 'low'], ['cake:channels-lap', 'Kết nối kênh', 'high'],
  ['users:write', 'Mời, đổi vai, ngưng nhân viên; giao tài khoản kênh', 'high'], ['settings:write', 'Sửa vai riêng & cài đặt đơn vị', 'high'], ['reports:read', 'Xem báo cáo, bằng chứng', 'low'],
];
const ALL = PERMS.map((p) => p[0]);
const VIEW = ['cake:contacts-xem', 'cake:catalog-xem', 'cake:channels-xem'];
const SYSTEM: Record<string, [string, string[]]> = {
  owner: ['Chủ', ALL],
  manager: ['Quản lý', ALL.filter((p) => p !== 'cake:channels-lap' && p !== 'settings:write')],
  agent: ['Nhân viên chăm sóc', [...VIEW, 'cake:inbox-xem', 'cake:inbox-lap', 'cake:contacts-sua']],
  marketer: ['Tiếp thị', [...VIEW, 'cake:contacts-sua', 'cake:catalog-lap', 'cake:catalog-gia']],
  viewer: ['Chỉ xem', [...VIEW, 'reports:read']],
};

const seed = (s: Store) => {
  s.staff ??= [
    { userId: '1', email: 'chu@hoamai.vn', name: 'Chủ shop Hoa Mai', role: 'owner', active: true, lastLoginAt: new Date(s.now()).toISOString() },
    { userId: '4', email: 'minh@hoamai.vn', name: 'Trần Văn Minh', role: 'manager', active: true, lastLoginAt: null },
    { userId: '2', email: 'lan@hoamai.vn', name: 'Nguyễn Thị Lan', role: 'agent', active: true, lastLoginAt: new Date(new Date(s.now()).getTime() - 3_600_000).toISOString() },
    { userId: '3', email: 'yen@hoamai.vn', name: 'Lê Hoàng Yến', role: 'agent', active: true, lastLoginAt: null },
    { userId: '5', email: 'bao@hoamai.vn', name: 'Phạm Quốc Bảo', role: 'marketer', active: false, lastLoginAt: null },
  ];
  s.customRoles ??= [{ key: 'r-truong-ca', label: 'Trưởng ca', baseRole: 'agent', active: true, allow: ['cake:all-inbox-xem'], deny: ['cake:contacts-gop'] }];
  return { staff: s.staff, custom: s.customRoles };
};
const accountsOf = (s: Store, userId: string) => Object.entries(s.members).filter(([, ids]) => ids.includes(userId)).map(([a]) => a).sort();
const view = (s: Store, u: NonNullable<Store['staff']>[number]) => ({ ...u, channelAccountIds: accountsOf(s, u.userId) });
const setAccounts = (s: Store, userId: string, ids: string[]) => {
  let removed = 0;
  for (const a of s.accounts) {
    const cur = s.members[a.channelAccountId] ?? [];
    const has = cur.includes(userId), want = ids.includes(a.channelAccountId);
    if (has && !want) { s.members[a.channelAccountId] = cur.filter((x) => x !== userId); removed++; }
    if (!has && want) s.members[a.channelAccountId] = [...cur, userId];
  }
  return removed;
};
const customView = (r: NonNullable<Store['customRoles']>[number]) => ({
  key: r.key, label: r.label, kind: 'custom' as const, baseRole: r.baseRole, active: r.active, allow: r.allow, deny: r.deny,
  permissions: [...new Set([...(SYSTEM[r.baseRole]?.[1] ?? []), ...r.allow])].filter((p) => !r.deny.includes(p)).sort(),
});
const roleOk = (s: Store, key: string) => {
  if (key === 'owner') throw new ApiError({ code: 'FORBIDDEN', message: 'Không cấp vai Chủ ở đây — chủ đơn vị do nền quản.' });
  if (!SYSTEM[key] && !seed(s).custom.some((r) => r.key === key && r.active)) throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Không có vai này.', field: 'role' });
};
const target = (s: Store, userId: string) => {
  const u = seed(s).staff.find((x) => x.userId === userId);
  if (!u) throw new ApiError({ code: 'NOT_FOUND', message: 'Không có nhân viên này trong đơn vị.' });
  if (u.role === 'owner') throw new ApiError({ code: 'FORBIDDEN', message: 'Không sửa / ngưng Chủ ở đây.' });
  return u;
};
const custom = (s: Store, key: string) => {
  const r = seed(s).custom.find((x) => x.key === key);
  if (!r) throw new ApiError({ code: 'NOT_FOUND', message: 'Không có vai riêng này.' });
  return r;
};

export const staffHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.staff.list': (s) => seed(s).staff.map((u) => view(s, u)),
  'cake.staff.invite': (s, i) => {
    roleOk(s, i.role);
    const { staff } = seed(s);
    if (staff.some((u) => u.email === i.email)) throw new ApiError({ code: 'CONFLICT', message: 'Email này đã là nhân viên của đơn vị.', field: 'email' });
    const u = { userId: String(++s.seq), email: i.email, name: i.name, role: i.role, active: true, lastLoginAt: null };
    staff.push(u);
    setAccounts(s, u.userId, i.channelAccountIds ?? []);
    return view(s, u);
  },
  'cake.staff.update': (s, i) => {
    const u = target(s, i.userId);
    if (!u.active) throw new ApiError({ code: 'CONFLICT', message: 'Nhân viên đang ngưng — bật lại trước khi sửa.' });
    if (i.role !== undefined) { roleOk(s, i.role); u.role = i.role; }
    if (i.channelAccountIds !== undefined) setAccounts(s, u.userId, i.channelAccountIds);
    return view(s, u);
  },
  'cake.staff.set_active': (s, i) => {
    const u = target(s, i.userId);
    let removedAccounts = 0, releasedConversations = 0;
    if (!i.active && u.active) {
      removedAccounts = setAccounts(s, u.userId, []);
      for (const c of s.conversations) if (c.assigneeUserId === u.userId) { c.assigneeUserId = null; releasedConversations++; }
    }
    u.active = i.active;
    return { staff: view(s, u), removedAccounts, releasedConversations };
  },
  'cake.role.list': (s) => ({
    permissions: PERMS.map(([key, label, risk]) => ({ key, label, risk })),
    roles: [
      ...Object.entries(SYSTEM).map(([key, [label, permissions]]) => ({ key, label, kind: 'system' as const, baseRole: null, active: true, permissions: [...permissions].sort(), allow: [], deny: [] })),
      ...seed(s).custom.map(customView),
    ],
  }),
  'cake.role.create': (s, i) => {
    if (!SYSTEM[i.baseRole] || i.baseRole === 'owner') throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Vai nền phải là một vai hệ thống (không phải Chủ).', field: 'baseRole' });
    const r = { key: `r-${++s.seq}`, label: i.label, baseRole: i.baseRole, active: true, allow: [], deny: [] };
    seed(s).custom.push(r);
    return customView(r);
  },
  'cake.role.update': (s, i) => {
    const r = custom(s, i.roleKey);
    if (i.label !== undefined) r.label = i.label;
    if (i.active !== undefined) r.active = i.active;
    return customView(r);
  },
  'cake.role.rule_set': (s, i) => {
    const r = custom(s, i.roleKey);
    r.allow = r.allow.filter((p) => p !== i.permission);
    r.deny = r.deny.filter((p) => p !== i.permission);
    if (i.effect === 'allow') r.allow.push(i.permission);
    if (i.effect === 'deny') r.deny.push(i.permission);
    return customView(r);
  },
};
