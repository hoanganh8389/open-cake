// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3/7 — sheet sửa / ngưng / mời nhân viên (mockup-sua-nhan-vien, -ngung, -moi).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang apps/web/src/i18n/vi/staff.ts.
import { useState } from 'react';
import { channelList, staffInvite, staffSetActive, staffUpdate, type RoleInfo, type Staff as StaffRow } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, CHANNEL_LABEL, Ic, Sheet, cx } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { DESC, Field } from './shared.js';
import { t } from '../../i18n/index.js';

// ── Chọn vai + tài khoản kênh (dùng cho sửa và mời) ─────────────────────
function RolePicker({ roles, value, onChange }: { roles: RoleInfo[]; value: string; onChange: (k: string) => void }) {
  const label = (k: string | null) => roles.find((r) => r.key === k)?.label ?? k;
  return (
    <div className="col gap8">{roles.filter((r) => r.key !== 'owner' && r.active).map((r) => (
      <label key={r.key} className={cx('choice', value === r.key && 'on')} style={{ cursor: 'pointer', padding: '10px 14px' }}>
        <input type="radio" name="role" checked={value === r.key} onChange={() => onChange(r.key)} style={{ display: 'none' }} />
        <span className="dot" />
        <div><b>{r.label}</b>{r.kind === 'custom' && <Badge style={{ marginLeft: 8 }}>{t.staff.picker.customBadge}</Badge>}
          <div className="sm muted">{r.kind === 'custom' ? t.staff.picker.customDesc(String(label(r.baseRole)), r.allow.length, r.deny.length) : DESC[r.key] ?? ''}</div></div>
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

export function EditSheet({ s, roles, onClose }: { s: StaffRow; roles: RoleInfo[]; onClose: () => void }) {
  const [role, setRole] = useState(s.role);
  const [accs, setAccs] = useState<string[]>(s.channelAccountIds);
  const [confirm, setConfirm] = useState(false);
  const save = useAction(staffUpdate);
  const active = useAction(staffSetActive);
  const can = useCan('users:write');
  const why = can ? undefined : needPermission('users:write');
  if (confirm) return (
    <Sheet open onClose={onClose} icon={Ic.warn} title={t.staff.stop.title(s.name)}
      footer={<><Btn onClick={() => setConfirm(false)}>{t.staff.common.cancel}</Btn><Btn danger disabled={!can || active.isPending} title={why} onClick={() => active.mutate({ userId: s.userId, active: false }, { onSuccess: onClose })}>{t.staff.stop.ok}</Btn></>}>
      <ul className="col gap8" style={{ margin: 0, paddingLeft: 20 }}>
        <li>{t.staff.stop.logout}</li>
        <li>{t.staff.stop.accounts(s.channelAccountIds.length)}</li>
        <li>{t.staff.stop.release(s.name)}</li>
        <li>{t.staff.stop.keep}</li>
      </ul>
      <ActionErrorNote error={active.error} />
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} icon={Ic.user} title={s.name} sub={t.staff.edit.lastLogin(s.email, s.lastLoginAt ? when(s.lastLoginAt) : null)}
      footer={<>
        {s.active ? <Btn ghost danger disabled={!can} title={why} onClick={() => setConfirm(true)}>{t.staff.edit.deactivate}</Btn>
          : <Btn out disabled={!can || active.isPending} title={why} onClick={() => active.mutate({ userId: s.userId, active: true }, { onSuccess: onClose })}>{t.staff.edit.reactivate}</Btn>}
        <span className="grow" /><Btn onClick={onClose}>{t.staff.common.cancel}</Btn>
        <Btn pri disabled={!can || !s.active || save.isPending} title={why} onClick={() => save.mutate({ userId: s.userId, role, channelAccountIds: accs as StaffRow["channelAccountIds"] }, { onSuccess: onClose })}>{t.staff.common.save}</Btn>
      </>}>
      {!s.active && <div className="note warn sm">{t.staff.edit.inactiveNote}</div>}
      <Field label={t.staff.edit.role}><RolePicker roles={roles} value={role} onChange={setRole} /></Field>
      <Field label={t.staff.edit.sees}><AccountPicker value={accs} onChange={setAccs} /></Field>
      <div className="xs subtle mt8">{t.staff.edit.hint(s.name)}</div>
      <ActionErrorNote error={save.error ?? active.error} />
    </Sheet>
  );
}

export function InviteSheet({ roles, onClose }: { roles: RoleInfo[]; onClose: () => void }) {
  const [d, setD] = useState({ email: '', name: '', role: 'agent', channelAccountIds: [] as string[] });
  const invite = useAction(staffInvite);
  const ok = /^\S+@\S+\.\S+$/.test(d.email) && d.name.trim().length > 0;
  return (
    <Sheet open onClose={onClose} icon={Ic.userPlus} title={t.staff.invite.title}
      footer={<><Btn onClick={onClose}>{t.staff.common.cancel}</Btn><Btn pri disabled={!ok || invite.isPending} onClick={() => invite.mutate(d as never, { onSuccess: onClose })}>{t.staff.invite.ok}</Btn></>}>
      <Field label={t.staff.invite.email}><input className="input" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="hoa@hoamai.vn" /></Field>
      <Field label={t.staff.invite.name}><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label={t.staff.invite.role}><RolePicker roles={roles} value={d.role} onChange={(role) => setD({ ...d, role })} /></Field>
      <Field label={t.staff.edit.sees}><AccountPicker value={d.channelAccountIds} onChange={(channelAccountIds) => setD({ ...d, channelAccountIds })} /></Field>
      <div className="note sm mt16">{t.staff.invite.sso(d.name.trim())}</div>
      <ActionErrorNote error={invite.error} />
    </Sheet>
  );
}

