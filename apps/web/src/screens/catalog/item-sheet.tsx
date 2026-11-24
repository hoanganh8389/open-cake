// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6/8 — sheet Thêm hàng / Sửa hàng (mockup-them-hang.png): 6 ô, lỗi một dòng ngay dưới ô,
//   kiểm bằng CHÍNH schema hợp đồng; tạo kèm giá trong một lần gọi. Kế Toán giữ ⇒ chỉ sửa cột riêng (tên khi chat, bán trong CRM).
import { useState, type ReactNode } from 'react';
import { ItemNameSchema, PriceSchema, SkuSchema, TAX_CODES, UNIT_NAMES, catalogCategoryList, catalogItemCreate, catalogItemUpdate, type Item } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Btn, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { TAX_LABEL } from './use-catalog.js';

const err = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, v: unknown) => schema.safeParse(v).error?.issues[0]?.message;
const Field = ({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) => (
  <div className="grow mt16"><label className="sm muted">{label}</label>{children}{error && <div className="xs mt8" style={{ color: 'var(--destructive)' }}>{error}</div>}</div>
);

export function NewItemSheet({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState({ sku: '', name: '', unit: 'Cái', taxCode: '8', categoryCode: '', price: '' });
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
    <Sheet open onClose={onClose} title="Thêm hàng" footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!ready || create.isPending} onClick={save}>Lưu</Btn></>}>
      <div className="row gap16">
        <Field label="Mã hàng *" error={e.sku}><input {...bind('sku')} placeholder="vd 101010004" /></Field>
        <Field label="Nhóm"><select {...bind('categoryCode')}><option value="">— chưa chọn —</option>
          {(cats.data ?? []).filter((c) => c.level === 3).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
      </div>
      <Field label="Tên hàng *" error={e.name}><input {...bind('name')} maxLength={50} /></Field>
      <div className="row gap16">
        <Field label="Đơn vị tính *"><select {...bind('unit')}>{UNIT_NAMES.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Thuế *"><select {...bind('taxCode')}>{TAX_CODES.map((t) => <option key={t} value={t}>{TAX_LABEL[t]}</option>)}</select></Field>
        <Field label="Giá bán (gồm VAT)" error={e.price}><input {...bind('price')} inputMode="decimal" style={{ textAlign: 'right' }} /></Field>
      </div>
      <div className="xs subtle mt16">Mã: chữ in hoa và số · ĐVT chọn trong 40 tên chuẩn · nhập đúng chuẩn này thì nối Kế Toán sau không phải sửa.</div>
      <ActionErrorNote error={create.error} />
    </Sheet>
  );
}

export function EditItemSheet({ it, readonly, onClose }: { it: Item; readonly: boolean; onClose: () => void }) {
  const [name, setName] = useState(it.name);
  const [chatName, setChatName] = useState(it.local.displayName ?? '');
  const [sellable, setSellable] = useState(it.local.sellable);
  const up = useAction(catalogItemUpdate);
  const local = { ...((chatName || null) !== it.local.displayName ? { displayName: chatName || null } : {}), ...(sellable !== it.local.sellable ? { sellable } : {}) };
  const patch = { ...(!readonly && name !== it.name ? { name } : {}), ...(Object.keys(local).length ? { local } : {}) };
  const nameErr = !readonly && err(ItemNameSchema, name);
  return (
    <Sheet open onClose={onClose} title="Sửa hàng" sub={<><code>{it.sku}</code> · {it.baseUnit} · thuế {TAX_LABEL[it.taxCode]}</>}
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!Object.keys(patch).length || !!nameErr || up.isPending} onClick={() => up.mutate({ itemId: it.itemId, patch }, { onSuccess: onClose })}>Lưu</Btn></>}>
      <Field label={readonly ? 'Tên hàng (Kế Toán giữ)' : 'Tên hàng *'} error={nameErr}>
        <input className="input mt8" value={name} maxLength={50} disabled={readonly} onChange={(e) => setName(e.target.value)} aria-label="Tên hàng" /></Field>
      <Field label="Tên khi chat"><input className="input mt8" value={chatName} maxLength={200} placeholder="để trống = dùng tên hàng" onChange={(e) => setChatName(e.target.value)} aria-label="Tên khi chat" /></Field>
      <label className="row gap8 mt16 sm"><input type="checkbox" checked={sellable} onChange={(e) => setSellable(e.target.checked)} />Bán trong CRM (hiện khi gửi giá trong chat)</label>
      <ActionErrorNote error={up.error} />
    </Sheet>
  );
}
