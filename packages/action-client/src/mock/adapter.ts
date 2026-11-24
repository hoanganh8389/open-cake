// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: adapter giả lập — kiểm input bằng spec.input và kiểm output bằng spec.output
//   ⇒ giao diện chỉ nhận dữ liệu đúng hợp đồng; giả lập lệch hợp đồng thì ném ngay (bắt sớm trôi hợp đồng). Kịch bản 4 trạng thái theo ?mock=.
import { cakeCatalog, type ActionSpec } from '@open-cake/contracts';
import { ApiError, type ActionClient, type CallResult } from '../client.js';
import { contactHandlers } from './handlers-contacts.js';
import { inboxHandlers } from './handlers-inbox.js';
import { createStore, isPaged, type Store } from './store.js';

export type MockScenario = 'normal' | 'empty' | 'error' | 'denied' | 'slow';
const HANDLERS = { ...inboxHandlers, ...contactHandlers };

/** Mọi action trong danh mục phải có handler giả lập (kiểm khi tạo client). */
export const missingMockHandlers = () => Object.keys(cakeCatalog).filter((id) => !HANDLERS[id]);

export function createMockClient(opts: { scenario?: MockScenario; latencyMs?: number; store?: Store } = {}): ActionClient & { store: Store } {
  const store = opts.store ?? createStore();
  const scenario = opts.scenario ?? 'normal';
  let req = 0;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    kind: 'mock',
    store,
    async call<S extends ActionSpec>(spec: S, input: unknown): Promise<CallResult<S>> {
      const requestId = `mock-${++req}`;
      const delay = scenario === 'slow' ? 1500 : opts.latencyMs ?? 0;
      if (delay) await wait(delay);
      if (scenario === 'error') throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Không tải được dữ liệu (lỗi giả lập).', hint: 'Bấm Thử lại; nếu còn lỗi, gửi mã tra cứu cho quản trị.', requestId });
      if (scenario === 'denied') throw new ApiError({ code: 'FORBIDDEN', message: `Bạn chưa có quyền ${spec.permission}.`, hint: 'Nhờ quản lý cấp quyền ở Cài đặt › Nhân viên.', requestId });
      const parsed = spec.input.safeParse(input);
      if (!parsed.success) {
        const iss = parsed.error.issues[0];
        throw new ApiError({ code: 'VALIDATION_ERROR', message: iss?.message ?? 'Dữ liệu không hợp lệ.', field: iss?.path.join('.'), reason: iss?.message?.startsWith('CAKE_') ? iss.message : undefined, requestId });
      }
      const h = HANDLERS[spec.id];
      if (!h) throw new ApiError({ code: 'CAPABILITY_MISSING', message: `Giả lập chưa có ${spec.id}.`, requestId });
      let out: unknown;
      try { out = h(store, parsed.data as Record<string, unknown>); } catch (e) { if (e instanceof ApiError) throw new ApiError({ ...e, message: e.message, requestId }); throw e; }
      const raw = isPaged(out) ? out.data : out;
      const meta = isPaged(out) ? out.meta : {};
      const data = scenario === 'empty' && spec.kind === 'query' && Array.isArray(raw) ? [] : raw;
      const checked = spec.output.safeParse(data);
      if (!checked.success) throw new Error(`giả lập trả sai hợp đồng ở ${spec.id}: ${checked.error.issues[0]?.path.join('.')} ${checked.error.issues[0]?.message}`);
      return { data: checked.data, meta: { ...meta, requestId } } as CallResult<S>;
    },
  };
}
