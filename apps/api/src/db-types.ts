// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1 — kiểu bảng của Cake gắn vào Database của @bizcity/platform bằng AppDatabase (P2b-4):
//   db / Db của gói thấy luôn bảng Cake, không tạo Kysely riêng. Khớp db/migrations 0102 (danh mục) + 0103 (lớp mềm). Bảng care-kernel thêm ở PHASE-005 (PgCareRepo).
import type { ColumnType } from 'kysely';

type Ts = ColumnType<Date, Date | string | undefined, Date | string>;
type TsNull = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
type Num = ColumnType<string, number | string, number | string>; // numeric về chuỗi (pg), đổi số ở repo
type Sync = {
  source: ColumnType<'local' | 'ketoan', 'local' | 'ketoan' | undefined, 'local' | 'ketoan'>;
  ext_id: string | null; ext_version: number | null; ext_synced_at: TsNull;
  push_status: ColumnType<string, string | undefined, string>; push_error: string | null;
};

export interface CatalogCategoriesTable extends Sync { tenant_id: string; code: string; name: string; parent_code: string | null; level: number; is_active: ColumnType<boolean, boolean | undefined, boolean>; updated_at: Ts }
export interface CatalogItemsTable extends Sync {
  item_id: string; tenant_id: string; sku: string; name: string; base_unit: string; category_code: string | null; item_kind: string | null;
  tax_code: string; is_kct: ColumnType<boolean, never, never>; parent_item_id: string | null; status: ColumnType<string, string | undefined, string>;
  no_sale: ColumnType<boolean, boolean | undefined, boolean>; created_at: Ts; updated_at: Ts;
}
export interface CatalogItemCodesTable { tenant_id: string; item_id: string; kind: string; code: string; valid_from: Ts; valid_to: TsNull }
export interface CatalogItemUnitsTable { tenant_id: string; item_id: string; unit: string; ratio: Num; is_default_sale: boolean; weight_kg: ColumnType<string | null, number | string | null | undefined, number | string | null> }
export interface CatalogPriceListsTable extends Sync { tenant_id: string; code: string; name: string; is_company: boolean; is_active: ColumnType<boolean, boolean | undefined, boolean> }
export interface CatalogPricesTable { tenant_id: string; price_list_code: string; item_id: string; unit: string; price: Num; updated_at: Ts }
export interface TenantLinksTable {
  tenant_id: string; tenant: string; catalog_source: ColumnType<'local' | 'ketoan', 'local' | 'ketoan' | undefined, 'local' | 'ketoan'>; okt_base_url: string | null;
  branch_code: string | null; connected_at: TsNull; last_health_ok_at: TsNull; paused: ColumnType<boolean, boolean | undefined, boolean>; feed_cursor: unknown;
}
export interface EntityMetaTable { tenant_id: string; entity_type: string; entity_id: string; key: string; value: ColumnType<unknown, string, string>; updated_at: Ts; updated_by: string | null }

declare module '@bizcity/platform/db/types' {
  interface AppDatabase {
    catalog_categories: CatalogCategoriesTable;
    catalog_items: CatalogItemsTable;
    catalog_item_codes: CatalogItemCodesTable;
    catalog_item_units: CatalogItemUnitsTable;
    catalog_price_lists: CatalogPriceListsTable;
    catalog_prices: CatalogPricesTable;
    tenant_links: TenantLinksTable;
    entity_meta: EntityMetaTable;
  }
}

