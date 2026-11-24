// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-6: màn Hàng hoá + Bảng giá trên 9 action cake.catalog_* (ADR-0004).
//   Chạy một mình (nguồn local) và sẵn ánh xạ: form kiểm bằng CHÍNH schema hợp đồng (chuẩn H-*), cảnh báo CAT-* hiện cạnh hàng,
//   nguồn = ketoan ⇒ cột kế toán khoá trên giao diện (máy chủ vẫn chặn bằng cổng ghi — giao diện chỉ là lớp thứ hai).
import { useMemo, useState } from 'react';
import {
  ERP_ITEM_FIELDS, ItemNameSchema, PriceSchema, SkuSchema, TAX_CODES, UNIT_NAMES,
  catalogCategoryList, catalogItemCreate, catalogItemList, catalogItemUpdate, catalogPriceList, catalogPriceListList, catalogPriceSet, catalogSourceGet,
  type Item, type PriceRow,
} from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Chip, Ic, Pager, Search, Sheet, StatusBar, Tabs } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { useRoute } from '../app/route.js';

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const TAX_LABEL: Record<string, string> = { KCT: 'Không chịu thuế', '0': '0%', '5': '5%', '8': '8%', '10': '10%', KKKN: 'Không kê khai' };
const COMPANY = 'CONGTY';
const isErp = (f: string) => (ERP_ITEM_FIELDS as readonly string[]).includes(f);

function SourceNote() {
  const src = useQueryAction(catalogSourceGet, {});
  if (!src.data) return null;
  return src.data.catalogSource === 'local'
    ? <div className="note sm"><b>Danh mục của shop</b> — Cake là chủ. Dữ liệu nhập theo chuẩn Kế Toán (H-1…H-18), nên khi nối Open Kế Toán chỉ cần gắn mã, không phải sửa lại.</div>
    : <div className="note warn sm"><b>Danh mục lấy từ Open Kế Toán</b> — mã, tên, ĐVT, thuế, giá chỉ sửa ở Kế Toán. Ở đây vẫn sửa được tên hiển thị, ảnh, mô tả, "đang bán trong CRM".
      {src.data.lastHealthOkAt && <span className="subtle"> · Kết nối tốt lần cuối {when(src.data.lastHealthOkAt)}</span>}</div>;
}

function Warnings({ it }: { it: Item }) {
  if (!it.warnings.length) return null;
  return <div className="row gap8 wrap" style={{ marginTop: 6 }}>{it.warnings.map((w) => <Badge key={w.code} tone="warn" title={`${w.message} (${w.rule})`}>{w.code}</Badge>)}</div>;
}

type NewDraft = { sku: string; name: string; unit: string; taxCode: string; categoryCode: string; price: string };
function NewItemSheet({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState<NewDraft>({ sku: '', name: '', unit: 'Cái', taxCode: '8', categoryCode: '', price: '' });
  const cats = useQueryAction(catalogCategoryList, {});
  const create = useAction(catalogItemCreate);
  const setPrice = useAction(catalogPriceSet);
  // Kiểm bằng chính schema hợp đồng — cùng luật máy chủ dùng (R-CANON-14).
  const problems = [
    !d.sku ? null : SkuSchema.safeParse(d.sku).error?.issues[0]?.message,
    !d.name ? null : ItemNameSchema.safeParse(d.name).error?.issues[0]?.message,
    !d.price ? null : PriceSchema.safeParse(Number(d.price)).error?.issues[0]?.message,
  ].filter(Boolean);
  const ready = d.sku && d.name && problems.length === 0;
  const nonStd = !(UNIT_NAMES as readonly string[]).includes(d.unit);
  const save = () => create.mutate(
    { sku: d.sku, name: d.name, units: [{ unit: d.unit, ratio: 1, isDefaultSale: true }], taxCode: d.taxCode, categoryCode: d.categoryCode || null },
    { onSuccess: (it) => (d.price ? setPrice.mutate({ priceListCode: COMPANY, itemId: it.itemId, unit: d.unit, price: Number(d.price) }, { onSuccess: onClose }) : onClose()) },
  );
  const f = (k: keyof NewDraft) => ({ className: 'input mt8', value: d[k], onChange: (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value }) });
  return (
    <Sheet open onClose={onClose} icon={Ic.store} title="Thêm hàng" sub="Theo chuẩn hàng hoá Open Kế Toán — nối Kế Toán sau không phải sửa"
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!ready || create.isPending || setPrice.isPending} onClick={save}>Lưu</Btn></>}>
      <div className="mt16"><label className="sm muted">Mã hàng (SKU) *</label><input {...f('sku')} placeholder="vd 101010004 — chữ in hoa và số" aria-label="Mã hàng" />
        <div className="xs subtle mt8">Mã đã dùng không cấp lại, kể cả khi hàng đã xoá (H-2).</div></div>
      <div className="mt16"><label className="sm muted">Tên hàng *</label><input {...f('name')} maxLength={50} aria-label="Tên hàng" />
        <div className="xs subtle mt8">{d.name.length}/50 · không trùng tên hàng khác (H-7)</div></div>
      <div className="row gap16 mt16">
        <div className="grow"><label className="sm muted">Đơn vị tính gốc *</label>
          <select {...f('unit')} aria-label="Đơn vị tính">{UNIT_NAMES.map((u) => <option key={u}>{u}</option>)}</select></div>
        <div className="grow"><label className="sm muted">Thuế bán *</label>
          <select {...f('taxCode')} aria-label="Thuế bán">{TAX_CODES.map((t) => <option key={t} value={t}>{TAX_LABEL[t]}</option>)}</select></div>
      </div>
      {nonStd && <div className="note warn xs mt8">ĐVT ngoài 40 tên chuẩn — giá có thể bị bỏ qua khi đẩy sang Kế Toán (H-9).</div>}
      <div className="row gap16 mt16">
        <div className="grow"><label className="sm muted">Nhóm hàng</label>
          <select {...f('categoryCode')} aria-label="Nhóm hàng"><option value="">— chưa chọn —</option>
            {(cats.data ?? []).map((c) => <option key={c.code} value={c.code} disabled={c.level !== 3}>{' '.repeat((c.level - 1) * 3)}{c.name}</option>)}</select></div>
        <div className="grow"><label className="sm muted">Giá bán công ty (gồm VAT)</label><input {...f('price')} inputMode="decimal" aria-label="Giá bán" placeholder="vd 390000" /></div>
      </div>
      {problems.length > 0 && <div className="xs subtle mt16">{problems[0]}</div>}
      <ActionErrorNote error={create.error ?? setPrice.error} />
    </Sheet>
  );
}

function EditItemSheet({ it, readonly, onClose }: { it: Item; readonly: boolean; onClose: () => void }) {
  const [name, setName] = useState(it.name);
  const [displayName, setDisplayName] = useState(it.displayName ?? '');
  const [sellable, setSellable] = useState(it.isSellableInCrm);
  const update = useAction(catalogItemUpdate);
  const patch: Record<string, unknown> = {};
  if (name !== it.name) patch.name = name;
  if ((displayName || null) !== it.displayName) patch.displayName = displayName || null;
  if (sellable !== it.isSellableInCrm) patch.isSellableInCrm = sellable;
  const changed = Object.keys(patch).length > 0;
  return (
    <Sheet open onClose={onClose} icon={Ic.edit} title={it.name} sub={<>Mã <code>{it.sku}</code> · {it.baseUnit} · thuế {TAX_LABEL[it.taxCode]}</>}
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={!changed || update.isPending} onClick={() => update.mutate({ itemId: it.itemId, patch }, { onSuccess: onClose })}>Lưu</Btn></>}>
      <div className="mt16"><label className="sm muted">Tên hàng {readonly && <Badge tone="out"><Ic.lock style={{ width: 12, height: 12 }} />Kế Toán giữ</Badge>}</label>
        <input className="input mt8" value={name} maxLength={50} disabled={readonly && isErp('name')} onChange={(e) => setName(e.target.value)} aria-label="Tên hàng" /></div>
      <div className="mt16"><label className="sm muted">Tên hiển thị khi chat (của Cake)</label>
        <input className="input mt8" value={displayName} maxLength={200} onChange={(e) => setDisplayName(e.target.value)} aria-label="Tên hiển thị" placeholder="để trống = dùng tên hàng" /></div>
      <label className="row gap8 mt16 sm"><input type="checkbox" checked={sellable} onChange={(e) => setSellable(e.target.checked)} />Đang bán trong CRM (hiện ở thẻ báo giá khi chat)</label>
      <div className="xs subtle mt16">item_id <code>{it.itemId}</code>{it.sync.extId ? <> · Kế Toán <code>{it.sync.extId}</code></> : ' · chưa gắn Kế Toán'}</div>
      <ActionErrorNote error={update.error} />
    </Sheet>
  );
}

function Items({ readonly }: { readonly: boolean }) {
  const { query, setQuery } = useRoute();
  const page = Number(query.get('page') ?? 1);
  const q = query.get('q') ?? '';
  const cat = query.get('cat') ?? undefined;
  const [open, setOpen] = useState<Item | 'new' | null>(null);
  const list = useQueryAction(catalogItemList, { q: q || undefined, categoryCode: cat, page, pageSize: 50, includeRetired: false });
  const prices = useQueryAction(catalogPriceList, { priceListCode: COMPANY, page: 1, pageSize: 500 });
  const cats = useQueryAction(catalogCategoryList, {});
  const priceOf = useMemo(() => new Map((prices.data ?? []).filter((p) => p.isDefaultUnit).map((p) => [p.itemId, p.price])), [prices.data]);
  const total = list.meta?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <>
      <div className="row wrap" style={{ padding: '16px 32px' }}>
        {(cats.data ?? []).filter((c) => c.level === 3).map((c) => <Chip key={c.code} on={cat === c.code} onClick={() => setQuery({ cat: cat === c.code ? null : c.code, page: null })}>{c.name}</Chip>)}
        <Search placeholder="Tên hoặc mã hàng…" sm style={{ width: 320 }} value={q} onChange={(v) => setQuery({ q: v, page: null })} />
        <span className="grow" />
        <Btn pri disabled={readonly} onClick={() => setOpen('new')} title={readonly ? 'Thêm hàng ở Open Kế Toán' : undefined}><Ic.plus />Thêm hàng</Btn>
      </div>
      <div className="grow" style={{ overflow: 'auto', padding: '0 32px' }}>
        <QueryView q={list} empty={{ title: q || cat ? 'Không có hàng khớp bộ lọc' : 'Chưa có hàng nào', desc: 'Thêm hàng để báo giá ngay trong chat — không cần Kế Toán.', action: !readonly && <Btn pri onClick={() => setOpen('new')}><Ic.plus />Thêm hàng</Btn> }}>
          {(rows) => (
            <table className="tbl">
              <thead><tr><th>Mã</th><th>Tên hàng</th><th>ĐVT</th><th>Thuế</th><th className="r">Giá công ty (gồm VAT)</th><th>Nguồn</th></tr></thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.itemId} onClick={() => setOpen(it)} style={{ cursor: 'pointer' }}>
                    <td><code>{it.sku}</code></td>
                    <td><div>{it.displayName ?? it.name}{!it.isSellableInCrm && <span className="subtle sm"> · ngừng bán trong CRM</span>}</div>
                      {it.displayName && <div className="xs subtle">{it.name}</div>}<Warnings it={it} /></td>
                    <td>{it.baseUnit}</td>
                    <td>{TAX_LABEL[it.taxCode]}</td>
                    <td className="r">{priceOf.has(it.itemId) ? vnd(priceOf.get(it.itemId)!) : <span className="subtle">—</span>}</td>
                    <td>{it.sync.source === 'ketoan' ? <Badge tone="pri">Kế Toán</Badge> : <Badge tone="out">Shop</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryView>
        {list.data && list.data.length > 0 && <div className="row" style={{ padding: '16px 0 24px' }}>
          <span className="muted sm">{total} mặt hàng</span><span className="grow" />
          <Pager page={page} total={pages} onPage={(p) => setQuery({ page: p === 1 ? null : p })} />
        </div>}
      </div>
      {open === 'new' && <NewItemSheet onClose={() => setOpen(null)} />}
      {open && open !== 'new' && <EditItemSheet key={open.itemId} it={open} readonly={readonly} onClose={() => setOpen(null)} />}
    </>
  );
}

function PriceCell({ row, readonly }: { row: PriceRow; readonly: boolean }) {
  const [v, setV] = useState<string | null>(null);
  const set = useAction(catalogPriceSet);
  if (readonly || v === null) {
    return <button type="button" className="ghost-cell" disabled={readonly} onClick={() => setV(String(row.price))} title={readonly ? 'Giá do Kế Toán giữ' : 'Bấm để sửa'}
      style={{ background: 'none', border: 0, cursor: readonly ? 'default' : 'pointer', font: 'inherit' }}>{vnd(row.price)}</button>;
  }
  const ok = PriceSchema.safeParse(Number(v)).success;
  return (
    <span className="row gap8" style={{ justifyContent: 'flex-end' }}>
      <input className="input sm" style={{ width: 140, textAlign: 'right' }} autoFocus value={v} inputMode="decimal" onChange={(e) => setV(e.target.value)} aria-label="Giá mới" />
      <Btn sm pri disabled={!ok || set.isPending} onClick={() => set.mutate({ priceListCode: row.priceListCode, itemId: row.itemId, unit: row.unit, price: Number(v) }, { onSuccess: () => setV(null) })}>Lưu</Btn>
      <Btn sm ghost onClick={() => setV(null)}>Huỷ</Btn>
      {set.error && <ActionErrorNote error={set.error} />}
    </span>
  );
}

function Prices({ readonly }: { readonly: boolean }) {
  const lists = useQueryAction(catalogPriceListList, {});
  const [code, setCode] = useState(COMPANY);
  const prices = useQueryAction(catalogPriceList, { priceListCode: code, page: 1, pageSize: 500 });
  const items = useQueryAction(catalogItemList, { page: 1, pageSize: 200, includeRetired: false });
  const nameOf = new Map((items.data ?? []).map((i) => [i.itemId, i.displayName ?? i.name]));
  return (
    <>
      <div className="row wrap" style={{ padding: '16px 32px' }}>
        {(lists.data ?? []).map((l) => <Chip key={l.code} on={code === l.code} onClick={() => setCode(l.code)}>{l.name}</Chip>)}
        <span className="grow" /><span className="muted sm">Giá đã gồm VAT · khoá theo item_id + ĐVT (H-14)</span>
      </div>
      <div className="grow" style={{ overflow: 'auto', padding: '0 32px' }}>
        <QueryView q={prices} empty={{ title: 'Bảng giá chưa có dòng nào', desc: 'Đặt giá ở màn Hàng hoá khi thêm hàng.' }}>
          {(rows) => (
            <table className="tbl">
              <thead><tr><th>Mã</th><th>Tên hàng</th><th>ĐVT</th><th className="r">Giá</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.itemId}:${r.unit}`}>
                    <td><code>{r.skuSnapshot}</code></td><td>{nameOf.get(r.itemId) ?? '—'}</td>
                    <td>{r.unit}{r.isDefaultUnit && <span className="xs subtle"> · bán chính</span>}</td>
                    <td className="r"><PriceCell row={r} readonly={readonly} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryView>
      </div>
    </>
  );
}

const TABS = [
  { id: 'items', label: 'Hàng hoá', icon: Ic.store },
  { id: 'prices', label: 'Bảng giá', icon: Ic.receipt },
];

export function Catalog() {
  const { query, setQuery } = useRoute();
  const tab = query.get('tab') === 'prices' ? 'prices' : 'items';
  const src = useQueryAction(catalogSourceGet, {});
  const readonly = src.data?.catalogSource === 'ketoan';
  return (
    <div className="page flush">
      <div className="row" style={{ padding: '16px 32px 0' }}>
        <Tabs items={TABS} value={tab} onChange={(id) => setQuery({ tab: id === 'items' ? null : id, page: null, q: null, cat: null })} />
      </div>
      <div style={{ padding: '16px 32px 0' }}><SourceNote /></div>
      {tab === 'items' ? <Items readonly={readonly} /> : <Prices readonly={readonly} />}
      <StatusBar><span>Nguồn danh mục: <b>{src.data ? (readonly ? 'Open Kế Toán' : 'Shop (chạy một mình)') : '—'}</b> · Đồng bộ với Kế Toán: PHASE-010</span></StatusBar>
    </div>
  );
}
