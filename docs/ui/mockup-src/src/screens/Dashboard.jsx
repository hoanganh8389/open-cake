// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — Tổng quan tài khoản (ảnh 1 Deplao): lưới thẻ tài khoản, mỗi thẻ 2 nút Chat · Ngắt kết nối.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Search, Sheet, Badge } from '../ui.jsx';
import { accounts } from '../data.js';
import { go } from '../main.jsx';

export default function Dashboard() {
	const [sheet, setSheet] = useState(null);
	return (
		<div className="page">
			<div className="row mb16">
				<h1 className="h1">Tổng quan</h1><span className="muted">{accounts.length} tài khoản</span>
				<span className="grow" />
				<Btn pri onClick={() => setSheet('add')}><Ic.userPlus />Thêm tài khoản</Btn>
				<Btn out><Ic.users />Gộp tài khoản</Btn>
				<Btn out><Ic.plus />Thêm workspace</Btn>
				<Btn out><Ic.info />Hỗ trợ, báo lỗi</Btn>
			</div>
			<div className="row mb24">
				<span className="muted sm row gap8"><Ic.drag style={{ width: 16, height: 16 }} />Kéo thả để sắp xếp thứ tự</span>
				<span className="grow" />
				<Search placeholder="Tên, SĐT, UID…" sm style={{ width: 360 }} />
			</div>
			<div className="row mb16"><h3 className="h3">Tài khoản</h3><Badge>{accounts.length}</Badge></div>
			<div className="grid g3">
				{accounts.map((a) => (
					<div key={a.id} className="card pad">
						<div className="row gap16" style={{ alignItems: 'flex-start' }}>
							<Avatar name={a.name} size="lg" online={a.on} channel={a.ch} />
							<div className="grow">
								<div className="h3">{a.name}</div>
								<div className="muted sm">{a.uid}</div>
								{a.phone && <div className="muted sm row gap8"><Ic.phone style={{ width: 14, height: 14 }} />{a.phone}</div>}
								{a.handle && <div className="muted sm">{a.handle}</div>}
								{a.ext && <Badge className="mt8" tone="out">Qua Zalo Brain</Badge>}
							</div>
							<button className="menu-dots" aria-label="Thêm"><Ic.dots style={{ width: 18, height: 18 }} /></button>
						</div>
						<div className="row mt16">
							<Btn pri block onClick={() => go('inbox')}>Chat</Btn>
							{a.on ? <Btn block onClick={() => setSheet(a)}>Ngắt kết nối</Btn> : <Btn out block onClick={() => setSheet('add')}>Kết nối lại</Btn>}
						</div>
					</div>
				))}
			</div>

			<Sheet open={sheet === 'add'} onClose={() => setSheet(null)} icon={Ic.qr} title="Thêm tài khoản Zalo" sub="Quét QR bằng Zalo trên điện thoại. Mã do máy chủ Zalo cấp, hết hạn sau 2 phút.">
				<div className="row gap24" style={{ alignItems: 'flex-start' }}>
					<div style={{ width: 220, height: 220, borderRadius: 12, background: 'var(--muted)', display: 'grid', placeItems: 'center' }}><Ic.qr style={{ width: 120, height: 120, color: 'var(--foreground)' }} /></div>
					<ol className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
						<li>Mở Zalo trên điện thoại → <b>Cài đặt → Thiết bị</b>.</li>
						<li>Chọn <b>Quét mã QR</b>, hướng vào mã bên trái.</li>
						<li>Chọn người phụ trách số này trong Open CRM.</li>
						<li>Bấm <b>Hoàn tất</b>. Tin nhắn cũ sẽ được tải trong nền.</li>
					</ol>
				</div>
				<div className="mt16"><label className="sm muted">Người phụ trách</label><input className="input mt8" defaultValue="Nguyễn Thị Lan (@lan.nguyen)" readOnly /></div>
			</Sheet>
			<Sheet open={sheet && sheet !== 'add'} onClose={() => setSheet(null)} icon={Ic.warn} title={`Ngắt kết nối ${sheet?.name || ''}`} sub="Số này ngừng nhận và gửi tin trong Open CRM. Hội thoại, danh bạ và sổ chăm sóc được giữ nguyên."
				footer={<><Btn onClick={() => setSheet(null)}>Giữ kết nối</Btn><Btn danger onClick={() => setSheet(null)}>Ngắt kết nối</Btn></>}>
				<div className="note warn sm">Chiến dịch đang chạy trên số này sẽ tạm dừng. Bật lại bằng cách quét QR.</div>
			</Sheet>
		</div>
	);
}
