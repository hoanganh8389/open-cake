// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-1/5 — action spec → route REST (R-CANON-14: một spec, nhiều cửa; web gọi cùng spec qua createHttpClient):
//   ép kiểu query của GET theo schema zod, kiểm vào + ra bằng chính spec, lệnh có Idempotency-Key ghi action_requests của nền (bizcity_api@1),
//   lỗi Cake theo CAKE_REASONS → details { reason, hint, field } (đúng chỗ ApiError phía web đọc). Action chưa có máy chủ ⇒ 501 CAPABILITY_MISSING.
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authOf, requirePermission } from '@bizcity/platform/core/auth';
import { AppError } from '@bizcity/platform/core/errors';
import { ok } from '@bizcity/platform/core/http';
import { currentRequest } from '@bizcity/platform/core/request-context';
import { db, type Db } from '@bizcity/platform/db/client';
import { KernelError } from '@open-cake/care-kernel';
import { CAKE_REASONS, ERROR_CATALOG, type ActionSpec, type CakeReason, type ErrorCode } from '@open-cake/contracts';

// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — ngữ cảnh mang NGƯỜI THAO TÁC thật (authPlugin của nền): actor ghi sổ / bằng chứng, userId cho "của tôi".
// [2026-11-24 09:51 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — can(): quyền của người thao tác, cho phạm vi xem (care/scope.ts).
export type Ctx = { tx: Db; tenantId: string; actor: string; userId: string | null; can: (permission: string) => boolean };
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

const ctxOf = (req: FastifyRequest, tx: Db): Ctx => {
  const a = authOf(req);
  return { tx, tenantId: tenantOf(), actor: a.actor, userId: a.kind === 'user' ? a.actor.slice('user:'.length) : null, can: (p) => a.permissions.has(p as never) };
};

// [2026-11-24 09:42 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-6 — bằng chứng (bizcity_evidence@1, 40-SECURITY §4): mỗi lệnh ghi = MỘT dòng audit_logs (chuỗi băm do trigger
//   của nền), cùng giao dịch với việc ghi khi thành công; thất bại ghi sau khi đã quay lui (không che lỗi gốc). Không lưu nội dung — chỉ sha256 của đầu vào (PII).
export type Receipt = { evidenceId: string; hash: string; at: string };
const objectIdOf = (input: Any, out: unknown): string | null => {
  const o = (out ?? {}) as Any;
  return input.conversationId ?? input.contactId ?? input.itemId ?? input.recordId ?? input.userId ?? input.roleKey ?? input.keyId ?? o.itemId ?? o.recordId ?? o.userId ?? o.key ?? null; // [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — + nhân viên / vai
};
async function evidence(conn: Db, req: FastifyRequest, spec: ActionSpec, x: { inputHash: string; key: string | null; objectId: string | null; ok: boolean; code?: string }): Promise<Receipt> {
  const a = authOf(req);
  const r = await conn.insertInto('audit_logs').values({
    tenant_id: tenantOf(), actor: a.actor, actor_kind: a.kind === 'apikey' ? 'apikey' : 'user', action: spec.id, object_type: spec.capability, object_id: x.objectId,
    before_data: null, after_data: null, module_id: 'cake', request_id: String(req.id), correlation_id: currentRequest()?.correlationId ?? null, idempotency_key: x.key,
    input_hash: `sha256:${x.inputHash}`, result_ok: x.ok, result_code: x.code ?? null,
  }).returning(['id', 'hash', 'created_at']).executeTakeFirstOrThrow();
  return { evidenceId: String(r.id), hash: r.hash ?? '', at: new Date(r.created_at).toISOString() };
}

/** Lệnh có Idempotency-Key: cùng khoá + cùng thân ⇒ trả lại kết quả cũ (replayed, không ghi bằng chứng mới); cùng khoá khác thân ⇒ IDEMPOTENCY_CONFLICT. */
async function runCommand(spec: ActionSpec, req: FastifyRequest, input: Any, h: Handler): Promise<{ out: unknown; meta: { receipt?: Receipt; replayed?: true } }> {
  const tenantId = tenantOf();
  const raw = req.headers['idempotency-key'];
  if (typeof raw === 'string' && !/^[\x21-\x7e]{8,128}$/.test(raw)) throw failure('VALIDATION_ERROR', 'Idempotency-Key phải 8–128 ký tự in được.', { field: 'idempotency-key' });
  const key = typeof raw === 'string' && raw ? raw : null;
  const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  try {
    return await db.transaction().execute(async (tx) => {
      if (key) {
        const prev = await tx.selectFrom('action_requests').select(['request_hash', 'response']).where('tenant_id', '=', tenantId).where('action_id', '=', spec.id).where('idem_key', '=', key).executeTakeFirst();
        if (prev) {
          if (prev.request_hash !== inputHash) throw failure('IDEMPOTENCY_CONFLICT', 'Khoá chống gửi lặp đã dùng cho một yêu cầu khác.');
          return { out: prev.response, meta: { replayed: true as const } };
        }
      }
      const out = await h(ctxOf(req, tx), input);
      if (key) await tx.insertInto('action_requests').values({ tenant_id: tenantId, action_id: spec.id, idem_key: key, request_hash: inputHash, status_code: 200, response: JSON.stringify(out, (k, v) => (k === 'secret' ? '[đã ẩn — khoá chỉ hiện một lần]' : v)) as never /* [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — không lưu khoá rõ vào action_requests */, actor: authOf(req).actor } as never).execute();
      return { out, meta: { receipt: await evidence(tx, req, spec, { inputHash, key, objectId: objectIdOf(input, out), ok: true }) } };
    });
  } catch (e) {
    const err = fromKernel(e) as { code?: string };
    try { await evidence(db, req, spec, { inputHash, key, objectId: objectIdOf(input, null), ok: false, code: err.code ?? 'INTERNAL_ERROR' }); } catch { /* bằng chứng thất bại không được che lỗi gốc */ }
    throw err;
  }
}

export function registerActions(app: FastifyInstance, specs: readonly ActionSpec[], handlers: Record<string, Handler>): void {
  for (const spec of specs) {
    const rest = spec.expose.rest;
    if (!rest) continue;
    const [method, url] = rest.split(' ') as ['GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', string];
    app.route({
      method, url,
      preHandler: requirePermission(spec.permission as never), // [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — quyền lấy từ CHÍNH spec (một nguồn)
      handler: async (req) => {
        const h = handlers[spec.id];
        if (!h) throw cakeError('CAKE_NOT_ON_SERVER', `Máy chủ chưa có ${spec.id}.`);
        const params = (req.params ?? {}) as Any;
        const body = method === 'GET' ? coerceQuery(spec.input, (req.query ?? {}) as Any) : ((req.body ?? {}) as Any);
        const input = spec.input.parse({ ...body, ...params }) as Any;
        if (spec.kind === 'command') {
          const { out, meta } = await runCommand(spec, req, input, h);
          return ok(spec.output.parse(out), meta as never);
        }
        const out = await db.transaction().execute((tx) => h(ctxOf(req, tx), input)).catch((e) => { throw fromKernel(e); });
        const isPaged = typeof out === 'object' && out !== null && PAGED in out;
        const data = isPaged ? (out as Paged).data : out;
        return ok(spec.output.parse(data), isPaged ? ((out as Paged).meta as never) : undefined);
      },
    });
  }
}
