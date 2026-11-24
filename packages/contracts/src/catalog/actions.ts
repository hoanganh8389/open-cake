// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — action danh mục (05:03 PM: thêm cake.catalog_price.list cho màn Bảng giá — một lần gọi, không gọi từng hàng) độc lập (ADR-0004). Tạo / sửa hàng kiểm chuẩn H-* ngay ở cửa;
//   khi nguồn = ketoan, sửa cột kế toán bị chặn bằng CAKE_CATALOG_READONLY (cổng ghi duy nhất).
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — gọn: tạo hàng kèm giá công ty trong MỘT lần gọi; sửa hàng = cột kế toán + `local` (lớp mềm);
//   lọc sellableOnly cho Gửi giá trong chat; nguồn danh mục trả CatalogSourceInfo (tenant slug).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';
import { ULID_RE } from '../cake/channel.js';
import { CatalogSourceInfoSchema, CategorySchema, ItemLocalSchema, ItemSchema, PriceListSchema, PriceRowSchema } from './entities.js';
import { ItemNameSchema, ItemUnitsSchema, PriceSchema, SkuSchema, TaxCodeSchema, skuShapeProblem } from './standard.js';

const ItemCreateInput = z.object({
  sku: SkuSchema,
  parentSku: SkuSchema.nullable().default(null),
  name: ItemNameSchema,
  units: ItemUnitsSchema,
  taxCode: TaxCodeSchema,
  categoryCode: z.string().nullable().default(null),
  itemKind: ItemSchema.shape.itemKind.default('goods'),
  noSale: z.boolean().default(false),
  barcodes: z.array(z.string().min(1).max(160)).max(20).default([]),
  price: PriceSchema.optional(), // giá bán công ty (gồm VAT) theo ĐVT bán chính
}).superRefine((v, ctx) => {
  const p = skuShapeProblem(v.sku, v.parentSku);
  if (p) ctx.addIssue({ code: 'custom', path: ['sku'], message: p });
});

export const catalogItemList = defineActionSpec({
  id: 'cake.catalog_item.list', capability: 'cake.catalog', title: 'Danh sách hàng hoá', kind: 'query',
  input: z.object({ q: z.string().max(100).optional(), categoryCode: z.string().optional(), sellableOnly: z.boolean().default(false), includeRetired: z.boolean().default(false), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(200).default(50) }),
  output: z.array(ItemSchema), permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/items', mcp: 'read', ui: true },
});
export const catalogItemGet = defineActionSpec({
  id: 'cake.catalog_item.get', capability: 'cake.catalog', title: 'Chi tiết hàng + giá', kind: 'query',
  input: z.object({ itemId: z.string().regex(ULID_RE) }), output: z.object({ item: ItemSchema, prices: z.array(PriceRowSchema) }),
  permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/items/:itemId', mcp: 'read', ui: true },
});
export const catalogItemCreate = defineActionSpec({
  id: 'cake.catalog_item.create', capability: 'cake.catalog', title: 'Tạo hàng (chuẩn H-*)', kind: 'command',
  input: ItemCreateInput, output: ItemSchema, permission: 'cake:catalog-lap', risk: 'low', idempotent: true,
  emits: ['bizcity.cake.catalog_item.created'], reasons: ['CAKE_SKU_TAKEN', 'CAKE_ITEM_NAME_TAKEN', 'CAKE_CATALOG_READONLY'],
  expose: { rest: 'POST /api/v1/catalog/items', ui: true },
});
export const catalogItemUpdate = defineActionSpec({
  id: 'cake.catalog_item.update', capability: 'cake.catalog', title: 'Sửa hàng', kind: 'command',
  input: z.object({
    itemId: z.string().regex(ULID_RE),
    patch: z.object({
      name: ItemNameSchema.optional(), taxCode: TaxCodeSchema.optional(), categoryCode: z.string().nullable().optional(), noSale: z.boolean().optional(),
      units: ItemUnitsSchema.optional(), local: ItemLocalSchema.partial().optional(),
    }).strict().refine((p) => Object.keys(p).length > 0, 'Không có gì để sửa'),
  }),
  output: ItemSchema, permission: 'cake:catalog-sua', risk: 'low', idempotent: true,
  emits: ['bizcity.cake.catalog_item.updated'], reasons: ['CAKE_CATALOG_READONLY', 'CAKE_ITEM_NAME_TAKEN'],
  expose: { rest: 'PATCH /api/v1/catalog/items/:itemId', ui: true },
});
export const catalogCategoryList = defineActionSpec({
  id: 'cake.catalog_category.list', capability: 'cake.catalog', title: 'Nhóm hàng', kind: 'query',
  input: z.object({}), output: z.array(CategorySchema), permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/categories', mcp: 'read', ui: true },
});
export const catalogPriceListList = defineActionSpec({
  id: 'cake.catalog_price_list.list', capability: 'cake.catalog', title: 'Bảng giá', kind: 'query',
  input: z.object({}), output: z.array(PriceListSchema), permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/price-lists', mcp: 'read', ui: true },
});
export const catalogPriceSet = defineActionSpec({
  id: 'cake.catalog_price.set', capability: 'cake.catalog', title: 'Đặt giá (gồm VAT)', kind: 'command',
  input: z.object({ priceListCode: z.string(), itemId: z.string().regex(ULID_RE), unit: z.string(), price: PriceSchema }),
  output: PriceRowSchema, permission: 'cake:catalog-gia', risk: 'medium', idempotent: true,
  emits: ['bizcity.cake.catalog_price.changed'], reasons: ['CAKE_CATALOG_READONLY'],
  expose: { rest: 'PUT /api/v1/catalog/prices', ui: true },
});
export const catalogPriceList = defineActionSpec({
  id: 'cake.catalog_price.list', capability: 'cake.catalog', title: 'Giá theo bảng giá', kind: 'query',
  input: z.object({ priceListCode: z.string(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(200).default(200) }), // [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — trần 200 = trần meta của phong bì bizcity_api@1 (máy chủ thật lộ lệch)
  output: z.array(PriceRowSchema), permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/prices', mcp: 'read', ui: true },
});
export const catalogSourceGet = defineActionSpec({
  id: 'cake.catalog_source.get', capability: 'cake.catalog', title: 'Nguồn danh mục & liên kết Kế Toán', kind: 'query',
  input: z.object({}), output: CatalogSourceInfoSchema, permission: 'cake:catalog-xem', risk: 'read', expose: { rest: 'GET /api/v1/catalog/source', mcp: 'read', ui: true },
});

export const CATALOG_ACTIONS = [catalogItemList, catalogItemGet, catalogItemCreate, catalogItemUpdate, catalogCategoryList, catalogPriceListList, catalogPriceSet, catalogPriceList, catalogSourceGet] as const;
