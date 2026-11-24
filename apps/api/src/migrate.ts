// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-3 — migration của site: nền @bizcity/platform (00xx) + open-cake (01xx), một trình chạy (P2b-1).
//   Job db-migrate trong compose chạy tệp này; API chỉ kiểm (health/ready), không tự áp.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations, type MigrationSource } from '@bizcity/platform/db/migrate';
import { PLATFORM_MIGRATIONS_DIR } from '@bizcity/platform/db/paths';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CAKE_MIGRATIONS_DIR = process.env.CAKE_MIGRATIONS_DIR || path.resolve(here, '../../../db/migrations');
export const MIGRATION_SOURCES: MigrationSource[] = [{ name: 'platform', dir: PLATFORM_MIGRATIONS_DIR }, { name: 'cake', dir: CAKE_MIGRATIONS_DIR }];

if (process.argv[1]?.endsWith('migrate.js')) {
  const applied = await runMigrations(console.log, { sources: MIGRATION_SOURCES });
  console.log(applied.length ? `Đã áp ${applied.length} migration.` : 'Cơ sở dữ liệu đã mới nhất.');
  process.exit(0);
}
