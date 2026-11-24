// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6 — giá sửa ngay trên dòng (mockup-hang-hoa.png): bấm ⇒ ô nhập + Lưu; kiểm bằng PriceSchema của hợp đồng.
import { useState } from 'react';
import { PriceSchema, catalogPriceSet } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Btn, Ic } from '@open-cake/ui-kit';
import { vnd } from '../../app/format.js';
import { COMPANY } from './use-catalog.js';

export function PriceCell({ itemId, unit, price, readonly }: { itemId: string; unit: string; price: number | null; readonly: boolean }) {
  const [v, setV] = useState<string | null>(null);
  const set = useAction(catalogPriceSet);
  if (readonly) return <>{price === null ? <span className="subtle">—</span> : vnd(price)}</>;
  if (v === null) {
    return (
      <button type="button" className="price-cell" onClick={(e) => { e.stopPropagation(); setV(price === null ? '' : String(price)); }} title="Sửa giá">
        {price === null ? <span className="subtle">chưa có giá</span> : vnd(price)}<Ic.edit />
      </button>
    );
  }
  const ok = v !== '' && PriceSchema.safeParse(Number(v)).success;
  const save = () => set.mutate({ priceListCode: COMPANY, itemId, unit, price: Number(v) }, { onSuccess: () => setV(null) });
  return (
    <span className="row gap8" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
      <input className="input sm" style={{ width: 130, textAlign: 'right' }} autoFocus value={v} inputMode="decimal" aria-label="Giá mới"
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ok) save(); if (e.key === 'Escape') setV(null); }} />
      <Btn sm pri disabled={!ok || set.isPending} onClick={save}>Lưu</Btn>
      {set.error && <span className="xs" style={{ color: 'var(--destructive)' }} role="alert">{set.error.message}</span>}
    </span>
  );
}
