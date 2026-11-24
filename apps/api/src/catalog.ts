// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1 / PHASE-017 — 9 action danh mục trên Postgres (0102 + 0103), CÙNG ngữ nghĩa bộ giả lập
//   (handlers-catalog.ts): cổng ghi theo nguồn (catalogWriteGate), trùng mã / tên ⇒ CAKE_SKU_TAKEN / CAKE_ITEM_NAME_TAKEN, cột riêng ở entity_meta cake.item.*,
//   tạo hàng + mã + ĐVT + giá công ty trong MỘT giao dịch. Mọi truy vấn qua db của nền ⇒ RLS theo đơn vị.
import { sql } from 'kysely';
import { ITEM_LOCAL_META, catalogWriteGate, itemWarnings, type CatalogSource, type Item, type ItemLocal } from '@open-cake/contracts';
import './db-types.js';
import { cakeError, failure, newUlid, paged, type Ctx, type Handler } from './runtime.js';

const COMPANY = 'CONGTY';
const iso = (d: Date | string | null) => (d === null ? null : new Date(d).toISOString());
const syncOf = (r: { source: CatalogSource; ext_id: string | null; ext_version: number | null; ext_synced_at: Date | null; push_status: string; push_error: string | null }) =>
  ({ source: r.source, extId: r.ext_id, extVersion: r.ext_version, extSyncedAt: iso(r.ext_synced_at), pushStatus: r.push_status as Item['sync']['pushStatus'], pushError: r.push_error });

async function sourceOf({ tx, tenantId }: Ctx): Promise<CatalogSource> {
  const r = await tx.selectFrom('tenant_links').select('catalog_source').where('tenant_id', '=', tenantId).executeTakeFirst();
  return r?.catalog_source ?? 'local';
}
async function gate(ctx: Ctx, fields: string[]) {
  const g = catalogWriteGate(await sourceOf(ctx), fields);
  if (!g.ok) throw cakeError('CAKE_CATALOG_READONLY', `Danh mục đang lấy từ Kế Toán: không sửa được ${g.blocked.join(', ')}.`);
}

/** Dựng Item (hợp đồng) cho nhiều hàng một lượt: mã, ĐVT, cột riêng, cảnh báo — 4 truy vấn, không theo từng hàng. */
async function view({ tx, tenantId }: Ctx, ids: string[]): Promise<Item[]> {
  if (!ids.length) return [];
  const [rows, codes, units, meta, priced] = await Promise.all([
    tx.selectFrom('catalog_items as i').leftJoin('catalog_categories as c', (j) => j.onRef('c.tenant_id', '=', 'i.tenant_id').onRef('c.code', '=', 'i.category_code'))
      .selectAll('i').select('c.level as category_level').where('i.item_id', 'in', ids).execute(),
    tx.selectFrom('catalog_item_codes').selectAll().where('item_id', 'in', ids).orderBy('valid_from').execute(),
    tx.selectFrom('catalog_item_units').selectAll().where('item_id', 'in', ids).orderBy('ratio').execute(),
    tx.selectFrom('entity_meta').select(['entity_id', 'key', 'value']).where('entity_type', '=', 'item').where('entity_id', 'in', ids).execute(),
    tx.selectFrom('catalog_prices').select('item_id').distinct().where('price_list_code', '=', COMPANY).where('price', '>', '0').where('item_id', 'in', ids).execute(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map(rows.map((r) => [r.item_id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    const m = new Map(meta.filter((x) => x.entity_id === id).map((x) => [x.key, x.value]));
    const local: ItemLocal = { displayName: (m.get(ITEM_LOCAL_META.displayName) as string) ?? null, sellable: m.get(ITEM_LOCAL_META.sellable) !== false, imageUrl: (m.get(ITEM_LOCAL_META.imageUrl) as string) ?? null, description: (m.get(ITEM_LOCAL_META.description) as string) ?? null };
    const us = units.filter((u) => u.item_id === id).map((u) => ({ unit: u.unit, ratio: Number(u.ratio), isDefaultSale: u.is_default_sale, weightKg: u.weight_kg === null ? null : Number(u.weight_kg) }));
    const item: Omit<Item, 'warnings'> = {
      itemId: id, sku: r.sku, name: r.name, baseUnit: r.base_unit, categoryCode: r.category_code, itemKind: r.item_kind as Item['itemKind'], taxCode: r.tax_code as Item['taxCode'], isKct: r.is_kct,
      parentItemId: r.parent_item_id, status: r.status as Item['status'], noSale: r.no_sale, units: us, local, sync: syncOf(r), updatedAt: iso(r.updated_at)!,
      codes: codes.filter((c) => c.item_id === id).map((c) => ({ kind: c.kind, code: c.code, validFrom: iso(c.valid_from)!, validTo: iso(c.valid_to) })),
    };
    return [{ ...item, warnings: itemWarnings({ units: us, taxCode: r.tax_code, categoryLevel: r.category_level ?? null, noSale: r.no_sale, hasCompanyPrice: priced.some((p) => p.item_id === id), today }) }];
  });
}

async function setLocal({ tx, tenantId }: Ctx, itemId: string, patch: Partial<ItemLocal>) {
  for (const [k, v] of Object.entries(patch)) {
    const key = ITEM_LOCAL_META[k as keyof ItemLocal];
    const q = tx.deleteFrom('entity_meta').where('tenant_id', '=', tenantId).where('entity_type', '=', 'item').where('entity_id', '=', itemId).where('key', '=', key);
    if (v === null || v === undefined) { await q.execute(); continue; }
    await tx.insertInto('entity_meta').values({ tenant_id: tenantId, entity_type: 'item', entity_id: itemId, key, value: JSON.stringify(v) })
      .onConflict((o) => o.columns(['tenant_id', 'entity_type', 'entity_id', 'key']).doUpdateSet({ value: JSON.stringify(v), updated_at: new Date() })).execute();
  }
}

async function putPrice({ tx, tenantId }: Ctx, itemId: string, listCode: string, unit: string, price: number) {
  const u = await tx.selectFrom('catalog_item_units').select('is_default_sale').where('item_id', '=', itemId).where('unit', '=', unit).executeTakeFirst();
  if (!u) throw failure('VALIDATION_ERROR', 'ĐVT của giá phải là ĐVT của mã hàng (H-14).', { field: 'unit' });
  await tx.insertInto('catalog_prices').values({ tenant_id: tenantId, price_list_code: listCode, item_id: itemId, unit, price })
    .onConflict((o) => o.columns(['tenant_id', 'price_list_code', 'item_id', 'unit']).doUpdateSet({ price, updated_at: new Date() })).execute();
  const it = await tx.selectFrom('catalog_items').select('sku').where('item_id', '=', itemId).executeTakeFirstOrThrow();
  return { priceListCode: listCode, itemId, skuSnapshot: it.sku, unit, price, isDefaultUnit: u.is_default_sale };
}

const nameTaken = (ctx: Ctx, name: string, except?: string) => {
  let q = ctx.tx.selectFrom('catalog_items').select('item_id').where(sql`lower(name)`, '=', name.toLowerCase());
  if (except) q = q.where('item_id', '<>', except);
  return q.executeTakeFirst();
};

export const catalogHandlers: Record<string, Handler> = {
  'cake.catalog_item.list': async (ctx, i) => {
    let q = ctx.tx.selectFrom('catalog_items as i');
    if (!i.includeRetired) q = q.where('i.status', '<>', 'retired');
    if (i.categoryCode) q = q.where('i.category_code', '=', i.categoryCode);
    if (i.q) q = q.where((e) => e.or([e('i.name', 'ilike', `%${i.q}%`), e('i.sku', 'ilike', `%${i.q}%`)]));
    if (i.sellableOnly) q = q.where('i.no_sale', '=', false).where(({ not, exists, selectFrom }) => not(exists(selectFrom('entity_meta as m').select('m.key')
      .whereRef('m.entity_id', '=', 'i.item_id').where('m.entity_type', '=', 'item').where('m.key', '=', ITEM_LOCAL_META.sellable).where(sql`m.value`, '=', sql`'false'::jsonb`))));
    const [{ n }] = await q.select((e) => e.fn.countAll<string>().as('n')).execute() as [{ n: string }];
    const ids = (await q.select('i.item_id').orderBy('i.sku').limit(i.pageSize).offset((i.page - 1) * i.pageSize).execute()).map((r) => r.item_id);
    return paged(await view(ctx, ids), { page: i.page, pageSize: i.pageSize, total: Number(n) });
  },
  'cake.catalog_item.get': async (ctx, i) => {
    const [item] = await view(ctx, [i.itemId]);
    if (!item) throw failure('NOT_FOUND', 'Không tìm thấy hàng.');
    const prices = await ctx.tx.selectFrom('catalog_prices').selectAll().where('item_id', '=', i.itemId).execute();
    return { item, prices: prices.map((p) => ({ priceListCode: p.price_list_code, itemId: p.item_id, skuSnapshot: item.sku, unit: p.unit, price: Number(p.price), isDefaultUnit: item.units.find((u) => u.unit === p.unit)?.isDefaultSale ?? false })) };
  },
  'cake.catalog_item.create': async (ctx, i) => {
    await gate(ctx, ['sku', 'name']);
    if (await ctx.tx.selectFrom('catalog_item_codes').select('code').where('kind', '=', 'sku').where('code', '=', i.sku).executeTakeFirst()) throw cakeError('CAKE_SKU_TAKEN');
    if (await nameTaken(ctx, i.name)) throw cakeError('CAKE_ITEM_NAME_TAKEN');
    const itemId = newUlid();
    const parent = i.parentSku ? await ctx.tx.selectFrom('catalog_items').select('item_id').where('sku', '=', i.parentSku).executeTakeFirst() : undefined;
    const base = i.units.find((u: { ratio: number }) => u.ratio === 1);
    await ctx.tx.insertInto('catalog_items').values({ item_id: itemId, tenant_id: ctx.tenantId, sku: i.sku, name: i.name, base_unit: base.unit, category_code: i.categoryCode, item_kind: i.itemKind,
      tax_code: i.taxCode, parent_item_id: parent?.item_id ?? null, no_sale: i.noSale, source: await sourceOf(ctx), ext_id: null, ext_version: null, ext_synced_at: null, push_error: null }).execute();
    await ctx.tx.insertInto('catalog_item_codes').values([{ kind: 'sku', code: i.sku }, ...i.barcodes.map((b: string) => ({ kind: 'barcode', code: b }))]
      .map((c) => ({ tenant_id: ctx.tenantId, item_id: itemId, valid_to: null, ...c }))).execute();
    await ctx.tx.insertInto('catalog_item_units').values(i.units.map((u: { unit: string; ratio: number; isDefaultSale: boolean; weightKg?: number | null }) =>
      ({ tenant_id: ctx.tenantId, item_id: itemId, unit: u.unit, ratio: u.ratio, is_default_sale: u.isDefaultSale, weight_kg: u.weightKg ?? null }))).execute();
    if (i.price !== undefined) await putPrice(ctx, itemId, COMPANY, (i.units.find((u: { isDefaultSale: boolean }) => u.isDefaultSale) ?? base).unit, i.price);
    return (await view(ctx, [itemId]))[0];
  },
  'cake.catalog_item.update': async (ctx, i) => {
    const { local, units, ...erp } = i.patch as Record<string, unknown> & { local?: Partial<ItemLocal>; units?: { unit: string; ratio: number; isDefaultSale: boolean; weightKg?: number | null }[] };
    await gate(ctx, [...Object.keys(erp), ...(units ? ['units'] : [])]);
    if (!(await view(ctx, [i.itemId])).length) throw failure('NOT_FOUND', 'Không tìm thấy hàng.');
    if (typeof erp.name === 'string' && await nameTaken(ctx, erp.name, i.itemId)) throw cakeError('CAKE_ITEM_NAME_TAKEN');
    const cols: Record<string, unknown> = { name: erp.name, tax_code: erp.taxCode, category_code: erp.categoryCode, no_sale: erp.noSale };
    const set = Object.fromEntries(Object.entries(cols).filter(([, v]) => v !== undefined));
    await ctx.tx.updateTable('catalog_items').set({ ...set, updated_at: new Date() }).where('item_id', '=', i.itemId).execute();
    if (units) {
      await ctx.tx.deleteFrom('catalog_item_units').where('item_id', '=', i.itemId).where('unit', 'not in', units.map((u) => u.unit)).execute(); // ĐVT còn giá ⇒ CSDL chặn (khoá ngoại)
      for (const u of units) await ctx.tx.insertInto('catalog_item_units').values({ tenant_id: ctx.tenantId, item_id: i.itemId, unit: u.unit, ratio: u.ratio, is_default_sale: u.isDefaultSale, weight_kg: u.weightKg ?? null })
        .onConflict((o) => o.columns(['tenant_id', 'item_id', 'unit']).doUpdateSet({ ratio: u.ratio, is_default_sale: u.isDefaultSale })).execute();
    }
    if (local) await setLocal(ctx, i.itemId, local);
    return (await view(ctx, [i.itemId]))[0];
  },
  'cake.catalog_category.list': async ({ tx }) => (await tx.selectFrom('catalog_categories').selectAll().where('is_active', '=', true).orderBy('code').execute())
    .map((c) => ({ code: c.code, name: c.name, parentCode: c.parent_code, level: c.level, isActive: c.is_active, sync: syncOf(c) })),
  'cake.catalog_price_list.list': async ({ tx }) => (await tx.selectFrom('catalog_price_lists').selectAll().orderBy('code').execute())
    .map((p) => ({ code: p.code, name: p.name, isCompany: p.is_company, isActive: p.is_active, sync: syncOf(p) })),
  'cake.catalog_price.set': async (ctx, i) => { await gate(ctx, ['price']); return putPrice(ctx, i.itemId, i.priceListCode, i.unit, i.price); },
  'cake.catalog_price.list': async ({ tx }, i) => {
    const q = tx.selectFrom('catalog_prices as p').innerJoin('catalog_items as i', 'i.item_id', 'p.item_id').innerJoin('catalog_item_units as u', (j) => j.onRef('u.item_id', '=', 'p.item_id').onRef('u.unit', '=', 'p.unit'))
      .where('p.price_list_code', '=', i.priceListCode);
    const [{ n }] = await q.select((e) => e.fn.countAll<string>().as('n')).execute() as [{ n: string }];
    const rows = await q.select(['p.price_list_code', 'p.item_id', 'i.sku', 'p.unit', 'p.price', 'u.is_default_sale']).orderBy('i.sku').limit(i.pageSize).offset((i.page - 1) * i.pageSize).execute();
    return paged(rows.map((r) => ({ priceListCode: r.price_list_code, itemId: r.item_id, skuSnapshot: r.sku, unit: r.unit, price: Number(r.price), isDefaultUnit: r.is_default_sale })), { page: i.page, pageSize: i.pageSize, total: Number(n) });
  },
  'cake.catalog_source.get': async ({ tx, tenantId }) => {
    const t = await tx.selectFrom('tenants').select('code').where('id', '=', tenantId).executeTakeFirstOrThrow();
    const l = await tx.selectFrom('tenant_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
    const ketoan = l?.catalog_source === 'ketoan' && l.okt_base_url && l.connected_at ? { baseUrl: l.okt_base_url, connectedAt: iso(l.connected_at)!, lastSyncAt: iso(l.last_health_ok_at), paused: l.paused } : null;
    return { tenant: t.code, catalogSource: l?.catalog_source ?? 'local', branchCode: l?.branch_code ?? null, ketoan };
  },
};
