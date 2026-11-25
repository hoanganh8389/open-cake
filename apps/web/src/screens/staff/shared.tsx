// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — phần dùng chung của Cài đặt › Nhân viên (tách từ Staff.tsx, luật tệp < 200 dòng).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang apps/web/src/i18n/vi/staff.ts.
import type { ReactNode } from 'react';
import { roleList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { t } from '../../i18n/index.js';

/** Vai kỹ thuật không hiện ở màn này (như mockup): vẫn có trong sổ, gán bằng PR / nền. */
export const HIDDEN = new Set(['auditor', 'developer']);
export const DESC: Record<string, string> = t.staff.roleDesc;
export const GROUPS: [string, RegExp][] = [[t.staff.groups.inbox, /^cake:(all-)?inbox|^cake:quick-reply/], [t.staff.groups.contacts, /^cake:contacts/], [t.staff.groups.catalog, /^cake:catalog/], [t.staff.groups.channels, /^cake:channels|^users:|^settings:/]];
export const groupOf = (p: string) => GROUPS.find(([, re]) => re.test(p))?.[0] ?? t.staff.groups.other;

export const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="mt16"><label className="sm muted">{label}</label><div className="mt8">{children}</div></div>;

export function useRoles() {
  const q = useQueryAction(roleList, {});
  const roles = (q.data?.roles ?? []).filter((r) => !HIDDEN.has(r.key));
  const label = (k: string) => q.data?.roles.find((r) => r.key === k)?.label ?? k;
  return { q, roles, label };
}
