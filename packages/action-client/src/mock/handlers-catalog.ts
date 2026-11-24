// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — giả lập danh mục độc lập (ADR-0004): hàng mẫu Shop Hoa Mai (GIẢ LẬP), chuẩn H-* ở hợp đồng,
//   trùng mã / tên ⇒ CAKE_SKU_TAKEN / CAKE_ITEM_NAME_TAKEN, nguồn ketoan ⇒ cổng ghi chặn cột kế toán (CAKE_CATALOG_READONLY).
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — cột riêng của Cake đọc / ghi ở lớp mềm (s.meta[itemId], khoá cake.item.*);
//   tạo hàng kèm giá công ty một lần gọi; lọc sellableOnly; nguồn trả tenant slug.
import { ITEM_LOCAL_META, catalogWriteGate, itemWarnings, type CatalogSource, type Item, type ItemLocal, type PriceRow } from '@open-cake/contracts';
import { ApiError } from '../client.js';
import { iso, nextId, paged, type Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
type Row = Omit<Item, 'local' | 'warnings'>;
export type CatalogStore = { source: CatalogSource; items: Row[]; prices: PriceRow[] };

const COMPANY = 'CONGTY';
const T = '2026-11-20T09:00:00+07:00';
const sync = (source: CatalogSource) => ({ source, extId: null, extVersion: null, extSyncedAt: null, pushStatus: 'local' as const, pushError: null });

export function seedCatalog(): CatalogStore {
  const item = (n: number, sku: string, name: string, unit: string, price: number | null, cat: string): [Row, PriceRow | null] => {
    const itemId = `01JDAP${String(n).padStart(20, '0')}`;
    return [{
      itemId, sku, name, baseUnit: unit, categoryCode: cat, itemKind: 'goods', taxCode: '8', isKct: false, parentItemId: null, status: 'active', noSale: false,
      codes: [{ kind: 'sku', code: sku, validFrom: T, validTo: null }], units: [{ unit, ratio: 1, isDefaultSale: true, weightKg: null }], sync: sync('local'), updatedAt: T,
    }, price === null ? null : { priceListCode: COMPANY, itemId, skuSnapshot: sku, unit, price, isDefaultUnit: true }];
  };
  const rows = [
    item(1, '101010001', 'Váy hoa Thu Đông — hồng', 'Cái', 390000, '101010'),
    item(2, '101010002', 'Váy hoa Thu Đông — xanh mint', 'Cái', 390000, '101010'),
    item(3, '101010003', 'Váy hoa Thu Đông — vàng', 'Cái', 390000, '101010'),
    item(4, '102020001', 'Kẹp tóc hoa', 'Chiếc', null, '102020'), // chưa có giá ⇒ cảnh báo CAT-NO-COMPANY-PRICE
  ];
  return { source: 'local', items: rows.map((r) => r[0]), prices: rows.flatMap((r) => (r[1] ? [r[1]] : [])) };
}

/** Giả lập đơn vị đã nối Kế Toán: nguồn ketoan, mỗi hàng gắn id của chủ (?catalog=ketoan). */
export function linkCatalogToKetoan(cat: CatalogStore): void {
  cat.source = 'ketoan';
  for (const it of cat.items) it.sync = { source: 'ketoan', extId: `01JKT${it.itemId.slice(5)}`, extVersion: 1, extSyncedAt: T, pushStatus: 'accepted', pushError: null };
}

const localOf = (s: Store, id: string): ItemLocal => {
  const m = s.meta[id] ?? {};
  return { displayName: m[ITEM_LOCAL_META.displayName] ?? null, sellable: m[ITEM_LOCAL_META.sellable] !== 'false', imageUrl: m[ITEM_LOCAL_META.imageUrl] ?? null, description: m[ITEM_LOCAL_META.description] ?? null };
};
const setLocal = (s: Store, id: string, patch: Partial<ItemLocal>) => {
  const m = (s.meta[id] ??= {});
  for (const [k, v] of Object.entries(patch)) {
    const key = ITEM_LOCAL_META[k as keyof ItemLocal];
    if (v === null || v === undefined) delete m[key]; else m[key] = String(v);
  }
};
const find = (s: Store, id: string) => {
  const it = s.catalog.items.find((x) => x.itemId === id);
  if (!it) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy hàng.' });
  return it;
};
const view = (s: Store, it: Row): Item => ({
  ...it,
  local: localOf(s, it.itemId),
  warnings: itemWarnings({ units: it.units, taxCode: it.taxCode, categoryLevel: it.categoryCode?.length === 6 ? 3 : null, noSale: it.noSale, hasCompanyPrice: s.catalog.prices.some((p) => p.itemId === it.itemId && p.priceListCode === COMPANY && p.price > 0), today: iso(s.now()).slice(0, 10) }),
});
const readonly = (s: Store, fields: string[]) => {
  const gate = catalogWriteGate(s.catalog.source, fields);
  if (!gate.ok) throw new ApiError({ ...ApiError.reason('CAKE_CATALOG_READONLY'), message: `Danh mục đang lấy từ Kế Toán: không sửa được ${gate.blocked.join(', ')}.` });
};
const putPrice = (s: Store, it: Row, listCode: string, unit: string, price: number): PriceRow => {
  if (!it.units.some((u) => u.unit === unit)) throw new ApiError({ code: 'VALIDATION_ERROR', message: 'ĐVT của giá phải là ĐVT của mã hàng (H-14).', field: 'unit' });
  const row = { priceListCode: listCode, itemId: it.itemId, skuSnapshot: it.sku, unit, price, isDefaultUnit: it.units.find((u) => u.unit === unit)?.isDefaultSale ?? false };
  s.catalog.prices = [...s.catalog.prices.filter((p) => !(p.priceListCode === listCode && p.itemId === it.itemId && p.unit === unit)), row];
  return row;
};

export const catalogHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.catalog_item.list': (s, i) => {
    const q = String(i.q ?? '').toLowerCase();
    const xs = s.catalog.items.filter((x) => (i.includeRetired || x.status !== 'retired') && (!i.categoryCode || x.categoryCode === i.categoryCode)
      && (!q || x.name.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q) || (localOf(s, x.itemId).displayName ?? '').toLowerCase().includes(q))
      && (!i.sellableOnly || (localOf(s, x.itemId).sellable && !x.noSale)));
    const start = (i.page - 1) * i.pageSize;
    return paged(xs.slice(start, start + i.pageSize).map((x) => view(s, x)), { page: i.page, pageSize: i.pageSize, total: xs.length });
  },
  'cake.catalog_item.get': (s, i) => ({ item: view(s, find(s, i.itemId)), prices: s.catalog.prices.filter((p) => p.itemId === i.itemId) }),
  'cake.catalog_item.create': (s, i) => {
    readonly(s, ['sku', 'name']);
    if (s.catalog.items.some((x) => x.codes.some((c) => c.kind === 'sku' && c.code === i.sku))) throw ApiError.reason('CAKE_SKU_TAKEN');
    if (s.catalog.items.some((x) => x.name.toLowerCase() === String(i.name).toLowerCase())) throw ApiError.reason('CAKE_ITEM_NAME_TAKEN');
    const at = iso(s.now());
    const parent = i.parentSku ? s.catalog.items.find((x) => x.sku === i.parentSku) : null;
    const it: Row = {
      itemId: nextId(s, 'C').replace('01JDAC', '01JDAP'), sku: i.sku, name: i.name, baseUnit: i.units.find((u: Any) => u.ratio === 1).unit, categoryCode: i.categoryCode,
      itemKind: i.itemKind, taxCode: i.taxCode, isKct: i.taxCode === 'KCT', parentItemId: parent?.itemId ?? null, status: 'active', noSale: i.noSale, units: i.units, sync: sync(s.catalog.source),
      codes: [{ kind: 'sku', code: i.sku, validFrom: at, validTo: null }, ...i.barcodes.map((b: string) => ({ kind: 'barcode', code: b, validFrom: at, validTo: null }))], updatedAt: at,
    };
    s.catalog.items.push(it);
    if (i.price !== undefined) putPrice(s, it, COMPANY, (i.units.find((u: Any) => u.isDefaultSale) ?? i.units.find((u: Any) => u.ratio === 1)).unit, i.price);
    return view(s, it);
  },
  'cake.catalog_item.update': (s, i) => {
    const it = find(s, i.itemId);
    const { local, ...erp } = i.patch;
    readonly(s, Object.keys(erp));
    if (erp.name && s.catalog.items.some((x) => x.itemId !== it.itemId && x.name.toLowerCase() === String(erp.name).toLowerCase())) throw ApiError.reason('CAKE_ITEM_NAME_TAKEN');
    Object.assign(it, erp, erp.taxCode ? { isKct: erp.taxCode === 'KCT' } : {}, { updatedAt: iso(s.now()) });
    if (local) setLocal(s, it.itemId, local);
    return view(s, it);
  },
  'cake.catalog_category.list': (s) => [
    ['10', 'Thời trang', null, 1], ['1010', 'Váy', '10', 2], ['101010', 'Váy hoa', '1010', 3], ['1020', 'Phụ kiện', '10', 2], ['102020', 'Phụ kiện tóc', '1020', 3],
  ].map(([code, name, parentCode, level]) => ({ code, name, parentCode, level, isActive: true, sync: sync(s.catalog.source) })),
  'cake.catalog_price_list.list': (s) => [{ code: COMPANY, name: 'Bảng giá công ty', isCompany: true, isActive: true, sync: sync(s.catalog.source) }],
  'cake.catalog_price.set': (s, i) => {
    readonly(s, ['price']);
    return putPrice(s, find(s, i.itemId), i.priceListCode, i.unit, i.price);
  },
  'cake.catalog_price.list': (s, i) => {
    const xs = s.catalog.prices.filter((p) => p.priceListCode === i.priceListCode);
    const start = (i.page - 1) * i.pageSize;
    return paged(xs.slice(start, start + i.pageSize), { page: i.page, pageSize: i.pageSize, total: xs.length });
  },
  'cake.catalog_source.get': (s) => ({
    tenant: 'hoa-mai', catalogSource: s.catalog.source, branchCode: s.catalog.source === 'ketoan' ? 'CN01' : null,
    ketoan: s.catalog.source === 'ketoan' ? { baseUrl: 'https://ketoan.hoamai.example', connectedAt: T, lastSyncAt: iso(s.now()), paused: false } : null,
  }),
};
