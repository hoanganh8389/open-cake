// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — khung app Open CRM: thanh tiêu đề · rail tài khoản + menu · trang theo #/đường-dẫn.
// Open CRM là một SPA riêng ở /crm/ (hoặc wp-admin › Open CRM). Không nằm trong /twin/, không TwinShell, không iframe (D001-2).
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import { Ic, cx } from './ui.jsx';
import { AccountAvatar, ChannelDot } from './deplao.jsx';
import './chat.css';
import { accounts } from './data.js';
import Dashboard from './screens/Dashboard.jsx';
import Contacts from './screens/Contacts.jsx';
import Inbox from './screens/Inbox.jsx';
import Campaigns from './screens/Campaigns.jsx';
import Workflow from './screens/Workflow.jsx';
import Integrations from './screens/Integrations.jsx';
import Reports from './screens/Reports.jsx';
import Settings from './screens/Settings.jsx';
import Tasks from './screens/Tasks.jsx';
import Apps from './screens/Apps.jsx';
import States from './screens/States.jsx';

/* Menu rail (dưới): 6 mục như Deplao. "Công việc" (cặp táp) mở một launcher nhỏ: Kịch bản · Tích hợp · Công việc nội bộ · Ứng dụng. */
const NAV = [
	{ id: 'dashboard', label: 'Tổng quan', icon: Ic.grid },
	{ id: 'inbox', label: 'Hộp thư', icon: Ic.chat },
	{ id: 'contacts', label: 'Danh bạ', icon: Ic.contact },
	{ id: 'reports', label: 'Báo cáo', icon: Ic.chart },
	{ id: 'work', label: 'Công việc', icon: Ic.brief, children: ['workflow', 'integrations', 'tasks', 'apps'] },
	{ id: 'settings', label: 'Cài đặt', icon: Ic.cog },
];
const SCREENS = {
	dashboard: Dashboard, inbox: Inbox, contacts: Contacts, campaigns: Campaigns, reports: Reports,
	workflow: Workflow, integrations: Integrations, tasks: Tasks, apps: Apps, settings: Settings, states: States,
};
const WORK = [
	{ id: 'workflow', label: 'Kịch bản tự động', icon: Ic.branch, note: 'bizcity-automation' },
	{ id: 'integrations', label: 'Kết nối mở rộng', icon: Ic.layers, note: 'POS · thanh toán · vận chuyển · AI' },
	{ id: 'tasks', label: 'Công việc nội bộ', icon: Ic.kanban, note: 'module tasks' },
	{ id: 'apps', label: 'Ứng dụng, API & Webhook', icon: Ic.terminal, note: 'add-on · REST · webhook' },
];

function useHash() {
	const read = () => (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
	const [parts, set] = useState(read);
	useEffect(() => { const h = () => set(read()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
	return parts;
}
export const go = (path) => { location.hash = '/' + path; };

function Rail({ screen, activeAccount, setActiveAccount }) {
	const [launcher, setLauncher] = useState(false);
	const activeTop = NAV.find((n) => n.id === screen || (n.children || []).includes(screen))?.id;
	return (
		<aside className="rail">
			{/* [2026-11-23 08:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 v0.2 — rail sát Deplao: nút ☰ ở Hộp thư, avatar 56 có huy hiệu kênh, mục chỉ biểu tượng (nhãn ở title). */}
			{screen === 'inbox' && <button className="burger" title="Thu gọn danh sách"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
			<div className="accounts">
				{accounts.map((a) => (
					<button key={a.id} className={cx('racc', activeAccount === a.id && 'on', !a.on && 'off')} title={`${a.name} · ${a.uid}`} onClick={() => setActiveAccount(a.id)}>
						<AccountAvatar a={a} />
						<ChannelDot ch={a.ch} />
						{a.unread > 0 && <span className="n">{a.unread}</span>}
						{a.folder && <span className="fold" title="Có thư mục gộp" />}
					</button>
				))}
				<button className="radd" title="Thêm tài khoản Zalo (QR)"><Ic.plus style={{ width: 22, height: 22 }} /></button>
			</div>
			<nav className="nav">
				{NAV.map((n) => (
					<div key={n.id} style={{ position: 'relative' }}>
						<button className={cx('nb2', activeTop === n.id && 'on')} title={n.label} aria-label={n.label} onClick={() => (n.children ? setLauncher(!launcher) : (setLauncher(false), go(n.id)))}>
							<n.icon />
						</button>
						{n.children && launcher && (
							<div className="card" style={{ position: 'absolute', left: 76, bottom: 0, width: 300, padding: 8, zIndex: 40, boxShadow: 'var(--shadow)' }}>
								<div className="xs subtle" style={{ padding: '6px 10px' }}>CÔNG VIỆC</div>
								{WORK.map((w) => (
									<button key={w.id} className="pitem" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setLauncher(false); go(w.id); }}>
										<div className="ic"><w.icon /></div>
										<div><b>{w.label}</b><span>{w.note}</span></div>
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
	return (
		<header className="titlebar">
			<span className="brand">Open CRM</span><span className="ver">v1.0 · Shop Hoa Mai</span>
			<span className="grow" />
			<button className="ib" title="Đồng bộ tin nhắn từ điện thoại" onClick={() => go('inbox/sync')}><Ic.phone style={{ width: 18, height: 18 }} /></button>
			<button className="ib" title="Mở nhanh"><Ic.grid style={{ width: 18, height: 18 }} /></button>
			<button className="ib" title="Thông báo"><Ic.bell style={{ width: 18, height: 18 }} /><span className="n">3</span></button>
			<button className="ib" title="Giao diện tối (bản sau)"><Ic.moon style={{ width: 18, height: 18 }} /></button>
			<button className="ib" title="Thêm"><Ic.dots style={{ width: 18, height: 18 }} /></button>
		</header>
	);
}

function MockToolbar({ screen }) {
	const [accent, setAccent] = useState(() => document.documentElement.dataset.accent || 'blue');
	useEffect(() => { document.documentElement.dataset.accent = accent; }, [accent]);
	return (
		<div className="mock-toolbar" title="Chỉ có trong bản mẫu">
			<span>Màu nhấn</span>
			{['blue', 'red', 'ink'].map((a) => <button key={a} className={cx(accent === a && 'on')} onClick={() => setAccent(a)}>{{ blue: 'Xanh', red: 'Đỏ', ink: 'Đen' }[a]}</button>)}
			<span>·</span>
			<button className={cx(screen === 'states' && 'on')} onClick={() => go('states')}>4 trạng thái</button>
			<button className={cx(screen === 'campaigns' && 'on')} onClick={() => go('campaigns')}>Chiến dịch</button>
		</div>
	);
}

function App() {
	const [screen, ...rest] = useHash();
	const [activeAccount, setActiveAccount] = useState('a1');
	const Screen = SCREENS[screen] || Dashboard;
	return (
		<div className="app">
			<TitleBar />
			<div className="body">
				<Rail screen={screen} activeAccount={activeAccount} setActiveAccount={setActiveAccount} />
				<main className="main"><Screen sub={rest} account={accounts.find((a) => a.id === activeAccount)} /></main>
			</div>
			<MockToolbar screen={screen} />
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);
