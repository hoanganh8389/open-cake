// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6/8 — bảng hàng gọn (mockup-hang-hoa / mockup-ke-toan-giu): Mã · Tên (⚠ nếu thiếu chuẩn) · ĐVT · Thuế · Giá;
//   Kế Toán giữ ⇒ giá chỉ đọc + cột "Bán trong CRM" bật / tắt ngay (cột riêng ở lớp mềm, luôn sửa được).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { catalogItemUpdate, type Item, type PriceRow } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Ic } from '@open-cake/ui-kit';
import { PriceCell } from './price-cell.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { TAX_LABEL } from './use-catalog.js';
import { t } from '../../i18n/index.js';

const L = t.catalog.items;

function Sellable({ it }: { it: Item }) {
  const up = useAction(catalogItemUpdate);
  const can = useCan('cake:catalog-sua'); // R-WEB-7
  return (
    <input type="checkbox" aria-label={L.col.sellable} checked={it.local.sellable} disabled={up.isPending || !can} title={can ? undefined : needPermission('cake:catalog-sua')}
      onClick={(e) => e.stopPropagation()} onChange={(e) => up.mutate({ itemId: it.itemId, patch: { local: { sellable: e.target.checked } } })} />
  );
}

export function ItemTable({ rows, prices, readonly, onOpen }: { rows: Item[]; prices: Map<string, PriceRow>; readonly: boolean; onOpen: (id: string) => void }) {
  return (
    <table className="tbl">
      <thead>
        <tr><th style={{ width: 150 }}>{L.col.sku}</th><th>{L.col.name}</th><th style={{ width: 90 }}>{L.col.unit}</th><th style={{ width: 120 }}>{L.col.tax}</th>
          <th className="r" style={{ width: 240 }}>{L.col.price}</th>{readonly && <th style={{ width: 140 }}>{L.col.sellable}</th>}</tr>
      </thead>
      <tbody>
        {rows.map((it) => {
          const p = prices.get(it.itemId);
          const unit = it.units.find((u) => u.isDefaultSale)?.unit ?? it.baseUnit;
          return (
            <tr key={it.itemId} onClick={() => onOpen(it.itemId)} style={{ cursor: 'pointer' }}>
              <td><code>{it.sku}</code></td>
              <td>
                {it.local.displayName ?? it.name}
                {it.warnings.length > 0 && <span className="warnmark" title={it.warnings.map((w) => w.message).join('\n')} aria-label={L.warnMissing}><Ic.warn /></span>}
                {it.local.displayName && <div className="xs subtle">{it.name}</div>}
              </td>
              <td>{unit}</td>
              <td>{TAX_LABEL[it.taxCode]}</td>
              <td className="r"><PriceCell itemId={it.itemId} unit={unit} price={p?.price ?? null} readonly={readonly} /></td>
              {readonly && <td><Sellable it={it} /></td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
