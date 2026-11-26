// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — thắng nhỏ "Zalo đã sẵn sàng" (mockup kết nối ③): kết quả nhắn thử từ cake.channel.test — "Đã thử hai chiều" CHỈ khi
//   máy chủ trả twoWay (bằng chứng tin đi lẫn tin về), không hiện sẵn; nút Mở hộp thư / Thêm số / Xem 4 bước; Tự cài ⇒ gợi ý Hub (không chặn).
import { channelLinkSet } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Badge, Btn, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { go } from '../../app/route.js';
import { t } from '../../i18n/index.js';
import { HubOffer } from './HubOffer.js';
import type { Connected } from './QrStep.js';

const L = t.setup.done;
type TestState = { data?: { testedAt: string; twoWay: boolean }; error: Error | null; isPending: boolean; mutate: (i: { channelAccountId: string }) => void };

export function SetupDone({ acc, who, self, hubReady, test, onSteps, onMore }: { acc: Connected; who: string; self: boolean; hubReady: boolean; test: TestState; onSteps: () => void; onMore: () => void }) {
  const toHub = useAction(channelLinkSet);
  const r = test.data;
  return (
    <div className="page" style={{ maxWidth: 1104 }}>
      <div className="card pad">
        <div className="row gap16">
          <span className="icon-circle" style={{ width: 44, height: 44, background: 'var(--success-soft)', color: 'var(--success)' }}><Ic.check /></span>
          <div className="grow"><div className="h3">{L.title}</div><div className="sm muted mt8">{L.who(acc.label, who)} · <Badge>{self ? t.setup.link.self : t.setup.link.hub}</Badge></div></div>
          <Btn out onClick={onSteps}>{L.viewSteps}</Btn>
          <Btn out onClick={onMore}><Ic.plus />{L.addMore}</Btn>
          <Btn pri onClick={() => go('inbox', { account: acc.channelAccountId })}><Ic.chat />{L.openInbox}</Btn>
        </div>
        <div className="prog mt16" style={{ width: '100%' }}><i style={{ width: '100%' }} /></div>
      </div>
      <div className="card pad mt16">
        <div className="row gap8"><b>{L.test}</b>
          {r ? <Badge tone={r.twoWay ? 'ok' : 'warn'}>{r.twoWay ? <><Ic.check style={{ width: 14, height: 14 }} />{L.twoWay}</> : L.oneWay}</Badge> : <Badge>{L.oneWay}</Badge>}
          {r && <span className="xs subtle">{L.at(when(r.testedAt))}</span>}<span className="grow" />
          <Btn ghost sm disabled={test.isPending} onClick={() => test.mutate({ channelAccountId: acc.channelAccountId })}><Ic.send />{L.retest}</Btn></div>
        <ActionErrorNote error={test.error} />
        <div className="xs subtle mt16">{L.note}</div>
      </div>
      {self && <HubOffer variant="done" hubReady={hubReady} onGo={() => toHub.mutate({ mode: 'hub', rotate: false }, { onSuccess: () => go('settings') })} />}
    </div>
  );
}
