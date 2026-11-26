// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: khung theo ảnh duyệt — thanh tiêu đề · rail tài khoản kênh (từ cake.channel.list) + 6 mục.
// [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-6: thêm mục Hàng hoá & bảng giá (danh mục độc lập, ADR-0004).
//   Rail: mỗi avatar = một channel_account, huy hiệu theo enum kênh, số chưa đọc thật; "+" mở Kết nối kênh.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { useState, type ReactNode } from 'react';
import { channelList } from '@open-cake/contracts';
import { useActionClient, useQueryAction } from '@open-cake/action-client';
import { AccountAvatar, ChannelDot, CHANNEL_LABEL, Ic, cx } from '@open-cake/ui-kit';
import { go } from './route.js';
import { useTenantName } from './permissions.js';
import { t } from '../i18n/index.js';

const NAV = [
  { id: 'dashboard', label: t.app.shell.nav.dashboard, icon: Ic.grid },
  { id: 'inbox', label: t.app.shell.nav.inbox, icon: Ic.chat },
  { id: 'contacts', label: t.app.shell.nav.contacts, icon: Ic.contact },
  { id: 'catalog', label: t.app.shell.nav.catalog, icon: Ic.store },
  { id: 'reports', label: t.app.shell.nav.reports, icon: Ic.chart },
  { id: 'work', label: t.app.shell.nav.work, icon: Ic.brief, children: ['workflow', 'integrations', 'tasks', 'apps', 'campaigns'] },
  { id: 'settings', label: t.app.shell.nav.settings, icon: Ic.cog },
] as const;
const WORK = [
  { id: 'campaigns', label: t.app.shell.work.campaigns, icon: Ic.send, note: 'module broadcast · PHASE-011' },
  { id: 'workflow', label: t.app.shell.work.workflow, icon: Ic.branch, note: 'Twin Brain qua MCP · PHASE-013' },
  { id: 'integrations', label: t.app.shell.work.integrations, icon: Ic.layers, note: t.app.shell.work.integrationsNote },
  { id: 'tasks', label: t.app.shell.work.tasks, icon: Ic.kanban, note: 'module tasks · PHASE-012' },
  { id: 'apps', label: t.app.shell.work.apps, icon: Ic.terminal, note: 'PHASE-013' },
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
            title={t.app.shell.accountTitle(a.label, CHANNEL_LABEL[a.channel] ?? a.channel, a.status === 'connected')}
            onClick={() => go('inbox', { account: a.channelAccountId })}>
            <AccountAvatar label={a.label} />
            <ChannelDot channel={a.channel} />
            {a.unread > 0 && <span className="n">{a.unread}</span>}
          </button>
        ))}
        <button type="button" className="radd" title={t.app.shell.connectChannel} onClick={() => go('channels', { connect: 1 })}><Ic.plus style={{ width: 22, height: 22 }} /></button>
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
                <div className="xs subtle" style={{ padding: '6px 10px' }}>{t.app.shell.work.heading}</div>
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
  const tenantName = useTenantName();
  return (
    <header className="titlebar">
      <span className="brand">Open CRM</span><span className="ver">{tenantName ? `open-cake 0.1 · ${tenantName}` : 'open-cake 0.1'}</span>
      {client.kind === 'mock' && <span className="badge warn" title={t.app.shell.mockTitle}>{t.app.shell.mockBadge}</span>}
      {client.kind === 'mix' && <span className="badge warn" title={t.app.shell.mixTitle}>{t.app.shell.mixBadge}</span>}
      <span className="grow" />
      <button type="button" className="ib" title={t.app.shell.channels} onClick={() => go('channels')}><Ic.link style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title={t.app.shell.states} onClick={() => go('states')}><Ic.layers style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title={t.app.shell.notifications}><Ic.bell style={{ width: 18, height: 18 }} /></button>
      <button type="button" className="ib" title={t.app.shell.more}><Ic.dots style={{ width: 18, height: 18 }} /></button>
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
