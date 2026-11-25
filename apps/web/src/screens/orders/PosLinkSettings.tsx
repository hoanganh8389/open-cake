// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-8 — Cài đặt › Kết nối cửa hàng (mockup-ket-noi đã duyệt): địa chỉ, khoá opb_… (dán vào, máy chủ chỉ lưu mã hoá,
//   màn chỉ hiện tiền tố), bí mật ký, cửa hàng xuất, địa chỉ nhận trạng thái để dán sang Open POS; khoá khi chưa nối Kế Toán (Q-ORD-6). Chỉ chủ (settings:write).
import { useState } from 'react';
import { posLinkGet, posLinkSet, posLinkTest } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { useCan } from '../../app/permissions.js';
import { t } from '../../i18n/index.js';

const L = t.orders.link;

export function PosLinkSettings() {
  const can = useCan('settings:write');
  const q = useQueryAction(posLinkGet, {}, { enabled: can });
  const set = useAction(posLinkSet);
  const test = useAction(posLinkTest);
  const [f, setF] = useState<{ baseUrl?: string; branchCode?: string; key: string; secret: string }>({ key: '', secret: '' });
  const d = q.data;
  if (!can || !d) return null;
  const locked = !d.ketoanLinked;
  const v = { baseUrl: f.baseUrl ?? d.baseUrl ?? '', branchCode: f.branchCode ?? d.branchCode ?? '' };
  const save = () => set.mutate({ ...v, ...(f.key ? { key: f.key } : {}), ...(f.secret ? { secret: f.secret } : {}) }, { onSuccess: () => setF({ key: '', secret: '' }) });
  const busy = set.isPending || test.isPending;
  return (
    <section className="mb24" style={{ maxWidth: 880 }}>
      <h3 className="h3 mb16">{L.title}</h3>
      {locked && <div className="note warn mb16">{L.needKetoan}</div>}
      <dl className="kv" style={locked ? { opacity: 0.6 } : undefined}>
        <dt>{L.status}</dt>
        <dd>{d.lastError ? <Badge tone="err">{L.err(d.lastError)}</Badge> : d.keyPrefix ? <Badge tone="ok" dot>{L.ok}</Badge> : <Badge>{L.notYet}</Badge>}
          {d.lastOkAt && <span className="xs subtle"> {L.testedAt(when(d.lastOkAt))}</span>}</dd>
        <dt>{L.baseUrl}</dt><dd><input className="input sm" style={{ width: '100%' }} disabled={locked} value={v.baseUrl} placeholder="https://" onChange={(e) => setF({ ...f, baseUrl: e.target.value })} /></dd>
        <dt>{L.key}</dt><dd><input className="input sm" style={{ width: '100%' }} disabled={locked} type="password" autoComplete="off" value={f.key} placeholder={d.keyPrefix ? `${d.keyPrefix}… — ${L.keyKeep}` : 'opb_…'} onChange={(e) => setF({ ...f, key: e.target.value.trim() })} />
          <div className="xs subtle mt8">{L.keyHint}</div></dd>
        <dt>{L.secret}</dt><dd><input className="input sm" style={{ width: '100%' }} disabled={locked} type="password" autoComplete="off" value={f.secret} placeholder={d.hasSecret ? `•••••••• — ${L.keyKeep}` : ''} onChange={(e) => setF({ ...f, secret: e.target.value })} /></dd>
        <dt>{L.branch}</dt><dd><input className="input sm" style={{ width: 160 }} disabled={locked} value={v.branchCode} onChange={(e) => setF({ ...f, branchCode: e.target.value.toUpperCase() })} /></dd>
        <dt>{L.eventsAt}</dt><dd><code>{`${location.origin}${d.eventsPath}`}</code> <span className="xs subtle">{L.eventsHint}</span></dd>
      </dl>
      <div className="row gap16 mt16">
        <Btn out disabled={locked || busy || !d.keyPrefix} onClick={() => test.mutate({})}>{L.test}</Btn>
        <Btn pri disabled={locked || busy || !v.baseUrl || !v.branchCode} onClick={save}>{L.save}</Btn>
      </div>
      <ActionErrorNote error={set.error ?? test.error} />
    </section>
  );
}
