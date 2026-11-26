// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-7: Kênh (màn mới) — tài khoản kênh của doanh nghiệp (cake.channel.list) + sheet Kết nối kênh 4 bước
//   (architecture/60-UI §3): ① khoá biz-… ② chọn kênh ③ cake.channel.connect_start ④ thắng nhỏ cake.channel.test — "Đã kết nối" chỉ khi có bằng chứng hai chiều.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { channelList, channelTest } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { AccountAvatar, Badge, Btn, Card, ChannelBadge, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { t } from '../i18n/index.js';
import { ChannelSetup } from './channel-setup/SetupSteps.js'; // [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — 4 bước thay sheet cũ

const L = t.catalog.channels;
const S = L.status;
const STATUS: Record<string, [string, string]> = {
  connected: ['ok', S.connected], connecting: ['warn', S.connecting], auth_required: ['warn', S.auth_required],
  checkpoint: ['err', S.checkpoint], degraded: ['warn', S.degraded], disconnected: ['', S.disconnected],
};
export function Channels() {
  const { query, setQuery } = useRoute();
  const list = useQueryAction(channelList, {});
  const test = useAction(channelTest);
  if (query.get('connect') === '1') return <ChannelSetup />;
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
    </div>
  );
}
