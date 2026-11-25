// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6/8 — sheet Thêm hàng / Sửa hàng (mockup-them-hang.png): 6 ô, lỗi một dòng ngay dưới ô,
//   kiểm bằng CHÍNH schema hợp đồng; tạo kèm giá trong một lần gọi. Kế Toán giữ ⇒ chỉ sửa cột riêng (tên khi chat, bán trong CRM).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { useState, type ReactNode } from 'react';
import { ItemNameSchema, PriceSchema, SkuSchema, TAX_CODES, UNIT_NAMES, catalogCategoryList, catalogItemCreate, catalogItemUpdate, type Item } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Btn, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { TAX_LABEL } from './use-catalog.js';
import { t } from '../../i18n/index.js';

const L = t.catalog.items.sheet;
const err = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, v: unknown) => schema.safeParse(v).error?.issues[0]?.message;
const Field = ({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) => (
  <div className="grow mt16"><label className="sm muted">{label}</label>{children}{error && <div className="xs mt8" style={{ color: 'var(--destructive)' }}>{error}</div>}</div>
);

export function NewItemSheet({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState({ sku: '', name: '', unit: t.catalog.items.defaultUnit, taxCode: '8', categoryCode: '', price: '' });
  const cats = useQueryAction(catalogCategoryList, {});
  const create = useAction(catalogItemCreate);
  const bind = (k: keyof typeof d) => ({ className: 'input mt8', value: d[k], 'aria-label': k, onChange: (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value }) });
  const e = { sku: d.sku && err(SkuSchema, d.sku), name: d.name && err(ItemNameSchema, d.name), price: d.price && err(PriceSchema, Number(d.price)) };
  const ready = d.sku && d.name && !e.sku && !e.name && !e.price;
  const save = () => create.mutate(
    { sku: d.sku, name: d.name, units: [{ unit: d.unit, ratio: 1, isDefaultSale: true }], taxCode: d.taxCode, categoryCode: d.categoryCode || null, ...(d.price ? { price: Number(d.price) } : {}) },
    { onSuccess: onClose },
  );
  return (
    <Sheet open onClose={onClose} title={L.newTitle} footer={<><Btn onClick={onClose}>{L.cancel}</Btn><Btn pri disabled={!ready || create.isPending} onClick={save}>{L.save}</Btn></>}>
      <div className="row gap16">
        <Field label={L.sku} error={e.sku}><input {...bind('sku')} placeholder={L.skuPh} /></Field>
        <Field label={L.group}><select {...bind('categoryCode')}><option value="">{L.groupNone}</option>
          {(cats.data ?? []).filter((c) => c.level === 3).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
      </div>
      <Field label={L.name} error={e.name}><input {...bind('name')} maxLength={50} /></Field>
      <div className="row gap16">
        <Field label={L.unit}><select {...bind('unit')}>{UNIT_NAMES.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label={L.tax}><select {...bind('taxCode')}>{TAX_CODES.map((t) => <option key={t} value={t}>{TAX_LABEL[t]}</option>)}</select></Field>
        <Field label={L.price} error={e.price}><input {...bind('price')} inputMode="decimal" style={{ textAlign: 'right' }} /></Field>
      </div>
      <div className="xs subtle mt16">{L.hint}</div>
      <ActionErrorNote error={create.error} />
    </Sheet>
  );
}

export function EditItemSheet({ it, readonly, onClose }: { it: Item; readonly: boolean; onClose: () => void }) {
  const [name, setName] = useState(it.name);
  const [chatName, setChatName] = useState(it.local.displayName ?? '');
  const [sellable, setSellable] = useState(it.local.sellable);
  const up = useAction(catalogItemUpdate);
  const can = useCan('cake:catalog-sua'); // R-WEB-7
  const local = { ...((chatName || null) !== it.local.displayName ? { displayName: chatName || null } : {}), ...(sellable !== it.local.sellable ? { sellable } : {}) };
  const patch = { ...(!readonly && name !== it.name ? { name } : {}), ...(Object.keys(local).length ? { local } : {}) };
  const nameErr = !readonly && err(ItemNameSchema, name);
  return (
    <Sheet open onClose={onClose} title={L.editTitle} sub={<><code>{it.sku}</code> · {it.baseUnit}{L.taxSub(TAX_LABEL[it.taxCode] ?? it.taxCode)}</>}
      footer={<><Btn onClick={onClose}>{L.cancel}</Btn><Btn pri disabled={!can || !Object.keys(patch).length || !!nameErr || up.isPending} title={can ? undefined : needPermission('cake:catalog-sua')} onClick={() => up.mutate({ itemId: it.itemId, patch }, { onSuccess: onClose })}>{L.save}</Btn></>}>
      <Field label={readonly ? L.nameKetoan : L.name} error={nameErr}>
        <input className="input mt8" value={name} maxLength={50} disabled={readonly} onChange={(e) => setName(e.target.value)} aria-label={L.nameAria} /></Field>
      <Field label={L.chatName}><input className="input mt8" value={chatName} maxLength={200} placeholder={L.chatNamePh} onChange={(e) => setChatName(e.target.value)} aria-label={L.chatName} /></Field>
      <label className="row gap8 mt16 sm"><input type="checkbox" checked={sellable} onChange={(e) => setSellable(e.target.checked)} />{L.sellable}</label>
      <ActionErrorNote error={up.error} />
    </Sheet>
  );
}
