// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 11:17 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-3 — lưu / đọc tệp của đơn vị qua cổng lưu + bảng files (26-NOI-LUU-TEP R-STOR-4, R-STOR-7):
//   kiểm loại theo đầu tệp + cỡ (sniff.ts) ⇒ khoá theo chuẩn (sites/<slug>/<vùng>/<tenant>/…) ⇒ ghi bộ lưu ⇒ ghi dòng files. Cùng nội dung đã có trong cùng vùng
//   (chưa gỡ) ⇒ trả lại tệp cũ, không ghi lần hai. Ghi dòng lỗi ⇒ xoá đối tượng vừa ghi (không để tệp mồ côi). Đọc ⇒ kiểm lại sha256.
import { createHash } from 'node:crypto';
import type { Db } from '@bizcity/platform/db/client';
import { failure, newUlid } from '../runtime.js';
import { APP_KEY, buildKey, currentSiteSlug, driverOf, storage } from './index.js';
import { FileRejected, sniffFile } from './sniff.js';

export type FileView = { fileId: string; area: string; kind: 'image' | 'file'; contentType: string; size: number; name: string; sha256: string; createdAt: string };
type Row = { file_id: string; area: string; kind: string; content_type: string; size_bytes: string; original_name: string; sha256: string; created_at: Date; storage_key: string; driver: string };
const COLS = ['file_id', 'area', 'kind', 'content_type', 'size_bytes', 'original_name', 'sha256', 'created_at', 'storage_key', 'driver'] as const;

const view = (r: Row): FileView => ({
  fileId: r.file_id, area: r.area, kind: r.kind as FileView['kind'], contentType: r.content_type, size: Number(r.size_bytes),
  name: r.original_name, sha256: r.sha256, createdAt: new Date(r.created_at).toISOString(),
});
/** Tên gốc chỉ để hiển thị: bỏ đường dẫn và ký tự điều khiển, cắt 255. */
const cleanName = (n: string) => (n.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || 'tep';

export async function saveFile(tx: Db, a: { tenantId: string; actor: string; area: string; name: string; data: Buffer }): Promise<FileView & { deduped: boolean }> {
  let t;
  try { t = sniffFile(a.data, a.name); } catch (e) {
    if (e instanceof FileRejected) throw failure('VALIDATION_ERROR', e.message, { reason: e.reason, field: 'file' });
    throw e;
  }
  const sha256 = createHash('sha256').update(a.data).digest('hex');
  const same = await tx.selectFrom('files').select(COLS).where('tenant_id', '=', a.tenantId).where('area', '=', a.area).where('sha256', '=', sha256)
    .where('archived_at', 'is', null).executeTakeFirst();
  if (same) return { ...view(same as Row), deduped: true };

  const d = await storage();
  const key = buildKey({ app: APP_KEY, site: currentSiteSlug(), area: a.area, tenantId: a.tenantId, sha256, ext: t.ext });
  await d.put(key, a.data, t.contentType);
  try {
    const row = await tx.insertInto('files').values({
      file_id: newUlid(), tenant_id: a.tenantId, area: a.area, storage_key: key, driver: d.kind, sha256, size_bytes: a.data.length,
      kind: t.kind, content_type: t.contentType, original_name: cleanName(a.name), created_by: a.actor,
    }).returning(COLS).executeTakeFirstOrThrow();
    return { ...view(row as Row), deduped: false };
  } catch (e) {
    await d.delete(key).catch(() => undefined); // nuot-loi: dọn đối tượng mồ côi là việc phụ, lỗi gốc mới cần báo
    throw e;
  }
}

/** Tệp + nội dung, đã kiểm băm. Không có / đã gỡ ⇒ null. */
export async function loadFile(tx: Db, tenantId: string, fileId: string): Promise<{ file: FileView; data: Buffer } | null> {
  const r = await tx.selectFrom('files').select(COLS).where('tenant_id', '=', tenantId).where('file_id', '=', fileId).where('archived_at', 'is', null).executeTakeFirst();
  if (!r) return null;
  const d = await driverOf(r.driver);
  if (!d) throw failure('NOT_READY', `Tệp nằm ở bộ lưu "${r.driver}" nhưng bộ này đang tắt — kiểm cấu hình STORAGE_* (chẩn đoán SC-STOR-0).`);
  const data = await d.get(r.storage_key);
  if (!data) throw failure('NOT_FOUND', 'Tệp không còn trong bộ lưu.');
  if (createHash('sha256').update(data).digest('hex') !== r.sha256) throw failure('CONFLICT', 'Tệp trong bộ lưu không khớp băm đã ghi — không trả nội dung.');
  return { file: view(r as Row), data };
}

/** Gỡ tệp (giữ dòng + nội dung; dọn theo luật vòng đời, không xoá ngay). */
export async function archiveFile(tx: Db, tenantId: string, fileId: string): Promise<boolean> {
  const r = await tx.updateTable('files').set({ archived_at: new Date() }).where('tenant_id', '=', tenantId).where('file_id', '=', fileId).where('archived_at', 'is', null).executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}
