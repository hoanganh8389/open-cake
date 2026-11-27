// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — chọn bộ lưu theo biến môi trường (26-NOI-LUU-TEP §4.3; cấu hình theo BẢN CÀI, không theo site — R-STOR-8):
//   STORAGE_DRIVER = local (mặc định; DATA_DIR/files) | s3 (STORAGE_S3_ENDPOINT, STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY, STORAGE_S3_SECRET_KEY, STORAGE_S3_REGION?).
//   Slug site trong khoá: bản một công ty = `_default`; nhiều site (PHASE-014) chưa bật ở Cake ⇒ đóng khi thiếu, không đoán.
// [2026-11-27 11:05 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — chủ: "S3 không cài thì local vẫn phải dùng được, giống WP media". Như bizcity-r2.php (thiếu
//   BIZCITY_R2_* ⇒ báo CONFIG_MISSING, media vẫn ở uploads/): (1) bộ s3 nạp LƯỜI — bản chỉ dùng đĩa không nạp AWS SDK; (2) đặt s3 mà thiếu / sai cấu hình hoặc
//   không nạp được SDK ⇒ LÙI VỀ ĐĨA kèm lý do (storageStatus, hiện ở chẩn đoán), không làm sập app.
import path from 'node:path';
import { siteMode } from '@bizcity/platform/db/site';
import { LocalDriver } from './local.js';
import type { StorageDriver } from './types.js';

export { buildKey, sitePrefix, assertKey } from './keys.js';
export { signLocalToken, verifyLocalToken, LocalDriver } from './local.js';
export type { StorageDriver, StoredObject, CopyPage } from './types.js';

export const APP_KEY = 'cake';
const S3_VARS = ['STORAGE_S3_ENDPOINT', 'STORAGE_S3_BUCKET', 'STORAGE_S3_ACCESS_KEY', 'STORAGE_S3_SECRET_KEY'] as const;

/** Bộ được cấu hình, bộ đang chạy, và vì sao khác nhau (null = như cấu hình). */
export type StorageStatus = { configured: string; active: 'local' | 's3'; reason: string | null };

const localOf = (env: NodeJS.ProcessEnv) => new LocalDriver(path.join(env.DATA_DIR ?? './data', 'files'));

export async function storageFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<{ driver: StorageDriver; status: StorageStatus }> {
  const configured = (env.STORAGE_DRIVER ?? 'local').trim() || 'local';
  const fallback = (reason: string) => ({ driver: localOf(env), status: { configured, active: 'local' as const, reason } });
  if (configured === 'local') return { driver: localOf(env), status: { configured, active: 'local', reason: null } };
  if (configured !== 's3') return fallback(`STORAGE_DRIVER "${configured}" không hợp lệ (local | s3) — đang lưu trên đĩa`);
  const need = S3_VARS.filter((k) => !env[k]);
  if (need.length) return fallback(`STORAGE_DRIVER=s3 thiếu ${need.join(', ')} — đang lưu trên đĩa`);
  try {
    const { S3Driver } = await import('./s3.js'); // nạp lười: không có S3 thì không cần AWS SDK
    const driver = new S3Driver({ endpoint: env.STORAGE_S3_ENDPOINT!, bucket: env.STORAGE_S3_BUCKET!, accessKey: env.STORAGE_S3_ACCESS_KEY!, secretKey: env.STORAGE_S3_SECRET_KEY!, region: env.STORAGE_S3_REGION });
    return { driver, status: { configured, active: 's3', reason: null } };
  } catch (e) {
    return fallback(`không nạp được bộ s3 (${e instanceof Error ? e.message.slice(0, 120) : 'lỗi'}) — đang lưu trên đĩa`);
  }
}

let current: Promise<{ driver: StorageDriver; status: StorageStatus }> | null = null;
/** Bộ lưu của tiến trình (dựng lười một lần). */
export const storage = async (): Promise<StorageDriver> => (await (current ??= storageFromEnv())).driver;
/** Trạng thái bộ lưu cho màn chẩn đoán. */
export const storageStatus = async (): Promise<StorageStatus> => (await (current ??= storageFromEnv())).status;
/** Chỉ cho test. */
export const setStorageForTest = (d: StorageDriver | null) => {
  current = d ? Promise.resolve({ driver: d, status: { configured: d.kind, active: d.kind, reason: null } }) : null;
};

/** Slug site cho khoá tệp. Một công ty ⇒ `_default`. Nhiều site chưa nối ở Cake (PHASE-014) ⇒ báo lỗi thay vì ghi nhầm chỗ (R-STOR-1). */
export function currentSiteSlug(): string {
  if (siteMode() === 'single') return '_default';
  throw new Error('SITE_CONTEXT_MISSING: lưu tệp ở chế độ nhiều site cần slug của site (PHASE-014 chưa nối)');
}
