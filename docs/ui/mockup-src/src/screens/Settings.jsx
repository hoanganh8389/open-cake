// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-015 (+ 009 Nhân viên, 014 Lưu trữ): Cài đặt kiểu Deplao — cột trái nhóm mục, phải là trang.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Badge, Search, Kpi, Tabs, Sheet, cx } from '../ui.jsx';
import { employees } from '../data.js';

const NAV = [
	['Chung', [['conversation', 'Hội thoại', Ic.chat], ['appearance', 'Giao diện', Ic.eye], ['notifications', 'Thông báo', Ic.bell]]],
	['Tài khoản & đội', [['accounts', 'Tài khoản Zalo', Ic.user], ['security', 'Bảo mật & khoá', Ic.shield], ['employees', 'Nhân viên', Ic.users], ['workspace', 'Workspace', Ic.brief]]],
	['Dữ liệu', [['storage', 'Lưu trữ', Ic.file], ['cloud', 'Internet & Đám mây', Ic.cloud], ['sendguard', 'Trần gửi & giờ gửi', Ic.shield]]],
	['Hỗ trợ', [['about', 'Giới thiệu', Ic.book], ['changelog', 'Log phiên bản', Ic.note], ['logs', 'Nhật ký', Ic.terminal]]],
];

function Employees() {
	const [tab, setTab] = useState('list');
	const [add, setAdd] = useState(false);
	return (
		<>
			<div className="row mb16"><h1 className="h1 row gap8"><Ic.users />Quản lý nhân viên</h1><span className="grow" /><Btn pri onClick={() => setAdd(true)}><Ic.plus />Thêm nhân viên</Btn></div>
			<div className="grid g4 mb16"><Kpi label="Tổng NV" value="4" /><Kpi label="Đang hoạt động" value={<span style={{ color: 'var(--success)' }}>3</span>} /><Kpi label="Đang online" value={<span style={{ color: 'var(--success)' }}>3</span>} /><Kpi label="Nhóm" value="2" /></div>
			<div className="card pad row mb16" style={{ padding: 14 }}>
				<Ic.globe style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
				<span className="sm">Nhân viên đăng nhập WordPress tại</span><span className="kbd">https://shop.hoamai.vn/crm/</span>
				<span className="muted sm">· không cần tunnel, không cần máy chủ riêng</span><span className="grow" /><Badge tone="ok" dot>3 online</Badge>
			</div>
			<div className="mb16"><Tabs items={[{ id: 'list', label: 'Nhân viên', count: 4 }, { id: 'conn', label: 'Kết nối', count: 3 }]} value={tab} onChange={setTab} /></div>
			<div className="row mb16"><Search placeholder="Tìm theo tên hoặc username…" sm style={{ flex: 1 }} /><Btn out sm><Ic.users />Nhóm <Badge>2</Badge></Btn></div>
			<div className="card">
				{employees.map((g) => (
					<div key={g.group}>
						<div className="row" style={{ padding: '14px 20px 6px' }}><span className="xs subtle" style={{ letterSpacing: '.06em' }}>NHÓM: {g.group.toUpperCase()}</span><Badge>{g.list.length}</Badge></div>
						{g.list.map((e) => (
							<div key={e.user} className="row" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
								<Avatar name={e.name} online={e.online} />
								<div className="grow"><div className="row gap8"><b style={{ fontSize: 'var(--fs-lg)' }}>{e.name}</b>{e.off && <Badge tone="err">Tắt</Badge>}</div><div className="row wrap gap16 muted sm mt8"><span>{e.user}</span><span className="row gap8"><Ic.key style={{ width: 14, height: 14 }} />{e.modules} mục</span><span className="row gap8"><Ic.phone style={{ width: 14, height: 14 }} />{e.accounts} TK</span><span className="row gap8"><Ic.clock style={{ width: 14, height: 14 }} />{e.since}</span></div></div>
								<Btn ghost icon sm title="Xem như nhân viên"><Ic.eye /></Btn><Btn ghost icon sm title={e.off ? 'Bật' : 'Tạm dừng'}>{e.off ? <Ic.play /> : <Ic.pause />}</Btn><Btn ghost icon sm title="Sửa"><Ic.edit /></Btn><Btn ghost icon sm title="Xoá"><Ic.trash /></Btn>
							</div>
						))}
					</div>
				))}
			</div>
			<Sheet open={add} onClose={() => setAdd(false)} icon={Ic.userPlus} title="Thêm nhân viên" sub="Tạo tài khoản WordPress (vai Open CRM) hoặc chọn người đã có; giao số Zalo và mục được dùng."
				footer={<><Btn onClick={() => setAdd(false)}>Huỷ</Btn><Btn pri onClick={() => setAdd(false)}>Tạo nhân viên</Btn></>}>
				<div className="grid g2"><div><label className="sm muted">Tên hiển thị</label><input className="input mt8" defaultValue="Nguyễn Văn Phúc" readOnly /></div><div><label className="sm muted">Tên đăng nhập</label><input className="input mt8" defaultValue="phuc.nguyen" readOnly /></div></div>
				<label className="sm muted mt16" style={{ display: 'block' }}>Nhóm</label><select className="input mt8"><option>Bán hàng</option><option>Chăm sóc khách hàng</option></select>
				<label className="sm muted mt16" style={{ display: 'block' }}>Số Zalo được giao</label>
				{['Shop Hoa Mai', 'Hoa Mai CSKH', 'Ngọc Lan - Sale'].map((n, i) => <label key={n} className="row mt8"><input type="checkbox" defaultChecked={i === 1} readOnly />{n}</label>)}
				<label className="sm muted mt16" style={{ display: 'block' }}>Mục được dùng</label>
				<div className="row wrap gap8 mt8">{['Hộp thư', 'Danh bạ', 'Chiến dịch', 'Báo cáo', 'Công việc'].map((m, i) => <Badge key={m} tone={i < 2 ? 'pri' : ''}>{m}</Badge>)}</div>
			</Sheet>
		</>
	);
}

function Cloud() {
	const [store, setStore] = useState('drive');
	return (
		<>
			<div className="mb16"><h1 className="h1 row gap8"><Ic.cloud />Internet & Đám mây</h1><div className="muted sm">Địa chỉ cố định là chính website WordPress của bạn; media và bản sao lưu đặt ở kho bạn chọn.</div></div>
			<div className="card pad row mb16"><span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--success)' }} /><div className="grow"><b>Website đang chạy · shop.hoamai.vn</b><div className="muted sm">HTTPS hợp lệ · REST bizcity-crm/v1 · webhook /wp-json/bizcity-crm/v1/hub/inbound</div></div><Btn out sm>Kiểm tra <Ic.chevron /></Btn></div>
			<div className="grid g2 mb16">
				<div className="card pad row gap16"><div className="icon-circle" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}><Ic.globe /></div><div className="grow"><div className="row gap8"><b style={{ fontSize: 'var(--fs-lg)' }}>Địa chỉ Internet</b><Badge tone="ok" dot>Cố định · 1 tên miền</Badge></div><div className="muted sm">Cho nhân viên ở xa, API, thanh toán và webhook — chính là URL WordPress</div></div></div>
				<div className="card pad row gap16" style={{ borderColor: 'var(--primary)', background: 'var(--selected)' }}><div className="icon-circle"><Ic.refresh /></div><div className="grow"><div className="row gap8"><b style={{ fontSize: 'var(--fs-lg)' }}>Sao lưu dữ liệu</b><Badge tone="ok" dot>Theo giờ · 14:30</Badge><span className="muted sm">ảnh 24.011/24.625</span></div><div className="muted sm">Sao lưu tin nhắn, danh bạ, ảnh, file lên R2 hoặc Google Drive; khôi phục khi đổi máy chủ</div></div></div>
			</div>
			<div className="card pad">
				<div className="h3 row gap8"><Ic.file style={{ width: 18, height: 18 }} />Kho lưu</div><div className="muted sm mb16">Nơi đặt ảnh, file và bản sao dữ liệu. Mỗi lúc dùng một kho; địa chỉ Internet vẫn là website.</div>
				<div className="grid g3">
					<div className={cx('radio-card', store === 'wp' && 'on')} onClick={() => setStore('wp')}><label className="row gap8"><input type="radio" checked={store === 'wp'} readOnly /><b>Thư mục uploads của WordPress</b>{store === 'wp' && <Badge tone="pri">Đang dùng</Badge>}</label><ul><li>Mặc định, không cấu hình</li><li>Dung lượng theo hosting</li><li>Sao lưu cùng website</li></ul></div>
					<div className={cx('radio-card', store === 'r2' && 'on')} onClick={() => setStore('r2')}><label className="row gap8"><input type="radio" checked={store === 'r2'} readOnly /><b>Cloudflare R2</b></label><ul><li>10 GB miễn phí mỗi tháng, sau đó 0,015 USD/GB-tháng</li><li>Ghi (Class A) — 1 triệu lượt/tháng miễn phí</li><li>Đọc (Class B) — 10 triệu lượt/tháng miễn phí</li><li>Xoá file: miễn phí · Tải xuống: miễn phí</li></ul></div>
					<div className={cx('radio-card', store === 'drive' && 'on')} onClick={() => setStore('drive')}><label className="row gap8"><input type="radio" checked={store === 'drive'} readOnly /><b>Google Drive (Google One)</b>{store === 'drive' && <Badge tone="pri">Đang dùng</Badge>}</label><ul><li>15 GB miễn phí, dùng chung Gmail và Google Photos</li><li>Không tính phí theo lượt đọc / ghi</li><li>Tải lên tối đa 750 GB/ngày mỗi tài khoản</li></ul><div className="note warn sm mt16">Dung lượng đầy thì không tải lên được và Gmail có thể không nhận thư — nên dùng một tài khoản Google riêng cho sao lưu.</div><div className="mt16"><b>saoluu.hoamai@gmail.com</b><div className="muted sm">Sao lưu Hoa Mai</div><div className="row sm mt8"><span className="grow">Đã dùng 43 / 100 GB</span><b>43%</b></div><div className="bar mt8"><i className="pri" style={{ width: '43%' }} /></div><div className="row gap8 mt16"><Btn out sm><Ic.refresh />Đọc lại</Btn><Btn out sm>Đổi tài khoản</Btn><Btn ghost sm style={{ color: 'var(--destructive)' }}>Ngắt kết nối</Btn></div></div></div>
				</div>
				<div className="muted sm mt16 row gap8"><Ic.lock style={{ width: 14, height: 14 }} />Tắt sao lưu để đổi kho lưu.</div>
			</div>
		</>
	);
}

function SendGuard() {
	return (
		<>
			<div className="mb16"><h1 className="h1 row gap8"><Ic.shield />Trần gửi & giờ gửi</h1><div className="muted sm">Send Guard — kernel kiểm, module không vượt được (R-OC-SEND-1).</div></div>
			<div className="grid g2">
				<div className="card pad"><div className="h3">Trần mỗi số / ngày</div><input className="input mt8" defaultValue="200 tin" readOnly /><div className="h3 mt16">Giãn cách giữa hai tin</div><input className="input mt8" defaultValue="45 giây – 1,5 phút (ngẫu nhiên)" readOnly /><div className="h3 mt16">Giờ được gửi</div><div className="row mt8"><input className="input" defaultValue="08:00" readOnly /><span className="muted">đến</span><input className="input" defaultValue="20:00" readOnly /></div></div>
				<div className="card pad"><div className="h3">Danh sách không nhận</div><div className="muted sm">Khách đã nhắn "ngừng", số bị chặn, số báo lỗi 3 lần.</div><table className="tbl mt8"><tbody>{[['0912 000 111', 'Khách yêu cầu ngừng', '12/10'], ['0988 222 333', 'Bị chặn', '15/10'], ['0777 444 555', 'Lỗi 3 lần', '18/10']].map(([p, r, d]) => <tr key={p}><td><b>{p}</b></td><td className="muted sm">{r}</td><td className="muted sm r">{d}</td></tr>)}</tbody></table><Btn out sm className="mt16"><Ic.plus />Thêm số</Btn></div>
			</div>
			<div className="row mt24"><span className="grow" /><Btn pri>Lưu thay đổi</Btn></div>
		</>
	);
}

function Generic({ title }) {
	return (<><h1 className="h1 mb16">{title}</h1><div className="card pad muted">Trang cài đặt này theo cùng mẫu: mỗi mục một dòng, ghi trong sheet. (Bản mẫu rút gọn.)</div></>);
}

export default function Settings({ sub = [] }) {
	const [cur, setCur] = useState(sub[0] || 'employees');
	const Page = { employees: Employees, cloud: Cloud, sendguard: SendGuard }[cur];
	const label = NAV.flatMap(([, items]) => items).find(([id]) => id === cur)?.[1] || '';
	return (
		<div className="page flush">
			<div className="settings">
				<nav className="snav">
					<h5>Cài đặt</h5>
					{NAV.map(([g, items]) => (
						<div key={g} className="mb16">
							<h5 style={{ marginTop: 16 }}>{g}</h5>
							{items.map(([id, l, I]) => <a key={id} className={cx(cur === id && 'on')} onClick={() => setCur(id)}><I />{l}</a>)}
						</div>
					))}
				</nav>
				<section style={{ overflow: 'auto', padding: 32 }}>{Page ? <Page /> : <Generic title={label} />}</section>
			</div>
		</div>
	);
}
