// [2026-11-23 08:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-002/006 v0.2 — chủ: "mockup chưa giống bộ giao diện chat tôi mong muốn" ⇒ bám sát Deplao:
// avatar minh hoạ (trên site thật = ảnh đại diện Zalo), nhãn nền đặc theo màu người dùng chọn cho nhãn (là DỮ LIỆU, không phải trang trí), huy hiệu kênh.
import React from 'react';

const hash = (s = '') => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };
const FEMALE = /(chị|thị|vy|linh|chi|hương|thảo|lan|yến|mai|ngọc|hoa|my|anh thư|trang|hằng)/i;
export const isFemale = (n) => FEMALE.test(n) && !/(anh khoa|đức anh|hải nam|gia bảo|thanh tùng|văn minh|quốc bảo|tuấn)/i.test(n);

const BG = ['#fde2e4', '#e0f2fe', '#ede9fe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff'];
const SKIN = ['#f6cfae', '#ecb894', '#d9a07a', '#f3d6bf'];
const HAIR = ['#2b1d16', '#3d2a20', '#1f1f1f', '#5a3a26'];
const SHIRT = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

/** Avatar minh hoạ kiểu Deplao. Trên site thật dùng ảnh đại diện Zalo; cái này chỉ để bản mẫu nhìn giống. */
export function Face({ name = '', size = 56, female, style }) {
	const h = hash(name);
	const f = female ?? isFemale(name);
	const bg = BG[h % BG.length], skin = SKIN[(h >>> 3) % SKIN.length], hair = HAIR[(h >>> 5) % HAIR.length], shirt = SHIRT[(h >>> 7) % SHIRT.length];
	const glasses = h % 5 === 0;
	return (
		<svg viewBox="0 0 64 64" width={size} height={size} style={{ borderRadius: '50%', flex: 'none', display: 'block', ...style }} aria-label={name}>
			<circle cx="32" cy="32" r="32" fill={bg} />
			{f && <path d="M18 30c-1-11 5-18 14-18s15 7 14 18c0 7 1 14 3 19H15c2-5 3-12 3-19z" fill={hair} />}
			<path d="M9 64c2-11 11-17 23-17s21 6 23 17z" fill={shirt} />
			<rect x="27.5" y="37" width="9" height="10" rx="3" fill={skin} />
			<circle cx="32" cy="28" r="11.5" fill={skin} />
			{f
				? <path d="M20.5 27c0-9 5-14 11.5-14S44 18 43.5 27c-4-1-8-4-10-8-2 4-7 7-13 8z" fill={hair} />
				: <path d="M20.5 26c0-8 5-12.5 11.5-12.5S43.5 18 43.5 26c-2-3-5-5-9-5.5-5 0-9 2-14 5.5z" fill={hair} />}
			<circle cx="28" cy="29" r="1.4" fill="#1f1f1f" /><circle cx="36" cy="29" r="1.4" fill="#1f1f1f" />
			<path d="M29 33.5q3 2.2 6 0" stroke="#9a4b3b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
			{glasses && <g stroke="#3a3a3a" strokeWidth="1.2" fill="none"><circle cx="28" cy="29" r="3.2" /><circle cx="36" cy="29" r="3.2" /><path d="M31.2 29h1.6" /></g>}
		</svg>
	);
}

/** Avatar nhóm: tròn màu + biểu tượng (Deplao dùng ảnh nhóm). */
export function GroupAvatar({ size = 56, emoji = '🛍️', bg = 'linear-gradient(135deg,#f472b6,#fb7185)' }) {
	return <span style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', fontSize: size * 0.42, flex: 'none' }}>{emoji}</span>;
}

/** Nhãn: màu do người dùng chọn khi tạo nhãn (bảng màu preset như Deplao). */
export const TAGS = {
	'Đã chốt đơn': { bg: '#ef4444', ic: '✅' },
	'Đặt hàng': { bg: '#f97316', ic: '🛒' },
	'Khách VIP': { bg: '#f59e0b', ic: '⭐' },
	'Khách sỉ': { bg: '#a855f7', ic: '📦' },
	'Chờ phản hồi': { bg: '#0ea5e9', ic: '⏳' },
};
export function Tag({ name, size = 'sm', on = true, check }) {
	const t = TAGS[name] || { bg: '#64748b', ic: '🏷️' };
	return (
		<span className={`dtag ${size}${on ? '' : ' off'}`} style={{ '--tag': t.bg }}>
			<span className="ti">{t.ic}</span>{name}{check && <span className="tc">✓</span>}
		</span>
	);
}

/** Huy hiệu kênh góc trên trái avatar: Zalo (Z xanh), Facebook (f), Telegram (máy bay). */
export function ChannelDot({ ch, size = 18 }) {
	const s = { position: 'absolute', top: -2, left: -2, width: size, height: size, borderRadius: '50%', background: '#fff', border: '2px solid #1f6bf2', color: '#1f6bf2', fontSize: size * 0.55, fontWeight: 900, display: 'grid', placeItems: 'center', lineHeight: 1, zIndex: 2 };
	if (ch === 'F') return <span style={{ ...s, background: '#1877f2', color: '#fff', borderColor: '#fff' }}>f</span>;
	if (ch === 'B' || ch === 'T') return <span style={{ ...s, borderColor: '#229ed9', color: '#229ed9' }}>➤</span>;
	return <span style={s}>Z</span>;
}

/** Hình đại diện tài khoản trên rail (bản mẫu): shop = vòng màu + chữ; người = Face; bot = xanh lá. */
export const RAIL_LOOK = {
	a1: { text: 'HM', bg: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
	a2: { face: 'Hoa Mai CSKH chị' },
	a3: { text: 'KS', bg: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
	a4: { face: 'Ngọc Lan Sale chị' },
	a5: { text: 'HF', bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
	a6: { text: 'HO', bg: 'linear-gradient(135deg,#0ea5e9,#0369a1)' },
	a7: { emoji: '🤖', bg: '#10b981' },
};
export function AccountAvatar({ a, size = 56 }) {
	const l = RAIL_LOOK[a.id] || { text: a.name.slice(0, 2).toUpperCase(), bg: '#64748b' };
	if (l.face) return <Face name={l.face} size={size} />;
	return <span style={{ width: size, height: size, borderRadius: '50%', background: l.bg, color: '#fff', fontWeight: 800, fontSize: size * 0.34, display: 'grid', placeItems: 'center' }}>{l.emoji || l.text}</span>;
}
