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

// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — 9 bảng care-kernel (0101 + 0104) cho PgCareRepo.
type J = ColumnType<unknown, string, string>; // jsonb: ghi bằng JSON.stringify
export interface ContactsTable { contact_id: string; tenant_id: string; kind: string; display_name: string; status: ColumnType<string, string | undefined, string>; merged_into: string | null; created_at: Ts }
export interface ContactIdentitiesTable { identity_id: string; tenant_id: string; contact_id: string; channel: string; scope: string; external_id: string; display_name: string | null; confidence: string; proof: ColumnType<unknown, string | null, string | null>; valid_from: Ts; valid_to: TsNull }
export interface ChannelAccountsTable { channel_account_id: string; tenant_id: string; channel: string; kind: string; external_account_id: string; label: string; owner_user_id: string | null; cell_ref: string | null; status: ColumnType<string, string | undefined, string>; capabilities: ColumnType<unknown, string | undefined, string>; connected_at: TsNull; tested_at: TsNull }
export interface ConversationsTable { conversation_id: string; tenant_id: string; channel_account_id: string; external_thread_id: string; contact_id: string; kind: string; anchor: ColumnType<unknown, string | null, string | null>; last_at: TsNull; last_direction: string | null; window_until: TsNull; assignee_user_id: ColumnType<string | null, string | null | undefined, string | null> }
export interface TouchEventsTable { event_id: string; tenant_id: string; source: string; doc_key: string; version: number; type: string; payload: J; actor: string; received_at: Ts }
export interface TouchEventVersionsTable { tenant_id: string; event_id: string; version: number; payload: J; archived_at: Ts }
export interface TouchLedgerTable {
  touch_id: ColumnType<string, never, never>; tenant_id: string; event_id: string; contact_id: string; conversation_id: string | null; channel_account_id: string | null; channel: string | null;
  kind: string; direction: string; qty: number; is_reversal: boolean; reverses_id: string | null; dims: J; at: Ts;
}
export interface MessagesTable { message_id: string; tenant_id: string; touch_id: string; conversation_id: string; external_message_id: string; direction: string; body: string; attachments: ColumnType<unknown, string | undefined, string>; delivery: string | null; e2ee: ColumnType<boolean, boolean | undefined, boolean>; at: Ts }
export interface ContactStateTable { contact_id: string; tenant_id: string; tags: string[]; last_in_at: TsNull; last_out_at: TsNull; unanswered: boolean; channels: J; rev: number }

// [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — 0104.
export interface ChannelAccountMembersTable { tenant_id: string; channel_account_id: string; user_id: string; added_at: Ts; added_by: string }

// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — 0105 luồng đơn xuyên app.
export interface OrderRequestsTable {
  tenant_id: string; order_request_id: string; contact_id: string; conversation_id: string | null;
  status: ColumnType<string, string | undefined, string>; send_state: ColumnType<string, string | undefined, string>; send_attempts: ColumnType<number, number | undefined, number>;
  next_send_at: TsNull; last_error: string | null; version: ColumnType<number, number | undefined, number>; branch_code: string | null;
  customer: J; ship_to: ColumnType<unknown, string | null, string | null>; lines: J; payment: string; shipping: string; preferred_carrier: string | null; note: ColumnType<string, string | undefined, string>;
  total: Num; pos_ref: string | null; order_ref: string | null; reject_reason: string | null; status_at: TsNull; expires_at: TsNull;
  created_by: string; created_at: Ts; updated_at: Ts;
}
export interface OrderRequestEventsTable { tenant_id: string; event_id: string; order_request_id: string; type: string; data: J; at: Ts }
export interface PosLinksTable {
  tenant_id: string; base_url: string; key_sealed: string; key_prefix: string; secret_sealed: string; branch_code: string;
  last_ok_at: TsNull; last_sent_at: TsNull; last_error: string | null; updated_by: string; updated_at: Ts;
}

declare module '@bizcity/platform/db/types' {
  interface AppDatabase {
    order_requests: OrderRequestsTable;
    order_request_events: OrderRequestEventsTable;
    pos_links: PosLinksTable;
    channel_account_members: ChannelAccountMembersTable;
    contacts: ContactsTable;
    contact_identities: ContactIdentitiesTable;
    channel_accounts: ChannelAccountsTable;
    conversations: ConversationsTable;
    touch_events: TouchEventsTable;
    touch_event_versions: TouchEventVersionsTable;
    touch_ledger: TouchLedgerTable;
    messages: MessagesTable;
    contact_state: ContactStateTable;
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

