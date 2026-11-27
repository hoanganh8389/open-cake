// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — bộ `s3`: R2 / S3 / MinIO qua giao thức S3 (vùng `auto`, path-style như bizcity-r2.php của mạng WP).
//   Chủ chốt Q-STOR-3 = B: bucket RIÊNG TƯ riêng (không gắn tên miền công khai), token quyền hẹp — không dùng lại khoá BIZCITY_R2_* của WP.
//   Không đặt hạn giữ trong app (chủ chốt 2026-11-26). Chép / xoá theo tiền tố làm phía máy chủ (CopyObject), chia lượt như MUCD_Files của mạng WP.
import {
  CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertKey, assertPrefix } from './keys.js';
import type { CopyPage, StorageDriver, StoredObject } from './types.js';

export type S3Config = { endpoint: string; bucket: string; accessKey: string; secretKey: string; region?: string };

const missing = (e: unknown) => {
  const x = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return x?.name === 'NotFound' || x?.name === 'NoSuchKey' || x?.$metadata?.httpStatusCode === 404;
};
/** CopySource: bucket/khoá đã mã hoá từng đoạn (giữ "/") — cùng cách của bizcity-r2.php. */
const copySource = (bucket: string, key: string) => `${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

export class S3Driver implements StorageDriver {
  readonly kind = 's3' as const;
  readonly client: S3Client;
  constructor(private readonly cfg: S3Config) {
    this.client = new S3Client({
      endpoint: cfg.endpoint, region: cfg.region ?? 'auto', forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
  }
  private get Bucket() { return this.cfg.bucket; }

  /** Một trang khoá dưới tiền tố, theo thứ tự khoá (S3 trả sẵn thứ tự). */
  private async page(prefix: string, startAfter: string | undefined, max: number) {
    const r = await this.client.send(new ListObjectsV2Command({ Bucket: this.Bucket, Prefix: assertPrefix(prefix), StartAfter: startAfter, MaxKeys: max }));
    return { items: (r.Contents ?? []).map((c) => ({ key: c.Key!, size: Number(c.Size ?? 0) })), more: !!r.IsTruncated };
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(new PutObjectCommand({ Bucket: this.Bucket, Key: assertKey(key), Body: body, ContentType: contentType }));
    return { key, size: body.length };
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      const r = await this.client.send(new GetObjectCommand({ Bucket: this.Bucket, Key: assertKey(key) }));
      return Buffer.from(await r.Body!.transformToByteArray());
    } catch (e) { if (missing(e)) return null; throw e; }
  }
  async head(key: string): Promise<StoredObject | null> {
    try {
      const r = await this.client.send(new HeadObjectCommand({ Bucket: this.Bucket, Key: assertKey(key) }));
      return { key, size: Number(r.ContentLength ?? 0) };
    } catch (e) { if (missing(e)) return null; throw e; }
  }
  async delete(key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.Bucket, Key: assertKey(key) })); }

  async copyPrefix(from: string, to: string, opts: { startAfter?: string; maxKeys?: number } = {}): Promise<CopyPage> {
    assertPrefix(to);
    const { items, more } = await this.page(from, opts.startAfter, Math.max(1, Math.min(opts.maxKeys ?? 500, 1000)));
    for (const it of items) {
      await this.client.send(new CopyObjectCommand({ Bucket: this.Bucket, Key: assertKey(to + it.key.slice(from.length)), CopySource: copySource(this.Bucket, it.key) }));
    }
    return { copied: items.length, next: more && items.length ? items[items.length - 1]!.key : null };
  }
  async deletePrefix(prefix: string): Promise<number> {
    let n = 0;
    for (;;) {
      const { items } = await this.page(prefix, undefined, 1000);
      if (!items.length) return n;
      await this.client.send(new DeleteObjectsCommand({ Bucket: this.Bucket, Delete: { Objects: items.map((i) => ({ Key: i.key })), Quiet: true } }));
      n += items.length;
    }
  }
  async usage(prefix: string): Promise<{ objects: number; bytes: number }> {
    let objects = 0, bytes = 0, after: string | undefined;
    for (;;) {
      const { items, more } = await this.page(prefix, after, 1000);
      for (const it of items) { objects++; bytes += it.size; }
      if (!more || !items.length) return { objects, bytes };
      after = items[items.length - 1]!.key;
    }
  }
  async signedUrl(key: string, ttlSec: number, contentType?: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.Bucket, Key: assertKey(key), ...(contentType ? { ResponseContentType: contentType } : {}) });
    return getSignedUrl(this.client, cmd, { expiresIn: Math.max(1, Math.min(Math.floor(ttlSec), 3600)) });
  }
}
