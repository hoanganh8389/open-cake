// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — MỘT bộ test cho cả hai bộ lưu (SC-STOR-4): local luôn chạy; s3 chạy khi có STORAGE_TEST_S3_ENDPOINT
//   (MinIO / R2 thử). Kiểm: ghi / đọc / xoá; hai site cùng tenant_id = 1 không chung khoá (SC-STOR-2); chép tiền tố chia lượt, dừng giữa chừng tiếp được, không trùng (SC-STOR-5);
//   dọn tiền tố; đo dung lượng; đường dẫn ký đúng / sai / hết hạn (SC-STOR-3); chặn khoá thoát thư mục.
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CreateBucketCommand } from '@aws-sdk/client-s3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildKey, LocalDriver, signLocalToken, sitePrefix, storageFromEnv, verifyLocalToken, type StorageDriver } from '../src/storage/index.js';
import { S3Driver } from '../src/storage/s3.js';

const s3Endpoint = process.env.STORAGE_TEST_S3_ENDPOINT;
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const key = (site: string, body: Buffer, area = 'chat') => buildKey({ app: 'cake', site, area, tenantId: '1', sha256: sha(body), ext: 'jpg', at: new Date('2026-11-27T00:00:00Z') });

type Case = { name: string; make: () => Promise<StorageDriver>; done?: () => void };
const cases: Case[] = [];
{
  let dir = '';
  cases.push({ name: 'local', make: async () => { dir = mkdtempSync(path.join(tmpdir(), 'cake-files-')); return new LocalDriver(dir); }, done: () => rmSync(dir, { recursive: true, force: true }) });
}
if (s3Endpoint) {
  cases.push({ name: 's3', make: async () => {
    const d = new S3Driver({ endpoint: s3Endpoint, bucket: `cake-test-${randomBytes(4).toString('hex')}`, accessKey: process.env.STORAGE_TEST_S3_ACCESS_KEY ?? 'minioadmin', secretKey: process.env.STORAGE_TEST_S3_SECRET_KEY ?? 'minioadmin', region: 'us-east-1' });
    await d.client.send(new CreateBucketCommand({ Bucket: (d as unknown as { cfg: { bucket: string } }).cfg.bucket }));
    return d;
  } });
}

describe.each(cases)('bộ lưu $name', ({ make, done, name }) => {
  let d: StorageDriver;
  beforeAll(async () => { process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123'; d = await make(); }, 60_000);
  afterAll(() => done?.());

  it('khoá theo chuẩn; ghi / đọc / head / xoá', async () => {
    const body = Buffer.from('ảnh hoá đơn');
    const k = key('hoa-mai', body);
    expect(k).toMatch(/^cake\/sites\/hoa-mai\/chat\/1\/2026\/11\/[0-9a-f]{16}-[0-9a-f]{8}\.jpg$/);
    expect(await d.put(k, body, 'image/jpeg')).toEqual({ key: k, size: body.length });
    expect((await d.get(k))!.equals(body)).toBe(true);
    expect(await d.head(k)).toEqual({ key: k, size: body.length });
    await d.delete(k);
    expect(await d.get(k)).toBeNull();
    expect(await d.head(k)).toBeNull();
  });

  it('hai site cùng tenant_id = 1, cùng tệp ⇒ hai khoá khác tiền tố, đọc riêng được (SC-STOR-2)', async () => {
    const body = Buffer.from('cùng một ảnh');
    const a = key('hoa-mai', body), b = key('lan-anh', body);
    expect(a.startsWith(sitePrefix('cake', 'hoa-mai'))).toBe(true);
    expect(b.startsWith(sitePrefix('cake', 'lan-anh'))).toBe(true);
    await d.put(a, body, 'image/jpeg');
    await d.put(b, Buffer.from('khác'), 'image/jpeg');
    expect((await d.get(a))!.toString()).toBe('cùng một ảnh');
    expect((await d.usage(sitePrefix('cake', 'lan-anh'))).objects).toBe(1);
  });

  it('chép tiền tố site chia lượt: dừng giữa chừng rồi tiếp ⇒ đủ tệp, không trùng (SC-STOR-5); dọn tiền tố', async () => {
    const from = sitePrefix('cake', 'mau-goc'), to = sitePrefix('cake', 'khach-moi');
    for (let i = 0; i < 5; i++) await d.put(key('mau-goc', Buffer.from(`tệp ${i}`), i % 2 ? 'chat' : 'attachments'), Buffer.from(`tệp ${i}`), 'image/jpeg');
    let next: string | undefined, rounds = 0, copied = 0;
    do { const p = await d.copyPrefix(from, to, { startAfter: next, maxKeys: 2 }); copied += p.copied; next = p.next ?? undefined; rounds++; } while (next);
    expect([copied, rounds]).toEqual([5, 3]);
    await d.copyPrefix(from, to, { startAfter: undefined, maxKeys: 10 }); // chạy lại từ đầu: ghi đè, không sinh thêm
    expect(await d.usage(to)).toEqual(await d.usage(from));
    expect(await d.deletePrefix(to)).toBe(5);
    expect((await d.usage(to)).objects).toBe(0);
    expect((await d.usage(from)).objects).toBe(5);
  });

  it('đường dẫn ký: đúng ⇒ tải được; sửa / hết hạn ⇒ từ chối (SC-STOR-3)', async () => {
    const body = Buffer.from('tệp riêng tư');
    const k = key('hoa-mai', body);
    await d.put(k, body, 'image/jpeg');
    const url = await d.signedUrl(k, 600, 'image/jpeg');
    if (name === 'local') {
      const tok = url.replace('/files/v1/', '');
      expect(verifyLocalToken(tok)).toBe(k);
      expect(verifyLocalToken(tok.slice(0, -2) + (tok.endsWith('A') ? 'BB' : 'AA'))).toBeNull();
      expect(verifyLocalToken(signLocalToken(k, 60, 1_000))).toBeNull(); // hết hạn từ lâu
    } else {
      const ok = await fetch(url);
      expect(ok.status).toBe(200);
      expect(Buffer.from(await ok.arrayBuffer()).equals(body)).toBe(true);
      const bad = await fetch(url.replace(/X-Amz-Signature=[0-9a-f]{4}/, 'X-Amz-Signature=0000'));
      expect(bad.status).toBe(403);
    }
  });

  it('chặn khoá thoát thư mục / sai khuôn', async () => {
    for (const k of ['../etc/passwd', 'cake/../../x', '/cake/sites/a', 'cake/sites/hoa-mai/../lan-anh/x.jpg']) {
      await expect(d.put(k, Buffer.from('x'), 'text/plain')).rejects.toThrow();
    }
    expect(() => buildKey({ app: 'cake', site: 'Hoa Mai', area: 'chat', tenantId: '1', sha256: 'a'.repeat(64), ext: 'jpg' })).toThrow();
    expect(() => buildKey({ app: 'cake', site: 'hoa-mai', area: 'chat', tenantId: '0', sha256: 'a'.repeat(64), ext: 'jpg' })).toThrow();
  });
});

// [2026-11-27 11:05 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — chủ: S3 không cài thì đĩa vẫn dùng được, như WP media (bizcity-r2.php thiếu cấu hình ⇒ CONFIG_MISSING, media vẫn ở uploads/).
describe('không có S3 ⇒ vẫn lưu trên đĩa (như WP media)', () => {
  let dir = '';
  beforeAll(() => { dir = mkdtempSync(path.join(tmpdir(), 'cake-fallback-')); process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123'; });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const env = (o: Record<string, string>) => ({ DATA_DIR: dir, ...o }) as NodeJS.ProcessEnv;

  it.each([
    ['mặc định (không đặt gì)', {}, null],
    ['đặt s3 nhưng thiếu biến', { STORAGE_DRIVER: 's3', STORAGE_S3_ENDPOINT: 'https://x.r2.cloudflarestorage.com' }, /thiếu STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY, STORAGE_S3_SECRET_KEY/],
    ['tên bộ sai', { STORAGE_DRIVER: 'r2' }, /không hợp lệ/],
  ])('%s ⇒ bộ đĩa chạy được, có lý do khi lệch cấu hình', async (_n, o, reason) => {
    const { driver, status } = await storageFromEnv(env(o));
    expect(driver.kind).toBe('local');
    expect(status.active).toBe('local');
    if (reason) expect(status.reason).toMatch(reason); else expect(status.reason).toBeNull();
    const body = Buffer.from('ảnh khách gửi');
    const k = key('_default', body);
    await driver.put(k, body, 'image/jpeg');
    expect((await driver.get(k))!.equals(body)).toBe(true);
  });

  it('đủ cấu hình s3 ⇒ dùng s3 (không gọi mạng lúc dựng)', async () => {
    const { driver, status } = await storageFromEnv(env({ STORAGE_DRIVER: 's3', STORAGE_S3_ENDPOINT: 'http://127.0.0.1:1', STORAGE_S3_BUCKET: 'b', STORAGE_S3_ACCESS_KEY: 'a', STORAGE_S3_SECRET_KEY: 's' }));
    expect([driver.kind, status.active, status.reason]).toEqual(['s3', 's3', null]);
  });

  it('index.ts không import tĩnh bộ s3 / AWS SDK (bản chỉ dùng đĩa không nạp SDK)', () => {
    const src = readFileSync(path.join(__dirname, '../src/storage/index.ts'), 'utf8');
    expect(src).not.toMatch(/^import[^\n]*(\.\/s3\.js|@aws-sdk)/m);
    expect(src).toMatch(/await import\('\.\/s3\.js'\)/);
  });
});
