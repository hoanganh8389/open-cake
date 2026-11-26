// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — gợi ý BizCity Hub kèm quyền lợi (mockup kết nối ① và ③): KHÔNG chặn — Tự cài vẫn đủ mọi tính năng CRM (D-KN-1).
//   "Để sau" chỉ ẩn trong phiên; nút chính tắt khi máy chủ chưa nối Hub (không hứa điều chưa làm được).
import { useState } from 'react';
import { Btn, Ic } from '@open-cake/ui-kit';
import { t } from '../../i18n/index.js';

const L = t.setup.offer;

export function HubOffer({ variant, hubReady, onGo }: { variant: 'settings' | 'done'; hubReady: boolean; onGo: () => void }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const items = variant === 'settings' ? L.items : L.doneItems;
  return (
    <div className="card pad mt16 hub" style={{ maxWidth: 1056 }}>
      <div className="row gap8"><Ic.sparkle style={{ width: 18, height: 18, color: 'var(--primary)' }} /><b>{variant === 'settings' ? L.title : L.doneTitle}</b><span className="grow" />
        <Btn ghost sm onClick={() => setHidden(true)}>{L.later}</Btn>
        <Btn pri sm disabled={!hubReady} title={hubReady ? undefined : t.setup.link.hubNotReady} onClick={onGo}>{variant === 'settings' ? L.go : L.see}</Btn></div>
      <ul className="ben">{items.map(([b, rest]) => <li key={b}><Ic.check /><span><b>{b}</b>{rest}</span></li>)}</ul>
      {variant === 'settings' && <div className="xs subtle mt16">{L.foot}</div>}
    </div>
  );
}
