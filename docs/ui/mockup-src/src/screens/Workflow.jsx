// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-012 — Kịch bản tự động (ảnh 5 + 6 Deplao). Open CRM chỉ là "chỗ đặt": canvas, palette, trợ lý thiết kế do bizcity-automation (cell-first) cung cấp.
// Không có bizcity-automation ⇒ màn này hiện thẻ Gate. Có ⇒ nhúng SPA của automation vào vùng này (cùng token, cùng rail).
import React, { useState } from 'react';
import { Ic, Btn, Badge, Search, Sheet, Gate, cx } from '../ui.jsx';
import { workflowNodes, triggers } from '../data.js';

const PORTS = { hoiGia: 'hỏi giá', datHang: 'đặt hàng', khieuNai: 'khiếu nại', macDinh: 'Mặc định' };

function Edge({ from, to }) {
	const x1 = from.x + 130, y1 = from.y + 96, x2 = to.x + 130, y2 = to.y;
	const c = (y2 - y1) / 2;
	return <path d={`M${x1},${y1} C${x1},${y1 + c} ${x2},${y2 - c} ${x2},${y2}`} fill="none" stroke="var(--border-strong)" strokeWidth="2" />;
}

export default function Workflow() {
	const [hasAutomation] = useState(true);
	const [ai, setAi] = useState(false);
	const [inspect, setInspect] = useState(false);
	if (!hasAutomation) {
		return (
			<div className="page"><h1 className="h1 mb16">Kịch bản tự động</h1>
				<Gate need="Automation" why="Kịch bản (trigger → logic → hành động) do plugin bizcity-automation dựng và chạy, cell thực thi. Open CRM chỉ cung cấp sự việc (tin vào, gắn nhãn, gửi hàng loạt) và hành động (gửi tin, gắn nhãn)." />
			</div>
		);
	}
	const byId = Object.fromEntries(workflowNodes.map((n) => [n.id, n]));
	return (
		<div className="page flush">
			<div className="row" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
				<Btn ghost sm><Ic.back />Quay lại</Btn>
				<input className="input sm" style={{ width: 300, fontWeight: 600 }} defaultValue="AI phân loại tin nhắn & tư vấn" readOnly />
				<Badge tone="pri">Kênh: Zalo</Badge><Btn out sm><Ic.user />Shop Hoa Mai <Ic.chevron /></Btn>
				<Badge tone="out">bizcity-automation · cell-first</Badge>
				<span className="grow" />
				<Btn out sm><Ic.download />Xuất</Btn><Btn out sm><Ic.upload />Nhập</Btn>
				<Btn sm onClick={() => setAi(true)}><Ic.sparkle />Trợ lý thiết kế</Btn>
				<label className="row gap8 sm"><span style={{ width: 40, height: 22, borderRadius: 11, background: 'var(--primary)', position: 'relative', display: 'inline-block' }}><i style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, borderRadius: 9, background: '#fff' }} /></span>Bật</label>
				<Btn out sm><Ic.target />Mô phỏng</Btn><Btn out sm><Ic.play />Chạy thử</Btn><Btn pri sm><Ic.check />Lưu</Btn>
			</div>
			<div className="grow" style={{ display: 'grid', gridTemplateColumns: inspect ? '300px 1fr 420px' : '300px 1fr', minHeight: 0 }}>
				<aside className="palette">
					<div className="muted sm mb8">Kéo node vào sơ đồ</div>
					<Search placeholder="Tìm node…" sm />
					<div className="row mt16 mb8"><span className="h3 row gap8" style={{ fontSize: 'var(--fs-sm)', letterSpacing: '.06em' }}><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)' }} />KÍCH HOẠT</span><span className="grow" /><span className="muted sm">10</span><Ic.chevron style={{ width: 16, height: 16 }} /></div>
					{triggers.map(([ic, t, d]) => { const T = Ic[ic]; return <div key={t} className="pitem"><div className="ic"><T /></div><div><b>{t}</b><span>{d}</span></div></div>; })}
					<div className="row mt16"><span className="h3 row gap8" style={{ fontSize: 'var(--fs-sm)', letterSpacing: '.06em' }}><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)' }} />HÀNH ĐỘNG</span><span className="grow" /><span className="muted sm">21</span><Ic.chevron style={{ width: 16, height: 16 }} /></div>
				</aside>
				<section className="canvas">
					<svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
						<Edge from={byId.n1} to={byId.n2} /><Edge from={byId.n2} to={byId.n3} /><Edge from={byId.n3} to={byId.n4} />
						<Edge from={byId.n4} to={byId.n5} /><Edge from={byId.n4} to={byId.n6} /><Edge from={byId.n4} to={byId.n7} />
					</svg>
					{workflowNodes.map((n) => { const T = Ic[n.icon]; return (
						<div key={n.id} className="node" style={{ left: n.x, top: n.y, cursor: 'pointer' }} onClick={() => setInspect(n.id === 'n3' ? !inspect : inspect)}>
							{n.start && <Badge tone="pri" style={{ position: 'absolute', top: -12, left: 8 }}><Ic.sparkle style={{ width: 12, height: 12 }} />Bắt đầu</Badge>}
							{!n.start && <span className="port in" />}
							<div className="nh"><div className="ic"><T /></div><div><small>{n.kind}</small><b>{n.title}</b></div></div>
							<div className="nb">{n.body}</div>
							{n.id === 'n2' && <div className="row" style={{ justifyContent: 'space-around', padding: '0 20px 8px' }}><Badge tone="ok">Đúng</Badge><Badge tone="err">Sai</Badge></div>}
							{n.id === 'n4' && <div className="row" style={{ justifyContent: 'space-around', padding: '0 8px 8px' }}>{Object.values(PORTS).map((p) => <Badge key={p} tone={p === 'Mặc định' ? '' : 'warn'}>{p}</Badge>)}</div>}
							<span className="port outp" />
						</div>
					); })}
					<div className="card" style={{ position: 'absolute', left: 20, top: 20, padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
						{[Ic.plus, Ic.x, Ic.target, Ic.lock].map((T, i) => <button key={i} className="menu-dots"><T style={{ width: 18, height: 18 }} /></button>)}
					</div>
					<Btn out sm style={{ position: 'absolute', right: 20, top: 20 }}><Ic.grid />Sắp xếp tự động</Btn>
					<div className="card sm muted" style={{ position: 'absolute', left: '50%', bottom: 60, transform: 'translateX(-50%)', padding: '8px 14px' }}>Chọn liên kết rồi bấm <span className="kbd">×</span> hoặc <span className="kbd">Del</span> để xoá</div>
					<div className="row" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '0 16px' }}><Ic.warn style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} /><Ic.note style={{ width: 16, height: 16 }} /><b className="sm">Lịch sử chạy</b><Badge>8</Badge><span className="grow" /><span className="muted sm">Click để mở rộng</span></div>
				</section>
				{inspect && (
					<aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--card)', overflow: 'auto', padding: 20 }}>
						<div className="row" style={{ alignItems: 'flex-start' }}><div className="icon-circle"><Ic.sparkle /></div><div className="grow"><div className="xs subtle">AI</div><div className="h2">AI phân loại ý định</div><div className="muted sm">AI tự phân loại tin nhắn vào danh mục (hỏi giá, khiếu nại…). Loại: Phân loại văn bản bằng AI</div></div><button className="menu-dots" onClick={() => setInspect(false)}><Ic.x style={{ width: 18, height: 18 }} /></button></div>
						<div className="card pad mt24">
							<div className="row"><span className="h3 row gap8"><Ic.cog style={{ width: 18, height: 18 }} />Trợ lý AI</span><span className="grow" /><span className="muted sm">2 mục</span></div>
							<label className="sm muted mt16" style={{ display: 'block' }}>Cách cấu hình AI</label>
							<select className="input mt8" defaultValue="g"><option value="g">Chọn trợ lý AI đã tạo (Agent Guru của Zalo Brain)</option></select>
							<div className="muted sm mt8">Open CRM không giữ khoá LLM (R-OC-BRAIN-1). Trợ lý là Agent Guru của Zalo Brain, cấu hình ở một nơi.</div>
							<label className="sm muted mt16" style={{ display: 'block' }}>Chọn trợ lý</label>
							{[['Trợ lý bán hàng', 'Agent Guru · mặc định', true], ['CSKH Hoa Mai', 'Agent Guru']].map(([n, m, on]) => <div key={n} className={cx('card pad row mt8')} style={{ padding: 12, borderColor: on ? 'var(--primary)' : undefined }}><div className="icon-circle" style={{ width: 40, height: 40 }}><Ic.bot style={{ width: 20, height: 20 }} /></div><div className="grow"><b style={{ color: on ? 'var(--primary)' : undefined }}>{n}</b><div className="muted sm">{m}</div></div>{on && <Ic.check style={{ color: 'var(--primary)' }} />}</div>)}
						</div>
						<div className="card pad mt16">
							<div className="row"><span className="h3 row gap8"><Ic.chat style={{ width: 18, height: 18 }} />Nội dung</span><span className="grow" /><span className="muted sm">2 mục</span></div>
							<div className="row mt16"><label className="sm muted grow">Văn bản cần phân loại</label><Badge tone="pri">{'{ }'} Chèn biến · 1</Badge></div>
							<input className="input mt8" defaultValue="{{ $trigger.content }}" readOnly style={{ fontFamily: 'ui-monospace, monospace' }} />
							<div className="muted sm mt8">Nội dung tin nhắn cần được AI phân loại.</div>
						</div>
						<div className="row mt16"><Badge tone="out">{'{ }'} Biến động</Badge><span className="grow" /><Btn out sm><Ic.plus />Output node</Btn><Btn pri sm>{'{ }'} Chèn biến</Btn></div>
					</aside>
				)}
			</div>

			<Sheet open={ai} onClose={() => setAi(false)} icon={Ic.sparkle} title="Trợ lý thiết kế kịch bản" sub="Kênh Zalo · 7 node trên sơ đồ · trò chuyện để trợ lý phân tích và đề xuất kịch bản (cell của Zalo Brain)" wide
				footer={<><Btn>Thay thế kịch bản</Btn><Btn pri onClick={() => setAi(false)}><Ic.sparkle />Thêm vào kịch bản</Btn></>}>
				<div className="grid g2" style={{ gridTemplateColumns: '1fr 1fr' }}>
					<div className="col" style={{ gap: 12 }}>
						<div className="card pad" style={{ background: 'var(--selected)', borderColor: 'var(--bubble-out-border)', alignSelf: 'flex-end', maxWidth: '90%' }}>Nếu AI không phân loại được (nhánh "khác") thì chào khách, gắn nhãn Chờ phản hồi và báo nhân viên trực qua Telegram giúp mình</div>
						<div className="card pad" style={{ maxWidth: '90%' }}>
							Mình thêm 3 bước vào nhánh <b>"khác"</b> của node <i>Rẽ nhánh theo ý định</i>:
							<ol style={{ paddingLeft: 18, lineHeight: 1.8 }}><li><b>Chào khách</b> — gửi tin chào kèm biểu tượng 🌸</li><li><b>Gắn nhãn "Chờ phản hồi"</b> để nhân viên lọc nhanh</li><li><b>Báo nhân viên trực</b> qua Telegram kèm nội dung khách hỏi</li></ol>
							Xem trước sơ đồ bên phải rồi bấm <b>Thêm vào</b> để áp dụng.
						</div>
						<div className="card pad" style={{ borderColor: 'var(--primary)' }}><div className="row gap8"><Badge tone="ok">v1</Badge><b>Chào khách + báo nhân viên trực khi AI không chắc</b></div><div className="row wrap gap16 mt8 sm"><span className="row gap8"><Ic.send style={{ width: 16, height: 16 }} />Chào khách</span><span className="row gap8"><Ic.tag style={{ width: 16, height: 16 }} />Gắn nhãn "Chờ phản hồi"</span><span className="row gap8"><Ic.bell style={{ width: 16, height: 16 }} />Báo nhân viên trực</span></div><a className="sm mt8" style={{ display: 'block' }}>Đang xem trước →</a></div>
						<div className="row mt16"><input className="input" placeholder="Trả lời trợ lý hoặc yêu cầu chỉnh sửa…" readOnly /><Btn pri icon><Ic.send /></Btn></div>
						<div className="muted xs">Enter để gửi · Shift+Enter xuống dòng · Trợ lý bán hàng (Agent Guru)</div>
					</div>
					<div>
						<div className="xs subtle" style={{ letterSpacing: '.06em' }}>BẢN ĐỀ XUẤT</div>
						<div className="h3 mt8">Chào khách + báo nhân viên trực khi AI không chắc</div>
						<div className="muted sm">Nhánh "khác": gửi lời chào, gắn nhãn Chờ phản hồi và báo nhân viên trực qua Telegram.</div>
						<div className="row gap8 mt8"><Badge>Thêm / sửa trên sơ đồ</Badge><Badge tone="ok">+3 node mới</Badge><Badge>9 liên kết</Badge></div>
						<div className="canvas mt16" style={{ height: 260, borderRadius: 12, border: '1px solid var(--border)' }}>
							<div className="row gap16 sm" style={{ position: 'absolute', left: 12, top: 12, background: 'var(--card)', padding: '4px 10px', borderRadius: 8 }}><span className="row gap8"><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--success)' }} />Mới</span><span className="row gap8"><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--warning)' }} />Sửa</span><span className="row gap8"><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--border-strong)' }} />Giữ nguyên</span></div>
							{[0, 1, 2].map((i) => <div key={i} className="node" style={{ left: 300, top: 40 + i * 70, width: 180, borderColor: 'var(--success)' }}><div className="nh"><div className="ic">{[<Ic.send />, <Ic.tag />, <Ic.bell />][i]}</div><div><small>HÀNH ĐỘNG</small><b>{['Chào khách', 'Gắn nhãn "Chờ phản hồi"', 'Báo nhân viên trực'][i]}</b></div></div></div>)}
						</div>
						<div className="note sm mt16 row gap8" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)' }}><Ic.check style={{ width: 16, height: 16, color: 'var(--success)' }} />Đã kiểm tra: đúng 1 trigger, node và liên kết hợp lệ, biến dùng đúng.</div>
						<div className="xs subtle mt16" style={{ letterSpacing: '.06em' }}>THAY ĐỔI</div>
						{[['Chào khách', 'Gửi tin nhắn'], ['Gắn nhãn "Chờ phản hồi"', 'Gắn nhãn hội thoại'], ['Báo nhân viên trực', 'Gửi tin qua Telegram']].map(([a, b]) => <div key={a} className="row mt8"><b>{a}</b><span className="muted sm">{b}</span><span className="grow" /><Badge tone="ok">MỚI</Badge></div>)}
					</div>
				</div>
			</Sheet>
		</div>
	);
}
