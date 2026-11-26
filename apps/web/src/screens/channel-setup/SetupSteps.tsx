// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — Thiết lập Zalo trong 4 bước (mockup kết nối ②③, theo FourStepSetup của channel-gateway R-SETUP-4; thay sheet cũ PHASE-003):
//   ① khoá nối (Tự cài: có sẵn từ lúc cài) ② máy kết nối trả lời /health (Kiểm tra) ③ QR ⇒ máy chủ ghi số ④ người trực ⇒ nhắn thử ⇒ thắng nhỏ (SetupDone).
//   Mỗi bước Đạt / Chưa đạt theo dữ liệu máy chủ, không theo cú bấm. Hub: ③ quét ở trang Hub (Hub chưa có hợp đồng luồng QR cho Open CRM).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { channelLinkGet, channelLinkTest, channelMembersSet, channelTest, staffList } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { useCan } from '../../app/permissions.js';
import { go } from '../../app/route.js';
import { t } from '../../i18n/index.js';
import { QrStep, type Connected } from './QrStep.js';
import { FbStep } from './FbStep.js'; // [2026-11-26 10:44 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2
import { SetupDone } from './SetupDone.js';

const L = t.setup.steps;
type State = 'done' | 'now' | 'lock';

function Step({ n, state, title, badge, desc, aside, children }: { n: number; state: State; title: string; badge: ReactNode; desc: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`st ${state}`}>
      <span className="n">{state === 'done' ? <Ic.check /> : state === 'lock' ? <Ic.lock /> : n}</span>
      <div className="t">{title} {badge}</div><span className="xs">{aside}</span>
      <div className="d">{desc}</div>
      {state === 'now' && children && <div className="bd">{children}</div>}
    </div>
  );
}

export function ChannelSetup() {
  const link = useQueryAction(channelLinkGet, {});
  const check = useAction(channelLinkTest);
  const canStaff = useCan('users:write');
  const staff = useQueryAction(staffList, {}, { enabled: canStaff });
  const members = useAction(channelMembersSet);
  const test = useAction(channelTest);
  const [acc, setAcc] = useState<Connected | null>(null);
  const [ch, setCh] = useState<'zalo_personal' | 'facebook_personal'>('zalo_personal');
  const [who, setWho] = useState('');
  const [done, setDone] = useState(false);
  const d = link.data;
  // Mỗi bước tự kiểm tra (mockup ②): Tự cài đã có khoá mà chưa kiểm lần nào ⇒ kiểm máy kết nối MỘT lần khi mở màn; kết quả thật (Đạt / lỗi) là của máy chủ.
  const autoChecked = useRef(false);
  useEffect(() => {
    if (d?.mode === 'self' && d.keyPrefix && !d.lastOkAt && !autoChecked.current) { autoChecked.current = true; check.mutate({}); }
  }, [d?.mode, d?.keyPrefix, d?.lastOkAt]); // eslint-disable-line react-hooks/exhaustive-deps -- một lần theo trạng thái liên kết
  if (!d) return <div className="page"><ActionErrorNote error={link.error} /></div>;
  const self = d.mode === 'self';
  const fb = ch === 'facebook_personal';
  const ok1 = self ? !!d.keyPrefix : d.hubReady;
  const ok2 = ok1 && (self ? !!d.lastOkAt && !d.lastError : d.hubReady);
  const ok3 = ok2 && !!acc;
  const whoName = staff.data?.find((s) => s.userId === who)?.name ?? L.me;
  const st = (ok: boolean, prev: boolean): State => (ok ? 'done' : prev ? 'now' : 'lock');
  const pill = (ok: boolean, prev: boolean, now: string = L.notYet) => <Badge tone={ok ? 'ok' : prev ? 'pri' : undefined}>{ok ? L.ok : prev ? now : L.waitPrev}</Badge>;
  const finish = () => {
    if (!acc) return;
    const testIt = () => test.mutate({ channelAccountId: acc.channelAccountId }, { onSettled: () => setDone(true) });
    if (who) members.mutate({ channelAccountId: acc.channelAccountId, userIds: [who] }, { onSuccess: testIt }); else testIt();
  };
  const again = () => { setAcc(null); setWho(''); setDone(false); test.reset(); };
  if (done && acc) return <SetupDone fb={fb} acc={acc} who={whoName} self={self} hubReady={d.hubReady} test={test} onSteps={() => setDone(false)} onMore={again} />;
  const n = [ok1, ok2, ok3].filter(Boolean).length;
  return (
    <div className="page" style={{ maxWidth: 1104 }}>
      <div className="row gap16 mb24">
        <div><h1 className="h1">{fb ? L.titleFb : L.title}</h1><div className="sm muted mt8">{L.sub}</div></div><span className="grow" />
        <Badge>{self ? <Ic.terminal style={{ width: 14, height: 14 }} /> : <Ic.cloud style={{ width: 14, height: 14 }} />}{self ? t.setup.link.self : t.setup.link.hub}</Badge>
        <div className="prog"><i style={{ width: `${n * 25}%` }} /></div><b className="sm">{L.progress(n)}</b>
        <Btn ghost sm disabled={!self || check.isPending} title={L.check} onClick={() => check.mutate({})}><Ic.refresh /></Btn>
      </div>
      <div className="card stp">
        <Step n={1} state={st(ok1, true)} title={L.s1} badge={pill(ok1, true)} desc={self ? (ok1 ? L.s1Self : L.s1SelfNo) : L.s1Hub} />
        <Step n={2} state={st(ok2, ok1)} title={L.s2} badge={pill(ok2, ok1)} aside={<button type="button" className="link" onClick={() => go('settings')}>{L.other}</button>}
          desc={!self ? L.s2Hub : ok2 && d.lastOkAt ? L.s2Self(when(d.lastOkAt)) : L.s2SelfNo}>
          <Btn out sm disabled={check.isPending} onClick={() => check.mutate({})}><Ic.refresh />{L.check}</Btn><ActionErrorNote error={check.error} />
        </Step>
        <Step n={3} state={st(ok3, ok2)} title={fb ? L.s3Fb : L.s3} badge={pill(ok3, ok2)} desc={ok3 && acc ? L.s3Done(acc.label, L.me) : self ? (ch === 'facebook_personal' ? L.fbDesc : L.s3Desc) : L.s3Hub}>
          {self && (
            <>
              <div className="row gap8" style={{ marginBottom: 12 }} role="group" aria-label={L.pickChannel}>
                <Btn sm out={ch !== 'zalo_personal'} pri={ch === 'zalo_personal'} onClick={() => setCh('zalo_personal')}>{L.chZalo}</Btn>
                <Btn sm out={ch !== 'facebook_personal'} pri={ch === 'facebook_personal'} onClick={() => setCh('facebook_personal')}>{L.chFb}</Btn>
              </div>
              {ch === 'zalo_personal' ? <QrStep onDone={setAcc} /> : <FbStep onDone={setAcc} />}
            </>
          )}
        </Step>
        <Step n={4} state={ok3 ? 'now' : 'lock'} title={L.s4} badge={pill(false, ok3, L.picking)} desc={L.s4Desc}>
          <dl className="kv" style={{ maxWidth: 560 }}>
            <dt>{L.s4Who}</dt>
            <dd><select className="input sm" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">{L.s4Me}</option>{(staff.data ?? []).filter((s) => s.active).map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}
            </select></dd>
          </dl>
          <Btn pri className="mt16" disabled={members.isPending || test.isPending} onClick={finish}><Ic.check />{L.finish}</Btn>
          <ActionErrorNote error={members.error} />
        </Step>
      </div>
      <div className="xs subtle mt16">{L.axis}</div>
    </div>
  );
}
