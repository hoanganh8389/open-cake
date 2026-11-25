// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-7/8 — máy khách ra ngoài của luồng đơn (bizcity_order_flow@1):
//   - seal / open: khoá opb_… và bí mật ký của cửa hàng lưu MÃ HOÁ AES-256-GCM (khoá = SHA-256(CAKE_SECRET_KEY)), dạng v1:<base64(iv 12 | tag 16 | bản mã)> — cùng khuôn site-registry của nền;
//   - posCall: gọi open-pos-backend với Bearer + Idempotency-Key + Bizcity-Signature (HMAC-SHA256 "t.thân"), hết giờ 8 giây; fetch mang traceparent (initTracing);
//   - ketoanStock: GET /api/v1/inventory/availability (bizcity_stock_read@1, scope stock:read).
//   NỢ: khoá Kế Toán đọc từ CAKE_OKT_API_KEY cho tới khi có màn nối Kế Toán (PHASE-017 "Lấy từ Open Kế Toán" — sắp có); khi đó chuyển sang lưu mã hoá như khoá cửa hàng.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { failure } from '../runtime.js';

const secretKey = () => {
  const k = process.env.CAKE_SECRET_KEY ?? '';
  if (k.length < 32) throw failure('NOT_READY', 'Máy chủ chưa đặt CAKE_SECRET_KEY (≥ 32 ký tự) để mã hoá khoá cửa hàng.');
  return createHash('sha256').update(k).digest();
};

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', secretKey(), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}`;
}
export function open(sealed: string): string {
  const b = Buffer.from(sealed.slice(3), 'base64');
  const d = createDecipheriv('aes-256-gcm', secretKey(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

/** `Bizcity-Signature: t=<unix>,v1=<hex>` — cùng khuôn bizcity_event@1 §7a. */
export const signBody = (secret: string, body: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
export function verifyBody(secret: string, body: string, header: string | undefined, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!m || Math.abs(nowSec - Number(m[1])) > 300) return false;
  const want = createHmac('sha256', secret).update(`${m[1]}.${body}`).digest('hex');
  return timingSafeEqual(Buffer.from(m[2]!), Buffer.from(want));
}

export type PosReply = { status: number; json: { ok?: boolean; data?: Record<string, unknown>; error?: { code?: string; message?: string } } | null };
export type PosTarget = { baseUrl: string; key: string; secret: string };
export const POS_PATH = '/wp-json/open-pos/v1/order-requests';

export async function posCall(t: PosTarget, method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<PosReply> {
  const raw = body === undefined ? '' : JSON.stringify(body);
  const res = await fetch(t.baseUrl.replace(/\/+$/, '') + path, {
    method, signal: AbortSignal.timeout(8000), body: body === undefined ? undefined : raw,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${t.key}`, 'bizcity-signature': signBody(t.secret, raw), ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) },
  });
  let json: PosReply['json'] = null;
  try { json = (await res.json()) as PosReply['json']; } catch { json = null; } // nuot-loi: thân không phải JSON ⇒ coi như lỗi máy nhận, status quyết
  return { status: res.status, json };
}

export type KetoanStockRow = { item: { id?: string; code?: string }; onHand: number; pendingOut: number; held: number; available: number; error?: string };
export async function ketoanStock(baseUrl: string, branchCode: string, skus: string[]): Promise<{ asOf: string; rows: KetoanStockRow[] } | null> {
  const key = process.env.CAKE_OKT_API_KEY;
  if (!key || !skus.length) return null;
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/inventory/availability?branchCode=${encodeURIComponent(branchCode)}&skus=${encodeURIComponent(skus.join(','))}`;
  try {
    const res = await fetch(url, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: KetoanStockRow[]; meta?: { asOf?: string } };
    return { asOf: j.meta?.asOf ?? new Date().toISOString(), rows: j.data ?? [] };
  } catch { return null; } // nuot-loi: Kế Toán không trả lời ⇒ giao diện không hiện tồn (source none), không chặn chat
}
