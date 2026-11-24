// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Cài đặt › Nhân viên + Vai & quyền theo mockup đã duyệt (mockup-nhan-vien, -sua-nhan-vien, -ngung, -moi,
//   -vai-quyen, -vai-rieng): danh sách kiểu WordPress Users (lọc theo vai), sheet sửa (một vai + tài khoản kênh), ngưng có xác nhận, mời; ma trận vai (hệ thống chỉ xem,
//   vai riêng bấm ô: Cho / Cấm). Vị trí trên URL (R-WEB-2): #/staff?tab=roles&user=…&invite=1&newRole=1. Nút ghi khoá kèm lý do (R-WEB-7); máy chủ kiểm lại.
import { useMemo, useState, type ReactNode } from 'react';
import { channelList, roleCreate, roleList, roleRuleSet, roleUpdate, staffInvite, staffList, staffSetActive, staffUpdate, type RoleInfo, type Staff as StaffRow } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, CHANNEL_LABEL, Ic, Search, Sheet, Tabs, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { needPermission, useCan } from '../app/permissions.js';
import { useRoute } from '../app/route.js';

/** Vai kỹ thuật không hiện ở màn này (như mockup): vẫn có trong sổ, gán bằng PR / nền. */
const HIDDEN = new Set(['auditor', 'developer']);
const DESC: Record<string, string> = {
  manager: 'Mọi việc trừ kết nối kênh và sửa vai riêng. ⚠ xem mọi hộp thư · ghép khách.',
  agent: 'Đọc, trả lời, gắn nhãn hội thoại của tài khoản được giao.',
  marketer: 'Danh bạ, hàng hoá, giá — không đọc nội dung tin.',
  viewer: 'Danh bạ, báo cáo — không đọc nội dung tin.',
};
const GROUPS: [string, RegExp][] = [['Hộp thư', /^cake:(all-)?inbox|^cake:quick-reply/], ['Danh bạ', /^cake:contacts/], ['Hàng hoá', /^cake:catalog/], ['Kênh & nhân viên', /^cake:channels|^users:|^settings:/]];
const groupOf = (p: string) => GROUPS.find(([, re]) => re.test(p))?.[0] ?? 'Khác';

const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="mt16"><label className="sm muted">{label}</label><div className="mt8">{children}</div></div>;

function useRoles() {
  const q = useQueryAction(roleList, {});
  const roles = (q.data?.roles ?? []).filter((r) => !HIDDEN.has(r.key));
  const label = (k: string) => q.data?.roles.find((r) => r.key === k)?.label ?? k;
  return { q, roles, label };
}

// ── Chọn vai + tài khoản kênh (dùng cho sửa và mời) ─────────────────────
function RolePicker({ roles, value, onChange }: { roles: RoleInfo[]; value: string; onChange: (k: string) => void }) {
  const label = (k: string | null) => roles.find((r) => r.key === k)?.label ?? k;
  return (
    <div className="col gap8">{roles.filter((r) => r.key !== 'owner' && r.active).map((r) => (
      <label key={r.key} className={cx('choice', value === r.key && 'on')} style={{ cursor: 'pointer', padding: '10px 14px' }}>
        <input type="radio" name="role" checked={value === r.key} onChange={() => onChange(r.key)} style={{ display: 'none' }} />
        <span className="dot" />
        <div><b>{r.label}</b>{r.kind === 'custom' && <Badge style={{ marginLeft: 8 }}>vai riêng</Badge>}
          <div className="sm muted">{r.kind === 'custom' ? `${label(r.baseRole)}${r.allow.length ? ` + ${r.allow.length} quyền Cho` : ''}${r.deny.length ? ` · ${r.deny.length} quyền Cấm` : ''}.` : DESC[r.key] ?? ''}</div></div>
      </label>
    ))}</div>
  );
}
function AccountPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const accs = useQueryAction(channelList, {});
  return (
    <div className="col">{(accs.data ?? []).map((a) => (
      <label key={a.channelAccountId} className="row gap8" style={{ padding: '6px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={value.includes(a.channelAccountId)} onChange={(e) => onChange(e.target.checked ? [...value, a.channelAccountId] : value.filter((x) => x !== a.channelAccountId))} />
        {a.label} <span className="xs subtle">{CHANNEL_LABEL[a.channel]}</span>
      </label>
    ))}</div>
  );
}

function EditSheet({ s, roles, onClose }: { s: StaffRow; roles: RoleInfo[]; onClose: () => void }) {
  const [role, setRole] = useState(s.role);
  const [accs, setAccs] = useState<string[]>(s.channelAccountIds);
  const [confirm, setConfirm] = useState(false);
  const save = useAction(staffUpdate);
  const active = useAction(staffSetActive);
  const can = useCan('users:write');
  const why = can ? undefined : needPermission('users:write');
  if (confirm) return (
    <Sheet open onClose={onClose} icon={Ic.warn} title={`Ngưng ${s.name}?`}
      footer={<><Btn onClick={() => setConfirm(false)}>Huỷ</Btn><Btn danger disabled={!can || active.isPending} title={why} onClick={() => active.mutate({ userId: s.userId, active: false }, { onSuccess: onClose })}>Ngưng</Btn></>}>
      <ul className="col gap8" style={{ margin: 0, paddingLeft: 20 }}>
        <li>Đăng xuất ngay trên mọi máy; vé WordPress không vào được nữa.</li>
        <li>Gỡ khỏi {s.channelAccountIds.length} tài khoản kênh.</li>
        <li>Hội thoại {s.name} đang giữ trở về hàng chung.</li>
        <li>Lịch sử và bằng chứng giữ nguyên — bật lại được.</li>
      </ul>
      <ActionErrorNote error={active.error} />
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} icon={Ic.user} title={s.name} sub={`${s.email} · ${s.lastLoginAt ? `vào lần cuối ${when(s.lastLoginAt)}` : 'chưa vào lần nào'}`}
      footer={<>
        {s.active ? <Btn ghost danger disabled={!can} title={why} onClick={() => setConfirm(true)}>Ngưng nhân viên…</Btn>
          : <Btn out disabled={!can || active.isPending} title={why} onClick={() => active.mutate({ userId: s.userId, active: true }, { onSuccess: onClose })}>Bật lại</Btn>}
        <span className="grow" /><Btn onClick={onClose}>Huỷ</Btn>
        <Btn pri disabled={!can || !s.active || save.isPending} title={why} onClick={() => save.mutate({ userId: s.userId, role, channelAccountIds: accs as StaffRow["channelAccountIds"] }, { onSuccess: onClose })}>Lưu</Btn>
      </>}>
      {!s.active && <div className="note warn sm">Đang ngưng — bật lại để sửa vai và tài khoản kênh.</div>}
      <Field label="Vai"><RolePicker roles={roles} value={role} onChange={setRole} /></Field>
      <Field label="Thấy hội thoại của"><AccountPicker value={accs} onChange={setAccs} /></Field>
      <div className="xs subtle mt8">Bỏ hết = chỉ thấy hội thoại được giao riêng cho {s.name}. Đổi vai chính ⇒ {s.name} vào lại qua WordPress.</div>
      <ActionErrorNote error={save.error ?? active.error} />
    </Sheet>
  );
}

function InviteSheet({ roles, onClose }: { roles: RoleInfo[]; onClose: () => void }) {
  const [d, setD] = useState({ email: '', name: '', role: 'agent', channelAccountIds: [] as string[] });
  const invite = useAction(staffInvite);
  const ok = /^\S+@\S+\.\S+$/.test(d.email) && d.name.trim().length > 0;
  return (
    <Sheet open onClose={onClose} icon={Ic.userPlus} title="Mời nhân viên"
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!ok || invite.isPending} onClick={() => invite.mutate(d as never, { onSuccess: onClose })}>Mời</Btn></>}>
      <Field label="Email *"><input className="input" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="hoa@hoamai.vn" /></Field>
      <Field label="Tên *"><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Vai *"><RolePicker roles={roles} value={d.role} onChange={(role) => setD({ ...d, role })} /></Field>
      <Field label="Thấy hội thoại của"><AccountPicker value={d.channelAccountIds} onChange={(channelAccountIds) => setD({ ...d, channelAccountIds })} /></Field>
      <div className="note sm mt16">{d.name.trim() || 'Nhân viên'} vào Open CRM bằng tài khoản WordPress của shop có đúng email này — không cần mật khẩu riêng.</div>
      <ActionErrorNote error={invite.error} />
    </Sheet>
  );
}

// ── Tab Nhân viên ───────────────────────────────────────────────────────
function StaffTab() {
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

// ── Tab Vai & quyền (ma trận) ───────────────────────────────────────────
function Cell({ r, p }: { r: RoleInfo; p: string }) {
  const rule = useAction(roleRuleSet);
  const can = useCan('settings:write');
  if (r.kind === 'system') return <td>{r.permissions.includes(p) ? <span className="c">✓</span> : <span className="c">·</span>}</td>;
  const deny = r.deny.includes(p), allow = r.allow.includes(p), has = r.permissions.includes(p);
  // vòng bấm: (trống) → Cho → Cấm → trống · (từ vai nền) → Cấm → về vai nền
  const next = deny ? 'none' : allow ? 'deny' : has ? 'deny' : 'allow';
  const look = deny ? ['dn', '⊘', 'Cấm (thắng)'] : allow ? ['al', '✓', 'Cho thêm'] : has ? ['inh', '✓', 'từ vai nền'] : ['no', '', 'chưa có'];
  return (
    <td className="cus">
      <button type="button" className={cx('c', look[0])} disabled={!can || rule.isPending || !r.active} title={can ? `${look[2]} — bấm để đổi` : needPermission('settings:write')}
        onClick={() => rule.mutate({ roleKey: r.key, permission: p, effect: next })}>{look[1]}</button>
    </td>
  );
}

function NewRoleSheet({ roles, onClose }: { roles: RoleInfo[]; onClose: () => void }) {
  const [d, setD] = useState({ label: '', baseRole: 'agent' });
  const create = useAction(roleCreate);
  return (
    <Sheet open onClose={onClose} icon={Ic.shield} title="Vai riêng mới"
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!d.label.trim() || create.isPending} onClick={() => create.mutate(d, { onSuccess: onClose })}>Tạo vai</Btn></>}>
      <Field label="Tên vai *"><input className="input" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder="vd Trưởng ca" /></Field>
      <Field label="Dựa trên *">
        <select className="input" value={d.baseRole} onChange={(e) => setD({ ...d, baseRole: e.target.value })}>
          {roles.filter((r) => r.kind === 'system' && r.key !== 'owner').map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </Field>
      <div className="note sm mt16">Vai mới có đúng quyền của vai nền; sau đó Cho / Cấm thêm từng quyền ở ma trận. Không xoá vai — chỉ tắt; đổi vai nền = tạo vai mới.</div>
      <ActionErrorNote error={create.error} />
    </Sheet>
  );
}

function RolesTab() {
  const { query, setQuery } = useRoute();
  const { q, roles, label } = useRoles();
  const can = useCan('settings:write');
  const upd = useAction(roleUpdate);
  const perms = useMemo(() => {
    const out = new Map<string, NonNullable<typeof q.data>['permissions']>();
    for (const p of q.data?.permissions ?? []) out.set(groupOf(p.key), [...(out.get(groupOf(p.key)) ?? []), p]);
    return [...GROUPS.map(([g]) => g), 'Khác'].filter((g) => out.has(g)).map((g) => [g, out.get(g)!] as const);
  }, [q.data]);
  return (
    <>
      <div className="row mb16"><h1 className="h1">Vai &amp; quyền</h1><span className="grow" />
        <div className="legend"><span><span className="c">✓</span>vai hệ thống</span><span><span className="c inh">✓</span>từ vai nền</span><span><span className="c al">✓</span>Cho thêm</span><span><span className="c dn">⊘</span>Cấm (thắng)</span><span style={{ color: 'var(--warning)' }}>⚠ rủi ro cao</span></div>
        <Btn pri disabled={!can} title={can ? undefined : needPermission('settings:write')} onClick={() => setQuery({ newRole: 1 })}><Ic.plus />Vai riêng</Btn></div>
      <ActionErrorNote error={upd.error} />
      <QueryView q={q}>
        {() => (
          <table className="mx"><thead><tr><th>Quyền</th>{roles.map((r) => (
            <th key={r.key} className={cx(r.kind === 'custom' && 'cus')}>{r.label}
              {r.kind === 'custom' && <span className="xs">nền: {label(r.baseRole!)} · <button type="button" className="link" disabled={!can || upd.isPending} onClick={() => upd.mutate({ roleKey: r.key, active: !r.active })}>{r.active ? 'tắt' : 'bật lại'}</button></span>}
            </th>
          ))}</tr></thead>
            <tbody>{perms.map(([g, ps]) => [
              <tr key={g} className="grp"><td colSpan={roles.length + 1}>{g}</td></tr>,
              ...ps.map((p) => (
                <tr key={p.key}><td>{p.label}{p.risk === 'high' && <span className="warnmark" title="rủi ro cao — không bao giờ vào khoá API / AI">⚠</span>}<code>{p.key}</code></td>
                  {roles.map((r) => <Cell key={r.key} r={r} p={p.key} />)}</tr>
              )),
            ])}</tbody></table>
        )}
      </QueryView>
      <div className="xs subtle mt16">Vai hệ thống do phần mềm khai (mỗi phân hệ đăng ký quyền + vai lúc khởi động) — chỉ xem ở đây. Muốn khác: tạo <b>vai riêng</b> dựa trên một vai hệ thống, rồi bấm ô của cột đó để Cho / Cấm. Khoá API và AI không bao giờ nhận quyền ⚠.</div>
      {query.get('newRole') === '1' && <NewRoleSheet roles={roles} onClose={() => setQuery({ newRole: null })} />}
    </>
  );
}

export function Staff() {
  const { query, setQuery } = useRoute();
  const tab = query.get('tab') === 'roles' ? 'roles' : 'staff';
  return (
    <div className="page">
      <div className="mb24"><Tabs underline value={tab} onChange={(t) => setQuery({ tab: t === 'roles' ? 'roles' : null, role: null, user: null })} items={[{ id: 'staff', label: 'Nhân viên' }, { id: 'roles', label: 'Vai & quyền' }]} /></div>
      {tab === 'staff' ? <StaffTab /> : <RolesTab />}
    </div>
  );
}
