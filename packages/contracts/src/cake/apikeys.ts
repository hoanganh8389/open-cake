// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — khoá API site (40-SECURITY §1): bảng api_keys của nền, băm sha256, một đơn vị, phạm vi khai bằng
//   registerApiScopes (nền lọc quyền ⚠), revoked_at / last_used_at. Khoá chỉ hiện MỘT lần lúc tạo; danh sách chỉ có tiền tố. Chỉ chủ (settings:write).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';

export const ApiKeyIdSchema = z.string().regex(/^[1-9][0-9]{0,18}$/);
export const ApiKeySchema = z.object({
  keyId: ApiKeyIdSchema, name: z.string(), prefix: z.string(), scopes: z.array(z.string()),
  createdAt: z.string(), lastUsedAt: z.string().nullable(), revokedAt: z.string().nullable(),
});
export type ApiKeyInfo = z.infer<typeof ApiKeySchema>;

export const apiKeyList = defineActionSpec({
  id: 'cake.apikey.list', capability: 'cake.apikey.manage', title: 'Khoá API', kind: 'query',
  input: z.object({}), output: z.object({ keys: z.array(ApiKeySchema), scopes: z.array(z.object({ key: z.string(), permissions: z.array(z.string()) })) }),
  permission: 'settings:write', risk: 'read', expose: { rest: 'GET /api/v1/api-keys', ui: true },
});
export const apiKeyCreate = defineActionSpec({
  id: 'cake.apikey.create', capability: 'cake.apikey.manage', title: 'Tạo khoá API', kind: 'command',
  input: z.object({ name: z.string().trim().min(1).max(100), scopes: z.array(z.string().regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/)).min(1).max(20) }),
  output: z.object({ key: ApiKeySchema, secret: z.string() }),
  permission: 'settings:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.apikey.created'], expose: { rest: 'POST /api/v1/api-keys', ui: true },
});
export const apiKeyRevoke = defineActionSpec({
  id: 'cake.apikey.revoke', capability: 'cake.apikey.manage', title: 'Thu hồi khoá API', kind: 'command',
  input: z.object({ keyId: ApiKeyIdSchema }), output: ApiKeySchema,
  permission: 'settings:write', risk: 'high', idempotent: true, emits: ['bizcity.cake.apikey.revoked'], expose: { rest: 'POST /api/v1/api-keys/:keyId/revoke', ui: true },
});

export const API_KEY_ACTIONS = [apiKeyList, apiKeyCreate, apiKeyRevoke] as const;
