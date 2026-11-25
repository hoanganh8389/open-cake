// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-006/007 — cổng nhận bizcity_touch@1 từ Hub (contracts/BIZCITY-TOUCH-v1 §1, 40-SECURITY: service:hub):
//   POST /ingress/v1/touch · Authorization: Bearer <khoá dịch vụ> · X-Bizcity-Signature: t=<unix>,v1=<hex hmac-sha256(bí mật, t + "." + thân THÔ)> · lệch ≤ 300 s ·
//   thân ≤ 256 KB · X-Bizcity-Contract = bizcity_touch@1. Hợp lệ ⇒ MỘT CỬA submitTouchIn (PgCareRepo). Cake không giữ phiên kênh nào (R-CAKE-CELL-1).
//   Khoá + bí mật đọc từ CAKE_HUB_KEY / CAKE_HUB_SECRET (PHASE-004 chuyển sang api_keys của nền). Thiếu ⇒ cổng tắt (503), không bao giờ mở không xác thực.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { ok } from '@bizcity/platform/core/http';
import { db } from '@bizcity/platform/db/client';
import { submitTouchIn } from '@open-cake/care-kernel';
import { cakeError, failure, fromKernel, newUlid } from '../runtime.js';
import { PgCareRepo } from './pg-care-repo.js';
import { notifyChanged } from '../stream.js';
import { cakeMetrics } from '../observability.js';

export const INGRESS_MAX_BYTES = 256 * 1024;
export const INGRESS_SKEW_S = 300;

/** Chữ ký Hub cho một thân (dùng ở test và ở Hub mẫu). */
export const signTouch = (secret: string, body: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function verify(headers: Record<string, unknown>, raw: string, key: string, secret: string, nowS: number): void {
  if (headers['x-bizcity-contract'] !== 'bizcity_touch@1') throw failure('VALIDATION_ERROR', 'Thiếu hoặc sai X-Bizcity-Contract (cần bizcity_touch@1).');
  const auth = String(headers.authorization ?? '');
  if (!same(auth, `Bearer ${key}`)) throw cakeError('CAKE_SIGNATURE_INVALID', 'Khoá dịch vụ Hub không đúng.');
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(headers['x-bizcity-signature'] ?? ''));
  if (!m) throw cakeError('CAKE_SIGNATURE_INVALID');
  const t = Number(m[1]);
  if (Math.abs(nowS - t) > INGRESS_SKEW_S) throw cakeError('CAKE_SIGNATURE_INVALID', 'Chữ ký Hub lệch giờ quá 300 giây.');
  if (!same(m[2]!, createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex'))) throw cakeError('CAKE_SIGNATURE_INVALID');
}

export function registerIngress(app: FastifyInstance, opts: { key?: string; secret?: string; now?: () => number } = {}): void {
  const key = opts.key ?? process.env.CAKE_HUB_KEY ?? '';
  const secret = opts.secret ?? process.env.CAKE_HUB_SECRET ?? '';
  void app.register(async (r) => {
    // Thân THÔ cho chữ ký: bộ đọc JSON riêng của nhánh này (không đụng route khác).
    r.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: INGRESS_MAX_BYTES }, (req, body, done) => {
      (req as unknown as { rawBody: string }).rawBody = String(body);
      try { done(null, JSON.parse(String(body))); } catch { done(failure('VALIDATION_ERROR', 'Thân không phải JSON.'), undefined); }
    });
    r.post('/ingress/v1/touch', async (req) => {
      if (key.length < 16 || secret.length < 32) throw failure('NOT_READY', 'Cổng nhận Hub chưa cấu hình khoá (CAKE_HUB_KEY ≥ 16, CAKE_HUB_SECRET ≥ 32 ký tự).');
      verify(req.headers, (req as unknown as { rawBody: string }).rawBody, key, secret, Math.floor((opts.now?.() ?? Date.now()) / 1000));
      // [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — đơn vị suy từ TÀI KHOẢN KÊNH của sự kiện (Hub đã tra site; trong site, một tài khoản kênh thuộc đúng một đơn vị).
      const acc = (req.body as { channelAccount?: { externalAccountId?: string; kind?: string } })?.channelAccount;
      const owners = acc?.externalAccountId ? await db.selectFrom('channel_accounts').select('tenant_id').distinct().where('external_account_id', '=', acc.externalAccountId).where('kind', '=', String(acc.kind)).execute() : [];
      if (owners.length !== 1) throw cakeError('CAKE_CHANNEL_NOT_CONNECTED', owners.length ? 'Tài khoản kênh thuộc nhiều đơn vị — kiểm cấu hình.' : undefined);
      const tenantId = owners[0]!.tenant_id;
      try {
        const res = await submitTouchIn({ repo: new PgCareRepo(tenantId, db), now: () => new Date().toISOString(), newId: () => newUlid() }, req.body);
        cakeMetrics.touches.inc({ result: res.status }); // [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — số đo chạm khách
        if (res.status === 'accepted') await notifyChanged(db, tenantId, ['cake.conversation.manage', 'cake.message.send', 'cake.contact.read']); // [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-9: tin vào ⇒ gợi ý (sau commit của kernel)
        return ok({ status: res.status, touchId: res.touchId === null ? null : String(res.touchId), contactId: res.contactId });
      } catch (e) { cakeMetrics.touches.inc({ result: 'rejected' }); throw fromKernel(e); }
    });
  });
}
