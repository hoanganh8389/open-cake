// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — khai quyền + vai của Cake qua cổng của nền (registerModulePermissions / registerRoles / registerApiScopes — P2b-3).
//   Quyền SINH từ action spec + registry lớp mềm (một nguồn, R-CANON-14): rủi ro = mức cao nhất trong các action dùng quyền đó. Vai theo architecture/40-SECURITY §2:
//   owner (nền, mọi quyền) · manager · agent · marketer · viewer · auditor · developer. Khoá API / AI không bao giờ có quyền rủi ro cao (nền lọc).
import { registerModulePermissions } from '@bizcity/platform/core/auth';
import { registerApiScopes, registerRoles } from '@bizcity/platform/core/roles';
import { ALL_ACTIONS, CAKE_RECORD_TYPES } from '@open-cake/contracts';
import { ALL_INBOX } from '../care/scope.js';

const ORDER = ['read', 'low', 'medium', 'high'] as const;
type Risk = (typeof ORDER)[number];

/** Mọi quyền Cake dùng: { quyền → rủi ro cao nhất, nhãn }. */
export function cakePermissions(): Map<string, { risk: Risk; label: string }> {
  const m = new Map<string, { risk: Risk; label: string }>();
  for (const a of ALL_ACTIONS) {
    const cur = m.get(a.permission);
    if (!cur) m.set(a.permission, { risk: a.risk as Risk, label: a.title });
    else if (ORDER.indexOf(a.risk as Risk) > ORDER.indexOf(cur.risk)) cur.risk = a.risk as Risk;
  }
// [2026-11-24 09:51 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — xem MỌI hộp thư (không theo tài khoản kênh được giao): rủi ro cao, chỉ manager / owner.
  m.set(ALL_INBOX, { risk: 'high', label: 'Xem mọi hội thoại (không giới hạn theo tài khoản kênh được giao)' });
  for (const t of CAKE_RECORD_TYPES) for (const [op, p] of Object.entries(t.permissions)) if (!m.has(p)) m.set(p, { risk: 'low', label: `${t.label} — ${op}` });
  return m;
}

const isView = (p: string) => p.endsWith('-xem') && p !== ALL_INBOX;

let done = false;
export function registerCakeAuthz(): void {
  if (done) return;
  done = true;
  const perms = cakePermissions();
  for (const module of ['cake', 'core'] as const) {
    registerModulePermissions(module, [...perms].filter(([k]) => k.startsWith(`${module}:`))
      .map(([key, v]) => ({ key, label: v.label, risk: v.risk === 'high' ? 'high' as const : 'low' as const })));
  }
  const all = [...perms.keys()];
  const view = all.filter(isView);
  const viewNoInbox = view.filter((p) => p !== 'cake:inbox-xem'); // nội dung tin là dữ liệu cá nhân: chỉ agent / manager / owner (40-SECURITY §2)
  registerRoles('cake', [
    // [2026-11-24 10:15 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — quản lý: mời, đổi vai, ngưng, giao tài khoản kênh (users:write); vai riêng / cài đặt (settings:write) chỉ chủ (40-SECURITY §2.3).
    { key: 'manager', label: 'Quản lý', permissions: [...all.filter((p) => !p.startsWith('cake:channels-') || isView(p)), 'reports:read', 'users:write'] },
    { key: 'agent', label: 'Nhân viên chăm sóc', permissions: [...view, 'cake:inbox-lap', 'cake:contacts-sua', 'cake:quick-reply-lap', 'cake:quick-reply-sua', 'core:records-lap', 'core:records-sua'] },
    { key: 'marketer', label: 'Tiếp thị', permissions: [...viewNoInbox, 'cake:contacts-sua', 'cake:catalog-lap', 'cake:catalog-sua', 'cake:catalog-gia'] },
    { key: 'viewer', label: 'Chỉ xem', permissions: [...viewNoInbox, 'reports:read'] },
    { key: 'auditor', label: 'Kiểm soát', permissions: [...viewNoInbox, 'reports:read', 'review:read'] },
    { key: 'developer', label: 'Nhà phát triển', permissions: [...viewNoInbox, 'devtools:read'] },
  ]);
  // Khoá API site (POS / Kế Toán gọi Cake): chỉ đọc danh bạ + danh mục; quyền rủi ro cao bị nền lọc.
  registerApiScopes('cake', { 'cake:read': ['cake:contacts-xem', 'cake:catalog-xem'] });
}
