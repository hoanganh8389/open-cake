// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: adapter http — dựng request từ expose.rest của spec, đọc phong bì bizcity_api@1.
//   Chưa có máy chủ ở phase này; PHASE-007 bật adapter này.
import { ApiFailureSchema, apiSuccess, type ActionSpec } from '@open-cake/contracts';
import { ApiError, newIdempotencyKey, type ActionClient, type CallResult } from './client.js';

/** `POST /api/v1/conversations/:conversationId/tags` + input ⇒ { method, path, rest of input }. */
export function buildRequest(spec: ActionSpec, input: Record<string, unknown>) {
  const rest = spec.expose.rest;
  if (!rest) throw new Error(`action ${spec.id} không có route REST`);
  const [method, rawPath] = rest.split(' ') as [string, string];
  const left = { ...input };
  const path = rawPath.replace(/:([A-Za-z]+)/g, (_, k: string) => {
    const v = left[k];
    delete left[k];
    if (v === undefined || v === null) throw new Error(`thiếu tham số đường dẫn ${k} cho ${spec.id}`);
    return encodeURIComponent(String(v));
  });
  if (method === 'GET') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(left)) if (v !== undefined && v !== null) qs.set(k, String(v));
    const q = qs.toString();
    return { method, url: q ? `${path}?${q}` : path, body: undefined };
  }
  return { method, url: path, body: JSON.stringify(left) };
}

export function createHttpClient(opts: { baseUrl?: string; getToken?: () => string | null; fetchImpl?: typeof fetch } = {}): ActionClient {
  const f = opts.fetchImpl ?? fetch;
  return {
    kind: 'http',
    async call(spec, input, callOpts) {
      const parsed = spec.input.parse(input) as Record<string, unknown>;
      const req = buildRequest(spec, parsed);
      const headers: Record<string, string> = { accept: 'application/json' };
      if (req.body) headers['content-type'] = 'application/json';
      if (spec.kind === 'command') headers['idempotency-key'] = callOpts?.idempotencyKey ?? newIdempotencyKey();
      const token = opts.getToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await f(`${opts.baseUrl ?? ''}${req.url}`, { method: req.method, headers, body: req.body, signal: callOpts?.signal });
      const json: unknown = await res.json().catch(() => null);
      const fail = ApiFailureSchema.safeParse(json);
      if (fail.success) {
        const e = fail.data.error;
        throw new ApiError({ code: e.code, message: e.message, reason: e.details?.reason, hint: e.details?.hint, field: e.details?.field, requestId: e.requestId });
      }
      const ok = apiSuccess(spec.output).safeParse(json);
      if (!ok.success) throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Máy chủ trả dữ liệu không đúng hợp đồng.', hint: `${spec.id}: ${ok.error.issues[0]?.message ?? ''}` });
      return { data: ok.data.data, meta: ok.data.meta ?? {} } as CallResult<typeof spec>;
    },
  };
}
