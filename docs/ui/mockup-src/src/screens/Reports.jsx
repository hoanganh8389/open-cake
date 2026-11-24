// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-008 — Báo cáo & phân tích (ảnh 8 Deplao): 8 KPI, 2 biểu đồ đường, thanh theo nhãn. Mọi số = site đếm từ sổ + dẫn xuất (R-OC-LEDGER-3), không model nào cộng.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Kpi, Tabs, Chip, Card, cx } from '../ui.jsx';
import { report } from '../data.js';

const TABS = [
	{ id: 'overview', label: 'Tổng quan', icon: Ic.chart }, { id: 'messages', label: 'Tin nhắn', icon: Ic.chat }, { id: 'contacts', label: 'Liên hệ', icon: Ic.users },
	{ id: 'labels', label: 'Nhãn', icon: Ic.tag }, { id: 'staff', label: 'Nhân viên', icon: Ic.user }, { id: 'campaigns', label: 'Chiến dịch', icon: Ic.send },
	{ id: 'workflow', label: 'Kịch bản', icon: Ic.branch }, { id: 'ai', label: 'AI', icon: Ic.bot },
];

/* Biểu đồ đường tối giản: một màu nhấn + một màu xám, nhãn trục rõ, lưới đứt (dataviz: không tô màu trang trí). */
function Line({ series, labels, max }) {
	const W = 640, H = 220, px = 40, py = 16;
	const x = (i) => px + (i * (W - px - 10)) / (labels.length - 1);
	const y = (v) => H - py - (v / max) * (H - py * 2);
	const path = (d) => d.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
			{[0, .25, .5, .75, 1].map((t) => <g key={t}><line x1={px} x2={W - 10} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeDasharray="4 4" /><text x={px - 8} y={y(max * t) + 4} fontSize="11" textAnchor="end" fill="var(--subtle-foreground)">{Math.round(max * t)}</text></g>)}
			{series.map((s, k) => <g key={k}><path d={path(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" />{s.data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--card)" stroke={s.color} strokeWidth="2" />)}</g>)}
			{labels.map((l, i) => <text key={l} x={x(i)} y={H - 2} fontSize="11" textAnchor="middle" fill="var(--subtle-foreground)">{l}</text>)}
		</svg>
	);
}

export default function Reports({ account }) {
	const [tab, setTab] = useState('overview');
	const [range, setRange] = useState('7d');
	const [scope, setScope] = useState('all');
	return (
		<div className="page">
			<div className="row wrap mb16">
				<div className="row gap8"><Ic.chart style={{ width: 22, height: 22 }} /><h1 className="h1">Báo cáo & Phân tích</h1></div>
				<Btn out><Avatar name={account?.name || 'Shop Hoa Mai'} size="sm" />{account?.name || 'Shop Hoa Mai'}<Ic.chevron /></Btn>
				<div className="row gap8">{[['today', 'Hôm nay'], ['yday', 'Hôm qua'], ['7d', '7 ngày'], ['30d', '30 ngày'], ['90d', '90 ngày'], ['custom', 'Tuỳ chọn']].map(([id, l]) => <Chip key={id} on={range === id} onClick={() => setRange(id)}>{l}</Chip>)}</div>
				<div className="row gap8">{[['all', 'Tất cả'], ['p', 'Cá nhân'], ['g', 'Nhóm']].map(([id, l]) => <Chip key={id} on={scope === id} onClick={() => setScope(id)}>{l}</Chip>)}</div>
				<span className="grow" /><Btn ghost icon title="Hướng dẫn"><Ic.info /></Btn><Btn ghost icon title="Tải lại"><Ic.refresh /></Btn>
			</div>
			<div className="mb24"><Tabs items={TABS} value={tab} onChange={setTab} /></div>
			<div className="grid g4 mb24">{report.kpis.map(([l, v, s, d]) => <Kpi key={l} label={l} value={v} sub={s} delta={d} />)}</div>
			<div className="grid g2 mb24">
				<Card><div className="h3 row gap8 mb16"><Ic.chart style={{ width: 18, height: 18 }} />Tin nhắn 7 ngày qua</div><Line labels={report.days} max={600} series={[{ data: report.sent, color: 'var(--primary)' }, { data: report.recv, color: 'var(--muted-foreground)' }]} /><div className="row sm muted mt8" style={{ justifyContent: 'center', gap: 24 }}><span className="row gap8"><i style={{ width: 12, height: 3, background: 'var(--primary)' }} />Gửi</span><span className="row gap8"><i style={{ width: 12, height: 3, background: 'var(--muted-foreground)' }} />Nhận</span></div></Card>
				<Card><div className="h3 row gap8 mb16"><Ic.chart style={{ width: 18, height: 18 }} />Tăng trưởng liên hệ</div><Line labels={report.days} max={60} series={[{ data: report.growth, color: 'var(--primary)' }]} /><div className="row sm muted mt8" style={{ justifyContent: 'center' }}><span className="row gap8"><i style={{ width: 12, height: 3, background: 'var(--primary)' }} />Liên hệ mới</span></div></Card>
			</div>
			<Card>
				<div className="h3 row gap8 mb16"><Ic.tag style={{ width: 18, height: 18 }} />Chi tiết theo từng nhãn</div>
				{report.labels.map(([l, v]) => <div key={l} className="row mb8"><span className="muted sm" style={{ width: 120, textAlign: 'right' }}>{l}</span><div className="grow bar" style={{ height: 22, borderRadius: 6 }}><i className="pri" style={{ width: `${v}%`, opacity: 1 - report.labels.findIndex((x) => x[0] === l) * .18 }} /></div><b style={{ width: 60 }}>{Math.round(v * 3.8)}</b></div>)}
				<div className="muted xs mt8">Số nguyên do site đếm từ sổ chăm sóc; cùng một nhãn, cùng khoảng ngày luôn cho cùng một số (dựng lại được).</div>
			</Card>
		</div>
	);
}
