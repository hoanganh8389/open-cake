// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — chọn bộ lưu theo biến môi trường (26-NOI-LUU-TEP §4.3; cấu hình theo BẢN CÀI, không theo site — R-STOR-8):
//   STORAGE_DRIVER = local (mặc định; DATA_DIR/files) | s3 (STORAGE_S3_ENDPOINT, STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY, STORAGE_S3_SECRET_KEY, STORAGE_S3_REGION?).
//   Slug site trong khoá: bản một công ty = `_default`; nhiều site (PHASE-014) chưa bật ở Cake ⇒ đóng khi thiếu, không đoán.
import path from 'node:path';
import { siteMode } from '@bizcity/platform/db/site';
import { LocalDriver } from './local.js';
import { S3Driver } from './s3.js';
import type { StorageDriver } from './types.js';

export { buildKey, sitePrefix, assertKey } from './keys.js';
export { signLocalToken, verifyLocalToken } from './local.js';
export type { StorageDriver, StoredObject, CopyPage } from './types.js';
export { LocalDriver, S3Driver };

export const APP_KEY = 'cake';

export function storageFromEnv(env: NodeJS.ProcessEnv = process.env): StorageDriver {
  const kind = (env.STORAGE_DRIVER ?? 'local').trim();
  if (kind === 'local') return new LocalDriver(path.join(env.DATA_DIR ?? './data', 'files'));
  if (kind === 's3') {
    const need = ['STORAGE_S3_ENDPOINT', 'STORAGE_S3_BUCKET', 'STORAGE_S3_ACCESS_KEY', 'STORAGE_S3_SECRET_KEY'].filter((k) => !env[k]);
    if (need.length) throw new Error(`STORAGE_DRIVER=s3 thiếu ${need.join(', ')}`);
    return new S3Driver({ endpoint: env.STORAGE_S3_ENDPOINT!, bucket: env.STORAGE_S3_BUCKET!, accessKey: env.STORAGE_S3_ACCESS_KEY!, secretKey: env.STORAGE_S3_SECRET_KEY!, region: env.STORAGE_S3_REGION });
  }
  throw new Error(`STORAGE_DRIVER không hợp lệ: ${kind} (local | s3)`);
}

let current: StorageDriver | null = null;
/** Bộ lưu của tiến trình (dựng lười một lần). */
export const storage = (): StorageDriver => (current ??= storageFromEnv());
/** Chỉ cho test. */
export const setStorageForTest = (d: StorageDriver | null) => { current = d; };

/** Slug site cho khoá tệp. Một công ty ⇒ `_default`. Nhiều site chưa nối ở Cake (PHASE-014) ⇒ báo lỗi thay vì ghi nhầm chỗ (R-STOR-1). */
export function currentSiteSlug(): string {
  if (siteMode() === 'single') return '_default';
  throw new Error('SITE_CONTEXT_MISSING: lưu tệp ở chế độ nhiều site cần slug của site (PHASE-014 chưa nối)');
}
