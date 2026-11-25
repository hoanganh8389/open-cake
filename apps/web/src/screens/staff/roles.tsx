// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — tab Vai & quyền — ma trận (mockup-vai-quyen, -vai-rieng).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang apps/web/src/i18n/vi/staff.ts.
import { useMemo, useState } from 'react';
import { roleCreate, roleRuleSet, roleUpdate, type RoleInfo } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Btn, Ic, Sheet, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../../app/QueryView.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useRoute } from '../../app/route.js';
import { Field, GROUPS, groupOf, useRoles } from './shared.js';
import { t } from '../../i18n/index.js';

function Cell({ r, p }: { r: RoleInfo; p: string }) {
  const rule = useAction(roleRuleSet);
  const can = useCan('settings:write');
  if (r.kind === 'system') return <td>{r.permissions.includes(p) ? <span className="c">✓</span> : <span className="c">·</span>}</td>;
  const deny = r.deny.includes(p), allow = r.allow.includes(p), has = r.permissions.includes(p);
  // vòng bấm: (trống) → Cho → Cấm → trống · (từ vai nền) → Cấm → về vai nền
  const next = deny ? 'none' : allow ? 'deny' : has ? 'deny' : 'allow';
  const look = deny ? ['dn', '⊘', t.staff.roles.cell.deny] : allow ? ['al', '✓', t.staff.roles.cell.allow] : has ? ['inh', '✓', t.staff.roles.cell.base] : ['no', '', t.staff.roles.cell.none];
  return (
    <td className="cus">
      <button type="button" className={cx('c', look[0])} disabled={!can || rule.isPending || !r.active} title={can ? t.staff.roles.cell.click(look[2]!) : needPermission('settings:write')}
        onClick={() => rule.mutate({ roleKey: r.key, permission: p, effect: next })}>{look[1]}</button>
    </td>
  );
}

function NewRoleSheet({ roles, onClose }: { roles: RoleInfo[]; onClose: () => void }) {
  const [d, setD] = useState({ label: '', baseRole: 'agent' });
  const create = useAction(roleCreate);
  return (
    <Sheet open onClose={onClose} icon={Ic.shield} title={t.staff.roles.create.title}
      footer={<><Btn onClick={onClose}>{t.staff.common.cancel}</Btn><Btn pri disabled={!d.label.trim() || create.isPending} onClick={() => create.mutate(d, { onSuccess: onClose })}>{t.staff.roles.create.ok}</Btn></>}>
      <Field label={t.staff.roles.create.label}><input className="input" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder={t.staff.roles.create.placeholder} /></Field>
      <Field label={t.staff.roles.create.base}>
        <select className="input" value={d.baseRole} onChange={(e) => setD({ ...d, baseRole: e.target.value })}>
          {roles.filter((r) => r.kind === 'system' && r.key !== 'owner').map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </Field>
      <div className="note sm mt16">{t.staff.roles.create.note}</div>
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
    return [...GROUPS.map(([g]) => g), t.staff.groups.other].filter((g) => out.has(g)).map((g) => [g, out.get(g)!] as const);
  }, [q.data]);
  return (
    <>
      <div className="row mb16"><h1 className="h1">{t.staff.roles.title}</h1><span className="grow" />
        <div className="legend"><span><span className="c">✓</span>{t.staff.roles.legendSystem}</span><span><span className="c inh">✓</span>{t.staff.roles.legendBase}</span><span><span className="c al">✓</span>{t.staff.roles.legendAllow}</span><span><span className="c dn">⊘</span>{t.staff.roles.legendDeny}</span><span style={{ color: 'var(--warning)' }}>{t.staff.roles.legendRisk}</span></div>
        <Btn pri disabled={!can} title={can ? undefined : needPermission('settings:write')} onClick={() => setQuery({ newRole: 1 })}><Ic.plus />{t.staff.roles.newRole}</Btn></div>
      <ActionErrorNote error={upd.error} />
      <QueryView q={q}>
        {() => (
          <table className="mx"><thead><tr><th>{t.staff.roles.colPermission}</th>{roles.map((r) => (
            <th key={r.key} className={cx(r.kind === 'custom' && 'cus')}>{r.label}
              {r.kind === 'custom' && <span className="xs">{t.staff.roles.base(label(r.baseRole!))}<button type="button" className="link" disabled={!can || upd.isPending} onClick={() => upd.mutate({ roleKey: r.key, active: !r.active })}>{r.active ? t.staff.roles.disable : t.staff.roles.enable}</button></span>}
            </th>
          ))}</tr></thead>
            <tbody>{perms.map(([g, ps]) => [
              <tr key={g} className="grp"><td colSpan={roles.length + 1}>{g}</td></tr>,
              ...ps.map((p) => (
                <tr key={p.key}><td>{p.label}{p.risk === 'high' && <span className="warnmark" title={t.staff.roles.riskTitle}>⚠</span>}<code>{p.key}</code></td>
                  {roles.map((r) => <Cell key={r.key} r={r} p={p.key} />)}</tr>
              )),
            ])}</tbody></table>
        )}
      </QueryView>
      <div className="xs subtle mt16">{t.staff.roles.footA}<b>{t.staff.roles.footB}</b>{t.staff.roles.footC}</div>
      {query.get('newRole') === '1' && <NewRoleSheet roles={roles} onClose={() => setQuery({ newRole: null })} />}
    </>
  );
}

