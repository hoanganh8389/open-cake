// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-013 — Ứng dụng, API & Webhook (ảnh 11 Deplao). Ứng dụng = add-on WordPress khai module.json / zalo-brain.json; API = REST bizcity-crm/v1; Webhook = outbox ra URL.
import React, { useState } from 'react';
import { Ic, Btn, Badge, Search, cx } from '../ui.jsx';
import { apps } from '../data.js';

export default function Apps() {
	const [tab, setTab] = useState('apps');
	const T = [
		['apps', Ic.layers, 'Ứng dụng', <Badge tone="pri">3 đã cài</Badge>, 'Thêm tính năng chạy ngay trong Open CRM: trang riêng, panel chat, node kịch bản…'],
		['api', Ic.key, 'API', <Badge tone="ok" dot>Đang chạy · REST</Badge>, 'Cho website, phần mềm, n8n… đọc dữ liệu và gửi tin qua Open CRM (bizcity-crm/v1, hợp đồng có phiên bản)'],
		['webhook', Ic.globe, 'Webhook', <Badge tone="ok" dot>Nhận + gửi</Badge>, 'Nhận dữ liệu từ hệ thống khác, báo sự kiện ra URL của bạn (outbox, phát lại không trùng)'],
	];
	return (
		<div className="page">
			<div className="row mb8"><h1 className="h1 row gap8"><Ic.layers />Ứng dụng, API & Webhook</h1><span className="grow" /><Btn ghost sm><Ic.book />Tài liệu API ↗</Btn><Btn ghost sm><Ic.book />Tài liệu phát triển ứng dụng ↗</Btn></div>
			<div className="muted mb24">Cài ứng dụng để thêm tính năng, kết nối website và phần mềm khác qua API và webhook.</div>
			<div className="grid g3 mb24">
				{T.map(([id, I, t, b, d]) => (
					<div key={id} className={cx('card pad row gap16')} style={{ alignItems: 'flex-start', cursor: 'pointer', borderColor: tab === id ? 'var(--primary)' : undefined, background: tab === id ? 'var(--selected)' : undefined }} onClick={() => setTab(id)}>
						<div className="icon-circle" style={tab === id ? undefined : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}><I /></div>
						<div className="grow"><div className="row gap8"><b style={{ fontSize: 'var(--fs-lg)' }}>{t}</b>{b}</div><div className="muted sm mt8">{d}</div></div>
					</div>
				))}
			</div>
			{tab === 'apps' && (
				<>
					<div className="row mb16"><h2 className="h2">Ứng dụng đã cài</h2><span className="grow" /><Search placeholder="Tìm ứng dụng…" sm style={{ width: 300 }} /><Btn out icon title="Giới hạn chung"><Ic.cog /></Btn><Btn out><Ic.terminal />Phát triển ứng dụng</Btn><Btn pri><Ic.plus />Cài ứng dụng</Btn></div>
					<div className="grid g3">
						{apps.map((a) => (
							<div key={a.code} className="card pad">
								<div className="row gap16" style={{ alignItems: 'flex-start' }}>
									<div className="icon-circle" style={{ borderRadius: 14, fontWeight: 800, fontSize: 18, background: a.on ? 'var(--primary)' : 'var(--accent)', color: a.on ? '#fff' : 'var(--muted-foreground)' }}>{a.code}</div>
									<div className="grow"><b style={{ fontSize: 'var(--fs-lg)' }}>{a.name}</b><div className="muted sm">{a.by}</div><div className="row gap8 sm mt8">{a.on ? <Badge tone="ok" dot>Đang bật</Badge> : <Badge dot>Đang tắt</Badge>}<span className="muted">· {a.where}</span></div></div>
								</div>
								<div className="mt16">{a.desc}</div>
								<div className="row gap8 mt8">{a.slots.map((s) => <Badge key={s} tone="out">{s}</Badge>)}</div>
								<div className="row mt16">{a.cta === 'Dùng trong màn chat' ? <span className="muted grow">{a.cta}</span> : <Btn pri={a.on} out={!a.on} block>{a.cta}</Btn>}<Btn out icon><Ic.cog /></Btn></div>
							</div>
						))}
						<div className="gate" style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><div className="col" style={{ alignItems: 'center' }}><Ic.plus style={{ width: 32, height: 32, color: 'var(--muted-foreground)' }} /><b className="muted">Cài ứng dụng từ file .zip</b><span className="muted xs">Plugin WordPress khai module.json; kernel đọc khai báo, không đọc mã</span></div></div>
					</div>
				</>
			)}
			{tab === 'api' && (
				<div className="card pad">
					<div className="h3">Khoá API</div><div className="muted sm mb16">Mỗi khoá một ứng dụng; quyền theo người (principal) ở nguồn.</div>
					<table className="tbl"><thead><tr><th>Tên</th><th>Quyền</th><th>Dùng lần cuối</th><th className="r"></th></tr></thead><tbody>{[['Website hoamai.vn', 'contacts.read · message.send', '2 phút trước'], ['n8n tự động', 'contacts.read · broadcast.draft', 'Hôm qua']].map(([n, p, u]) => <tr key={n}><td><b>{n}</b></td><td className="muted sm">{p}</td><td className="muted sm">{u}</td><td className="r"><Btn ghost sm>Thu hồi</Btn></td></tr>)}</tbody></table>
					<Btn pri className="mt16"><Ic.plus />Tạo khoá</Btn>
					<div className="note sm mt16">GET /wp-json/bizcity-crm/v1/contacts?q=0912 — hợp đồng openapi.json; lỗi trả 4 trường code/message/hint/help_code.</div>
				</div>
			)}
			{tab === 'webhook' && (
				<div className="grid g2">
					<div className="card pad"><div className="h3">Nhận vào</div><div className="muted sm">Hệ thống khác gửi vào đây (ký HMAC, chống phát lại bằng doc_key).</div><div className="kbd mt16" style={{ display: 'block', padding: 10 }}>POST /wp-json/bizcity-crm/v1/hub/inbound</div><div className="kbd mt8" style={{ display: 'block', padding: 10 }}>POST /wp-json/bizcity-crm/v1/webhook/payment</div></div>
					<div className="card pad"><div className="h3">Gửi ra</div><div className="muted sm">Sự việc trong sổ phát ra URL của bạn qua outbox.</div><table className="tbl mt16"><tbody>{[['https://hooks.hoamai.vn/crm', 'message.received · contact.tagged', 'ok'], ['https://n8n.hoamai.vn/wh/abc', 'broadcast.*', 'warn']].map(([u, e, s]) => <tr key={u}><td><b className="sm">{u}</b><div className="muted xs">{e}</div></td><td className="r">{s === 'ok' ? <Badge tone="ok" dot>Giao được</Badge> : <Badge tone="warn" dot>Thử lại 2/5</Badge>}</td></tr>)}</tbody></table><Btn out sm className="mt16"><Ic.plus />Thêm URL</Btn></div>
				</div>
			)}
		</div>
	);
}
