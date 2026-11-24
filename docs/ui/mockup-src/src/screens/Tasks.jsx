// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — Công việc nội bộ (ảnh 10 Deplao): bảng Kanban 5 cột, tab Của tôi · Task · Lịch · Note · Nhân sự · Báo cáo. Việc = sự việc task.pushed trong sổ.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Badge, Tabs, Bar, cx } from '../ui.jsx';
import { tasks, priTone } from '../data.js';

const TABS = [{ id: 'mine', label: 'Của tôi', icon: Ic.shield }, { id: 'task', label: 'Task', icon: Ic.check }, { id: 'cal', label: 'Lịch', icon: Ic.calendar }, { id: 'note', label: 'Note', icon: Ic.note }, { id: 'hr', label: 'Nhân sự', icon: Ic.users }, { id: 'rep', label: 'Báo cáo', icon: Ic.chart }];

export default function Tasks() {
	const [tab, setTab] = useState('task');
	return (
		<div className="page">
			<div className="row mb16"><h1 className="h1 row gap8"><Ic.kanban />Quản lý công việc</h1><Tabs items={TABS} value={tab} onChange={setTab} /></div>
			<div className="row mb24">
				{['Tất cả dự án', 'Tất cả nhân viên', 'Mọi mức ưu tiên', 'Tất cả hạn chót'].map((f) => <select key={f} className="input" style={{ width: 220 }}><option>{f}</option></select>)}
				<span className="grow" /><Btn pri><Ic.plus />Tạo dự án</Btn>
			</div>
			<div className="kanban">
				{Object.entries(tasks).map(([col, list]) => (
					<div key={col} className="kcol">
						<div className="kh"><span>{col}</span><Badge>{list.length}</Badge></div>
						{list.map((t) => (
							<div key={t.t} className="kcard">
								<div className="t">{t.t}</div>
								<div className="row sm"><Badge tone={priTone[t.pri]} dot>{t.pri}</Badge>{t.c && <span className="muted row gap8"><Ic.chat style={{ width: 14, height: 14 }} />{t.c}</span>}<span className="grow" /><span className={cx('sm', t.pri === 'Khẩn cấp' ? '' : 'muted')} style={t.pri === 'Khẩn cấp' ? { color: 'var(--destructive)' } : undefined}>{t.due}</span></div>
								<div className="row wrap gap8 mt8">{t.who.map((w) => <span key={w} className="row gap8 sm"><Avatar name={w} size="sm" />{w}</span>)}</div>
								<div className="row mt8 xs" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}><Ic.eye style={{ width: 14, height: 14, color: 'var(--primary)' }} /><span style={{ color: 'var(--primary)', fontWeight: 600 }}>THEO DÕI</span><Badge tone="pri">1</Badge></div>
								{t.p && <><div className="mt8"><Bar ok={(t.p[0] / t.p[1]) * 100} /></div><div className="muted xs mt8">{t.p[0]}/{t.p[1]}</div></>}
							</div>
						))}
						<button className="btn ghost sm block" style={{ justifyContent: 'flex-start' }}><Ic.plus />Thêm task</button>
					</div>
				))}
			</div>
			<div className="muted sm mt16 row gap8"><Ic.info style={{ width: 16, height: 16 }} />Việc do trợ lý đẩy từ Zalo Brain ("nhắc tôi 9h gọi lại anh A") xuất hiện ở cột Cần làm với nhãn <Badge tone="pri">từ trợ lý</Badge>.</div>
		</div>
	);
}
