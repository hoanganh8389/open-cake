// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-2: mã lỗi chung theo bizcity_errors@1 (chỉ phần không thuộc kế toán)
//   + lý do riêng của cake (details.reason tiền tố CAKE_). Mã kế toán (POSTING_FAILED, PERIOD_LOCKED…) không có ở đây.
import { z } from 'zod';

/** Mã lỗi ổn định — phía gọi xử lý theo mã, không theo câu chữ. Kèm mã HTTP. */
export const ERROR_CATALOG = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  MODULE_DISABLED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  CAPABILITY_MISSING: 501,
  NOT_READY: 503,
  GATEWAY_UNAVAILABLE: 503,
  SITE_UPGRADING: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;
export const ErrorCodeSchema = z.enum(Object.keys(ERROR_CATALOG) as [ErrorCode, ...ErrorCode[]]);

/**
 * Lý do riêng của open-cake (details.reason). Mỗi lý do: mã chung đi kèm + câu tiếng Việt + gợi ý.
 * Thêm lý do = thêm một dòng ở đây (một chỗ, R-REUSE-5); finding CAKE-* dùng chung bảng này.
 */
export const CAKE_REASONS = {
  CAKE_WINDOW_CLOSED: { code: 'CONFLICT', message: 'Đã quá 24 giờ kể từ tin cuối của khách trên Fanpage.', hint: 'Chờ khách nhắn lại, hoặc gửi bằng thẻ tin nhắn được phép.' },
  CAKE_SEND_CAP_REACHED: { code: 'RATE_LIMITED', message: 'Tài khoản kênh đã chạm trần gửi trong giờ.', hint: 'Chờ sang giờ kế tiếp hoặc nâng trần ở Cài đặt › Trần gửi.' },
  CAKE_SEND_CAP_MISSING: { code: 'CONFLICT', message: 'Chưa đặt trần gửi cho tài khoản kênh này.', hint: 'Đặt trần ở Cài đặt › Trần gửi trước khi gửi.' },
  CAKE_CHANNEL_NOT_CONNECTED: { code: 'CONFLICT', message: 'Tài khoản kênh chưa kết nối.', hint: 'Mở Kênh và kết nối lại tài khoản.' },
  CAKE_IDENTITY_CONFLICT: { code: 'CONFLICT', message: 'Danh tính này đang thuộc một khách khác.', hint: 'Dùng Ghép nếu chắc là cùng một người.' },
  CAKE_MERGE_NO_PROOF: { code: 'VALIDATION_ERROR', message: 'Ghép hai khách cần bằng chứng (số điện thoại, email, mã số thuế hoặc người xác nhận).', hint: 'Không ghép chỉ vì trùng tên.' },
  CAKE_MERGE_SELF: { code: 'VALIDATION_ERROR', message: 'Không ghép một khách với chính nó.', hint: 'Chọn khách khác.' },
  CAKE_UNMERGE_EXPIRED: { code: 'CONFLICT', message: 'Đã quá hạn tách lại.', hint: 'Liên hệ quản trị nếu cần sửa.' },
  CAKE_TOUCH_VERSION_STALE: { code: 'CONFLICT', message: 'Sự việc này đã có phiên bản mới hơn.', hint: 'Không cần gửi lại.' },
  CAKE_SIGNATURE_INVALID: { code: 'UNAUTHORIZED', message: 'Chữ ký Hub không hợp lệ hoặc lệch giờ.', hint: 'Kiểm đồng hồ máy chủ và khoá ký.' },
  CAKE_META_KEY_UNKNOWN: { code: 'VALIDATION_ERROR', message: 'Khoá dữ liệu phụ chưa đăng ký.', hint: 'Thêm khoá vào registry trước khi ghi.' },
  CAKE_RECORD_TYPE_UNKNOWN: { code: 'VALIDATION_ERROR', message: 'Loại bản ghi chưa đăng ký.', hint: 'Thêm record_type vào registry trước khi ghi.' },
} as const satisfies Record<string, { code: ErrorCode; message: string; hint: string }>;

export type CakeReason = keyof typeof CAKE_REASONS;
