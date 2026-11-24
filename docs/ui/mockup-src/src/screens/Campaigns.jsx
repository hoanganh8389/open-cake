// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — Chiến dịch gửi hàng loạt (ảnh 4 Deplao): danh sách trái · chi tiết phải (KPI, tiến độ, nội dung, danh sách liên hệ); Send Guard hiện trần.
import React, { useState } from 'react';
import { Ic, Btn, Avatar, Search, Badge, Bar, Kpi, Sheet, Chip, StatusBar, cx } from '../ui.jsx';
import { campaigns, campaignTargets } from '../data.js';
import { ContactsHeader } from './Contacts.jsx';
import { go } from '../main.jsx';

const ST = { running: ['Đang chạy', 'ok'], paused: ['Tạm dừng', 'warn'], draft: ['Nháp', ''], done: ['Hoàn thành', 'pri'] };

export default function Campaigns({ account }) {
	const [cur, setCur] = useState('k1');
	const [create, setCreate] = useState(false);
	const [step, setStep] = useState(1);
	const [tf, setTf] = useState('all');
	const k = campaigns.find((c) => c.id === cur);
	const [label, tone] = ST[k.status];
	return (
		<div className="page flush">
			<ContactsHeader tab="campaigns" onTab={(id) => go(id === 'campaigns' ? 'campaigns' : 'contacts')} account={account} />
			<div className="grow" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', minHeight: 0, marginTop: 16, borderTop: '1px solid var(--border)' }}>
				<aside style={{ borderRight: '1px solid var(--border)', background: 'var(--card)', overflow: 'auto', padding: 20 }}>
					<div className="row mb16"><div><div className="h2">Chiến dịch</div><div className="muted sm">4 chiến dịch · 1 đang chạy</div></div><span className="grow" /><Btn pri onClick={() => { setCreate(true); setStep(1); }}><Ic.plus />Tạo mới</Btn></div>
					<div className="row mb16"><Search placeholder="Tìm chiến dịch…" sm style={{ flex: 1 }} /><select className="input sm" style={{ width: 130 }}><option>Tất cả (4)</option></select></div>
					{campaigns.map((c) => { const [l, t] = ST[c.status]; return (
						<div key={c.id} className={cx('card pad', cur === c.id && 'on')} style={{ marginBottom: 12, cursor: 'pointer', borderColor: cur === c.id ? 'var(--primary)' : undefined, background: cur === c.id ? 'var(--selected)' : undefined }} onClick={() => setCur(c.id)}>
							<div className="row gap16" style={{ alignItems: 'flex-start' }}>
								<div className="icon-circle" style={{ width: 44, height: 44 }}>{c.kind === 'Mời vào nhóm' ? <Ic.users style={{ width: 20, height: 20 }} /> : c.kind === 'Hỗn hợp' ? <Ic.branch style={{ width: 20, height: 20 }} /> : <Ic.chat style={{ width: 20, height: 20 }} />}</div>
								<div className="grow"><div className="h3">{c.name}</div><div className="row gap8 muted sm mt8"><Badge tone={t} dot>{l}</Badge>· {c.kind} · {c.total} liên hệ</div></div>
								<button className="menu-dots"><Ic.dots style={{ width: 18, height: 18 }} /></button>
							</div>
							<div className="row mt16"><div className="grow"><Bar ok={(c.sent / c.total) * 100} err={(c.err / c.total) * 100} /></div><span className="muted sm">{c.sent}/{c.total}{c.err > 0 && <span style={{ color: 'var(--destructive)' }}> · {c.err} lỗi</span>}</span></div>
						</div>
					); })}
				</aside>

				<section style={{ overflow: 'auto', padding: 24 }}>
					<div className="row mb16" style={{ alignItems: 'flex-start' }}>
						<div className="icon-circle" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Ic.chat /></div>
						<div className="grow">
							<div className="row gap8"><h1 className="h1" style={{ fontSize: 'var(--fs-xl)' }}>{k.name}</h1><Badge tone={tone} dot>{label}</Badge><Badge tone="out">{k.kind}</Badge></div>
							{k.gap && <div className="row wrap gap16 muted sm mt8"><span className="row gap8"><Ic.clock style={{ width: 14, height: 14 }} />Giãn cách {k.gap}</span><span className="row gap8"><Ic.calendar style={{ width: 14, height: 14 }} />Chạy từ {k.from}</span><span className="row gap8"><Ic.chart style={{ width: 14, height: 14 }} />Tối đa {k.cap} liên hệ/ngày</span><span>Tạo {k.created}</span></div>}
						</div>
						{k.status === 'running' ? <Btn out><Ic.pause />Tạm dừng</Btn> : k.status === 'draft' ? <Btn pri><Ic.play />Bắt đầu</Btn> : k.status === 'paused' ? <Btn pri><Ic.play />Tiếp tục</Btn> : <Btn out><Ic.refresh />Nhân bản</Btn>}
					</div>
					<div className="grid g4 mb16">
						<Kpi label="Tổng liên hệ" value={k.total} />
						<Kpi label="Đã gửi" value={<span style={{ color: 'var(--success)' }}>{k.sent}</span>} />
						<Kpi label="Đang chờ" value={k.total - k.sent - k.err} sub={k.status === 'running' ? '1 đang gửi' : ''} />
						<Kpi label="Lỗi" value={<span style={{ color: 'var(--destructive)' }}>{k.err}</span>} />
					</div>
					<div className="row mb8 muted sm"><span>Đã xử lý {k.sent + k.err}/{k.total} liên hệ · Hôm nay {k.sent}/{k.cap || 200}</span><span className="grow" /><b>{Math.round(((k.sent + k.err) / k.total) * 100)}%</b></div>
					<Bar ok={(k.sent / k.total) * 100} err={(k.err / k.total) * 100} />
					<div className="note sm mt16 row gap8"><Ic.shield style={{ width: 16, height: 16 }} />Trần gửi hôm nay của số này: còn <b>158</b> tin (200/ngày). Giờ được gửi 08:00–20:00. 3 số trong danh sách không nhận đã được bỏ qua.</div>

					<div className="grid g2 mt24" style={{ gridTemplateColumns: '440px 1fr' }}>
						<div className="card">
							<div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><span className="h3">Nội dung gửi</span></div>
							<div style={{ padding: 20 }}>
								<div className="row gap8 wrap mb16"><Ic.chat style={{ width: 20, height: 20, color: 'var(--primary)' }} /><b>Gửi tin nhắn</b><Badge tone="pri">2 biến thể</Badge><Badge tone="pri">Gộp ảnh + chữ</Badge><Badge>Ảnh trước</Badge></div>
								<div className="muted sm row gap8 mb16"><Ic.branch style={{ width: 16, height: 16 }} />Mỗi liên hệ nhận ngẫu nhiên 1 trong 2 biến thể</div>
								<div className="muted sm">Biến thể 1</div>
								<div className="card pad mt8" style={{ background: 'var(--selected)', borderColor: 'var(--bubble-out-border)' }}>
									<div className="img" style={{ width: 80, height: 80, marginBottom: 12, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Ic.image style={{ width: 28, height: 28, color: 'var(--muted-foreground)' }} /></div>
									Chào <Badge tone="pri">{'{name}'}</Badge> 🌸 Hoa Mai gửi tặng bạn mã GIAM20 cho bộ sưu tập Thu – Đông. Hạn dùng đến 31/10!
								</div>
								<div className="muted xs mt8">Mô tả ảnh trên Zalo không giữ định dạng (đậm, nghiêng).</div>
								<hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
								<div className="xs subtle" style={{ letterSpacing: '.06em' }}>ẢNH KÈM CHỮ</div>
								<div className="row mt8 sm">Gửi trước <div className="tabs"><button className="tab" style={{ height: 32 }}>Chữ trước</button><button className="tab on" style={{ height: 32 }}>Ảnh trước</button></div></div>
								<label className="row mt16 sm" style={{ alignItems: 'flex-start' }}><input type="checkbox" defaultChecked readOnly style={{ marginTop: 4 }} /><span><b>Gộp ảnh + chữ thành 1 tin</b><div className="muted">Chữ thành mô tả của ảnh. Zalo chỉ hỗ trợ khi có 1 ảnh (jpg, png, webp) và không giữ định dạng chữ. Không gộp được thì gửi riêng theo thứ tự trên.</div></span></label>
								<div className="muted sm mt16 row gap8"><Ic.lock style={{ width: 14, height: 14 }} />Tạm dừng chiến dịch để thay đổi</div>
							</div>
						</div>
						<div className="card">
							<div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><span className="h3">Danh sách liên hệ</span><Badge>{k.total}</Badge><span className="grow" /><Btn ghost icon sm title="Xuất CSV"><Ic.download /></Btn></div>
							<div className="row" style={{ padding: '12px 20px' }}>
								<Search placeholder="Tìm tên, UID, số điện thoại…" sm style={{ flex: 1 }} />
								{[['all', `Tất cả ${k.total}`], ['wait', `Chờ gửi ${k.total - k.sent - k.err}`], ['sent', `Đã gửi ${k.sent}`], ['err', `Lỗi ${k.err}`]].map(([id, l]) => <Chip key={id} on={tf === id} onClick={() => setTf(id)}>{l}</Chip>)}
							</div>
							<table className="tbl">
								<tbody>
									{campaignTargets.map(([n, p, t]) => (
										<tr key={n}><td style={{ width: 60 }}><Avatar name={n} /></td><td><b>{n}</b><div className="muted sm">{p}</div></td><td className="r"><Badge tone="ok" dot>Đã gửi</Badge><div className="muted xs mt8">{t}</div></td></tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</section>
			</div>
			<StatusBar><span className="live" /><span>Hàng chờ đang chạy</span><span>Hạn mức: <b style={{ color: 'var(--success)' }}>42</b>/60 /giờ</span><span>Gửi lần cuối: <b>36s</b> trước</span><span className="grow" /><span>10:29:15</span></StatusBar>

			<Sheet open={create} onClose={() => setCreate(false)} icon={Ic.send} title="Tạo chiến dịch gửi hàng loạt" sub="3 bước · người nhận → nội dung → giờ gửi và số gửi" wide
				footer={<>{step > 1 && <Btn onClick={() => setStep(step - 1)}>Quay lại</Btn>}<span className="grow" />{step < 3 ? <Btn pri onClick={() => setStep(step + 1)}>Tiếp tục</Btn> : <Btn pri onClick={() => setCreate(false)}>Tạo chiến dịch (chưa gửi)</Btn>}</>}>
				<div className="row mb16">{['Chọn người nhận', 'Soạn nội dung', 'Giờ gửi & số Zalo'].map((s, i) => <div key={s} className="grow" style={{ borderTop: `3px solid ${i + 1 <= step ? 'var(--primary)' : 'var(--border)'}`, paddingTop: 8, color: i + 1 === step ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: i + 1 === step ? 600 : 400 }}>{i + 1}. {s}</div>)}</div>
				{step === 1 && <div className="grid g3"><div className="card pad"><div className="h3 row gap8"><Ic.tag />Theo nhãn</div><div className="row wrap gap8 mt16"><Chip on>Khách VIP · 214</Chip><Chip>Đặt hàng · 380</Chip><Chip>Khách sỉ · 96</Chip></div></div><div className="card pad"><div className="h3 row gap8"><Ic.users />Theo nhóm</div><div className="muted sm mt16">Chọn nhóm Zalo để lấy thành viên</div><Btn out sm className="mt8">Chọn nhóm</Btn></div><div className="card pad"><div className="h3 row gap8"><Ic.file />Dán danh sách</div><textarea className="input mt16" style={{ height: 96, padding: 10 }} placeholder="Mỗi dòng một số điện thoại hoặc UID" readOnly /></div></div>}
				{step === 2 && <div className="grid g2"><div><label className="sm muted">Nội dung (dùng {'{name}'} để chèn tên)</label><textarea className="input mt8" style={{ height: 160, padding: 12 }} defaultValue={'Chào {name} 🌸 Hoa Mai gửi tặng bạn mã GIAM20 cho bộ sưu tập Thu – Đông. Hạn dùng đến 31/10!'} readOnly /><div className="row gap8 mt8"><Btn out sm><Ic.image />Thêm ảnh</Btn><Btn out sm><Ic.clip />Thêm tệp</Btn><Btn out sm><Ic.plus />Biến thể 2</Btn></div></div><div><div className="sm muted mb8">Xem trước</div><div className="msg out"><div className="b">Chào Nguyễn Thu Hương 🌸 Hoa Mai gửi tặng bạn mã GIAM20 cho bộ sưu tập Thu – Đông. Hạn dùng đến 31/10!<span className="ts">Xem trước</span></div></div></div></div>}
				{step === 3 && <div className="grid g2"><div className="card pad"><div className="h3">Giờ gửi</div><div className="row mt16"><Btn pri block>Gửi ngay</Btn><Btn block>Hẹn giờ</Btn></div><label className="sm muted mt16" style={{ display: 'block' }}>Giãn cách giữa hai tin</label><input className="input mt8" defaultValue="45 giây – 1,5 phút (ngẫu nhiên)" readOnly /></div><div className="card pad"><div className="h3">Số Zalo gửi</div>{['Shop Hoa Mai · còn 158/200 hôm nay', 'Hoa Mai CSKH · còn 200/200 hôm nay'].map((s, i) => <label key={s} className="row mt16"><input type="checkbox" defaultChecked={i === 0} readOnly />{s}</label>)}<div className="note sm mt16">Send Guard: 214 người nhận, 2 số ⇒ xong trong ~2 ngày với trần hiện tại.</div></div></div>}
			</Sheet>
		</div>
	);
}
