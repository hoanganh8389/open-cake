// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-27 11:21 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-4 — đường tệp trên Postgres thật, bộ đĩa tạm:
//   tải lên nhị phân qua action (quyền, bằng chứng, chống gửi lặp: cùng khoá + tệp khác ⇒ IDEMPOTENCY_CONFLICT); tệp chạy được / quá cỡ bị chặn; thân > 26 MB ⇒ 413;
//   tải về trong app cần đăng nhập + nosniff; đường dẫn ký cho Cell tải được không cần đăng nhập, sửa / hết hạn ⇒ 403.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('anh hoa don')]);
const JPG2 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('anh khac')]);

describe.skipIf(!url)('đường tệp: tải lên / tải về / đường dẫn ký', () => {
  let app: FastifyInstance;
  let token = '', dir = '', tenantId = '';
  let sql: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const up = (data: Buffer, name: string, key = `f-${Math.random().toString(36).slice(2, 12)}`) =>
    app.inject({ method: 'POST', url: `/api/v1/files?area=chat&name=${encodeURIComponent(name)}`, payload: data, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream', 'idempotency-key': key } });

  beforeAll(async () => {
    process.env.CAKE_DEV_AUTH = '1';
    process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123';
    process.env.CAKE_PUBLIC_URL = 'https://abc.opencake.net/';
    dir = mkdtempSync(path.join(tmpdir(), 'cake-files-http-'));
    process.env.DATA_DIR = dir;
    delete process.env.STORAGE_DRIVER;
    const dbUrl = await freshDb(url!, 'tep_http');
    const pg = (await import('pg')).default;
    const admin = new pg.Client({ connectionString: dbUrl }); await admin.connect();
    sql = (q, p) => admin.query(q, p as unknown[]);
    tenantId = await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    app = await (await import('../src/server.js')).buildApp({ logger: false });
    token = (await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' })).json().data.token;
  }, 90_000);
  afterAll(async () => { await app?.close(); rmSync(dir, { recursive: true, force: true }); delete process.env.CAKE_PUBLIC_URL; delete process.env.DATA_DIR; });

  it('tải ảnh lên ⇒ FileView, ghi bằng chứng (băm gọn); cùng nội dung ⇒ deduped; cùng khoá + tệp khác ⇒ IDEMPOTENCY_CONFLICT', async () => {
    const r = await up(JPG, 'hoá đơn tháng 11.jpg', 'k-tep-0000001');
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().data).toMatchObject({ area: 'chat', kind: 'image', contentType: 'image/jpeg', size: JPG.length, name: 'hoá đơn tháng 11.jpg', deduped: false });
    expect((await up(JPG, 'gui-lai.jpg')).json().data.deduped).toBe(true);
    expect((await up(JPG2, 'khac.jpg', 'k-tep-0000001')).json().error.code).toBe('IDEMPOTENCY_CONFLICT');
    const a = (await sql(`SELECT input_hash, result_ok FROM audit_logs WHERE action = 'cake.file.upload' ORDER BY id LIMIT 1`)).rows[0]!;
    expect(a).toMatchObject({ result_ok: true });
    expect(String(a.input_hash)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('tệp chạy được ⇒ 400 FILE_TYPE_NOT_ALLOWED; ảnh 12 MB ⇒ FILE_TOO_LARGE (vượt trần 1 MB mặc định của máy chủ vẫn đọc được); thân > 26 MB ⇒ 413', async () => {
    const exe = await up(Buffer.from('MZ\x90\x00'), 'cai-dat.exe');
    expect(exe.statusCode).toBe(400);
    expect(JSON.stringify(exe.json().error)).toContain('FILE_TYPE_NOT_ALLOWED');
    const big = await up(Buffer.concat([JPG, Buffer.alloc(12 * 1024 * 1024)]), 'to.jpg');
    expect(JSON.stringify(big.json().error)).toContain('FILE_TOO_LARGE');
    expect((await up(Buffer.alloc(27 * 1024 * 1024), 'qua-tran.pdf')).statusCode).toBe(413);
  });

  it('tải về trong app: cần đăng nhập; trả đúng nội dung, nosniff, inline cho ảnh', async () => {
    const f = (await up(JPG2, 'anh.jpg')).json().data;
    expect((await app.inject({ method: 'GET', url: `/api/v1/files/${f.fileId}` })).statusCode).toBe(401);
    const r = await app.inject({ method: 'GET', url: `/api/v1/files/${f.fileId}`, headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    expect(r.rawPayload.equals(JPG2)).toBe(true);
    expect(r.headers).toMatchObject({ 'content-type': 'image/jpeg', 'x-content-type-options': 'nosniff' });
    expect(String(r.headers['content-disposition'])).toMatch(/^inline; filename="anh\.jpg"/);
    expect((await app.inject({ method: 'GET', url: '/api/v1/files/01JDA0000000000000000000ZZ', headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(404);
  });

  it('đường dẫn ký cho Cell: CAKE_PUBLIC_URL + /files/v1/<vé>, tải không cần đăng nhập; sửa vé / hết hạn ⇒ 403', async () => {
    const f = (await up(Buffer.from('%PDF-1.7 bang gia si'), 'Bảng giá sỉ.pdf')).json().data;
    const { db } = await import('@bizcity/platform/db/client');
    const { fileLink } = await import('../src/storage/routes.js');
    const link = await db.transaction().execute((tx) => fileLink(tx, tenantId, f.fileId));
    expect(link.url).toMatch(/^https:\/\/abc\.opencake\.net\/files\/v1\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(link.file).toMatchObject({ name: 'Bảng giá sỉ.pdf', contentType: 'application/pdf', kind: 'file' });
    const p = new URL(link.url).pathname;
    const ok = await app.inject({ method: 'GET', url: p });
    expect(ok.statusCode).toBe(200);
    expect(ok.rawPayload.toString()).toBe('%PDF-1.7 bang gia si');
    expect(ok.headers['content-type']).toBe('application/pdf');
    expect((await app.inject({ method: 'GET', url: p.slice(0, -3) + 'AAA' })).statusCode).toBe(403);
    const key = String((await sql('SELECT storage_key FROM files WHERE file_id = $1', [f.fileId])).rows[0]!.storage_key);
    const { signLocalToken } = await import('../src/storage/index.js');
    expect((await app.inject({ method: 'GET', url: `/files/v1/${signLocalToken(key, 60, 1000)}` })).statusCode).toBe(403);
  });
});
