// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — khoá API site trên bảng api_keys của NỀN (authPlugin đọc X-Api-Key, băm hashApiKey, ghi last_used_at):
//   Cake chỉ tạo / liệt kê / thu hồi. Khoá `kc_` + 32 byte ngẫu nhiên, lưu băm + tiền tố; khoá rõ chỉ trả MỘT lần (runtime ẩn `secret` khỏi action_requests).
//   Phạm vi chỉ nhận phạm vi Cake đã khai (registerApiScopes); quyền ⚠ do nền lọc khỏi khoá (R-CAKE-AUTHZ-3).
import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import { listApiScopes, scopePermissionKeys } from '@bizcity/platform/core/roles';
import { hashApiKey } from '@bizcity/platform/core/security/password';
import type { ApiKeyInfo } from '@open-cake/contracts';
import { failure, type Ctx, type Handler } from '../runtime.js';

const cakeScopes = () => listApiScopes().filter((s) => s.startsWith('cake:'));
type Row = { id: string; name: string; key_prefix: string; scopes: string[]; created_at: Date; last_used_at: Date | null; revoked_at: Date | null };
const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
const view = (r: Row): ApiKeyInfo => ({ keyId: r.id, name: r.name, prefix: r.key_prefix, scopes: r.scopes, createdAt: iso(r.created_at)!, lastUsedAt: iso(r.last_used_at), revokedAt: iso(r.revoked_at) });
const rows = async ({ tx, tenantId }: Ctx, id?: string) => (await sql<Row>`
  SELECT id::text, name, key_prefix, scopes, created_at, last_used_at, revoked_at FROM api_keys
  WHERE tenant_id = ${tenantId} AND app_key IS NULL ${id ? sql`AND id = ${id}` : sql``} ORDER BY revoked_at IS NOT NULL, created_at DESC`.execute(tx)).rows;

export const apiKeyHandlers: Record<string, Handler> = {
  'cake.apikey.list': async (ctx) => ({ keys: (await rows(ctx)).map(view), scopes: cakeScopes().map((key) => ({ key, permissions: [...scopePermissionKeys(key)] })) }),
  'cake.apikey.create': async (ctx, i) => {
    const bad = (i.scopes as string[]).filter((s) => !cakeScopes().includes(s));
    if (bad.length) throw failure('VALIDATION_ERROR', `Phạm vi không có: ${bad.join(', ')}.`, { field: 'scopes' });
    const secret = `kc_${randomBytes(32).toString('base64url')}`;
    const id = (await sql<{ id: string }>`INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, scopes)
      VALUES (${ctx.tenantId}, ${i.name}, ${secret.slice(0, 10)}, ${hashApiKey(secret)}, ${[...new Set<string>(i.scopes)]}::text[]) RETURNING id::text`.execute(ctx.tx)).rows[0]!.id;
    return { key: view((await rows(ctx, id))[0]!), secret };
  },
  'cake.apikey.revoke': async (ctx, i) => {
    const r = (await rows(ctx, i.keyId))[0];
    if (!r) throw failure('NOT_FOUND', 'Không có khoá này.');
    if (!r.revoked_at) await sql`UPDATE api_keys SET revoked_at = now() WHERE tenant_id = ${ctx.tenantId} AND id = ${r.id}`.execute(ctx.tx);
    return view((await rows(ctx, r.id))[0]!);
  },
};
