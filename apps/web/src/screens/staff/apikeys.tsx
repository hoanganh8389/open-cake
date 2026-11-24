// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — tab Khoá API theo mockup đã duyệt (mockup-khoa-api, -tao-khoa, -hien-khoa, -thu-hoi-khoa):
//   danh sách (tiền tố, phạm vi, dùng lần cuối), tạo ⇒ hiện khoá MỘT lần (chỉ trong bộ nhớ của sheet, không lên URL), thu hồi có xác nhận. Chỉ Chủ (settings:write).
import { useState } from 'react';
import { apiKeyCreate, apiKeyList, apiKeyRevoke, type ApiKeyInfo } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useRoute } from '../../app/route.js';
import { Field } from './shared.js';

const SCOPE_LABEL: Record<string, [string, string]> = {
  'cake:read': ['Đọc danh bạ + hàng hoá', 'Xem khách, xem hàng hoá & bảng giá. Không đọc nội dung tin.'],
};
const scopeLabel = (s: string) => SCOPE_LABEL[s]?.[0] ?? s;
const day = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

function CreateSheet({ scopes, onClose }: { scopes: string[]; onClose: () => void }) {
  const [d, setD] = useState({ name: '', scopes: scopes.slice(0, 1) });
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useAction(apiKeyCreate);
  if (secret) return (
    <Sheet open onClose={onClose} icon={Ic.key} title={`Khoá "${secret.name}" đã tạo`}
      footer={<Btn pri onClick={onClose}>Tôi đã chép, đóng</Btn>}>
      <div className="row gap8">
        <input className="input" readOnly value={secret.value} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} onFocus={(e) => e.target.select()} />
        <Btn pri onClick={() => void navigator.clipboard?.writeText(secret.value).then(() => setCopied(true))}>{copied ? 'Đã chép' : 'Chép'}</Btn>
      </div>
      <div className="note warn sm mt16"><b>Chép ngay.</b> Đóng cửa sổ này là không xem lại được — mất thì thu hồi và tạo khoá mới.</div>
      <div className="xs subtle mt8">Dùng: gửi header <code>X-Api-Key: kc_…</code> tới <code>/api/v1/…</code> của Open CRM.</div>
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} icon={Ic.key} title="Tạo khoá API"
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!d.name.trim() || !d.scopes.length || create.isPending}
        onClick={() => create.mutate(d, { onSuccess: (r) => setSecret({ name: r.key.name, value: r.secret }) })}>Tạo khoá</Btn></>}>
      <Field label="Tên (để nhận ra khoá dùng ở đâu) *"><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="vd POS cửa hàng Quận 7" /></Field>
      <Field label="Được làm *">
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
      <div className="note sm mt16">Khoá hiện <b>một lần</b> ngay sau khi tạo — chép và dán vào phần mềm kia. Open CRM chỉ giữ bản băm, không xem lại được.</div>
      <ActionErrorNote error={create.error} />
    </Sheet>
  );
}

function RevokeSheet({ k, onClose }: { k: ApiKeyInfo; onClose: () => void }) {
  const revoke = useAction(apiKeyRevoke);
  return (
    <Sheet open onClose={onClose} icon={Ic.warn} title={`Thu hồi "${k.name}"?`}
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn danger disabled={revoke.isPending} onClick={() => revoke.mutate({ keyId: k.keyId }, { onSuccess: onClose })}>Thu hồi</Btn></>}>
      <ul className="col gap8" style={{ margin: 0, paddingLeft: 20 }}>
        <li>Khoá <code>{k.prefix}…</code> hết dùng được <b>ngay</b> — phần mềm đang dùng sẽ báo lỗi 401.</li>
        <li>{k.lastUsedAt ? `Dùng lần cuối ${when(k.lastUsedAt)}.` : 'Chưa dùng lần nào.'}</li>
        <li>Không bật lại được; cần thì tạo khoá mới.</li>
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
      <div className="row mb16"><h1 className="h1">Khoá API</h1><span className="muted">cho POS, Kế Toán, phần mềm khác gọi Open CRM</span><span className="grow" />
        <Btn pri disabled={!can} title={why} onClick={() => setQuery({ newKey: 1 })}><Ic.plus />Tạo khoá</Btn></div>
      {!can ? <div className="note warn sm">{why} Chỉ Chủ tạo / thu hồi khoá API.</div> : (
        <QueryView q={list} empty={{ title: 'Chưa có khoá API', desc: 'Tạo khoá khi cần cho POS hay Kế Toán đọc danh bạ / hàng hoá.', when: (d) => d.keys.length === 0 }}>
          {(d) => (
            <table className="tbl"><thead><tr><th>Tên</th><th>Khoá</th><th>Được làm</th><th>Dùng lần cuối</th><th>Tạo</th><th /></tr></thead>
              <tbody>{d.keys.map((k) => (
                <tr key={k.keyId} style={{ opacity: k.revokedAt ? 0.55 : 1 }}>
                  <td><b style={{ fontWeight: k.revokedAt ? 400 : 500 }}>{k.name}</b></td><td><code>{k.prefix}…</code></td>
                  <td>{k.scopes.map((s) => <Badge key={s}>{scopeLabel(s)}</Badge>)}</td>
                  <td className={k.lastUsedAt ? undefined : 'muted'}>{k.revokedAt ? '—' : k.lastUsedAt ? when(k.lastUsedAt) : 'chưa dùng'}</td>
                  <td className="muted">{day(k.createdAt)}</td>
                  <td className="r">{k.revokedAt ? <Badge>đã thu hồi {day(k.revokedAt)}</Badge> : <Btn sm ghost danger onClick={() => setQuery({ revoke: k.keyId })}>Thu hồi…</Btn>}</td>
                </tr>
              ))}</tbody></table>
          )}
        </QueryView>
      )}
      <div className="xs subtle mt16">Khoá chỉ đọc được dữ liệu theo phạm vi; <b>không bao giờ</b> đọc nội dung tin, gửi tin, ghép khách hay đổi nhân viên (quyền ⚠). Gửi khoá qua header <code>X-Api-Key</code>. Chỉ Chủ tạo / thu hồi (quyền <code>settings:write</code>). Mọi lần tạo / thu hồi có bằng chứng.</div>
      {query.get('newKey') === '1' && list.data && <CreateSheet scopes={list.data.scopes.map((s) => s.key)} onClose={() => setQuery({ newKey: null })} />}
      {revoking && <RevokeSheet k={revoking} onClose={() => setQuery({ revoke: null })} />}
    </>
  );
}
