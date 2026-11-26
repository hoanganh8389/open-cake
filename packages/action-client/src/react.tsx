// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: hook React trên react-query (R-WEB-3): dữ liệu máy chủ chỉ ở cache react-query,
//   khoá cache = ['cake', action id, input]; ghi xong thì làm mới mọi query cùng năng lực (capability).
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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

/**
 * [2026-11-26 12:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-3 — "Đọc lại": gọi cùng action với `forced` (vd refresh: true ⇒ bỏ đệm phía máy chủ) rồi đặt kết quả vào
 * query đang hiện (cùng khoá input gốc) — màn không đổi khoá, không nháy. Lỗi ⇒ giữ dữ liệu cũ, trả về để màn báo.
 */
export function useForceRead<S extends ActionSpec>(spec: S, input: ActionInput<S>, forced: Partial<ActionInput<S>>) {
  const client = useActionClient();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    try { qc.setQueryData(queryKeyOf(spec, input), await client.call(spec, { ...input, ...forced })); } finally { setPending(false); }
  };
  return { run, pending };
}

// [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: danh sách theo con trỏ (meta.nextCursor). `items` = mọi trang nối lại theo thứ tự tải;
//   `more()` tải trang kế. Khoá truy vấn cùng tiền tố ['cake', spec.id, …] ⇒ lệnh ghi / gợi ý realtime làm mới như mọi truy vấn khác.
export function useInfiniteQueryAction<S extends ActionSpec>(spec: S, input: Omit<ActionInput<S>, 'cursor'>, opts: { enabled?: boolean } = {}) {
  const client = useActionClient();
  const q = useInfiniteQuery<CallResult<S>, Error>({
    queryKey: [...queryKeyOf(spec, input), 'pages'],
    queryFn: ({ pageParam }) => client.call(spec, { ...input, ...(pageParam ? { cursor: pageParam } : {}) } as ActionInput<S>),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.nextCursor ?? null,
    enabled: opts.enabled ?? true,
  });
  // ghi nhớ theo dữ liệu của react-query: màn dùng `pages` / `data` làm phụ thuộc effect (cuộn) mà không chạy lại mỗi lần vẽ
  const { pages, items } = useMemo(() => {
    const ps = (q.data?.pages ?? []).map((p) => p.data as unknown as unknown[]);
    return { pages: ps, items: ps.flat() };
  }, [q.data]);
  const { fetchNextPage } = q;
  const more = useMemo(() => () => void fetchNextPage(), [fetchNextPage]);
  type Item = CallResult<S>['data'] extends readonly (infer T)[] ? T : never;
  return { ...q, data: q.data ? (items as Item[]) : undefined, pages: pages as Item[][], more, hasMore: q.hasNextPage, loadingMore: q.isFetchingNextPage };
}
