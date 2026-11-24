// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: URL là nguồn vị trí duy nhất (R-WEB-2): `#/màn/tham-số?k=v` — F5 về đúng chỗ, link dán được.
import { useCallback, useEffect, useState } from 'react';

export type Route = { path: string[]; query: URLSearchParams };

const read = (): Route => {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p = '', q = ''] = raw.split('?');
  return { path: (p || 'inbox').split('/').filter(Boolean), query: new URLSearchParams(q) };
};

export const go = (path: string, query?: Record<string, string | number | null | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  location.hash = `/${path}${s ? `?${s}` : ''}`;
};

export function useRoute() {
  const [r, set] = useState(read);
  useEffect(() => {
    const h = () => set(read());
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  /** Đổi một vài tham số, giữ phần còn lại. */
  const setQuery = useCallback((patch: Record<string, string | number | null | undefined>) => {
    const cur = read();
    const next: Record<string, string> = Object.fromEntries(cur.query.entries());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') delete next[k];
      else next[k] = String(v);
    }
    go(cur.path.join('/'), next);
  }, []);
  return { ...r, setQuery };
}
