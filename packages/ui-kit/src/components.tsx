// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-1: bộ thành phần chép từ bản mẫu duyệt (ui.jsx), giữ nguyên class để ra đúng ảnh;
//   thêm kiểu, ô tìm kiếm điều khiển được, phân trang bấm được, trạng thái lỗi có mã tra cứu (R-WEB-5).
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Ic, type Icon } from './icons.js';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const initials = (n = '') => {
  const w = n.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0]![0]! + w[w.length - 1]![0]! : (w[0] ?? '').slice(0, 2)).toUpperCase();
};

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { pri?: boolean; out?: boolean; ghost?: boolean; danger?: boolean; sm?: boolean; icon?: boolean; block?: boolean };
export function Btn({ pri, out, ghost, danger, sm, icon, block, className, children, type = 'button', ...rest }: BtnProps) {
  return <button type={type} className={cx('btn', pri && 'pri', out && 'out', ghost && 'ghost', danger && 'danger', sm && 'sm', icon && 'icon', block && 'block', className)} {...rest}>{children}</button>;
}
export function Badge({ tone, dot, children, className, style, title }: { tone?: string; dot?: boolean; children?: ReactNode; className?: string; style?: CSSProperties; title?: string }) {
  return <span className={cx('badge', tone, className)} style={style} title={title}>{dot && <i className="dot" />}{children}</span>;
}
export function Chip({ on, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type="button" className={cx('chip', on && 'on')} {...rest}>{children}</button>;
}
export function Avatar({ name, size, online, channel, className, style }: { name: string; size?: 'sm' | 'lg'; online?: boolean; channel?: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('avatar', size, className)} style={style} aria-label={name}>
      {initials(name)}{channel && <span className="ch">{channel}</span>}{online && <span className="on" />}
    </span>
  );
}
export function Search({ placeholder = 'Tìm kiếm…', sm, style, value, onChange }: { placeholder?: string; sm?: boolean; style?: CSSProperties; value?: string; onChange?: (v: string) => void }) {
  return <div className="search" style={style}><Ic.search /><input className={cx('input', sm && 'sm')} placeholder={placeholder} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} aria-label={placeholder} /></div>;
}
export type TabItem = { id: string; label: string; icon?: Icon; count?: number | null };
export function Tabs({ items, value, onChange, underline }: { items: TabItem[]; value: string; onChange?: (id: string) => void; underline?: boolean }) {
  return (
    <div className={underline ? 'utabs' : 'tabs'}>
      {items.map((t) => (
        <button type="button" key={t.id} className={cx(underline ? 'utab' : 'tab', value === t.id && 'on')} onClick={() => onChange?.(t.id)}>
          {t.icon && <t.icon />}{t.label}{t.count != null && <span className="muted sm">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
export function Card({ pad = true, className, children, style }: { pad?: boolean; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return <div className={cx('card', pad && 'pad', className)} style={style}>{children}</div>;
}

/** Sheet: tiêu đề = động từ + đối tượng; mọi thao tác ghi đi qua đây, không alert/confirm (R-WEB-6). */
export function Sheet({ open, onClose, icon: IconC, title, sub, wide, children, footer }: { open: boolean; onClose: () => void; icon?: Icon; title: string; sub?: ReactNode; wide?: boolean; children?: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className={cx('sheet', wide && 'wide')} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="hd">
          {IconC && <div className="icon-circle"><IconC /></div>}
          <div className="grow"><h2 className="h2">{title}</h2>{sub && <div className="muted sm">{sub}</div>}</div>
          <button type="button" className="menu-dots" onClick={onClose} aria-label="Đóng"><Ic.x style={{ width: 20, height: 20 }} /></button>
        </div>
        <div className="bd">{children}</div>
        {footer && <div className="ft">{footer}</div>}
      </div>
    </div>
  );
}

/** Bốn trạng thái của mọi màn (R-WEB-5): đang tải · trống · lỗi (có mã tra cứu) · không có quyền. */
export function State({ kind, title, desc, action, requestId }: { kind: 'loading' | 'empty' | 'error' | 'denied'; title?: string; desc?: ReactNode; action?: ReactNode; requestId?: string }) {
  if (kind === 'loading') {
    return <div className="col" style={{ padding: 24, gap: 12 }} aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56, width: `${100 - i * 8}%` }} />)}</div>;
  }
  const IconC = { empty: Ic.info, error: Ic.warn, denied: Ic.lock }[kind];
  return (
    <div className="state" role={kind === 'error' ? 'alert' : undefined}>
      <div className="ic"><IconC /></div>
      <div className="h3">{title}</div>
      {desc && <div className="muted" style={{ maxWidth: 440 }}>{desc}</div>}
      {requestId && <div className="xs subtle mt8">Mã tra cứu: <code>{requestId}</code></div>}
      {action && <div className="mt8">{action}</div>}
    </div>
  );
}
export function Toast({ tone = 'ok', children }: { tone?: 'ok' | 'err'; children?: ReactNode }) {
  return <div className="toast" role="status"><span className={tone}>{tone === 'ok' ? <Ic.check /> : <Ic.warn />}</span>{children}</div>;
}
/** Tính năng chưa có ở phase này: nói rõ vì sao + khi nào, không số giả (R-NO-FAKE, R-BLOCK-1). */
export function Gate({ need, why, action }: { need: string; why: string; action?: ReactNode }) {
  return (
    <div className="gate">
      <div className="row gap16">
        <div className="icon-circle" style={{ background: 'var(--accent)', color: 'var(--muted-foreground)' }}><Ic.lock /></div>
        <div className="grow"><div className="h3">{need}</div><div className="muted sm mt8">{why}</div></div>
        {action}
      </div>
    </div>
  );
}
export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const go = (p: number) => onPage(Math.min(Math.max(1, p), Math.max(1, total)));
  return (
    <div className="pager">
      <span onClick={() => go(1)}>«</span><span onClick={() => go(page - 1)}>‹</span>
      {Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1).map((n) => (n === page ? <b key={n}>{n}</b> : <span key={n} onClick={() => go(n)}>{n}</span>))}
      <span onClick={() => go(page + 1)}>›</span><span onClick={() => go(total)}>»</span>
    </div>
  );
}
export function StatusBar({ children }: { children?: ReactNode }) { return <div className="statusbar">{children}</div>; }
