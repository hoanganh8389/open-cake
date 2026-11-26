// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-2/3 — Contact 360 › Công nợ (mockup ⑥ ⑦ đã duyệt): số dư theo tài khoản đọc từ Kế Toán (Open CRM không lưu),
//   Đọc lại bỏ đệm 5 phút, Kế Toán không trả lời ⇒ giữ số lần đọc gần nhất + nhãn "Chưa đọc được"; khách chưa liên kết ⇒ sheet "Tạo khách công nợ".
import { useState } from 'react';
import { partnerCreate, partnerGet, type PartnerDebt } from '@open-cake/contracts';
import { useAction, useForceRead, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Card, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../../app/QueryView.js';
import { when, vnd } from '../../app/format.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { t } from '../../i18n/index.js';

const L = t.orders.debt;

function Balances({ d, contactId }: { d: PartnerDebt; contactId: string }) {
  const input = { contactId, refresh: false };
  const force = useForceRead(partnerGet, input, { refresh: true });
  const [err, setErr] = useState<Error | null>(null);
  const b = d.balances;
  const ago = b ? Math.max(0, Math.floor((Date.now() - new Date(b.readAt).getTime()) / 60_000)) : 0;
  return (
    <div className="col gap16">
      <Card>
        <div className="row gap16" style={{ alignItems: 'center' }}>
          <b>{L.title}</b><Badge tone="ok">{L.linked}</Badge><span className="xs subtle">{L.code(d.refCode ?? '', d.branchCode)}</span><span className="grow" />
          {b && <span className="xs subtle">{L.asOf(when(b.readAt), L.ago(ago))}</span>}
          <Btn out disabled={force.pending} onClick={() => { setErr(null); force.run().catch((e: Error) => setErr(e)); }}>{L.reread}</Btn>
        </div>
        {b && (b.accounts.length ? (
          <>
            <table className="tbl mt16">
              <thead><tr><th>{L.colAccount}</th><th>{L.colName}</th><th className="r">{L.colBalance}</th></tr></thead>
              <tbody>{b.accounts.map((a, i) => <tr key={a.accountCode}><td>{a.accountCode}</td><td>{a.accountName}</td><td className="r">{i === 0 ? <b>{vnd(a.balance)}</b> : vnd(a.balance)}</td></tr>)}</tbody>
            </table>
            <div className="row mt16" style={{ justifyContent: 'flex-end', gap: 24 }}><span className="muted">{L.owes}</span><b style={{ fontSize: 20 }}>{vnd(b.total)}</b></div>
          </>
        ) : <div className="muted mt16">{L.zero}</div>)}
        {!b && <div className="muted mt16">{L.neverRead}</div>}
      </Card>
      {d.error && <Card><div className="row gap8" style={{ alignItems: 'center' }}><Badge tone="warn">{L.stale}</Badge><span className="sm">{d.error} {L.staleNote}</span></div></Card>}
      <ActionErrorNote error={err} />
      <div className="xs subtle">{L.footnote}</div>
    </div>
  );
}

function Unlinked({ d, contactId }: { d: PartnerDebt; contactId: string }) {
  const create = useAction(partnerCreate);
  const can = useCan('cake:don-lap');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(d.proposed.name);
  const p = d.proposed;
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div className="h3">{L.unlinkedTitle}</div><div className="sm muted mt8">{L.unlinkedNote}</div>
        <Btn pri className="mt16" disabled={!can} title={can ? undefined : needPermission('cake:don-lap')} onClick={() => setOpen(true)}><Ic.plus />{L.create}</Btn>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} icon={Ic.users} title={L.sheetTitle} sub={L.sheetSub(p.name)}
        footer={<><Btn onClick={() => setOpen(false)}>{L.cancel}</Btn><Btn pri disabled={create.isPending || !name.trim()} onClick={() => create.mutate({ contactId, name: name.trim() }, { onSuccess: () => setOpen(false) })}>{L.submit}</Btn></>}>
        <dl className="kv">
          <dt>{L.fCode}</dt><dd><b>{p.code}</b> {p.verified && <Badge tone="ok">{L.fVerified}</Badge>}<div className="xs subtle mt8">{L.codeNote}</div></dd>
          <dt>{L.fName}</dt><dd><input className="input sm" style={{ width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} /></dd>
          {p.phone && <><dt>{L.fPhone}</dt><dd><b>{p.phone}</b></dd></>}
          {d.branchCode && <><dt>{L.fBranch}</dt><dd><b>{d.branchCode}</b></dd></>}
        </dl>
        <div className="note sm mt16">{L.explain}</div>
        <ActionErrorNote error={create.error} />
      </Sheet>
    </Card>
  );
}

export function ContactDebt({ contactId }: { contactId: string }) {
  const q = useQueryAction(partnerGet, { contactId, refresh: false });
  return (
    <QueryView q={q}>
      {(d) => d.source === 'none'
        ? <Card><div className="h3">{L.noKetoan}</div><div className="sm muted mt8">{L.noKetoanNote}</div></Card>
        : d.linked ? <Balances d={d} contactId={contactId} /> : <Unlinked d={d} contactId={contactId} />}
    </QueryView>
  );
}
