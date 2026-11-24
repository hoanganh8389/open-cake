// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-7 — hai bảng chọn trên ô soạn, cùng một khuôn: Tin nhắn nhanh (lớp mềm cake.quick_reply) và Gửi giá
//   (mockup-gui-gia.png): tìm hàng "Bán trong CRM" → chèn câu báo giá vào ô soạn, nhân viên sửa rồi gửi. Không thêm kiểu tin, không thêm API.
import { useState, type ReactNode } from 'react';
import { catalogItemList, recordList, type Item } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Btn, Search } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { vnd } from '../app/format.js';
import { go } from '../app/route.js';
import { useCompanyPrices } from './catalog/use-catalog.js';

const Panel = ({ children }: { children: ReactNode }) => <div className="card" style={{ margin: '0 16px 8px', padding: 8, maxWidth: 560 }}>{children}</div>;

export function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  const replies = useQueryAction(recordList, { type: 'cake.quick_reply', includeArchived: false });
  return (
    <Panel>
      <QueryView q={replies} empty={{ title: 'Chưa có tin nhắn nhanh', action: <Btn sm out onClick={() => go('records/cake.quick_reply')}>Thêm ở Cài đặt</Btn> }}>
        {(rs) => <>{rs.map((r) => (
          <button type="button" key={r.recordId} className="pitem" style={{ width: '100%', textAlign: 'left' }} onClick={() => onPick(String(r.data.body ?? ''))}>
            <div><b>{r.title}</b> <span className="xs subtle">{String(r.data.shortcut ?? '')}</span><span>{String(r.data.body ?? '')}</span></div>
          </button>
        ))}</>}
      </QueryView>
    </Panel>
  );
}

/** Câu báo giá chèn vào ô soạn — một chỗ, để sau này đổi mẫu câu không phải sửa màn. */
export const quoteLine = (it: Item, price: number, unit: string) => `Dạ ${it.local.displayName ?? it.name} giá ${vnd(price)}/${unit} (đã gồm VAT) ạ.`;

export function PricePicker({ onPick }: { onPick: (text: string) => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const items = useQueryAction(catalogItemList, { q: q || undefined, sellableOnly: true, page: 1, pageSize: 8, includeRetired: false });
  const prices = useCompanyPrices();
  const rows = (items.data ?? []).flatMap((it) => { const p = prices.byItem.get(it.itemId); return p ? [{ it, p }] : []; });
  // [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — chờ đủ hàng + giá rồi mới quyết "trống" (máy chủ thật trả hai lời gọi lệch nhau; giả lập thì không lộ).
  const pick = (i: number) => { const r = rows[i]; if (r) onPick(quoteLine(r.it, r.p.price, r.p.unit)); };
  return (
    <Panel>
      <div onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setAt(Math.min(at + 1, rows.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(at - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); pick(at); }
      }}>
        <Search placeholder="Tìm hàng để gửi giá…" sm value={q} onChange={(v) => { setQ(v); setAt(0); }} />
      </div>
      <QueryView q={{ ...items, isLoading: items.isLoading || prices.isLoading, error: items.error ?? prices.error, data: items.data && prices.data ? rows : undefined }} empty={{ title: q ? 'Không có hàng khớp' : 'Chưa có hàng có giá', action: <Btn sm out onClick={() => go('catalog')}>Mở Hàng hoá</Btn> }}>
        {(rs) => <>{rs.map(({ it, p }, i) => (
          <button type="button" key={it.itemId} className={`pick-row${i === at ? ' on' : ''}`} onMouseEnter={() => setAt(i)} onClick={() => pick(i)}>
            <b style={{ fontWeight: 500 }}>{it.local.displayName ?? it.name}</b><span className="xs subtle">{it.sku}</span><span className="p">{vnd(p.price)} / {p.unit}</span>
          </button>
        ))}</>}
      </QueryView>
      <div className="xs subtle" style={{ padding: '6px 12px' }}>↑↓ chọn · Enter chèn vào ô soạn · chỉ hiện hàng "Bán trong CRM" có giá</div>
    </Panel>
  );
}
