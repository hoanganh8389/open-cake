// [2026-11-23 08:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-006 v0.2 — chủ: "mockup này chưa giống bộ giao diện chat tôi mong muốn" ⇒ dựng lại sát ảnh 3 Deplao:
// danh sách 440 px · khung chat không cột phải (bật bằng nút bảng bên) · nhãn nền đặc · dải Gợi ý AI · dải nhãn · 12 công cụ · ô nhập emoji + 👍.
import React, { useEffect, useRef, useState } from 'react';
import '../chat.css';
import { Ic, Btn, Sheet, cx } from '../ui.jsx';
import { Face, GroupAvatar, Tag, ChannelDot } from '../deplao.jsx';
import { go } from '../main.jsx';

const CONVS = [
	{ id: 'c1', name: 'Chị Hương (váy hoa)', at: '10:28', pin: true, pv: 'Dạ chị chuyển khoản rồi nhé, em check giúp chị', sq: ['#ef4444', '✓'], tags: ['Khách VIP', 'Đặt hàng'] },
	{ id: 'c2', name: 'Khách sỉ Hoa Mai 2026', at: '10:24', star: true, group: { emoji: '🛍️' }, pv: 'Minh: Lô váy hoa đợt 2 về chưa shop ơi?', at2: true, un: 12 },
	{ id: 'c3', name: 'Anh Khoa - sỉ HN', at: '10:16', pv: 'Anh lấy 20 bộ, báo giá sỉ giúp anh nha', un: 2, tags: ['Khách sỉ'] },
	{ id: 'c4', name: 'Lê Thảo Vy', at: '10:03', pv: '🖼️ Hình ảnh', sq: ['#22c55e', '▶'], un: 1, tags: ['Đặt hàng'] },
	{ id: 'c5', name: 'Quỳnh Chi (phụ kiện)', at: '09:42', pv: 'Lấy 2 cái có freeship không shop?', rp: true, tags: ['Khách VIP'] },
	{ id: 'c6', name: 'Hội yêu váy hoa', at: '09:15', group: { emoji: '🌸', bg: 'linear-gradient(135deg,#fb923c,#f97316)' }, pv: 'Hoa Mai: 🌸 BST Thu – Đông đã lên kệ!', rp: true },
	{ id: 'c7', name: 'Phạm Gia Bảo', at: '08:20', pv: 'File: Bao-gia-si-T10.pdf', sq: ['#ef4444', '✓'], rp: true, tags: ['Chờ phản hồi'] },
	{ id: 'c8', name: 'Võ Thanh Tùng', at: '07:20', pv: 'Mẫu này còn size 42 không ạ?', sq: ['#22c55e', '▶'], muted: true, rp: true },
	{ id: 'c9', name: 'Hoàng Mỹ Linh', at: '05:30', pv: 'Cảm ơn shop, váy đẹp lắm ạ 💕', rp: true, tags: ['Đặt hàng'] },
];
const LABELS = [['Chờ phản hồi', false], ['Đặt hàng', true], ['Khách sỉ', false], ['Khách VIP', true]];

const Panel = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>;
const Copy = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>;
const Kbd = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" /></svg>;
const Sticker = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M9 10h.01M15 10h.01M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" /></svg>;
const TOOLS = [Sticker, Ic.image, Ic.clip, Ic.video, Ic.mic, Ic.text, Ic.contact, Ic.card, Ic.bolt, Ic.tag, Ic.bot, Ic.dots];

function Dress({ color }) {
	return (
		<svg viewBox="0 0 100 140" width="120" height="168">
			<path d="M38 8q12 8 24 0l8 18-8 6 26 100H12L38 32l-8-6z" fill={color} />
			{[[40, 60], [58, 75], [35, 95], [62, 105], [48, 120], [70, 125], [28, 125]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="4" ry="2.4" fill="#fff" opacity=".9" />)}
		</svg>
	);
}

export default function Inbox({ sub = [], account }) {
	const [cur, setCur] = useState('c1');
	const [tab, setTab] = useState('all');
	const [info, setInfo] = useState(false);
	const [sug, setSug] = useState(true);
	const [labels, setLabels] = useState(LABELS);
	const [range, setRange] = useState('week');
	const sync = sub[0] === 'sync';
	const msgsRef = useRef(null);
	useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [cur, sug, info]);
	const conv = CONVS.find((c) => c.id === cur);
	const avatar = (c, size = 56) => (c.group ? <GroupAvatar size={size} emoji={c.group.emoji} bg={c.group.bg} /> : <Face name={c.name} size={size} />);

	return (
		<div className="page flush">
			<div className={cx('dinbox', info && 'info')}>
				{/* ---------- danh sách hội thoại ---------- */}
				<section className="dlist">
					<div className="top"><div className="sbox"><Ic.search />Tìm kiếm...</div><button className="plus" title="Tin mới"><Ic.plus style={{ width: 24, height: 24 }} /></button></div>
					<div className="tabs2">
						<button className={cx(tab === 'all' && 'on')} onClick={() => setTab('all')}>Tất cả</button>
						<button className={cx(tab === 'unread' && 'on')} onClick={() => setTab('unread')}>Chưa đọc <span className="cnt">3</span></button>
						<button className={cx(tab === 'label' && 'on')} onClick={() => setTab('label')}>Nhãn</button>
						<button title="Thêm"><Ic.dots style={{ width: 20, height: 20 }} /></button>
					</div>
					<div className="items">
						{CONVS.filter((c) => tab !== 'unread' || c.un).map((c) => (
							<div key={c.id} className={cx('ditem', cur === c.id && 'on')} onClick={() => setCur(c.id)}>
								{avatar(c)}
								<div className="b">
									<div className="r1">
										{c.pin && <span style={{ color: '#ef4444' }}>📍</span>}
										{c.star && <span style={{ color: '#6b7280' }}>☆</span>}
										<span className="nm">{c.name}</span><span className="tm">{c.at}</span>
									</div>
									<div className="r2">
										<span className="pv">{c.sq && <span className="sq" style={{ background: c.sq[0] }}>{c.sq[1]}</span>}{c.pv}</span>
										{c.muted && <span style={{ color: 'var(--subtle-foreground)' }}>🔇</span>}
										{c.at2 && <span className="at">@</span>}
										{c.un ? <span className="un">{c.un}</span> : c.rp ? <Ic.back className="rp" /> : null}
									</div>
									{c.tags && <div className="tags">{c.tags.map((t) => <Tag key={t} name={t} />)}</div>}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ---------- khung chat ---------- */}
				<section className="dchat">
					<div className="hd">
						{avatar(conv, 56)}
						<div style={{ flex: 1, minWidth: 0 }}>
							<div className="nm">{conv.name}<Copy className="mi" /><Ic.refresh className="mi" /><Ic.edit className="mi" /></div>
							<div className="tags"><Tag name="Đã chốt đơn" size="md" />{(conv.tags || []).map((t) => <Tag key={t} name={t} size="md" />)}</div>
						</div>
						<button className="ri" title="Tìm trong hội thoại"><Ic.search /></button>
						<button className="ri" title="Trợ lý"><Ic.bot /></button>
						<button className="ri" title="Liên kết"><Ic.link /></button>
						<button className="ri" title="Thông tin hội thoại" onClick={() => setInfo(!info)}><Panel /></button>
					</div>

					<div className="msgs" ref={msgsRef}>
						<div className="dmsg out"><div className="bb">Dạ còn chị ơi! Mẫu này shop có 3 màu: hồng, xanh mint và vàng ạ 🌸<span className="ts">09:14</span></div></div>
						<div className="dmsg out">
							<div className="img">
								<div className="pic"><Dress color="#e0537a" /><Dress color="#4fd1a5" /><Dress color="#d4b04a" /><span style={{ position: 'absolute', right: 24, top: 16, width: 70, height: 70, borderRadius: '50%', background: '#fff', opacity: .6 }} /></div>
								<div className="cap">Váy hoa Thu – Đông · 3 màu</div>
								<span className="tp">09:14</span>
							</div>
						</div>
						<div className="dmsg"><Face name={conv.name} size={40} /><div className="bb">Chị lấy 2 cái màu hồng size M nhé. Có freeship không em?<span className="ts">09:18</span><span className="re" style={{ right: 16 }}>❤️</span></div></div>
						<div className="dmsg out" style={{ maxWidth: '88%' }}><div className="bb">Đơn từ 2 sản phẩm shop freeship toàn quốc luôn ạ. Tổng 2 váy là 780.000đ, chị gửi giúp em địa chỉ nhận hàng nhé!<span className="ts">09:19</span><span className="re" style={{ left: 8 }}>👍</span></div></div>
						<div className="dmsg"><Face name={conv.name} size={40} /><div className="bb">12 Nguyễn Trãi, P. Bến Thành, Q.1, TP.HCM — 0912 345 671<span className="ts">09:22</span></div></div>
						<div className="dmsg out"><div className="bb"><div className="file"><span className="pdf">PDF</span><div style={{ flex: 1 }}><b>Hoa-don-HM1024.pdf</b><div className="muted" style={{ fontSize: 15 }}>177.86 KB Nhấn để tải</div></div><Ic.download style={{ width: 22, height: 22, color: 'var(--muted-foreground)' }} /></div><span className="ts">09:24</span></div></div>
						<div className="dmsg"><Face name={conv.name} size={40} /><div className="bb">Dạ chị chuyển khoản rồi nhé, em check giúp chị<span className="ts">10:28</span></div></div>
					</div>

					{/* Gợi ý AI — chỉ hiện khi có Zalo Brain (cell). Không có ⇒ dải này không render. */}
					{sug && (
						<div className="dsug">
							<span className="lb">✦ Gợi ý AI</span>
							{['Dạ shop nhận được rồi ạ, đơn của chị sẽ giao trong 2–3 ngày 🌸', 'Em cảm ơn chị! Shop đóng gói và gửi mã vận đơn cho chị ngay ạ', 'Chị cần shop xuất hoá đơn VAT không ạ?'].map((s) => <button key={s} className="s">{s}</button>)}
							<button className="x" onClick={() => setSug(false)} title="Ẩn gợi ý"><Ic.x style={{ width: 20, height: 20 }} /></button>
						</div>
					)}
					<div className="dlabels">
						{labels.map(([n, on], i) => <span key={n} onClick={() => setLabels(labels.map((l, j) => (j === i ? [l[0], !l[1]] : l)))}><Tag name={n} size="lg" on={on} check={on} /></span>)}
						<span className="xr" title="Đóng dải nhãn">✕</span>
					</div>
					<div className="dtools">
						{TOOLS.map((T, i) => <button key={i} className={cx(i === 10 && 'on')}><T /></button>)}
						<span style={{ flex: 1 }} /><button title="Phím tắt"><Kbd /></button>
					</div>
					<div className="dinput">
						<span className="ph">Nhập @tên để tag, Shift+Enter xuống dòng, Enter gửi...</span>
						<Ic.smile className="em" />
						<span className="like" title="Gửi nhanh 👍 (đổi thành nút Gửi khi có chữ)">👍</span>
					</div>
				</section>

				{/* ---------- thông tin hội thoại (bật bằng nút bảng bên) ---------- */}
				{info && (
					<aside className="dinfo">
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
							<div style={{ position: 'relative' }}><Face name={conv.name} size={88} /><ChannelDot ch="Z" size={24} /></div>
							<div style={{ fontSize: 20, fontWeight: 600 }}>{conv.name}</div>
							<div className="muted">Nguyễn Thu Hương · 0912 345 671</div>
						</div>
						<h4>Nhãn</h4><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(conv.tags || []).map((t) => <Tag key={t} name={t} size="md" />)}</div>
						<h4>Ghi chú</h4><div className="card pad" style={{ padding: 12 }}>Khách quen, hay đặt váy hoa size M. Thích màu hồng. — Lan, 18/10</div>
						<h4>Người phụ trách</h4><div className="row"><Face name="Nguyễn Thị Lan" size={32} />Nguyễn Thị Lan</div>
						<h4>Trợ lý</h4><Btn out block><Ic.sparkle />Hỏi trợ lý về khách này</Btn>
					</aside>
				)}
			</div>

			<Sheet open={sync} onClose={() => go('inbox')} icon={Ic.phone} title="Đồng bộ tin nhắn từ điện thoại" sub={account?.name || 'Shop Hoa Mai'}
				footer={<><Btn ghost onClick={() => go('inbox')}>Đóng</Btn><Btn pri onClick={() => go('inbox')}>Bắt đầu đồng bộ</Btn></>}>
				<p style={{ fontSize: 17, lineHeight: 1.7, margin: 0 }}>Lấy tin nhắn trên Zalo điện thoại trong khoảng thời gian bạn chọn và ghép vào đúng các hội thoại trên Open CRM.</p>
				<ol style={{ paddingLeft: 0, listStyle: 'none', lineHeight: 1.9, fontSize: 17 }}>
					<li>1. Bấm <b>Bắt đầu đồng bộ</b>.</li>
					<li>2. Mở Zalo trên điện thoại, chọn <b>Đồng ý</b> ở yêu cầu đồng bộ tin nhắn (thiết bị "Web").</li>
					<li>3. Giữ Zalo mở trên điện thoại tới khi tải xong. Tin đã có sẽ được bỏ qua nên có thể đồng bộ lại nhiều lần.</li>
				</ol>
				<div style={{ fontWeight: 600, marginTop: 8 }}>Khoảng thời gian cần đồng bộ</div>
				<div className="row mt8">{[['week', '1 tuần gần nhất'], ['pick', 'Chọn ngày'], ['all', 'Toàn bộ']].map(([id, l]) => <Btn key={id} pri={range === id} block onClick={() => setRange(id)}>{l}</Btn>)}</div>
				<div className="muted sm mt8">Từ 12/10/2026 đến nay.</div>
			</Sheet>
		</div>
	);
}
