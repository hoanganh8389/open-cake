// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-8: Tổng quan tài khoản theo ảnh duyệt (dashboard.png) trên cake.channel.list.
//   Ngắt kết nối chưa có action ở hợp đồng ⇒ không hiện nút giả; tài khoản chưa nối ⇒ "Kết nối lại" mở sheet Kết nối kênh.
import { channelList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Avatar, Badge, Btn, Ic, CHANNEL_LABEL, channelFamily } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { go } from '../app/route.js';

export function Dashboard() {
  const list = useQueryAction(channelList, {});
  return (
    <div className="page">
      <div className="row mb16">
        <h1 className="h1">Tổng quan</h1><span className="muted">{list.data?.length ?? 0} tài khoản kênh</span>
        <span className="grow" />
        <Btn pri onClick={() => go('channels', { connect: 1 })}><Ic.userPlus />Thêm tài khoản</Btn>
      </div>
      <div className="row mb16"><h3 className="h3">Tài khoản</h3><Badge>{list.data?.length ?? 0}</Badge></div>
      <QueryView q={list} empty={{ title: 'Chưa có tài khoản kênh', action: <Btn pri onClick={() => go('channels', { connect: 1 })}>Kết nối kênh</Btn> }}>
        {(xs) => (
          <div className="grid g3">{xs.map((a) => (
            <div key={a.channelAccountId} className="card pad">
              <div className="row gap16" style={{ alignItems: 'flex-start' }}>
                <Avatar name={a.label} size="lg" online={a.status === 'connected'} channel={channelFamily(a.channel) === 'F' ? 'f' : 'Z'} />
                <div className="grow">
                  <div className="h3">{a.label}</div>
                  <div className="muted sm">{CHANNEL_LABEL[a.channel]} · {a.externalAccountId}</div>
                  {a.unread > 0 && <Badge className="mt8" tone="pri">{a.unread} chưa đọc</Badge>}
                </div>
              </div>
              <div className="row mt16">
                <Btn pri block onClick={() => go('inbox', { account: a.channelAccountId })}>Chat</Btn>
                {a.status === 'connected' ? <Btn block onClick={() => go('channels')}>Chi tiết kênh</Btn> : <Btn out block onClick={() => go('channels', { connect: 1 })}>Kết nối lại</Btn>}
              </div>
            </div>
          ))}</div>
        )}
      </QueryView>
    </div>
  );
}
