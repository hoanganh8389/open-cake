// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — dữ liệu dev (GIẢ LẬP, Shop Hoa Mai): đơn vị, nguồn danh mục local, bảng giá công ty, 5 nhóm hàng.
//   Không tạo hàng: thêm hàng qua màn Hàng hoá (đi đúng đường action). Chạy lại an toàn (ON CONFLICT DO NOTHING). Không dùng ở bản thật.
import { sql } from 'kysely';
import { db } from '@bizcity/platform/db/client';
import './db-types.js';

export async function seedDev(slug = process.env.CAKE_TENANT ?? 'hoa-mai'): Promise<string> {
  await sql`INSERT INTO tenants (code, name) VALUES (${slug}, 'Shop Hoa Mai (giả lập)') ON CONFLICT (code) DO NOTHING`.execute(db);
  const { rows: [t] } = await sql<{ id: string }>`SELECT id::text AS id FROM tenants WHERE code = ${slug}`.execute(db);
  const tenantId = t!.id;
  await db.insertInto('tenant_links').values({ tenant_id: tenantId, tenant: slug }).onConflict((o) => o.column('tenant_id').doNothing()).execute();
  await db.insertInto('catalog_price_lists').values({ tenant_id: tenantId, code: 'CONGTY', name: 'Bảng giá công ty', is_company: true, ext_id: null, ext_version: null, ext_synced_at: null, push_error: null })
    .onConflict((o) => o.columns(['tenant_id', 'code']).doNothing()).execute();
  const cats: [string, string, string | null, number][] = [['10', 'Thời trang', null, 1], ['1010', 'Váy', '10', 2], ['101010', 'Váy hoa', '1010', 3], ['1020', 'Phụ kiện', '10', 2], ['102020', 'Phụ kiện tóc', '1020', 3]];
  for (const [code, name, parent, level] of cats) {
    await db.insertInto('catalog_categories').values({ tenant_id: tenantId, code, name, parent_code: parent, level, ext_id: null, ext_version: null, ext_synced_at: null, push_error: null, updated_at: new Date() })
      .onConflict((o) => o.columns(['tenant_id', 'code']).doNothing()).execute();
  }
  return tenantId;
}

if (process.argv[1]?.endsWith('seed-dev.js')) {
  console.log(`Đơn vị dev: ${await seedDev()}`);
  await db.destroy();
}
