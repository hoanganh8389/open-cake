// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 09:42 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — R-WEB-7: quyền của người đăng nhập (GET /api/v1/auth/me) ⇒ nút ghi KHOÁ KÈM LÝ DO, không ẩn im lặng (R-BLOCK).
//   Giả lập: null = đủ quyền (ca "không có quyền" xem bằng ?mock=denied). Máy chủ vẫn kiểm lại mọi lệnh — giao diện chỉ là lớp thứ hai.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { createContext, useContext, type ReactNode } from 'react';
import { t } from '../i18n/index.js';

const PermsCtx = createContext<ReadonlySet<string> | null>(null);
const TenantCtx = createContext<string | null>(null);

export function PermissionsProvider({ perms, tenantName = null, children }: { perms: ReadonlySet<string> | null; tenantName?: string | null; children: ReactNode }) {
  return <PermsCtx.Provider value={perms}><TenantCtx.Provider value={tenantName}>{children}</TenantCtx.Provider></PermsCtx.Provider>;
}

/** Tên đơn vị của phiên (giả lập ⇒ null). */
export const useTenantName = (): string | null => useContext(TenantCtx);

/** Có quyền không (giả lập ⇒ luôn có). */
export function useCan(permission: string): boolean {
  const perms = useContext(PermsCtx);
  return perms === null || perms.has(permission);
}

/** Câu giải thích cho nút bị khoá (title / ghi chú). */
export const needPermission = (permission: string) => t.app.needPermission(permission);

/** Đọc quyền + tên đơn vị của phiên hiện tại; lỗi / chưa đăng nhập ⇒ tập rỗng (khoá hết, máy chủ vẫn là nơi quyết). */
export async function loadSession(token: string | null, base = ''): Promise<{ perms: ReadonlySet<string>; tenantName: string | null }> {
  const r = await fetch(`${base}/api/v1/auth/me`, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then((x) => x.json()).catch(() => null);
  return { perms: new Set<string>(r?.ok ? r.data.permissions : []), tenantName: r?.ok ? (r.data.tenantName ?? null) : null };
}
