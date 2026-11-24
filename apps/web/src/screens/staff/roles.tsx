// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — tab Vai & quyền — ma trận (mockup-vai-quyen, -vai-rieng).
import { useMemo, useState } from 'react';
import { roleCreate, roleRuleSet, roleUpdate, type RoleInfo } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Btn, Ic, Sheet, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../../app/QueryView.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useRoute } from '../../app/route.js';
import { Field, GROUPS, groupOf, useRoles } from './shared.js';

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

export function RolesTab() {
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

