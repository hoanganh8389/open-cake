// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — phần dùng chung của Cài đặt › Nhân viên (tách từ Staff.tsx, luật tệp < 200 dòng).
import type { ReactNode } from 'react';
import { roleList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';

/** Vai kỹ thuật không hiện ở màn này (như mockup): vẫn có trong sổ, gán bằng PR / nền. */
export const HIDDEN = new Set(['auditor', 'developer']);
export const DESC: Record<string, string> = {
  manager: 'Mọi việc trừ kết nối kênh và sửa vai riêng. ⚠ xem mọi hộp thư · ghép khách.',
  agent: 'Đọc, trả lời, gắn nhãn hội thoại của tài khoản được giao.',
  marketer: 'Danh bạ, hàng hoá, giá — không đọc nội dung tin.',
  viewer: 'Danh bạ, báo cáo — không đọc nội dung tin.',
};
export const GROUPS: [string, RegExp][] = [['Hộp thư', /^cake:(all-)?inbox|^cake:quick-reply/], ['Danh bạ', /^cake:contacts/], ['Hàng hoá', /^cake:catalog/], ['Kênh & nhân viên', /^cake:channels|^users:|^settings:/]];
export const groupOf = (p: string) => GROUPS.find(([, re]) => re.test(p))?.[0] ?? 'Khác';

export const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="mt16"><label className="sm muted">{label}</label><div className="mt8">{children}</div></div>;

export function useRoles() {
  const q = useQueryAction(roleList, {});
  const roles = (q.data?.roles ?? []).filter((r) => !HIDDEN.has(r.key));
  const label = (k: string) => q.data?.roles.find((r) => r.key === k)?.label ?? k;
  return { q, roles, label };
}
