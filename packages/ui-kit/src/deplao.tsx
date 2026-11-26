// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
import { useState } from 'react';
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-1: thành phần kiểu Deplao từ bản mẫu duyệt (deplao.jsx): avatar minh hoạ, nhãn nền đặc,
//   huy hiệu kênh — nay theo enum kênh của hợp đồng (zalo_* / facebook_*), không theo id tài khoản bản mẫu. Thêm ChannelBadge chữ (R-CAKE-UI-5).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang packages/ui-kit/src/vi.ts.
import type { CSSProperties } from 'react';
import { CHANNEL_LABEL_VI, FEMALE_NAME, MALE_NAME_EXCEPTIONS, TAG_LOOK_VI } from './vi.js';

const hash = (s = '') => { let h = 0; for (const c of s) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0; return h; };
export const isFemale = (n: string) => FEMALE_NAME.test(n) && !MALE_NAME_EXCEPTIONS.test(n);

const BG = ['#fde2e4', '#e0f2fe', '#ede9fe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff'];
const SKIN = ['#f6cfae', '#ecb894', '#d9a07a', '#f3d6bf'];
const HAIR = ['#2b1d16', '#3d2a20', '#1f1f1f', '#5a3a26'];
const SHIRT = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const pick = <T,>(xs: T[], n: number): T => xs[n % xs.length]!;

/** Avatar minh hoạ (site thật dùng ảnh đại diện từ kênh qua avatarRef). */
export function Face({ name = '', size = 56, female, style }: { name?: string; size?: number; female?: boolean; style?: CSSProperties }) {
  const h = hash(name);
  const f = female ?? isFemale(name);
  const skin = pick(SKIN, h >>> 3), hair = pick(HAIR, h >>> 5);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ borderRadius: '50%', flex: 'none', display: 'block', ...style }} aria-label={name}>
      <circle cx="32" cy="32" r="32" fill={pick(BG, h)} />
      {f && <path d="M18 30c-1-11 5-18 14-18s15 7 14 18c0 7 1 14 3 19H15c2-5 3-12 3-19z" fill={hair} />}
      <path d="M9 64c2-11 11-17 23-17s21 6 23 17z" fill={pick(SHIRT, h >>> 7)} />
      <rect x="27.5" y="37" width="9" height="10" rx="3" fill={skin} />
      <circle cx="32" cy="28" r="11.5" fill={skin} />
      {f
        ? <path d="M20.5 27c0-9 5-14 11.5-14S44 18 43.5 27c-4-1-8-4-10-8-2 4-7 7-13 8z" fill={hair} />
        : <path d="M20.5 26c0-8 5-12.5 11.5-12.5S43.5 18 43.5 26c-2-3-5-5-9-5.5-5 0-9 2-14 5.5z" fill={hair} />}
      <circle cx="28" cy="29" r="1.4" fill="#1f1f1f" /><circle cx="36" cy="29" r="1.4" fill="#1f1f1f" />
      <path d="M29 33.5q3 2.2 6 0" stroke="#9a4b3b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {h % 5 === 0 && <g stroke="#3a3a3a" strokeWidth="1.2" fill="none"><circle cx="28" cy="29" r="3.2" /><circle cx="36" cy="29" r="3.2" /><path d="M31.2 29h1.6" /></g>}
    </svg>
  );
}

export function GroupAvatar({ size = 56, emoji = '🛍️', bg = 'linear-gradient(135deg,#f472b6,#fb7185)' }: { size?: number; emoji?: string; bg?: string }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', fontSize: size * 0.42, flex: 'none' }}>{emoji}</span>;
}

/** Màu nhãn là DỮ LIỆU (record_type cake.label, trường tone) — bảng dưới là mặc định cho nhãn mẫu. */
export const TAG_LOOK: Record<string, { bg: string; ic: string }> = TAG_LOOK_VI;
export function Tag({ name, size = 'sm', on = true, check }: { name: string; size?: 'sm' | 'md' | 'lg'; on?: boolean; check?: boolean }) {
  const t = TAG_LOOK[name] ?? { bg: '#64748b', ic: '🏷️' };
  return <span className={`dtag ${size}${on ? '' : ' off'}`} style={{ '--tag': t.bg } as CSSProperties}><span className="ti">{t.ic}</span>{name}{check && <span className="tc">✓</span>}</span>;
}

/** Nhóm kênh để vẽ: Zalo (Z), Facebook (f), khác (•). */
export const channelFamily = (channel: string | null | undefined): 'Z' | 'F' | 'X' => (channel?.startsWith('zalo') ? 'Z' : channel?.startsWith('facebook') ? 'F' : 'X');

export const CHANNEL_LABEL: Record<string, string> = CHANNEL_LABEL_VI;

/** Huy hiệu kênh góc trên trái avatar. */
export function ChannelDot({ channel, size = 18 }: { channel: string | null | undefined; size?: number }) {
  const s: CSSProperties = { position: 'absolute', top: -2, left: -2, width: size, height: size, borderRadius: '50%', background: '#fff', border: '2px solid #1f6bf2', color: '#1f6bf2', fontSize: size * 0.55, fontWeight: 900, display: 'grid', placeItems: 'center', lineHeight: 1, zIndex: 2 };
  const fam = channelFamily(channel);
  if (fam === 'F') return <span style={{ ...s, background: '#1877f2', color: '#fff', borderColor: '#fff' }} title={CHANNEL_LABEL[channel ?? '']}>f</span>;
  if (fam === 'X') return <span style={{ ...s, borderColor: '#64748b', color: '#64748b' }} title={CHANNEL_LABEL[channel ?? '']}>•</span>;
  return <span style={s} title={CHANNEL_LABEL[channel ?? '']}>Z</span>;
}

/** Nhãn chữ của kênh — luôn hiện trên tin / dòng thời gian (R-CAKE-UI-5). */
export function ChannelBadge({ channel }: { channel: string | null | undefined }) {
  if (!channel) return null;
  const fam = channelFamily(channel);
  return <span className={`badge ${fam === 'F' ? 'pri' : fam === 'Z' ? 'out' : ''}`}>{CHANNEL_LABEL[channel] ?? channel}</span>;
}

const RAIL_BG = ['linear-gradient(135deg,#ec4899,#f43f5e)', 'linear-gradient(135deg,#a855f7,#7c3aed)', 'linear-gradient(135deg,#3b82f6,#1d4ed8)', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'linear-gradient(135deg,#10b981,#047857)'];
/** Avatar tài khoản trên rail: vòng màu + chữ đầu (màu theo tên, ổn định). */
/** [2026-11-26 08:35 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — ảnh đại diện theo kênh (URL có hạn của máy kết nối); không có / hỏng ⇒ Face (người) hoặc GroupAvatar (nhóm). */
export function ChannelAvatar({ src, name, size = 56, group }: { src?: string | null; name: string; size?: number; group?: boolean }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) return <img src={src} alt={name} width={size} height={size} referrerPolicy="no-referrer" onError={() => setBad(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none', display: 'block' }} />;
  return group ? <GroupAvatar size={size} /> : <Face name={name} size={size} />;
}

export function AccountAvatar({ label, size = 56 }: { label: string; size?: number }) {
  const w = label.split(/\s+/).filter(Boolean);
  const text = (w.length > 1 ? w[0]![0]! + w[w.length - 1]![0]! : label.slice(0, 2)).toUpperCase();
  return <span style={{ width: size, height: size, borderRadius: '50%', background: pick(RAIL_BG, hash(label)), color: '#fff', fontWeight: 800, fontSize: size * 0.34, display: 'grid', placeItems: 'center' }}>{text}</span>;
}
