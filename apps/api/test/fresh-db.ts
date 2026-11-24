// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — mỗi tệp test có CSDL một database RIÊNG (vitest chạy các tệp song song): tạo mới, áp đủ migration
//   (nền + cake), đặt DATABASE_URL TRƯỚC khi nền được import (vitest tách module theo tệp ⇒ mỗi tệp một pool). Trả URL của database đó.
export async function freshDb(baseUrl: string, suffix: string): Promise<string> {
  const pg = (await import('pg')).default;
  const u = new URL(baseUrl);
  const name = `${u.pathname.slice(1) || 'postgres'}_${suffix}`.replace(/[^a-z0-9_]/gi, '_');
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
  return url;
}
