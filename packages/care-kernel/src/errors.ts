// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — lỗi của kernel mang lý do CAKE_* (một chỗ: CAKE_REASONS); lớp HTTP đổi sang phong bì bizcity_api@1.
import { CAKE_REASONS, type CakeReason, type ErrorCode } from '@open-cake/contracts';

export class KernelError extends Error {
  readonly code: ErrorCode;
  readonly reason?: string;
  readonly hint?: string;
  constructor(code: ErrorCode, message: string, reason?: string, hint?: string) {
    super(message);
    this.name = 'KernelError';
    this.code = code;
    this.reason = reason;
    this.hint = hint;
  }
  static of(reason: CakeReason): KernelError {
    const r = CAKE_REASONS[reason];
    return new KernelError(r.code, r.message, reason, r.hint);
  }
}
