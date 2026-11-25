// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ tiếng Việt của ui-kit (gói riêng, không phụ thuộc từ điển của app):
//   chữ mặc định của thành phần, nhãn kênh, nhãn mẫu (khoá = tên nhãn là DỮ LIỆU), mẫu tên để vẽ avatar minh hoạ.

export const ui = {
  searchPlaceholder: 'Tìm kiếm…',
  close: 'Đóng',
  requestId: 'Mã tra cứu:',
} as const;

/** Nhãn chữ của từng kênh (enum kênh của hợp đồng). */
export const CHANNEL_LABEL_VI: Record<string, string> = {
  zalo_personal: 'Zalo cá nhân', zalo_oa: 'Zalo OA', facebook_personal: 'Facebook cá nhân', facebook_page: 'Fanpage',
  facebook_comment: 'Bình luận Facebook', facebook_group: 'Nhóm Facebook', phone: 'Điện thoại', email: 'Email', tax_code: 'Mã số thuế', bank_account: 'Tài khoản ngân hàng', web: 'Web',
};

/** Màu nhãn mẫu — khoá là TÊN NHÃN (dữ liệu record_type cake.label), giữ nguyên chữ. */
export const TAG_LOOK_VI: Record<string, { bg: string; ic: string }> = {
  'Đã chốt đơn': { bg: '#ef4444', ic: '✅' }, 'Đặt hàng': { bg: '#f97316', ic: '🛒' }, 'Khách VIP': { bg: '#f59e0b', ic: '⭐' },
  'Khách sỉ': { bg: '#a855f7', ic: '📦' }, 'Chờ phản hồi': { bg: '#0ea5e9', ic: '⏳' },
};

/** Mẫu tên để đoán giới tính cho avatar minh hoạ (chỉ trang trí, không lưu). */
export const FEMALE_NAME = /(chị|thị|vy|linh|chi|hương|thảo|lan|yến|mai|ngọc|hoa|my|anh thư|trang|hằng)/i;
export const MALE_NAME_EXCEPTIONS = /(anh khoa|đức anh|hải nam|gia bảo|thanh tùng|văn minh|quốc bảo|tuấn)/i;
