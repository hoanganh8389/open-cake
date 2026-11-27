// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 01:55 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN SC-USER-5 / R-USER-13 — tệp khai báo bizcity.authz.json (bizcity_authz_manifest@1) sinh TỪ CHÍNH sổ đăng ký đang chạy
//   (registerModulePermissions / registerRoles / registerApiScopes) để bộ kiểm chung bizcity-platform tools/users-check.mjs đọc được mà không chạy app.
//   Cùng thuật toán authzManifest() của @bizcity/platform (src/core/authz-manifest.ts, chưa có trong bản 0.2.0 đang dùng) — lên bản nền có hàm này thì thay bằng import, bỏ tệp.
//   Ghi lại tệp: pnpm run authz:manifest · chặn lệch: apps/api/test/authz-manifest.test.ts.
import { PERMISSIONS, listModulePermissions } from '@bizcity/platform/core/auth';
import { OWNER_ROLE, listApiScopes, listRoles, scopePermissionKeys } from '@bizcity/platform/core/roles';
import { CAKE_META_KEYS } from '@open-cake/contracts';
import { registerCakeAuthz } from './authz.js';

export const APP_ID = 'open-cake'; // = id trong bizcity.app.json

export function cakeAuthzManifest() {
  registerCakeAuthz();
  const byKey = <T extends { key: string }>(a: T, b: T) => a.key.localeCompare(b.key);
  return {
    schema: 'bizcity_authz_manifest@1' as const,
    app: APP_ID,
    core_permissions: [...PERMISSIONS].sort(),
    permissions: listModulePermissions().map((p) => ({ key: p.key, label: p.label, risk: p.risk === 'high' ? 'high' as const : 'low' as const, module: p.module })).sort(byKey),
    roles: listRoles().filter((r) => r.key !== OWNER_ROLE).map((r) => ({ key: r.key, label: r.label, admin: Boolean(r.admin), permissions: [...new Set(r.permissions)].sort() })).sort(byKey),
    api_scopes: Object.fromEntries(listApiScopes().map((s) => [s, [...scopePermissionKeys(s)].sort()])),
    user_meta: CAKE_META_KEYS.filter((m) => m.store === 'user_meta').map((m) => ({ key: m.key, label: m.field.label, type: m.field.type, pii: m.field.pii })).sort(byKey),
    settings: [] as { key: string; label: string; scopes: string[]; permission: string }[],
  };
}

/** Nội dung tệp: JSON thụt 2, xuống dòng cuối — so sánh được trong git. */
export const manifestText = () => `${JSON.stringify(cakeAuthzManifest(), null, 2)}\n`;

