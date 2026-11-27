// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — bộ `local`: tệp dưới DATA_DIR/files/<khoá>; mọi đường dẫn kiểm nằm TRONG thư mục gốc.
//   Tải về bằng vé ký HMAC `/files/v1/<vé>` (khoá ký suy từ CAKE_SECRET_KEY, tách khỏi khoá mã hoá). Không tự xoá theo tuổi (Q-STOR-2 = A).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { assertKey, assertPrefix } from './keys.js';
import type { CopyPage, StorageDriver, StoredObject } from './types.js';

const fileKey = () => {
  const s = process.env.CAKE_SECRET_KEY ?? '';
  if (s.length < 32) throw new Error('Thiếu CAKE_SECRET_KEY (≥ 32 ký tự) để ký đường dẫn tải tệp');
  return createHash('sha256').update(`bizcity-files|${s}`).digest();
};
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

/** Vé tải tệp của bộ local: `<base64url({k,e})>.<hmac>`; e = hạn (giây unix). */
export function signLocalToken(key: string, ttlSec: number, nowSec = Math.floor(Date.now() / 1000)): string {
  const body = b64(JSON.stringify({ k: assertKey(key), e: nowSec + Math.max(1, Math.floor(ttlSec)) }));
  return `${body}.${createHmac('sha256', fileKey()).update(body).digest('base64url')}`;
}
/** Khoá của vé nếu vé đúng chữ ký và còn hạn; ngược lại null. */
export function verifyLocalToken(token: string, nowSec = Math.floor(Date.now() / 1000)): string | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = createHmac('sha256', fileKey()).update(body).digest('base64url');
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { k?: string; e?: number };
    if (typeof p.k !== 'string' || typeof p.e !== 'number' || p.e < nowSec) return null;
    return assertKey(p.k);
  } catch { return null; }
}

export class LocalDriver implements StorageDriver {
  readonly kind = 'local' as const;
  private readonly root: string;
  constructor(root: string) { this.root = path.resolve(root); }

  private abs(key: string): string {
    const p = path.resolve(this.root, assertKey(key));
    if (!p.startsWith(this.root + path.sep)) throw new Error('khoá thoát khỏi thư mục lưu');
    return p;
  }
  /** Mọi khoá dưới tiền tố, đã sắp xếp. */
  private async list(prefix: string): Promise<string[]> {
    const dir = this.abs(assertPrefix(prefix).slice(0, -1));
    const out: string[] = [];
    const walk = async (d: string): Promise<void> => {
      const items = await readdir(d, { withFileTypes: true }).catch(() => []);
      for (const it of items) {
        const full = path.join(d, it.name);
        if (it.isDirectory()) await walk(full);
        else out.push(path.relative(this.root, full).split(path.sep).join('/'));
      }
    };
    await walk(dir);
    return out.sort();
  }

  async put(key: string, body: Buffer): Promise<StoredObject> {
    const p = this.abs(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
    return { key, size: body.length };
  }
  async get(key: string): Promise<Buffer | null> { return readFile(this.abs(key)).catch(() => null); }
  async head(key: string): Promise<StoredObject | null> {
    const s = await stat(this.abs(key)).catch(() => null);
    return s?.isFile() ? { key, size: s.size } : null;
  }
  async delete(key: string): Promise<void> { await rm(this.abs(key), { force: true }); }

  async copyPrefix(from: string, to: string, opts: { startAfter?: string; maxKeys?: number } = {}): Promise<CopyPage> {
    assertPrefix(to);
    const keys = (await this.list(from)).filter((k) => !opts.startAfter || k > opts.startAfter);
    const page = keys.slice(0, Math.max(1, opts.maxKeys ?? 500));
    for (const k of page) {
      const dst = this.abs(to + k.slice(from.length));
      await mkdir(path.dirname(dst), { recursive: true });
      await copyFile(this.abs(k), dst);
    }
    return { copied: page.length, next: page.length < keys.length ? page[page.length - 1]! : null };
  }
  async deletePrefix(prefix: string): Promise<number> {
    const keys = await this.list(prefix);
    await rm(this.abs(assertPrefix(prefix).slice(0, -1)), { recursive: true, force: true });
    return keys.length;
  }
  async usage(prefix: string): Promise<{ objects: number; bytes: number }> {
    let bytes = 0;
    const keys = await this.list(prefix);
    for (const k of keys) bytes += (await stat(this.abs(k))).size;
    return { objects: keys.length, bytes };
  }
  async signedUrl(key: string, ttlSec: number): Promise<string> { return `/files/v1/${signLocalToken(key, ttlSec)}`; }
}
