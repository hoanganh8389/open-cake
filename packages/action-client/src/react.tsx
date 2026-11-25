// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: hook React trên react-query (R-WEB-3): dữ liệu máy chủ chỉ ở cache react-query,
//   khoá cache = ['cake', action id, input]; ghi xong thì làm mới mọi query cùng năng lực (capability).
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ActionInput, ActionSpec } from '@open-cake/contracts';
import { newIdempotencyKey, type ActionClient, type CallResult } from './client.js';

const Ctx = createContext<ActionClient | null>(null);

export function ActionProvider({ client, children }: { client: ActionClient; children: ReactNode }) {
  const qc = useMemo(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000, refetchOnWindowFocus: false } } }), []);
  return <Ctx.Provider value={client}><QueryClientProvider client={qc}>{children}</QueryClientProvider></Ctx.Provider>;
}

export function useActionClient(): ActionClient {
  const c = useContext(Ctx);
  if (!c) throw new Error('thiếu <ActionProvider>');
  return c;
}

export const queryKeyOf = (spec: ActionSpec, input?: unknown) => ['cake', spec.id, input ?? {}] as const;

/** Đọc: `useQueryAction(contactList, { page: 1 })` ⇒ { data, meta, isLoading, error, refetch }. */
export function useQueryAction<S extends ActionSpec>(spec: S, input: ActionInput<S>, opts: { enabled?: boolean } = {}) {
  const client = useActionClient();
  const q = useQuery<CallResult<S>, Error>({ queryKey: queryKeyOf(spec, input), queryFn: () => client.call(spec, input), enabled: opts.enabled ?? true });
  return { ...q, data: q.data?.data, meta: q.data?.meta };
}

/** Ghi: `const send = useAction(messageSend); send.mutate({ conversationId, text })` — tự gắn Idempotency-Key, làm mới query cùng năng lực. */
export function useAction<S extends ActionSpec>(spec: S) {
  const client = useActionClient();
  const qc = useQueryClient();
  return useMutation<CallResult<S>['data'], Error, ActionInput<S>>({
    mutationFn: async (input) => (await client.call(spec, input, { idempotencyKey: newIdempotencyKey() })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cake'] }),
  });
}

// [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-9: làm mới mọi truy vấn của app (react-query chỉ tải lại truy vấn đang hiện) — luồng realtime gọi khi có gợi ý.
export function useInvalidateAll(): () => void {
  const qc = useQueryClient();
  return useMemo(() => () => void qc.invalidateQueries({ queryKey: ['cake'] }), [qc]);
}
