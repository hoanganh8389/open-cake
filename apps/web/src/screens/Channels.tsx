// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-7: Kênh (màn mới) — tài khoản kênh của doanh nghiệp (cake.channel.list) + sheet Kết nối kênh 4 bước
//   (architecture/60-UI §3): ① khoá biz-… ② chọn kênh ③ cake.channel.connect_start ④ thắng nhỏ cake.channel.test — "Đã kết nối" chỉ khi có bằng chứng hai chiều.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { useState } from 'react';
import { ACCOUNT_CHANNELS, channelConnectStart, channelList, channelTest, type AccountChannel } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { AccountAvatar, Badge, Btn, Card, ChannelBadge, CHANNEL_LABEL, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { t } from '../i18n/index.js';

const L = t.catalog.channels;
const S = L.status;
const STATUS: Record<string, [string, string]> = {
  connected: ['ok', S.connected], connecting: ['warn', S.connecting], auth_required: ['warn', S.auth_required],
  checkpoint: ['err', S.checkpoint], degraded: ['warn', S.degraded], disconnected: ['', S.disconnected],
};
const NOTE: Record<AccountChannel, string> = L.note;

function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<AccountChannel>('zalo_personal');
  const start = useAction(channelConnectStart);
  const close = () => { setStep(1); start.reset(); onClose(); };
  return (
    <Sheet open={open} onClose={close} icon={Ic.link} title={L.connect} sub={L.sheet.step(step)}
      footer={<>
        <Btn onClick={close}>{L.sheet.close}</Btn>
        {step === 1 && <Btn pri onClick={() => setStep(2)}>{L.sheet.next}</Btn>}
        {step === 2 && <Btn pri onClick={() => start.mutate({ channel, label: CHANNEL_LABEL[channel] ?? channel }, { onSuccess: () => setStep(3) })} disabled={start.isPending}>{L.sheet.start}</Btn>}
        {step === 3 && <Btn pri onClick={() => setStep(4)}>{L.sheet.doneOnDevice}</Btn>}
      </>}>
      {step === 1 && <div className="note ok">{L.sheet.step1a}<code>biz-…</code>{L.sheet.step1b}</div>}
      {step === 2 && (
        <div className="col gap8">{ACCOUNT_CHANNELS.map((c) => (
          <label key={c} className="card pad row gap16" style={{ cursor: 'pointer', borderColor: channel === c ? 'var(--primary)' : undefined }}>
            <input type="radio" name="ch" checked={channel === c} onChange={() => setChannel(c)} />
            <div className="grow"><b>{CHANNEL_LABEL[c]}</b><div className="muted sm">{NOTE[c]}</div></div>
          </label>
        ))}<ActionErrorNote error={start.error} /></div>
      )}
      {step === 3 && start.data && (
        <div className="row gap24" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 200, height: 200, borderRadius: 12, background: 'var(--muted)', display: 'grid', placeItems: 'center' }}>{start.data.nextStep === 'qr' ? <Ic.qr style={{ width: 120, height: 120 }} /> : <Ic.globe style={{ width: 96, height: 96 }} />}</div>
          <div className="muted">{L.sheet.nextStepLabel}<b>{L.sheet.nextStep[start.data.nextStep]}</b>{L.sheet.nextStepTail}</div>
        </div>
      )}
      {step === 4 && <div className="note">{L.sheet.step4a}<b>{L.sheet.step4Manual}</b>{L.sheet.step4b}<b>{L.sheet.step4Test}</b>{L.sheet.step4c}</div>}
    </Sheet>
  );
}

export function Channels() {
  const { query, setQuery } = useRoute();
  const list = useQueryAction(channelList, {});
  const test = useAction(channelTest);
  return (
    <div className="page">
      <div className="row mb24"><h1 className="h1">{L.title}</h1><span className="muted">{L.sub}</span><span className="grow" />
        <Btn pri onClick={() => setQuery({ connect: 1 })}><Ic.plus />{L.connect}</Btn></div>
      <ActionErrorNote error={test.error} />
      <QueryView q={list} empty={{ title: L.emptyTitle, desc: L.emptyDesc, action: <Btn pri onClick={() => setQuery({ connect: 1 })}>{L.connect}</Btn> }}>
        {(xs) => (
          <div className="grid g3">{xs.map((a) => {
            const [tone, label] = STATUS[a.status] ?? ['', a.status];
            return (
              <Card key={a.channelAccountId}>
                <div className="row gap16" style={{ alignItems: 'flex-start' }}>
                  <AccountAvatar label={a.label} size={48} />
                  <div className="grow"><div className="h3">{a.label}</div><div className="row gap8 mt8"><ChannelBadge channel={a.channel} /><Badge tone={tone}>{label}</Badge></div>
                    <div className="xs subtle mt8">{a.testedAt ? L.testedAt(when(a.testedAt)) : L.notTested}</div></div>
                </div>
                <div className="row mt16">
                  <Btn pri block onClick={() => go('inbox', { account: a.channelAccountId })}>{L.openInbox}</Btn>
                  <Btn out block disabled={test.isPending} onClick={() => test.mutate({ channelAccountId: a.channelAccountId })}>{L.test}</Btn>
                </div>
              </Card>
            );
          })}</div>
        )}
      </QueryView>
      <ConnectSheet open={query.get('connect') === '1'} onClose={() => setQuery({ connect: null })} />
    </div>
  );
}
