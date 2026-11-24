// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — giả lập khoá API theo luật máy chủ (apps/api/src/auth/apikeys.ts): khoá rõ chỉ trả lúc tạo, phạm vi chỉ cake:read.
import { ApiError } from '../client.js';
import type { Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter
type Key = { keyId: string; name: string; prefix: string; scopes: string[]; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
const SCOPES = [{ key: 'cake:read', permissions: ['cake:catalog-xem', 'cake:contacts-xem'] }];
const keys = (s: Store & { apiKeys?: Key[] }) => (s.apiKeys ??= [
  { keyId: '1', name: 'POS cửa hàng Quận 3', prefix: 'kc_Q7m2xR', scopes: ['cake:read'], createdAt: '2026-11-02T08:00:00Z', lastUsedAt: '2026-11-24T03:10:00Z', revokedAt: null },
  { keyId: '2', name: 'Kế Toán (thử)', prefix: 'kc_aB91kd', scopes: ['cake:read'], createdAt: '2026-10-20T08:00:00Z', lastUsedAt: null, revokedAt: '2026-11-01T08:00:00Z' },
]);

export const apiKeyHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'cake.apikey.list': (s) => ({ keys: [...keys(s)].sort((a, b) => Number(!!a.revokedAt) - Number(!!b.revokedAt)), scopes: SCOPES }),
  'cake.apikey.create': (s, i) => {
    const bad = i.scopes.filter((x: string) => !SCOPES.some((c) => c.key === x));
    if (bad.length) throw new ApiError({ code: 'VALIDATION_ERROR', message: `Phạm vi không có: ${bad.join(', ')}.`, field: 'scopes' });
    const secret = `kc_demo${String(++s.seq)}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;
    const k = { keyId: String(s.seq), name: i.name, prefix: secret.slice(0, 10), scopes: i.scopes, createdAt: new Date(s.now()).toISOString(), lastUsedAt: null, revokedAt: null };
    keys(s).unshift(k);
    return { key: k, secret };
  },
  'cake.apikey.revoke': (s, i) => {
    const k = keys(s).find((x) => x.keyId === i.keyId);
    if (!k) throw new ApiError({ code: 'NOT_FOUND', message: 'Không có khoá này.' });
    k.revokedAt ??= new Date(s.now()).toISOString();
    return k;
  },
};
