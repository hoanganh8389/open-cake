// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: khung theo ảnh duyệt — thanh tiêu đề · rail tài khoản kênh (từ cake.channel.list) + 6 mục.
// [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-6: thêm mục Hàng hoá & bảng giá (danh mục độc lập, ADR-0004).
//   Rail: mỗi avatar = một channel_account, huy hiệu theo enum kênh, số chưa đọc thật; "+" mở Kết nối kênh.
import { useState, type ReactNode } from 'react';
import { channelList } from '@open-cake/contracts';
import { useActionClient, useQueryAction } from '@open-cake/action-client';
import { AccountAvatar, ChannelDot, CHANNEL_LABEL, Ic, cx } from '@open-cake/ui-kit';
import { go } from './route.js';

const NAV = [
  { id: 'dashboard', label: 'Tổng quan', icon: Ic.grid },
  { id: 'inbox', label: 'Hộp thư', icon: Ic.chat },
  { id: 'contacts', label: 'Danh bạ', icon: Ic.contact },
  { id: 'catalog', label: 'Hàng hoá & bảng giá', icon: Ic.store },
  { id: 'reports', label: 'Báo cáo', icon: Ic.chart },
  { id: 'work', label: 'Công việc', icon: Ic.brief, children: ['workflow', 'integrations', 'tasks', 'apps', 'campaigns'] },
  { id: 'settings', label: 'Cài đặt', icon: Ic.cog },
] as const;
const WORK = [
  { id: 'campaigns', label: 'Chiến dịch gửi hàng loạt', icon: Ic.send, note: 'module broadcast · PHASE-011' },
  { id: 'workflow', label: 'Kịch bản tự động', icon: Ic.branch, note: 'Twin Brain qua MCP · PHASE-013' },
  { id: 'integrations', label: 'Kết nối mở rộng', icon: Ic.layers, note: 'Kế Toán · POS · PHASE-010' },
  { id: 'tasks', label: 'Công việc nội bộ', icon: Ic.kanban, note: 'module tasks · PHASE-012' },
  { id: 'apps', label: 'Ứng dụng, API & Webhook', icon: Ic.terminal, note: 'PHASE-013' },
];

function Rail({ screen, account }: { screen: string; account: string | null }) {
  const [launcher, setLauncher] = useState(false);
  const accounts = useQueryAction(channelList, {});
  const activeTop = NAV.find((n) => n.id === screen || ('children' in n && (n.children as readonly string[]).includes(screen)))?.id ?? (screen === 'channels' ? 'dashboard' : screen === 'records' || screen === 'staff' ? 'settings' : undefined);
  return (
    <aside className="rail">
      <div className="accounts">
        {(accounts.data ?? []).map((a) => (
          <button type="button" key={a.channelAccountId} className={cx('racc', account === a.channelAccountId && 'on', a.status !== 'connected' && 'off')}
            title={`${a.label} · ${CHANNEL_LABEL[a.channel]} · ${a.status === 'connected' ? 'đang kết nối' : 'chưa kết nối'}`}
            onClick={() => go('inbox', { account: a.channelAccountId })}>
            <AccountAvatar label={a.label} />
            <ChannelDot channel={a.channel} />
            {a.unread > 0 && <span className="n">{a.unread}</span>}
          </button>
        ))}
        <button type="button" className="radd" title="Kết nối kênh" onClick={() => go('channels', { connect: 1 })}><Ic.plus style={{ width: 22, height: 22 }} /></button>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <div key={n.id} style={{ position: 'relative' }}>
            <button type="button" className={cx('nb2', activeTop === n.id && 'on')} title={n.label} aria-label={n.label}
              onClick={() => ('children' in n ? setLauncher(!launcher) : (setLauncher(false), go(n.id)))}>
              <n.icon />
            </button>
            {'children' in n && launcher && (
              <div className="card" style={{ position: 'absolute', left: 76, bottom: 0, width: 320, padding: 8, zIndex: 40, boxShadow: 'var(--shadow)' }}>
                <div className="xs subtle" style={{ padding: '6px 10px' }}>CÔNG VIỆC</div>
                {WORK.map((w) => (
                  <button type="button" key={w.id} className="pitem" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setLauncher(false); go(w.id); }}>
                    <div className="ic"><w.icon /></div><div><b>{w.label}</b><span>{w.note}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TitleBar() {
  const client = useActionClient();
  return (
    <header className="titlebar">
      <span className="brand">Open CRM</span><span className="ver">open-cake 0.1 · Shop Hoa Mai</span>
      {client.kind === 'mock' && <span className="badge warn" title="Dữ liệu giả lập theo hợp đồng — chưa nối máy chủ (PHASE-007)">Bản giả lập</span>}
      {client.kind === 'mix' && <span className="badge warn" title="Hàng hoá chạy máy chủ thật; màn khác còn giả lập (PHASE-007)">Một phần giả lập</span>}
      <span className="grow" />
      <button type="button" className="ib" title="Kênh" onClick={() => go('channels')}><Ic.link style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title="Bốn trạng thái" onClick={() => go('states')}><Ic.layers style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title="Thông báo"><Ic.bell style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title="Thêm"><Ic.dots style={{ width: 18, height: 18 }} /></button>
    </header>
  );
}

export function Shell({ screen, account, children }: { screen: string; account: string | null; children: ReactNode }) {
  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Rail screen={screen} account={account} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
