// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-8 / R-LOG-10: nhận lỗi giao diện từ ErrorBoundary ⇒ MỘT dòng log có cấu trúc (không DB, không nội dung tin);
//   cần phiên (authPlugin), ≤ 10 lần / phút / người (vượt ⇒ 429), cắt độ dài từng trường. Tra theo errFp + request_id trong log.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authOf } from '@bizcity/platform/core/auth';
import { ok } from '@bizcity/platform/core/http';
import { failure } from './runtime.js';
import { cakeMetrics } from './observability.js';

const Body = z.object({
  errFp: z.string().regex(/^[0-9a-f]{8}$/), route: z.string().max(200),
  message: z.string().max(300), stack: z.string().max(2000).optional(), where: z.string().max(40).optional(),
});
const WINDOW = 60_000, MAX = 10;
const seen = new Map<string, number[]>();

export function registerClientErrors(app: FastifyInstance): void {
  app.post('/api/v1/system/client-errors', { bodyLimit: 8 * 1024 }, async (req) => {
    const who = authOf(req).actor, t = Date.now();
    const recent = (seen.get(who) ?? []).filter((x) => t - x < WINDOW);
    if (recent.length >= MAX) { cakeMetrics.clientErrors.inc({ result: 'limited' }); throw failure('RATE_LIMITED', 'Quá nhiều báo lỗi giao diện — đã ghi đủ, thử lại sau một phút.'); }
    seen.set(who, [...recent, t]);
    const r = Body.safeParse(req.body);
    if (!r.success) throw failure('VALIDATION_ERROR', 'Báo lỗi giao diện sai khuôn.', { field: r.error.issues[0]?.path.join('.') });
    cakeMetrics.clientErrors.inc({ result: 'logged' }); // [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 R-STD-OBS-1 — số đo
    req.log.warn({ clientError: { ...r.data, actor: who, tenantId: authOf(req).tenantId } }, 'lỗi giao diện');
    return ok({ accepted: true });
  });
}
