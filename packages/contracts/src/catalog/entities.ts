// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — danh mục độc lập sẵn ánh xạ (ADR-0004): hàng, mã, ĐVT, nhóm, bảng giá, giá, liên kết đơn vị.
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — theo bizcity_spine@1.1: itemId của Cake là KHOÁ CỤC BỘ (R-SPINE-1/9) — trên dây đi bằng itemRefOf();
//   cột riêng của Cake (tên hiển thị, bán trong CRM, ảnh, mô tả) ở lớp mềm entity_meta cake.item.* (R-SPINE-5/10, R-CANON-15); đơn vị = slug tenant (không lộ id nội bộ Kế Toán).
import { z } from 'zod';
import { ULID_RE } from '../cake/channel.js';
import { CatalogWarningSchema, ItemNameSchema, ItemUnitInputSchema, PriceSchema, SkuSchema, TaxCodeSchema } from './standard.js';

const iso = z.string().datetime({ offset: true });

/** Nguồn danh mục theo đơn vị (setting bizcity.cake.catalog_source). */
export const CatalogSourceSchema = z.enum(['local', 'ketoan']);
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;

/** Khối ánh xạ chung — cột tối thiểu của bản sao theo SPINE §4 (id chủ · phiên bản · lúc đồng bộ). */
export const MasterSyncSchema = z.object({
  source: CatalogSourceSchema,
  extId: z.string().nullable(), // id của chủ: items.item_id | price_lists.code | item_classes.code
  extVersion: z.number().int().min(1).nullable(), // đối chiếu digest {id, version}
  extSyncedAt: iso.nullable(),
  pushStatus: z.enum(['local', 'sent', 'accepted', 'rejected']),
  pushError: z.string().nullable(),
});
export type MasterSync = z.infer<typeof MasterSyncSchema>;

export const CategorySchema = z.object({
  code: z.string().regex(/^[0-9A-Z_-]{1,32}$/), // → item_classes.code (kind group)
  name: z.string().min(1).max(100),
  parentCode: z.string().nullable(),
  level: z.number().int().min(1).max(3),
  isActive: z.boolean(),
  sync: MasterSyncSchema,
});
export type Category = z.infer<typeof CategorySchema>;

export const ItemCodeSchema = z.object({
  kind: z.union([z.enum(['sku', 'barcode', 'alias']), z.string().regex(/^external:[a-z0-9-]+$/)]), // → item_codes.kind
  code: z.string().min(1).max(160),
  validFrom: iso,
  validTo: iso.nullable(),
});

/** Cột riêng của Cake — lớp mềm entity_meta cake.item.*; sửa được ở mọi nguồn (chủ không chạm, R-SPINE-10). */
export const ItemLocalSchema = z.object({
  displayName: z.string().max(200).nullable(), // tên gọi khi chat
  sellable: z.boolean(), // hiện khi gửi giá trong chat
  imageUrl: z.string().max(1000).nullable(),
  description: z.string().max(20000).nullable(),
});
export type ItemLocal = z.infer<typeof ItemLocalSchema>;
export const ITEM_LOCAL_META: Record<keyof ItemLocal, string> = {
  displayName: 'cake.item.display_name', sellable: 'cake.item.sellable', imageUrl: 'cake.item.image_url', description: 'cake.item.description',
};

export const ItemSchema = z.object({
  itemId: z.string().regex(ULID_RE), // khoá cục bộ của Cake; id của Kế Toán ở sync.extId
  sku: SkuSchema, // mã hiện hành (ảnh chụp từ codes kind sku)
  name: ItemNameSchema,
  baseUnit: z.string().min(1).max(20),
  categoryCode: z.string().nullable(),
  itemKind: z.enum(['goods', 'material', 'finished', 'service', 'tool', 'asset', 'gift', 'packaging', 'other']).nullable(),
  taxCode: TaxCodeSchema,
  isKct: z.boolean(), // = taxCode KCT (H-13, tự tính)
  parentItemId: z.string().regex(ULID_RE).nullable(),
  status: z.enum(['draft', 'active', 'retired']),
  noSale: z.boolean(),
  codes: z.array(ItemCodeSchema),
  units: z.array(ItemUnitInputSchema),
  sync: MasterSyncSchema,
  local: ItemLocalSchema,
  warnings: z.array(CatalogWarningSchema),
  updatedAt: iso,
});
export type Item = z.infer<typeof ItemSchema>;

export const PriceListSchema = z.object({
  code: z.string().regex(/^[0-9A-Z_-]{1,32}$/), // → price_lists.code
  name: z.string().min(1).max(100),
  isCompany: z.boolean(), // đúng một bảng giá công ty
  isActive: z.boolean(),
  sync: MasterSyncSchema,
});
export type PriceList = z.infer<typeof PriceListSchema>;

export const PriceRowSchema = z.object({
  priceListCode: z.string(),
  itemId: z.string().regex(ULID_RE),
  skuSnapshot: z.string(), // chỉ để hiển thị; khoá là itemId
  unit: z.string(),
  price: PriceSchema, // gồm VAT (H-14) → product_prices.price
  isDefaultUnit: z.boolean(),
});
export type PriceRow = z.infer<typeof PriceRowSchema>;

/** Nguồn danh mục + đơn vị. tenant = slug site (SPINE trục tenant); tenant_id bigint của Kế Toán không lộ ra dây. */
export const CatalogSourceInfoSchema = z.object({
  tenant: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
  catalogSource: CatalogSourceSchema,
  branchCode: z.string().regex(/^[A-Z0-9_.-]{1,20}$/).nullable(), // SPINE trục branch
  ketoan: z.object({ baseUrl: z.string().url(), connectedAt: iso, lastSyncAt: iso.nullable(), paused: z.boolean() }).nullable(),
});
export type CatalogSourceInfo = z.infer<typeof CatalogSourceInfoSchema>;

/** Cột kế toán: chỉ đọc khi nguồn = ketoan. Mọi thứ ngoài `local` là cột kế toán (một danh sách, một cổng). */
export const ERP_ITEM_FIELDS = ['sku', 'name', 'baseUnit', 'categoryCode', 'itemKind', 'taxCode', 'parentItemId', 'status', 'noSale', 'units', 'codes'] as const;

/** Cổng ghi duy nhất (R-CAKE-MASTER-3): nguồn ketoan ⇒ chặn mọi cột kế toán, ở MỌI trạng thái kết nối. */
export function catalogWriteGate(source: CatalogSource, changedFields: readonly string[]): { ok: true } | { ok: false; blocked: string[] } {
  if (source === 'local') return { ok: true };
  const blocked = changedFields.filter((f) => f !== 'local');
  return blocked.length ? { ok: false, blocked } : { ok: true };
}

/** ItemRef trên dây (SPINE §3): đã gắn Kế Toán ⇒ {id}; chưa ⇒ khoá cục bộ + mã (R-SPINE-1: không đưa itemId của Cake vào ô id). */
export type ItemRef = { id: string } | { local: string; code: string };
export const itemRefOf = (it: Pick<Item, 'itemId' | 'sku' | 'sync'>): ItemRef =>
  (it.sync.extId ? { id: it.sync.extId } : { local: `cake:item:${it.itemId}`, code: it.sku });
