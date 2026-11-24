// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 09:42 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — R-WEB-7: quyền của người đăng nhập (GET /api/v1/auth/me) ⇒ nút ghi KHOÁ KÈM LÝ DO, không ẩn im lặng (R-BLOCK).
//   Giả lập: null = đủ quyền (ca "không có quyền" xem bằng ?mock=denied). Máy chủ vẫn kiểm lại mọi lệnh — giao diện chỉ là lớp thứ hai.
import { createContext, useContext, type ReactNode } from 'react';

const PermsCtx = createContext<ReadonlySet<string> | null>(null);

export function PermissionsProvider({ perms, children }: { perms: ReadonlySet<string> | null; children: ReactNode }) {
  return <PermsCtx.Provider value={perms}>{children}</PermsCtx.Provider>;
}

/** Có quyền không (giả lập ⇒ luôn có). */
export function useCan(permission: string): boolean {
  const perms = useContext(PermsCtx);
  return perms === null || perms.has(permission);
}

/** Câu giải thích cho nút bị khoá (title / ghi chú). */
export const needPermission = (permission: string) => `Bạn chưa có quyền ${permission} — nhờ quản lý cấp ở Cài đặt › Nhân viên.`;

/** Đọc quyền của phiên hiện tại; lỗi / chưa đăng nhập ⇒ tập rỗng (khoá hết, máy chủ vẫn là nơi quyết). */
export async function loadPermissions(token: string | null, base = ''): Promise<ReadonlySet<string>> {
  const r = await fetch(`${base}/api/v1/auth/me`, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then((x) => x.json()).catch(() => null);
  return new Set<string>(r?.ok ? r.data.permissions : []);
}
