// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-011 — Kết nối mở rộng (ảnh 7 Deplao): Tất cả · POS/Bán hàng · Thanh toán · Vận chuyển · Tin nhắn · Trợ lý AI. Thẻ nào cần plugin khác thì nói rõ.
import React, { useState } from 'react';
import { Ic, Btn, Badge, Tabs, Gate } from '../ui.jsx';
import { integrations } from '../data.js';

const TABS = [
	{ id: 'all', label: 'Tất cả', icon: Ic.grid }, { id: 'pos', label: 'POS / Bán hàng', icon: Ic.store }, { id: 'pay', label: 'Thanh toán', icon: Ic.card },
	{ id: 'ship', label: 'Vận chuyển', icon: Ic.truck }, { id: 'msg', label: 'Tin nhắn', icon: Ic.chat }, { id: 'ai', label: 'Trợ lý AI', icon: Ic.bot },
];

function Section({ icon: Icon, title, sub, action, children }) {
	return (
		<div className="mb24">
			<div className="row mb16"><div className="icon-circle" style={{ width: 44, height: 44 }}><Icon style={{ width: 22, height: 22 }} /></div><div className="grow"><div className="h3">{title}</div><div className="muted sm">{sub}</div></div>{action}</div>
			<div className="grid g3">{children}</div>
		</div>
	);
}
function Tile({ icon: Icon, name, desc, on, badge, bizcity, need }) {
	return (
		<div className="card pad">
			<div className="row gap16" style={{ alignItems: 'flex-start' }}>
				<div className="icon-circle" style={{ width: 48, height: 48, background: bizcity ? 'var(--primary-soft)' : 'var(--muted)', color: bizcity ? 'var(--primary)' : 'var(--muted-foreground)' }}><Icon style={{ width: 22, height: 22 }} /></div>
				<div className="grow"><div className="row gap8"><b style={{ fontSize: 'var(--fs-lg)' }}>{name}</b>{badge && <Badge tone="pri">{badge}</Badge>}{bizcity && <Badge tone="out">Bizcity</Badge>}</div><div className="muted sm mt8">{desc}</div></div>
			</div>
			<div className="row mt16">{need ? <Badge tone="warn" dot>Cần {need}</Badge> : on ? <Badge tone="ok" dot>Đã kết nối</Badge> : <Badge dot>Chưa kết nối</Badge>}<span className="grow" />{need ? <Btn out sm>Cài {need}</Btn> : <Btn out sm>{on ? 'Cấu hình' : 'Kết nối'}</Btn>}</div>
		</div>
	);
}

export default function Integrations() {
	const [tab, setTab] = useState('all');
	const show = (k) => tab === 'all' || tab === k;
	return (
		<div className="page">
			<div className="row mb16"><div className="icon-circle" style={{ width: 44, height: 44 }}><Ic.layers style={{ width: 22, height: 22 }} /></div><h1 className="h1">Kết nối mở rộng</h1><span className="muted">Kết nối nền tảng bên ngoài</span><span className="grow" /><Badge tone="ok" dot>Đang nhận webhook</Badge></div>
			<div className="mb24"><Tabs items={TABS} value={tab} onChange={setTab} /></div>

			{show('ai') && (
				<>
					<div className="note mb24 row gap16"><div className="icon-circle" style={{ width: 40, height: 40 }}><Ic.sparkle style={{ width: 20, height: 20 }} /></div><div className="grow"><b>Trợ lý AI đến từ Zalo Brain.</b> Gợi ý trả lời, hỏi đáp trong hội thoại, node AI trong kịch bản, chatbot 24/7 — tất cả do cell của Zalo Brain làm. Open CRM không giữ khoá LLM.</div><Btn out sm>Hướng dẫn →</Btn></div>
					<Section icon={Ic.bot} title="Trợ lý AI" sub="2 trợ lý · Agent Guru của Zalo Brain · tự động gợi ý trả lời, chat với AI, knowledge base" action={<Btn out sm>Quản lý →</Btn>}>
						{integrations.ai.map((a) => <Tile key={a.name} icon={Ic.bot} name={a.name} desc={a.meta} on={a.on} badge={a.def ? 'MẶC ĐỊNH' : undefined} />)}
						<Tile icon={Ic.globe} name="Facebook / Messenger" desc="Facebook kết nối qua Composio của Zalo Brain; trợ lý trả lời và ghi sổ cho bạn. Tin Facebook vào cùng hộp thư." need="Zalo Brain" />
					</Section>
				</>
			)}
			{show('pos') && <Section icon={Ic.store} title="POS / Bán hàng" sub="6 nền tảng · 3 đã kết nối">{integrations.pos.map((p) => <Tile key={p.name} icon={Ic.store} name={p.name} desc={p.desc} on={p.on} bizcity={p.bizcity} />)}</Section>}
			{show('pay') && <Section icon={Ic.card} title="Thanh toán" sub="3 nền tảng · 3 đã kết nối">{integrations.pay.map((p) => <Tile key={p.name} icon={Ic.wallet} name={p.name} desc={p.desc} on={p.on} bizcity={p.bizcity} />)}</Section>}
			{show('ship') && <Section icon={Ic.truck} title="Vận chuyển" sub="3 nền tảng · tra cứu vận đơn trong chat">{integrations.ship.map((p) => <Tile key={p.name} icon={Ic.truck} name={p.name} desc={p.desc} on={p.on} />)}</Section>}
			{show('msg') && <Section icon={Ic.chat} title="Tin nhắn" sub="Kênh báo và kênh phụ">{integrations.msg.map((p) => <Tile key={p.name} icon={p.name === 'Telegram' ? Ic.send : Ic.mail} name={p.name} desc={p.desc} on={p.on} />)}</Section>}
			{tab === 'all' && <Gate need="Automation" why="Webhook thanh toán và đơn hàng kích hoạt kịch bản 'Khi nhận thanh toán' / 'Khi phần mềm bán hàng gửi webhook'. Kịch bản chạy bởi bizcity-automation; không có thì webhook vẫn ghi sổ nhưng không tự làm gì tiếp." />}
		</div>
	);
}
