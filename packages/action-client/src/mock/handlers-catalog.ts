// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — giả lập danh mục độc lập (ADR-0004): hàng mẫu Shop Hoa Mai (GIẢ LẬP), chuẩn H-* ở hợp đồng,
//   trùng mã / tên ⇒ CAKE_SKU_TAKEN / CAKE_ITEM_NAME_TAKEN, nguồn ketoan ⇒ cổng ghi chặn cột kế toán (CAKE_CATALOG_READONLY).
import { catalogWriteGate, itemWarnings, type CatalogSource, type Item, type PriceRow } from '@open-cake/contracts';
import { ApiError } from '../client.js';
import { iso, nextId, paged, type Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
export type CatalogStore = { source: CatalogSource; items: Item[]; prices: PriceRow[] };

const sync = (source: CatalogSource) => ({ source, extId: null, extSyncedAt: null, extHash: null, pushStatus: 'local' as const, pushError: null });
const T = '2026-11-20T09:00:00+07:00';

/** Giả lập đơn vị đã nối Kế Toán: nguồn ketoan, mỗi hàng gắn ext_id = item_id bên Kế Toán (?catalog=ketoan). */
export function linkCatalogToKetoan(cat: CatalogStore): void {
  cat.source = 'ketoan';
  for (const it of cat.items) it.sync = { source: 'ketoan', extId: it.itemId, extSyncedAt: T, extHash: null, pushStatus: 'accepted', pushError: null };
}

export function seedCatalog(): CatalogStore {
  const item = (n: number, sku: string, name: string, unit: string, price: number, cat: string): [Item, PriceRow] => {
    const itemId = `01JDAP${String(n).padStart(20, '0')}`;
    const units = [{ unit, ratio: 1, isDefaultSale: true, weightKg: null }];
    return [{
      itemId, sku, name, displayName: null, baseUnit: unit, categoryCode: cat, itemKind: 'goods', taxCode: '8', isKct: false, parentItemId: null,
      status: 'active', noSale: false, isSellableInCrm: true, imageUrl: null, description: null,
      codes: [{ kind: 'sku', code: sku, validFrom: T, validTo: null }], units, sync: sync('local'), warnings: [], updatedAt: T,
    }, { priceListCode: 'CONGTY', itemId, skuSnapshot: sku, unit, price, isDefaultUnit: true }];
  };
  const rows = [
    item(1, '101010001', 'Váy hoa Thu Đông — hồng', 'Cái', 390000, '101010'),
    item(2, '101010002', 'Váy hoa Thu Đông — xanh mint', 'Cái', 390000, '101010'),
    item(3, '101010003', 'Váy hoa Thu Đông — vàng', 'Cái', 390000, '101010'),
    item(4, '102020001', 'Kẹp tóc hoa', 'Chiếc', 45000, '102020'),
  ];
  return { source: 'local', items: rows.map((r) => r[0]), prices: rows.map((r) => r[1]) };
}

const find = (s: Store, id: string) => {
  const it = s.catalog.items.find((x) => x.itemId === id);
  if (!it) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy hàng.' });
  return it;
};
const withWarnings = (s: Store, it: Item): Item => ({
  ...it,
  warnings: itemWarnings({ units: it.units, taxCode: it.taxCode, categoryLevel: it.categoryCode?.length === 6 ? 3 : null, noSale: it.noSale, hasCompanyPrice: s.catalog.prices.some((p) => p.itemId === it.itemId && p.priceListCode === 'CONGTY' && p.price > 0), today: iso(s.now()).slice(0, 10) }),
});

export const catalogHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.catalog_item.list': (s, i) => {
    const q = String(i.q ?? '').toLowerCase();
    const xs = s.catalog.items.filter((x) => (i.includeRetired || x.status !== 'retired') && (!i.categoryCode || x.categoryCode === i.categoryCode) && (!q || x.name.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q)));
    const start = (i.page - 1) * i.pageSize;
    return paged(xs.slice(start, start + i.pageSize).map((x) => withWarnings(s, x)), { page: i.page, pageSize: i.pageSize, total: xs.length });
  },
  'cake.catalog_item.get': (s, i) => ({ item: withWarnings(s, find(s, i.itemId)), prices: s.catalog.prices.filter((p) => p.itemId === i.itemId) }),
  'cake.catalog_item.create': (s, i) => {
    const gate = catalogWriteGate(s.catalog.source, ['sku', 'name']);
    if (!gate.ok) throw ApiError.reason('CAKE_CATALOG_READONLY');
    if (s.catalog.items.some((x) => x.codes.some((c) => c.kind === 'sku' && c.code === i.sku))) throw ApiError.reason('CAKE_SKU_TAKEN');
    if (s.catalog.items.some((x) => x.name.toLowerCase() === String(i.name).toLowerCase())) throw ApiError.reason('CAKE_ITEM_NAME_TAKEN');
    const at = iso(s.now());
    const base = i.units.find((u: Any) => u.ratio === 1);
    const parent = i.parentSku ? s.catalog.items.find((x) => x.sku === i.parentSku) : null;
    const it: Item = {
      itemId: nextId(s, 'C').replace('01JDAC', '01JDAP'), sku: i.sku, name: i.name, displayName: i.displayName, baseUnit: base.unit, categoryCode: i.categoryCode,
      itemKind: i.itemKind, taxCode: i.taxCode, isKct: i.taxCode === 'KCT', parentItemId: parent?.itemId ?? null, status: 'active', noSale: i.noSale, isSellableInCrm: true,
      imageUrl: null, description: null, units: i.units, sync: sync(s.catalog.source),
      codes: [{ kind: 'sku', code: i.sku, validFrom: at, validTo: null }, ...i.barcodes.map((b: string) => ({ kind: 'barcode', code: b, validFrom: at, validTo: null }))],
      warnings: [], updatedAt: at,
    };
    s.catalog.items.push(it);
    return withWarnings(s, it);
  },
  'cake.catalog_item.update': (s, i) => {
    const it = find(s, i.itemId);
    const gate = catalogWriteGate(s.catalog.source, Object.keys(i.patch));
    if (!gate.ok) throw new ApiError({ ...ApiError.reason('CAKE_CATALOG_READONLY'), message: `Danh mục đang lấy từ Kế Toán: không sửa được ${gate.blocked.join(', ')}.` });
    if (i.patch.name && s.catalog.items.some((x) => x.itemId !== it.itemId && x.name.toLowerCase() === String(i.patch.name).toLowerCase())) throw ApiError.reason('CAKE_ITEM_NAME_TAKEN');
    Object.assign(it, i.patch, i.patch.taxCode ? { isKct: i.patch.taxCode === 'KCT' } : {}, { updatedAt: iso(s.now()) });
    return withWarnings(s, it);
  },
  'cake.catalog_category.list': (s) => [
    { code: '10', name: 'Thời trang', parentCode: null, level: 1, kind: 'group', isActive: true, sync: sync(s.catalog.source) },
    { code: '1010', name: 'Váy', parentCode: '10', level: 2, kind: 'group', isActive: true, sync: sync(s.catalog.source) },
    { code: '101010', name: 'Váy hoa', parentCode: '1010', level: 3, kind: 'group', isActive: true, sync: sync(s.catalog.source) },
    { code: '102020', name: 'Phụ kiện tóc', parentCode: '10', level: 3, kind: 'group', isActive: true, sync: sync(s.catalog.source) },
  ],
  'cake.catalog_price_list.list': (s) => [{ code: 'CONGTY', name: 'Bảng giá công ty', isCompany: true, isActive: true, sync: sync(s.catalog.source) }],
  'cake.catalog_price.set': (s, i) => {
    if (!catalogWriteGate(s.catalog.source, ['units']).ok) throw ApiError.reason('CAKE_CATALOG_READONLY');
    const it = find(s, i.itemId);
    if (!it.units.some((u) => u.unit === i.unit)) throw new ApiError({ code: 'VALIDATION_ERROR', message: 'ĐVT của giá phải là ĐVT của mã hàng (H-14).', field: 'unit' });
    const row = { priceListCode: i.priceListCode, itemId: i.itemId, skuSnapshot: it.sku, unit: i.unit, price: i.price, isDefaultUnit: it.units.find((u) => u.unit === i.unit)?.isDefaultSale ?? false };
    s.catalog.prices = [...s.catalog.prices.filter((p) => !(p.priceListCode === row.priceListCode && p.itemId === row.itemId && p.unit === row.unit)), row];
    return row;
  },
  'cake.catalog_price.list': (s, i) => {
    const xs = s.catalog.prices.filter((p) => p.priceListCode === i.priceListCode);
    const start = (i.page - 1) * i.pageSize;
    return paged(xs.slice(start, start + i.pageSize), { page: i.page, pageSize: i.pageSize, total: xs.length });
  },
  'cake.catalog_source.get': (s) => (s.catalog.source === 'local'
    ? { catalogSource: 'local', oktBaseUrl: null, oktTenantId: null, branchCode: null, externalRef: null, connectedAt: null, lastHealthOkAt: null, paused: false }
    : { catalogSource: 'ketoan', oktBaseUrl: 'https://ketoan.hoamai.example', oktTenantId: '1', branchCode: null, externalRef: 'opencake:hoa-mai', connectedAt: T, lastHealthOkAt: iso(s.now()), paused: false }),
};
