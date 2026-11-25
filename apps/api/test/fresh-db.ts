// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — mỗi tệp test có CSDL một database RIÊNG (vitest chạy các tệp song song): tạo mới, áp đủ migration
//   (nền + cake), đặt DATABASE_URL TRƯỚC khi nền được import (vitest tách module theo tệp ⇒ mỗi tệp một pool). Trả URL của database đó.
export async function freshDb(baseUrl: string, suffix: string): Promise<string> {
  const pg = (await import('pg')).default;
  const u = new URL(baseUrl);
  const name = `${u.pathname.slice(1) || 'postgres'}_${suffix}`.replace(/[^a-z0-9_]/gi, '_');
  // [2026-11-25 01:55 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-SEC-5 — lớp chặn thứ hai (lớp đầu ở vitest.config.ts): KHÔNG bao giờ DROP database không mang chữ test.
  if (!/test/i.test(name)) throw new Error(`Từ chối xoá / tạo CSDL "${name}": tên không có chữ test (R-STD-SEC-5).`);
  const admin = new pg.Client({ connectionString: baseUrl }); await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally { await admin.end(); }
  u.pathname = `/${name}`;
  const url = u.toString();
  process.env.DATABASE_URL = url;
  const { runMigrations } = await import('@bizcity/platform/db/migrate');
  const { MIGRATION_SOURCES } = await import('../src/migrate.js');
  await runMigrations(() => {}, { connectionString: url, sources: MIGRATION_SOURCES });
  await (await import('../src/migrate.js')).syncRecordTypes(url); // [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — như job db-migrate
  // [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — có CAKE_APP_ROLE ⇒ tạo vai ứng dụng như job db-migrate (tệp test đặt DB_SET_ROLE để API chạy dưới vai này).
  if (process.env.CAKE_APP_ROLE) await (await import('../src/migrate.js')).ensureAppRole(url, process.env.CAKE_APP_ROLE);
  return url;
}
