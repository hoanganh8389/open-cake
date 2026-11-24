// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — danh mục độc lập sẵn ánh xạ (ADR-0004): hàng, mã, ĐVT, nhóm, bảng giá, giá, liên kết đơn vị.
//   Mỗi bảng đồng bộ mang cùng khối ánh xạ MasterSync (khuôn open-pos-backend); item_id cùng khuôn ULID với open-ketoan items.item_id.
import { z } from 'zod';
import { ULID_RE } from '../cake/channel.js';
import { CatalogWarningSchema, ItemNameSchema, ItemUnitInputSchema, PriceSchema, SkuSchema, TaxCodeSchema } from './standard.js';

const iso = z.string().datetime({ offset: true });

/** Nguồn danh mục theo đơn vị (setting bizcity.cake.catalog_source). */
export const CatalogSourceSchema = z.enum(['local', 'ketoan']);
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;

/** Khối ánh xạ chung — giống nhau ở mọi bảng đồng bộ. */
export const MasterSyncSchema = z.object({
  source: CatalogSourceSchema,
  extId: z.string().nullable(), // items.item_id | partners.code | price_lists.code | item_classes.code
  extSyncedAt: iso.nullable(),
  extHash: z.string().nullable(),
  pushStatus: z.enum(['local', 'sent', 'accepted', 'rejected']),
  pushError: z.string().nullable(),
});
export type MasterSync = z.infer<typeof MasterSyncSchema>;

export const CategorySchema = z.object({
  code: z.string().regex(/^[0-9A-Z_-]{1,32}$/), // → item_classes.code (kind group)
  name: z.string().min(1).max(100),
  parentCode: z.string().nullable(),
  level: z.number().int().min(1).max(3),
  kind: z.enum(['group', 'brand', 'industry', 'type']),
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

export const ItemSchema = z.object({
  itemId: z.string().regex(ULID_RE), // khuôn items.item_id; khi ánh xạ ⇒ sync.extId = item_id của Kế Toán
  sku: SkuSchema, // mã hiện hành (ảnh chụp từ itemCodes kind sku)
  name: ItemNameSchema,
  displayName: z.string().max(200).nullable(), // cột vận hành của Cake — sửa được cả khi nguồn ketoan
  baseUnit: z.string().min(1).max(32),
  categoryCode: z.string().nullable(),
  itemKind: z.enum(['goods', 'material', 'finished', 'service', 'tool', 'asset', 'gift', 'packaging', 'other']).nullable(),
  taxCode: TaxCodeSchema,
  isKct: z.boolean(), // = taxCode KCT (H-13, tự tính)
  parentItemId: z.string().regex(ULID_RE).nullable(),
  status: z.enum(['draft', 'active', 'retired']),
  noSale: z.boolean(),
  isSellableInCrm: z.boolean(), // vận hành
  imageUrl: z.string().max(1000).nullable(),
  description: z.string().max(20000).nullable(),
  codes: z.array(ItemCodeSchema),
  units: z.array(ItemUnitInputSchema),
  sync: MasterSyncSchema,
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

/** Liên kết đơn vị Cake ↔ đơn vị Kế Toán. okt_tenant_id đọc từ health của khoá, không gõ tay. */
export const TenantLinkSchema = z.object({
  catalogSource: CatalogSourceSchema,
  oktBaseUrl: z.string().url().nullable(),
  oktTenantId: z.string().nullable(),
  branchCode: z.string().nullable(),
  externalRef: z.string().regex(/^opencake:[a-z0-9-]+$/).nullable(),
  connectedAt: iso.nullable(),
  lastHealthOkAt: iso.nullable(),
  paused: z.boolean(),
});
export type TenantLink = z.infer<typeof TenantLinkSchema>;

/** Cột kế toán: chỉ đọc khi nguồn = ketoan (một cổng ghi — R-OKT-CONN-4). Còn lại là cột vận hành của Cake. */
export const ERP_ITEM_FIELDS = ['sku', 'name', 'baseUnit', 'categoryCode', 'itemKind', 'taxCode', 'parentItemId', 'status', 'noSale', 'units', 'codes'] as const;
export const OPERATIONAL_ITEM_FIELDS = ['displayName', 'isSellableInCrm', 'imageUrl', 'description'] as const;

/** Cổng ghi duy nhất: nguồn ketoan ⇒ chặn mọi cột kế toán, ở MỌI trạng thái kết nối (kể cả mất kết nối / tạm dừng). */
export function catalogWriteGate(source: CatalogSource, changedFields: readonly string[]): { ok: true } | { ok: false; blocked: string[] } {
  if (source === 'local') return { ok: true };
  const blocked = changedFields.filter((f) => (ERP_ITEM_FIELDS as readonly string[]).includes(f));
  return blocked.length ? { ok: false, blocked } : { ok: true };
}
