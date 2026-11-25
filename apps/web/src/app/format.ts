// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — định dạng ngày giờ theo giờ Việt Nam (dữ liệu trên dây là ISO có múi giờ).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { t } from '../i18n/index.js';

const TZ = 'Asia/Ho_Chi_Minh';
export const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: TZ }).format(new Date(iso));
export const ddmm = (iso: string) => part(iso, { day: '2-digit', month: '2-digit' }); // 24/11 (en-GB luôn dùng dấu /)
export const ddmmyyyy = (isoDate: string) => { const [y, m, d] = isoDate.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const when = (iso: string) => `${ddmm(iso)} ${hhmm(iso)}`;
export const bytes = (n?: number) => (n === undefined ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(2)} KB`);
export const vnd = (n: number) => `${n.toLocaleString('vi-VN')}${t.app.money.suffix}`; // [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — tiền VNĐ, dùng chung danh mục + chat
