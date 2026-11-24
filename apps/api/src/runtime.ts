// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1/5 — action spec → route REST (R-CANON-14: một spec, nhiều cửa; web gọi cùng spec qua createHttpClient):
//   ép kiểu query của GET theo schema zod, kiểm vào + ra bằng chính spec, lệnh có Idempotency-Key ghi action_requests của nền (bizcity_api@1),
//   lỗi Cake theo CAKE_REASONS → details { reason, hint, field } (đúng chỗ ApiError phía web đọc). Action chưa có máy chủ ⇒ 501 CAPABILITY_MISSING.
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sql } from 'kysely';
import { AppError } from '@bizcity/platform/core/errors';
import { ok } from '@bizcity/platform/core/http';
import { currentRequest } from '@bizcity/platform/core/request-context';
import { db, type Db } from '@bizcity/platform/db/client';
import { KernelError } from '@open-cake/care-kernel';
import { CAKE_REASONS, ERROR_CATALOG, type ActionSpec, type CakeReason, type ErrorCode } from '@open-cake/contracts';

export type Ctx = { tx: Db; tenantId: string };
type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod của spec
export type Handler = (ctx: Ctx, input: Any) => Promise<unknown>;

const PAGED = Symbol('paged');
export type Paged = { [PAGED]: true; data: unknown; meta: Record<string, unknown> };
export const paged = (data: unknown, meta: Record<string, unknown>): Paged => ({ [PAGED]: true, data, meta });

/** Lỗi theo lý do của Cake (một bảng CAKE_REASONS cho máy chủ, giả lập, giao diện). */
export function cakeError(reason: CakeReason, message?: string, extra: Record<string, unknown> = {}): AppError {
  const r = CAKE_REASONS[reason];
  return new AppError(r.code as never, message ?? r.message, ERROR_CATALOG[r.code], { reason, hint: r.hint, ...extra });
}
export const failure = (code: ErrorCode, message: string, extra: Record<string, unknown> = {}) => new AppError(code as never, message, ERROR_CATALOG[code], extra);
// [2026-11-24 08:49 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lỗi của kernel ⇒ phong bì chung (cùng reason / hint), một chỗ cho mọi action và cổng nhận.
export const fromKernel = (e: unknown) => (e instanceof KernelError ? failure(e.code, e.message, { ...(e.reason ? { reason: e.reason } : {}), ...(e.hint ? { hint: e.hint } : {}) }) : e);

/** ULID Crockford: 48 bit thời gian + 80 bit ngẫu nhiên (khoá cục bộ của Cake — R-CAKE-MASTER-6). */
const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newUlid(now = Date.now()): string {
  let t = '';
  for (let i = 0, n = now; i < 10; i++, n = Math.floor(n / 32)) t = CROCK[n % 32] + t;
  const r = randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += CROCK[r[i]! % 32];
  return t + s;
}

/** Ép chuỗi query về đúng kiểu theo schema (số, đúng-sai); trường khác để nguyên cho zod kiểm. */
function coerceQuery(schema: z.ZodTypeAny, q: Any): Any {
  let s: z.ZodTypeAny = schema;
  while (s instanceof z.ZodEffects) s = s.innerType();
  if (!(s instanceof z.ZodObject)) return q;
  const out: Any = {};
  for (const [k, v] of Object.entries(q)) {
    let f = s.shape[k] as z.ZodTypeAny | undefined;
    while (f && (f instanceof z.ZodOptional || f instanceof z.ZodDefault || f instanceof z.ZodNullable)) f = f instanceof z.ZodDefault ? f.removeDefault() : f.unwrap();
    out[k] = f instanceof z.ZodNumber ? Number(v) : f instanceof z.ZodBoolean ? v === 'true' : v;
  }
  return out;
}

const tenantOf = (): string => {
  const t = currentRequest()?.tenantId;
  if (!t) throw failure('UNAUTHORIZED', 'Chưa xác định đơn vị của yêu cầu.');
  return t;
};

/** Lệnh có Idempotency-Key: cùng khoá + cùng thân ⇒ trả lại kết quả cũ; cùng khoá khác thân ⇒ IDEMPOTENCY_CONFLICT. */
async function runCommand(spec: ActionSpec, req: FastifyRequest, input: Any, h: Handler): Promise<unknown> {
  const tenantId = tenantOf();
  const key = req.headers['idempotency-key'];
  if (typeof key === 'string' && !/^[\x21-\x7e]{8,128}$/.test(key)) throw failure('VALIDATION_ERROR', 'Idempotency-Key phải 8–128 ký tự in được.', { field: 'idempotency-key' });
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return db.transaction().execute(async (tx) => {
    if (typeof key === 'string' && key) {
      const prev = await tx.selectFrom('action_requests').select(['request_hash', 'response']).where('tenant_id', '=', tenantId).where('action_id', '=', spec.id).where('idem_key', '=', key).executeTakeFirst();
      if (prev) {
        if (prev.request_hash !== hash) throw failure('IDEMPOTENCY_CONFLICT', 'Khoá chống gửi lặp đã dùng cho một yêu cầu khác.');
        return prev.response;
      }
    }
    const out = await h({ tx, tenantId }, input);
    if (typeof key === 'string' && key) {
      await tx.insertInto('action_requests').values({ tenant_id: tenantId, action_id: spec.id, idem_key: key, request_hash: hash, status_code: 200, response: JSON.stringify(out) as never, actor: 'dev' } as never).execute();
    }
    return out;
  });
}

export function registerActions(app: FastifyInstance, specs: readonly ActionSpec[], handlers: Record<string, Handler>): void {
  for (const spec of specs) {
    const rest = spec.expose.rest;
    if (!rest) continue;
    const [method, url] = rest.split(' ') as ['GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', string];
    app.route({
      method, url,
      handler: async (req) => {
        const h = handlers[spec.id];
        if (!h) throw cakeError('CAKE_NOT_ON_SERVER', `Máy chủ chưa có ${spec.id}.`);
        const params = (req.params ?? {}) as Any;
        const body = method === 'GET' ? coerceQuery(spec.input, (req.query ?? {}) as Any) : ((req.body ?? {}) as Any);
        const input = spec.input.parse({ ...body, ...params }) as Any;
        const out = await (spec.kind === 'command' ? runCommand(spec, req, input, h) : db.transaction().execute((tx) => h({ tx, tenantId: tenantOf() }, input))).catch((e) => { throw fromKernel(e); });
        const isPaged = typeof out === 'object' && out !== null && PAGED in out;
        const data = isPaged ? (out as Paged).data : out;
        return ok(spec.output.parse(data), isPaged ? ((out as Paged).meta as never) : undefined);
      },
    });
  }
}

/** Đơn vị dev (trước PHASE-004 đăng nhập): mọi yêu cầu chạy trong đơn vị CAKE_TENANT (slug). PHASE-004 thay bằng đơn vị của người đăng nhập. */
export async function useDevTenant(app: FastifyInstance, slug: string): Promise<string> {
  const row = await sql<{ id: string }>`SELECT id::text AS id FROM tenants WHERE code = ${slug}`.execute(db);
  const id = row.rows[0]?.id;
  if (!id) throw new Error(`Chưa có đơn vị "${slug}" — chạy npm run seed -w @open-cake/api.`);
  app.addHook('preHandler', async () => { const c = currentRequest(); if (c) c.tenantId = id; });
  return id;
}
