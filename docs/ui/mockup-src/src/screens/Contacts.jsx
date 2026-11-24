// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — Danh bạ (ảnh 2 Deplao): dải tab Tìm kiếm · Liên hệ · Nhóm · Lời mời · Chiến dịch · Lịch sử; bảng liên hệ; thanh trạng thái hàng chờ.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Search, Badge, Tabs, Chip, Pager, StatusBar, Sheet } from '../ui.jsx';
import { contacts, tagTone } from '../data.js';
import { Face, Tag } from '../deplao.jsx';
import { go } from '../main.jsx';

const TABS = [
	{ id: 'search', label: 'Tìm kiếm', icon: Ic.search },
	{ id: 'contacts', label: 'Liên hệ', icon: Ic.user, count: 1248 },
	{ id: 'groups', label: 'Nhóm', icon: Ic.users, count: 3 },
	{ id: 'invites', label: 'Lời mời', icon: Ic.userPlus, count: 5 },
	{ id: 'campaigns', label: 'Chiến dịch', icon: Ic.send, count: 4 },
	{ id: 'history', label: 'Lịch sử', icon: Ic.note },
];

export function ContactsHeader({ tab, onTab, account }) {
	return (
		<div className="row" style={{ padding: '16px 32px 0' }}>
			<Tabs items={TABS} value={tab} onChange={(id) => (id === 'campaigns' ? go('campaigns') : onTab(id))} />
			<span className="grow" />
			<Btn ghost icon title="Báo cáo"><Ic.chart /></Btn>
			<Btn out><Avatar name={account?.name || 'Shop Hoa Mai'} size="sm" />{account?.name || 'Shop Hoa Mai'}<Ic.chevron /></Btn>
		</div>
	);
}

export default function Contacts({ account }) {
	const [tab, setTab] = useState('contacts');
	const [open, setOpen] = useState(null);
	return (
		<div className="page flush">
			<ContactsHeader tab={tab} onTab={setTab} account={account} />
			<div className="row wrap" style={{ padding: '16px 32px' }}>
				<Chip><Ic.tag />Nhãn</Chip><Chip><Ic.contact />Loại <Ic.chevron /></Chip><Chip><Ic.user />Giới tính <Ic.chevron /></Chip><Chip>Sinh nhật <Ic.chevron /></Chip><Chip>Tên A → Z <Ic.chevron /></Chip>
				<Search placeholder="Tên, SĐT, UID…" sm style={{ width: 420 }} />
				<span className="grow" />
				<Btn out sm><Ic.dots />Thao tác <Ic.chevron /></Btn>
			</div>
			<div className="grow" style={{ overflow: 'auto', padding: '0 32px' }}>
				<table className="tbl">
					<thead><tr><th style={{ width: 40 }}><input type="checkbox" readOnly /></th><th>Trang này (14)</th><th></th><th>Giới tính</th><th>Sinh nhật</th><th>Điện thoại</th><th className="r">Tin nhắn</th></tr></thead>
					<tbody>
						{contacts.map((c) => (
							<tr key={c.name} onClick={() => setOpen(c)} style={{ cursor: 'pointer' }}>
								<td><input type="checkbox" readOnly /></td>
								<td style={{ width: 64 }}><Face name={c.real || c.name} size={48} female={c.sex === 'Nữ'} /></td>
								<td>
									<div><span style={{ fontSize: 19 }}>{c.name}</span>{c.tags.length > 0 && <span className="onl" />}{c.note && <Ic.edit className="editic" />}</div>
									{c.real && <div className="muted sm">{c.real}</div>}
									{c.tags.length > 0 && <div className="row gap8" style={{ marginTop: 6 }}>{c.tags.map((t) => <Tag key={t} name={t} />)}</div>}
								</td>
								<td><span className={`gender ${c.sex === 'Nữ' ? 'f' : 'm'}`}>{c.sex === 'Nữ' ? '♀' : '♂'} {c.sex}</span></td>
								<td className="muted">{c.dob || ''}</td>
								<td>{c.phone}</td>
								<td className="r muted">{c.last}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="row" style={{ padding: '16px 0 24px' }}>
					<span className="muted sm">1.248 liên hệ</span><select className="input sm" style={{ width: 120 }} defaultValue="200"><option>200/trang</option></select>
					<span className="grow" /><Pager page={1} total={7} /><span className="grow" /><span className="muted sm">Trang 1/7</span>
				</div>
			</div>
			<StatusBar>
				<span className="live" /><span>Hàng chờ đang chạy</span><span>Hạn mức: <span className="meter" style={{ display: 'inline-block', verticalAlign: 'middle' }}><i style={{ width: '70%' }} /></span> <b style={{ color: 'var(--success)' }}>42</b>/60 /giờ</span><span>Gửi lần cuối: <b>36s</b> trước</span><span className="grow" /><span>10:29:11</span>
			</StatusBar>

			<Sheet open={!!open} onClose={() => setOpen(null)} icon={Ic.user} title={open?.name || ''} sub={open?.real ? `${open.real} · ${open.phone}` : open?.phone}
				footer={<><Btn onClick={() => setOpen(null)}>Đóng</Btn><Btn pri onClick={() => go('inbox')}><Ic.chat />Nhắn tin</Btn></>}>
				{open && (
					<>
						<div className="row gap8">{open.tags.map((t) => <Tag key={t} name={t} size="md" />)}<Chip><Ic.plus />Gắn nhãn</Chip></div>
						<h4 className="xs subtle mt16" style={{ letterSpacing: '.06em' }}>SỔ CHĂM SÓC (dòng mới nhất)</h4>
						<table className="tbl sm">
							<tbody>
								<tr><td className="muted" style={{ width: 120 }}>19/10 10:28</td><td>Tin vào — "Dạ chị chuyển khoản rồi nhé…"</td></tr>
								<tr><td className="muted">19/10 09:24</td><td>Tin ra — gửi Hoa-don-HM1024.pdf</td></tr>
								<tr><td className="muted">19/10 07:53</td><td>Gửi hàng loạt — Tri ân khách hàng tháng 10 · đã gửi</td></tr>
								<tr><td className="muted">18/10 15:02</td><td>Gắn nhãn — Khách VIP (Nguyễn Thị Lan)</td></tr>
							</tbody>
						</table>
					</>
				)}
			</Sheet>
		</div>
	);
}
