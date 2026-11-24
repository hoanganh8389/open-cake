// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-3 — migration của site: nền @bizcity/platform (00xx) + open-cake (01xx), một trình chạy (P2b-1).
//   Job db-migrate trong compose chạy tệp này; API chỉ kiểm (health/ready), không tự áp.
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — vai CSDL của ứng dụng (40-SECURITY §6: "API chạy cake_<slug>_app không siêu người dùng"): CAKE_APP_ROLE ⇒
//   tạo vai NOLOGIN, chỉ đọc / ghi dữ liệu (không DDL), API đặt DB_SET_ROLE = vai này ⇒ RLS theo đơn vị có hiệu lực thật (siêu người dùng bỏ qua RLS).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations, type MigrationSource } from '@bizcity/platform/db/migrate';
import { PLATFORM_MIGRATIONS_DIR } from '@bizcity/platform/db/paths';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CAKE_MIGRATIONS_DIR = process.env.CAKE_MIGRATIONS_DIR || path.resolve(here, '../../../db/migrations');
export const MIGRATION_SOURCES: MigrationSource[] = [{ name: 'platform', dir: PLATFORM_MIGRATIONS_DIR }, { name: 'cake', dir: CAKE_MIGRATIONS_DIR }];

/** Tạo / cấp lại vai ứng dụng (chạy lại an toàn). Vai không đăng nhập: tài khoản kết nối SET ROLE sang (DB_SET_ROLE). */
export async function ensureAppRole(connectionString: string, role: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]{1,62}$/.test(role)) throw new Error(`Tên vai CSDL không hợp lệ: ${role}`);
  const c = new pg.Client({ connectionString }); await c.connect();
  try {
    await c.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$`);
    await c.query(`GRANT ${role} TO CURRENT_USER`); // tài khoản kết nối được SET ROLE sang
    await c.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${role}`);
  } finally { await c.end(); }
}

if (process.argv[1]?.endsWith('migrate.js')) {
  const applied = await runMigrations(console.log, { sources: MIGRATION_SOURCES });
  console.log(applied.length ? `Đã áp ${applied.length} migration.` : 'Cơ sở dữ liệu đã mới nhất.');
  if (process.env.CAKE_APP_ROLE) { await ensureAppRole(process.env.DATABASE_URL!, process.env.CAKE_APP_ROLE); console.log(`Vai ứng dụng: ${process.env.CAKE_APP_ROLE}`); }
  process.exit(0);
}
