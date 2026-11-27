// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-27 11:17 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-3 — kiểm tệp theo đầu tệp + cỡ (không CSDL) và lưu / đọc qua bảng files (Postgres thật, bộ đĩa tạm):
//   loại thật thắng đuôi khai; tệp chạy được bị chặn theo nội dung lẫn đuôi; ảnh > 10 MB / tệp > 25 MB bị chặn; cùng nội dung ⇒ một dòng; khoá theo chuẩn có sites/_default;
//   nội dung bị sửa trong bộ lưu ⇒ không trả (băm lệch); gỡ ⇒ không đọc được; tệp nằm ở s3 mà s3 tắt ⇒ báo rõ.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FileRejected, LIMITS, sniffFile } from '../src/storage/sniff.js';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('anh-jpeg')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('anh-png')]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const PDF = Buffer.from('%PDF-1.7\nbang gia');
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('zip')]);
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 1, 2]);
const reason = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof FileRejected ? e.reason : 'khac'; } };

describe('kiểm loại tệp theo đầu tệp (D-ATT-1)', () => {
  it.each([
    [JPG, 'a.jpg', 'image', 'image/jpeg', 'jpg'], [PNG, 'a.jpg', 'image', 'image/png', 'png'], [WEBP, 'a.webp', 'image', 'image/webp', 'webp'],
    [PDF, 'Bang-gia.PDF', 'file', 'application/pdf', 'pdf'], [ZIP, 'bao-cao.xlsx', 'file', expect.stringContaining('spreadsheetml'), 'xlsx'],
    [ZIP, 'hop-dong.docx', 'file', expect.stringContaining('wordprocessingml'), 'docx'], [ZIP, 'tai-lieu.zip', 'file', 'application/zip', 'zip'],
    [OLE, 'cu.xls', 'file', 'application/vnd.ms-excel', 'xls'], [OLE, 'cu.doc', 'file', 'application/msword', 'doc'],
  ])('%#: loại thật thắng đuôi khai', (data, name, kind, contentType, ext) => {
    expect(sniffFile(data as Buffer, name as string)).toEqual({ kind, contentType, ext });
  });
  it('chặn tệp chạy được (theo nội dung và theo đuôi), loại lạ, tệp rỗng, quá cỡ', () => {
    expect(reason(() => sniffFile(Buffer.from('MZ\x90\x00'), 'anh.jpg'))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(reason(() => sniffFile(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2]), 'x.pdf'))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(reason(() => sniffFile(Buffer.from('#!/bin/sh\nrm -rf /'), 'chay.txt'))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(reason(() => sniffFile(JPG, 'cai-dat.exe'))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(reason(() => sniffFile(Buffer.from('chữ thường'), 'ghi-chu.txt'))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(reason(() => sniffFile(Buffer.alloc(0), 'a.jpg'))).toBe('FILE_EMPTY');
    expect(reason(() => sniffFile(Buffer.concat([JPG, Buffer.alloc(LIMITS.image)]), 'to.jpg'))).toBe('FILE_TOO_LARGE');
    expect(reason(() => sniffFile(Buffer.concat([PDF, Buffer.alloc(LIMITS.file)]), 'to.pdf'))).toBe('FILE_TOO_LARGE');
    expect(reason(() => sniffFile(Buffer.concat([PDF, Buffer.alloc(LIMITS.image)]), 'vua.pdf'))).toBeNull(); // 10 MB+ vẫn được với tệp (≤ 25 MB)
  });
});

describe.skipIf(!url)('lưu / đọc tệp qua bảng files (Postgres thật, bộ đĩa)', () => {
  let dir = '', tenantId = '';
  let F: typeof import('../src/storage/files.js');
  let S: typeof import('../src/storage/index.js');
  let sql: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const tx = async <T>(fn: (t: import('@bizcity/platform/db/client').Db) => Promise<T>) => (await import('@bizcity/platform/db/client')).db.transaction().execute(fn);
  const err = async (p: Promise<unknown>) => p.then(() => null, (e: { code?: string; extra?: { reason?: string }; details?: { reason?: string } }) => e.code ?? 'loi');

  beforeAll(async () => {
    process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123';
    const dbUrl = await freshDb(url!, 'tep_files');
    tenantId = await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    sql = (q, p) => admin.query(q, p as unknown[]);
    dir = mkdtempSync(path.join(tmpdir(), 'cake-files-pg-'));
    S = await import('../src/storage/index.js');
    S.setStorageForTest(new S.LocalDriver(dir));
    F = await import('../src/storage/files.js');
  }, 90_000);
  afterAll(() => { S?.setStorageForTest(null); rmSync(dir, { recursive: true, force: true }); });

  it('lưu ảnh ⇒ một dòng files, khoá theo chuẩn có sites/_default; cùng nội dung ⇒ trả tệp cũ, không thêm dòng; đọc ⇒ đúng nội dung', async () => {
    const a = await tx((t) => F.saveFile(t, { tenantId, actor: 'user:1', area: 'chat', name: 'C:\\Users\\khach\\hoa don.JPG', data: JPG }));
    expect(a).toMatchObject({ kind: 'image', contentType: 'image/jpeg', size: JPG.length, name: 'hoa don.JPG', deduped: false });
    const row = (await sql('SELECT storage_key, driver FROM files WHERE file_id = $1', [a.fileId])).rows[0]!;
    expect(String(row.storage_key)).toMatch(new RegExp(`^cake/sites/_default/chat/${tenantId}/\\d{4}/\\d{2}/[0-9a-f]{16}-[0-9a-f]{8}\\.jpg$`));
    expect(row.driver).toBe('local');
    const b = await tx((t) => F.saveFile(t, { tenantId, actor: 'user:2', area: 'chat', name: 'lai.jpg', data: JPG }));
    expect([b.fileId, b.deduped]).toEqual([a.fileId, true]);
    expect((await sql('SELECT count(*)::int n FROM files')).rows[0]!.n).toBe(1);
    const got = await tx((t) => F.loadFile(t, tenantId, a.fileId));
    expect(got!.data.equals(JPG)).toBe(true);
  });

  it('tệp bị chặn ⇒ VALIDATION_ERROR, không ghi gì', async () => {
    const before = (await sql('SELECT count(*)::int n FROM files')).rows[0]!.n;
    expect(await err(tx((t) => F.saveFile(t, { tenantId, actor: 'user:1', area: 'chat', name: 'cai-dat.exe', data: Buffer.from('MZ\x90') })))).toBe('VALIDATION_ERROR');
    expect((await sql('SELECT count(*)::int n FROM files')).rows[0]!.n).toBe(before);
  });

  it('nội dung bị sửa trong bộ lưu ⇒ không trả (băm lệch); gỡ ⇒ không đọc được', async () => {
    const f = await tx((t) => F.saveFile(t, { tenantId, actor: 'user:1', area: 'chat', name: 'bang-gia.pdf', data: PDF }));
    const key = String((await sql('SELECT storage_key FROM files WHERE file_id = $1', [f.fileId])).rows[0]!.storage_key);
    writeFileSync(path.join(dir, key), Buffer.from('%PDF-1.7 da bi sua'));
    expect(await err(tx((t) => F.loadFile(t, tenantId, f.fileId)))).toBe('CONFLICT');
    expect(await tx((t) => F.archiveFile(t, tenantId, f.fileId))).toBe(true);
    expect(await tx((t) => F.loadFile(t, tenantId, f.fileId))).toBeNull();
  });

  it('tệp ghi ở s3 mà s3 đang tắt ⇒ NOT_READY rõ ràng (không đọc nhầm chỗ)', async () => {
    const f = await tx((t) => F.saveFile(t, { tenantId, actor: 'user:1', area: 'chat', name: 'anh.png', data: PNG }));
    await sql(`UPDATE files SET driver = 's3' WHERE file_id = $1`, [f.fileId]);
    expect(await err(tx((t) => F.loadFile(t, tenantId, f.fileId)))).toBe('NOT_READY');
  });
});
