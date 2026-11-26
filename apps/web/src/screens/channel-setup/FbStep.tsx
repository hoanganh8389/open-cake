// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:44 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2 — bước ③ cho Facebook cá nhân (Tự cài): đặt tên ⇒ connect_start (tạo nick trên máy kết nối) ⇒ email + mật khẩu ⇒ fb_login start
//   ⇒ có thể cần mã (ô do Facebook yêu cầu) / duyệt trên điện thoại ⇒ success ⇒ connect_finish (máy chủ ghi số). Mật khẩu / mã chỉ nằm trong state của ô nhập và bị xoá ngay khi gửi;
//   không vào localStorage, không vào URL. Checkpoint ⇒ nói rõ, không thử lại tự động.
import { useState } from 'react';
import { channelConnectFinish, channelConnectStart, channelFbLogin, type FbLoginView } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Badge, Btn, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { t } from '../../i18n/index.js';
import type { Connected } from './QrStep.js';

const L = t.setup.steps;

export function FbStep({ onDone }: { onDone: (a: Connected) => void }) {
  const [label, setLabel] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<FbLoginView | null>(null);
  const start = useAction(channelConnectStart);
  const login = useAction(channelFbLogin);
  const finish = useAction(channelConnectFinish);
  const flowId = start.data?.flowId ?? '';
  const busy = start.isPending || login.isPending || finish.isPending;
  const err = start.error ?? login.error ?? finish.error;

  const apply = (v: FbLoginView) => {
    setView(v);
    setPw(''); setAnswers({}); // bí mật không ở lại trong bộ nhớ của màn
    if (v.status === 'success') finish.mutate({ flowId }, { onSuccess: onDone });
  };
  const run = (body: Parameters<typeof login.mutate>[0]) => login.mutate(body, { onSuccess: apply });
  const go = () => {
    const begin = (flow: string) => run({ flowId: flow, action: 'start', identifier: id.trim(), password: pw });
    if (flowId) return begin(flowId);
    start.mutate({ channel: 'facebook_personal', label: label.trim() }, { onSuccess: (s) => begin(s.flowId) });
  };
  const st = view?.status ?? 'idle';
  const off = (err as { message?: string } | null)?.message?.includes('FB_PERSONAL_ENABLED');
  return (
    <div className="col" style={{ gap: 12, maxWidth: 560 }}>
      <div className="note warn">{L.fbWarn}</div>
      {view && <div><Badge tone={st === 'success' ? 'ok' : st === 'checkpoint' || st === 'error' ? 'err' : 'pri'}>{L.fbSt[st]}</Badge></div>}
      {view?.message && <div className="sm muted">{view.message}</div>}
      {(!view || st === 'error' || st === 'checkpoint') && (
        <>
          <label className="sm" htmlFor="fb-label"><b>{L.fbLabel}</b></label>
          <input id="fb-label" className="input" value={label} placeholder={L.fbLabelPh} disabled={!!flowId} onChange={(e) => setLabel(e.target.value)} />
          <label className="sm" htmlFor="fb-id"><b>{L.fbId}</b></label>
          <input id="fb-id" className="input" autoComplete="off" value={id} onChange={(e) => setId(e.target.value)} />
          <label className="sm" htmlFor="fb-pw"><b>{L.fbPw}</b></label>
          <input id="fb-pw" className="input" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="row gap8"><Btn pri disabled={busy || !label.trim() || id.trim().length < 3 || !pw} onClick={go}><Ic.key />{st === 'idle' || !view ? L.fbLogin : L.fbRetry}</Btn></div>
        </>
      )}
      {st === 'need_code' && (
        <>
          {(view?.fields ?? []).map((f) => (
            <div key={f.id} className="col" style={{ gap: 6 }}>
              <label className="sm" htmlFor={`fb-f-${f.id}`}><b>{f.name ?? f.id}</b></label>
              <input id={`fb-f-${f.id}`} className="input" autoComplete="off" value={answers[f.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
            </div>
          ))}
          <div className="row gap8"><Btn pri disabled={busy || !Object.values(answers).some(Boolean)} onClick={() => run({ flowId, action: 'submit', answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v)) })}><Ic.check />{L.fbSubmit}</Btn></div>
        </>
      )}
      {st === 'waiting_approval' && <div className="row gap8"><Btn pri disabled={busy} onClick={() => run({ flowId, action: 'wait' })}><Ic.check />{L.fbApproved}</Btn></div>}
      {off && <div className="note warn">{L.fbOff}</div>}
      <ActionErrorNote error={err} />
    </div>
  );
}
