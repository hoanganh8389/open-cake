// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — tab Khoá API theo mockup đã duyệt (mockup-khoa-api, -tao-khoa, -hien-khoa, -thu-hoi-khoa):
//   danh sách (tiền tố, phạm vi, dùng lần cuối), tạo ⇒ hiện khoá MỘT lần (chỉ trong bộ nhớ của sheet, không lên URL), thu hồi có xác nhận. Chỉ Chủ (settings:write).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang apps/web/src/i18n/vi/staff.ts.
import { useState } from 'react';
import { apiKeyCreate, apiKeyList, apiKeyRevoke, type ApiKeyInfo } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useRoute } from '../../app/route.js';
import { Field } from './shared.js';
import { t } from '../../i18n/index.js';

const SCOPE_LABEL = t.staff.keys.scope;
const scopeLabel = (s: string) => SCOPE_LABEL[s]?.[0] ?? s;
const day = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

function CreateSheet({ scopes, onClose }: { scopes: string[]; onClose: () => void }) {
  const [d, setD] = useState({ name: '', scopes: scopes.slice(0, 1) });
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useAction(apiKeyCreate);
  if (secret) return (
    <Sheet open onClose={onClose} icon={Ic.key} title={t.staff.keys.shown.title(secret.name)}
      footer={<Btn pri onClick={onClose}>{t.staff.keys.shown.done}</Btn>}>
      <div className="row gap8">
        <input className="input" readOnly value={secret.value} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} onFocus={(e) => e.target.select()} />
        <Btn pri onClick={() => void navigator.clipboard?.writeText(secret.value).then(() => setCopied(true))}>{copied ? t.staff.keys.shown.copied : t.staff.keys.shown.copy}</Btn>
      </div>
      <div className="note warn sm mt16"><b>{t.staff.keys.shown.warnA}</b>{t.staff.keys.shown.warnB}</div>
      <div className="xs subtle mt8">{t.staff.keys.shown.useA}<code>X-Api-Key: kc_…</code>{t.staff.keys.shown.useB}<code>/api/v1/…</code>{t.staff.keys.shown.useC}</div>
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} icon={Ic.key} title={t.staff.keys.form.title}
      footer={<><Btn onClick={onClose}>{t.staff.common.cancel}</Btn><Btn pri disabled={!d.name.trim() || !d.scopes.length || create.isPending}
        onClick={() => create.mutate(d, { onSuccess: (r) => setSecret({ name: r.key.name, value: r.secret }) })}>{t.staff.keys.create}</Btn></>}>
      <Field label={t.staff.keys.form.name}><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={t.staff.keys.form.namePh} /></Field>
      <Field label={t.staff.keys.form.scopes}>
        <div className="col gap8">{scopes.map((s) => {
          const on = d.scopes.includes(s);
          return (
            <label key={s} className={on ? 'choice on' : 'choice'} style={{ cursor: 'pointer', padding: '10px 14px' }}>
              <input type="checkbox" checked={on} style={{ display: 'none' }} onChange={() => setD({ ...d, scopes: on ? d.scopes.filter((x) => x !== s) : [...d.scopes, s] })} />
              <span className="dot" /><div><b>{scopeLabel(s)}</b> <code className="xs">{s}</code><div className="xs muted">{SCOPE_LABEL[s]?.[1] ?? ''}</div></div>
            </label>
          );
        })}</div>
      </Field>
      <div className="note sm mt16">{t.staff.keys.form.onceA}<b>{t.staff.keys.form.onceB}</b>{t.staff.keys.form.onceC}</div>
      <ActionErrorNote error={create.error} />
    </Sheet>
  );
}

function RevokeSheet({ k, onClose }: { k: ApiKeyInfo; onClose: () => void }) {
  const revoke = useAction(apiKeyRevoke);
  return (
    <Sheet open onClose={onClose} icon={Ic.warn} title={t.staff.keys.revokeSheet.title(k.name)}
      footer={<><Btn onClick={onClose}>{t.staff.common.cancel}</Btn><Btn danger disabled={revoke.isPending} onClick={() => revoke.mutate({ keyId: k.keyId }, { onSuccess: onClose })}>{t.staff.keys.revokeSheet.ok}</Btn></>}>
      <ul className="col gap8" style={{ margin: 0, paddingLeft: 20 }}>
        <li>{t.staff.keys.revokeSheet.nowA}<code>{k.prefix}…</code>{t.staff.keys.revokeSheet.nowB}<b>{t.staff.keys.revokeSheet.nowC}</b>{t.staff.keys.revokeSheet.nowD}</li>
        <li>{t.staff.keys.revokeSheet.lastUsed(k.lastUsedAt ? when(k.lastUsedAt) : null)}</li>
        <li>{t.staff.keys.revokeSheet.final}</li>
      </ul>
      <ActionErrorNote error={revoke.error} />
    </Sheet>
  );
}

export function ApiKeysTab() {
  const { query, setQuery } = useRoute();
  const can = useCan('settings:write');
  const list = useQueryAction(apiKeyList, {}, { enabled: can });
  const why = can ? undefined : needPermission('settings:write');
  const revoking = list.data?.keys.find((k) => k.keyId === query.get('revoke') && !k.revokedAt);
  return (
    <>
      <div className="row mb16"><h1 className="h1">{t.staff.keys.title}</h1><span className="muted">{t.staff.keys.sub}</span><span className="grow" />
        <Btn pri disabled={!can} title={why} onClick={() => setQuery({ newKey: 1 })}><Ic.plus />{t.staff.keys.create}</Btn></div>
      {!can ? <div className="note warn sm">{why} {t.staff.keys.ownerOnly}</div> : (
        <QueryView q={list} empty={{ title: t.staff.keys.empty, desc: t.staff.keys.emptyDesc, when: (d) => d.keys.length === 0 }}>
          {(d) => (
            <table className="tbl"><thead><tr><th>{t.staff.keys.col.name}</th><th>{t.staff.keys.col.key}</th><th>{t.staff.keys.col.scopes}</th><th>{t.staff.keys.col.lastUsed}</th><th>{t.staff.keys.col.created}</th><th /></tr></thead>
              <tbody>{d.keys.map((k) => (
                <tr key={k.keyId} style={{ opacity: k.revokedAt ? 0.55 : 1 }}>
                  <td><b style={{ fontWeight: k.revokedAt ? 400 : 500 }}>{k.name}</b></td><td><code>{k.prefix}…</code></td>
                  <td>{k.scopes.map((s) => <Badge key={s}>{scopeLabel(s)}</Badge>)}</td>
                  <td className={k.lastUsedAt ? undefined : 'muted'}>{k.revokedAt ? '—' : k.lastUsedAt ? when(k.lastUsedAt) : t.staff.keys.neverUsed}</td>
                  <td className="muted">{day(k.createdAt)}</td>
                  <td className="r">{k.revokedAt ? <Badge>{t.staff.keys.revokedAt(day(k.revokedAt))}</Badge> : <Btn sm ghost danger onClick={() => setQuery({ revoke: k.keyId })}>{t.staff.keys.revoke}</Btn>}</td>
                </tr>
              ))}</tbody></table>
          )}
        </QueryView>
      )}
      <div className="xs subtle mt16">{t.staff.keys.footA}<b>{t.staff.keys.footB}</b>{t.staff.keys.footC}<code>X-Api-Key</code>{t.staff.keys.footD}<code>settings:write</code>{t.staff.keys.footE}</div>
      {query.get('newKey') === '1' && list.data && <CreateSheet scopes={list.data.scopes.map((s) => s.key)} onClose={() => setQuery({ newKey: null })} />}
      {revoking && <RevokeSheet k={revoking} onClose={() => setQuery({ revoke: null })} />}
    </>
  );
}
