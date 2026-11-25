// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-8: Tổng quan tài khoản theo ảnh duyệt (dashboard.png) trên cake.channel.list.
//   Ngắt kết nối chưa có action ở hợp đồng ⇒ không hiện nút giả; tài khoản chưa nối ⇒ "Kết nối lại" mở sheet Kết nối kênh.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { channelList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Avatar, Badge, Btn, Ic, CHANNEL_LABEL, Search, channelFamily } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { go, useRoute } from '../app/route.js';
import { t } from '../i18n/index.js';

export function Dashboard() {
  const list = useQueryAction(channelList, {});
  // [2026-11-25 12:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 S007-8 — ô tìm tài khoản như ảnh chuẩn dashboard.png (lọc tại chỗ theo tên / mã; từ khoá trên URL, R-WEB-2).
  const { query, setQuery } = useRoute();
  const q = (query.get('q') ?? '').toLowerCase();
  const match = (a: { label: string; externalAccountId: string }) => !q || a.label.toLowerCase().includes(q) || a.externalAccountId.toLowerCase().includes(q);
  return (
    <div className="page">
      <div className="row mb16">
        <h1 className="h1">{t.app.dashboard.title}</h1><span className="muted">{t.app.dashboard.accounts(list.data?.length ?? 0)}</span>
        <span className="grow" />
        <Btn pri onClick={() => go('channels', { connect: 1 })}><Ic.userPlus />{t.app.dashboard.addAccount}</Btn>
      </div>
      <div className="row mb16"><span className="grow" /><Search sm style={{ width: 360 }} placeholder={t.app.dashboard.search} value={query.get('q') ?? ''} onChange={(v) => setQuery({ q: v || null })} /></div>
      <div className="row mb16"><h3 className="h3">{t.app.dashboard.accountsHeading}</h3><Badge>{list.data?.length ?? 0}</Badge></div>
      <QueryView q={list} empty={{ title: t.app.dashboard.empty, action: <Btn pri onClick={() => go('channels', { connect: 1 })}>{t.app.shell.connectChannel}</Btn> }}>
        {(all) => { const xs = all.filter(match); return xs.length === 0 ? <div className="muted">{t.app.dashboard.noMatch}</div> : (
          <div className="grid g3">{xs.map((a) => (
            <div key={a.channelAccountId} className="card pad">
              <div className="row gap16" style={{ alignItems: 'flex-start' }}>
                <Avatar name={a.label} size="lg" online={a.status === 'connected'} channel={channelFamily(a.channel) === 'F' ? 'f' : 'Z'} />
                <div className="grow">
                  <div className="h3">{a.label}</div>
                  <div className="muted sm">{CHANNEL_LABEL[a.channel]} · {a.externalAccountId}</div>
                  {a.unread > 0 && <Badge className="mt8" tone="pri">{t.app.dashboard.unread(a.unread)}</Badge>}
                </div>
              </div>
              <div className="row mt16">
                <Btn pri block onClick={() => go('inbox', { account: a.channelAccountId })}>Chat</Btn>
                {a.status === 'connected' ? <Btn block onClick={() => go('channels')}>{t.app.dashboard.details}</Btn> : <Btn out block onClick={() => go('channels', { connect: 1 })}>{t.app.dashboard.reconnect}</Btn>}
              </div>
            </div>
          ))}</div>
        ); }}
      </QueryView>
    </div>
  );
}
