// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-7 — hai bảng chọn trên ô soạn, cùng một khuôn: Tin nhắn nhanh (lớp mềm cake.quick_reply) và Gửi giá
//   (mockup-gui-gia.png): tìm hàng "Bán trong CRM" → chèn câu báo giá vào ô soạn, nhân viên sửa rồi gửi. Không thêm kiểu tin, không thêm API.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/inbox.ts.
import { useState, type ReactNode } from 'react';
import { catalogItemList, recordList, type Item } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Btn, Ic, Search } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { hhmm, vnd } from '../app/format.js';
import { StockBadge, useStock } from './orders/parts.js';
import type { CartLine } from './orders/OrderSheet.js';
import { go } from '../app/route.js';
import { useCompanyPrices } from './catalog/use-catalog.js';
import { t } from '../i18n/index.js';

const Panel = ({ children }: { children: ReactNode }) => <div className="card" style={{ margin: '0 16px 8px', padding: 8, maxWidth: 560 }}>{children}</div>;

export function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  const replies = useQueryAction(recordList, { type: 'cake.quick_reply', includeArchived: false });
  return (
    <Panel>
      <QueryView q={replies} empty={{ title: t.inbox.composer.quickEmpty, action: <Btn sm out onClick={() => go('records/cake.quick_reply')}>{t.inbox.composer.addInSettings}</Btn> }}>
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
export const quoteLine = (it: Item, price: number, unit: string) => t.inbox.composer.quoteLine(it.local.displayName ?? it.name, vnd(price), unit);

// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-7 — tồn Kế Toán trên từng dòng (Còn n / Hết hàng) + nút + thêm vào đơn nháp (mockup-gui-gia-ton); chưa nối Kế Toán ⇒ không nhãn.
export function PricePicker({ onPick, onAdd }: { onPick: (text: string) => void; onAdd?: (line: Omit<CartLine, 'qty'>) => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const items = useQueryAction(catalogItemList, { q: q || undefined, sellableOnly: true, page: 1, pageSize: 8, includeRetired: false });
  const prices = useCompanyPrices();
  const rows = (items.data ?? []).flatMap((it) => { const p = prices.byItem.get(it.itemId); return p ? [{ it, p }] : []; });
  const stock = useStock(rows.map((r) => r.it.itemId));
  // [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — chờ đủ hàng + giá rồi mới quyết "trống" (máy chủ thật trả hai lời gọi lệch nhau; giả lập thì không lộ).
  const pick = (i: number) => { const r = rows[i]; if (r) onPick(quoteLine(r.it, r.p.price, r.p.unit)); };
  return (
    <Panel>
      <div onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setAt(Math.min(at + 1, rows.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(at - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); pick(at); }
      }}>
        <Search placeholder={t.inbox.composer.searchItem} sm value={q} onChange={(v) => { setQ(v); setAt(0); }} />
      </div>
      <QueryView q={{ ...items, isLoading: items.isLoading || prices.isLoading, error: items.error ?? prices.error, data: items.data && prices.data ? rows : undefined }} empty={{ title: q ? t.inbox.composer.noMatch : t.inbox.composer.noPriced, action: <Btn sm out onClick={() => go('catalog')}>{t.inbox.composer.openCatalog}</Btn> }}>
        {(rs) => <>{rs.map(({ it, p }, i) => (
          <div key={it.itemId} role="button" tabIndex={-1} className={`pick-row${i === at ? ' on' : ''}${(stock.byItem.get(it.itemId)?.available ?? 1) <= 0 ? ' dim' : ''}`} onMouseEnter={() => setAt(i)} onClick={() => pick(i)}>
            <b style={{ fontWeight: 500 }}>{it.local.displayName ?? it.name}</b><span className="xs subtle">{it.sku}</span><span className="p">{vnd(p.price)} / {p.unit}</span>
            <StockBadge available={stock.byItem.get(it.itemId)?.available} />
            {onAdd && <button type="button" className="add" title={t.orders.stock.addToOrder} aria-label={t.orders.stock.addToOrder} onClick={(e) => { e.stopPropagation(); onAdd({ itemId: it.itemId, name: it.local.displayName ?? it.name, sku: it.sku, unit: p.unit, price: p.price }); }}><Ic.plus /></button>}
          </div>
        ))}</>}
      </QueryView>
      <div className="xs subtle" style={{ padding: '6px 12px' }}>{stock.data?.source === 'ketoan' && stock.data.asOf ? `${t.orders.stock.hint(stock.data.branchCode ?? '', hhmm(stock.data.asOf))} · ` : ''}{t.inbox.composer.hint}</div>
    </Panel>
  );
}
