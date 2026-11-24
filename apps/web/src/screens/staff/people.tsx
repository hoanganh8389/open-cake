// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — tab Nhân viên — danh sách kiểu WordPress Users (mockup-nhan-vien).
import { useState } from 'react';
import { channelList, staffList, type Staff as StaffRow } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic, Search } from '@open-cake/ui-kit';
import { QueryView } from '../../app/QueryView.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useRoute } from '../../app/route.js';
import { EditSheet, InviteSheet } from './sheets.js';
import { useRoles } from './shared.js';

export function StaffTab() {
  const { query, setQuery } = useRoute();
  const list = useQueryAction(staffList, {});
  const accs = useQueryAction(channelList, {});
  const { roles, label } = useRoles();
  const [q, setQ] = useState('');
  const can = useCan('users:write');
  const f = query.get('role') ?? '';
  const xs = list.data ?? [];
  const rows = xs.filter((s) => (f === '' ? true : f === 'off' ? !s.active : s.active && s.role === f) && `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
  const accLabel = (id: string) => accs.data?.find((a) => a.channelAccountId === id)?.label ?? id;
  const sees = (s: StaffRow) => {
    if (!s.active) return <span className="subtle">—</span>;
    const all = roles.find((r) => r.key === s.role)?.permissions.includes('cake:all-inbox-xem');
    if (all) return <span className="muted">mọi tài khoản</span>;
    return s.channelAccountIds.length ? <div className="row gap8" style={{ flexWrap: 'wrap' }}>{s.channelAccountIds.map((id) => <span key={id} className="chip">{accLabel(id)}</span>)}</div> : <span className="muted">chỉ hội thoại được giao</span>;
  };
  const sel = xs.find((s) => s.userId === query.get('user'));
  const filters: [string, string, number][] = [['', 'Tất cả', xs.length], ...roles.map((r): [string, string, number] => [r.key, r.label, xs.filter((s) => s.active && s.role === r.key).length]), ['off', 'Đã ngưng', xs.filter((s) => !s.active).length]];
  return (
    <>
      <div className="row mb16"><h1 className="h1">Nhân viên</h1><span className="muted">{xs.length}</span><span className="grow" />
        <Search sm placeholder="Tên hoặc email…" style={{ width: 280 }} value={q} onChange={setQ} />
        <Btn pri disabled={!can} title={can ? undefined : needPermission('users:write')} onClick={() => setQuery({ invite: 1 })}><Ic.plus />Mời nhân viên</Btn></div>
      <div className="row gap8 sm mb16" style={{ flexWrap: 'wrap' }}>{filters.map(([k, l, n], i) => (
        <span key={k}>{i > 0 && <span className="subtle">| </span>}
          <button type="button" style={{ color: f === k ? 'var(--foreground)' : 'var(--primary)', fontWeight: f === k ? 600 : 400 }} onClick={() => setQuery({ role: k || null })}>{l} ({n})</button></span>
      ))}</div>
      <QueryView q={list} empty={{ title: 'Chưa có nhân viên', when: () => rows.length === 0 }}>
        {() => (
          <table className="tbl"><thead><tr><th>Nhân viên</th><th>Vai</th><th>Thấy hội thoại của</th><th>Trạng thái</th></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.userId} style={{ cursor: s.role === 'owner' ? 'default' : 'pointer', opacity: s.active ? 1 : 0.6 }} onClick={() => s.role !== 'owner' && setQuery({ user: s.userId })}>
                <td><b style={{ fontWeight: 500 }}>{s.name}</b><div className="xs subtle">{s.email}</div></td>
                <td>{label(s.role)}</td><td>{sees(s)}</td>
                <td>{s.active ? <Badge tone="ok">hoạt động</Badge> : <Badge>đã ngưng</Badge>}</td>
              </tr>
            ))}</tbody></table>
        )}
      </QueryView>
      <div className="xs subtle mt16">Nhân viên đăng nhập bằng tài khoản WordPress của shop (cùng email) · bấm một dòng để đổi vai, giao tài khoản kênh hoặc ngưng · Chủ và Quản lý làm được (quyền <code>users:write</code>).</div>
      {sel && <EditSheet key={sel.userId} s={sel} roles={roles} onClose={() => setQuery({ user: null })} />}
      {query.get('invite') === '1' && <InviteSheet roles={roles} onClose={() => setQuery({ invite: null })} />}
    </>
  );
}

