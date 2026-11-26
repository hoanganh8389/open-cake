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
  CAKE_CATALOG_READONLY: { code: 'CONFLICT', message: 'Danh mục đang lấy từ Kế Toán: cột này chỉ sửa ở Kế Toán.', hint: 'Sửa ở Open Kế Toán, hoặc chuyển nguồn danh mục về "local" ở Cài đặt.' },
  CAKE_SKU_TAKEN: { code: 'CONFLICT', message: 'Mã hàng đã có (kể cả hàng đã xoá).', hint: 'Chọn mã khác (H-2).' },
  CAKE_ITEM_NAME_TAKEN: { code: 'CONFLICT', message: 'Tên hàng đã có.', hint: 'Tên hàng phải duy nhất, không phân biệt hoa thường (H-7).' },
  // [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — action có hợp đồng nhưng máy chủ chưa làm (giao diện đang dùng bộ giả lập cho màn này).
  CAKE_NOT_ON_SERVER: { code: 'CAPABILITY_MISSING', message: 'Máy chủ chưa có chức năng này.', hint: 'Màn này đang chạy bằng bộ giả lập; chức năng sẽ có ở phase kế tiếp.' },
  // [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — luồng đơn xuyên app (bizcity_order_flow@1).
  CAKE_ORDER_LOCKED: { code: 'CONFLICT', message: 'Yêu cầu đặt hàng đã sang bước không sửa / huỷ được ở Open CRM.', hint: 'Cửa hàng đã xác nhận: sửa hoặc huỷ ở Open POS.' },
  CAKE_ITEM_NO_PRICE: { code: 'VALIDATION_ERROR', message: 'Mặt hàng chưa có giá bán của công ty.', hint: 'Đặt giá ở Hàng hoá (hoặc ở Kế Toán) rồi thêm lại.' },
  CAKE_POS_NOT_LINKED: { code: 'CONFLICT', message: 'Chưa kết nối cửa hàng (Open POS).', hint: 'Vào Cài đặt › Kết nối cửa hàng, dán địa chỉ, khoá và bí mật ký.' },
  CAKE_KETOAN_REQUIRED: { code: 'CONFLICT', message: 'Gửi đơn sang cửa hàng cần nối Kế Toán trước.', hint: 'Đổi Nguồn danh mục sang "Lấy từ Open Kế Toán" để mã hàng hai bên trùng nhau.' },
  CAKE_PARTNER_FAILED: { code: 'CONFLICT', message: 'Kế Toán chưa nhận được khách công nợ.', hint: 'Kiểm tra kết nối Kế Toán (địa chỉ, khoá có quyền ghi danh mục) rồi bấm Tạo lại — gửi lại không tạo trùng.' },
  CAKE_RECORD_TYPE_UNKNOWN: { code: 'VALIDATION_ERROR', message: 'Loại bản ghi chưa đăng ký.', hint: 'Thêm record_type vào registry trước khi ghi.' },
} as const satisfies Record<string, { code: ErrorCode; message: string; hint: string }>;

export type CakeReason = keyof typeof CAKE_REASONS;
