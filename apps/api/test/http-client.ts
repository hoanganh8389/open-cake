// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — test: createHttpClient của WEB gọi app.inject (không mạng), kèm phiên. Một chỗ cho mọi tệp test HTTP.
import type { FastifyInstance } from 'fastify';
import type { ActionClient } from '@open-cake/action-client';

/** Phiên dev (CAKE_DEV_AUTH=1) — chủ đơn vị dev. */
export async function devToken(app: FastifyInstance): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/v1/auth/dev-login' });
  if (r.statusCode !== 200) throw new Error(`dev-login ${r.statusCode}: ${r.body}`);
  return r.json().data.token as string;
}

export async function clientFor(app: FastifyInstance, token: string | null): Promise<ActionClient> {
  const { createHttpClient } = await import('@open-cake/action-client');
  return createHttpClient({
    getToken: () => token,
    fetchImpl: (async (u: string, init: RequestInit) => {
      const r = await app.inject({ method: init.method as 'GET', url: u, headers: init.headers as Record<string, string>, payload: init.body as string | undefined });
      return new Response(r.body, { status: r.statusCode, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch,
  });
}
