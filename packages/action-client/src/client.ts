// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: cổng duy nhất màn dùng để lấy / ghi dữ liệu (SC-REUSE-3: không fetch ngoài client).
//   Đổi giả lập ↔ máy chủ thật = đổi adapter, không sửa màn.
import { CAKE_REASONS, type ActionInput, type ActionOutput, type ActionSpec, type CakeReason, type ErrorCode } from '@open-cake/contracts';

export interface CallMeta { requestId?: string; nextCursor?: string | null; page?: number; pageSize?: number; total?: number; replayed?: boolean }
export interface CallResult<S extends ActionSpec> { data: ActionOutput<S>; meta: CallMeta }
export interface CallOptions { idempotencyKey?: string; signal?: AbortSignal }

export interface ActionClient {
  readonly kind: 'mock' | 'http';
  call<S extends ActionSpec>(spec: S, input: ActionInput<S>, opts?: CallOptions): Promise<CallResult<S>>;
}

/** Lỗi theo phong bì bizcity_api@1: mã chung + lý do cụ thể + gợi ý + mã tra cứu. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly reason?: string;
  readonly hint?: string;
  readonly requestId?: string;
  readonly field?: string;
  constructor(init: { code: ErrorCode; message: string; reason?: string; hint?: string; requestId?: string; field?: string }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.reason = init.reason;
    this.hint = init.hint;
    this.requestId = init.requestId;
    this.field = init.field;
  }
  /** Lỗi theo lý do CAKE_* đã khai — câu chữ lấy từ một chỗ (CAKE_REASONS). */
  static reason(reason: CakeReason, requestId?: string): ApiError {
    const r = CAKE_REASONS[reason];
    return new ApiError({ code: r.code, message: r.message, hint: r.hint, reason, requestId });
  }
}

/** Khoá idempotency cho thao tác ghi từ giao diện (R-API-9): một lần bấm = một khoá. */
export const newIdempotencyKey = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
