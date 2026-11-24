// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — chuẩn hàng hoá dùng chung với open-pos / open-ketoan (open-pos-backend 16-CHUAN-HANG-HOA H-1…H-18):
//   luật mức E nằm trong schema (chặn); mức W trả về cảnh báo CAT-*; mức A tự sửa (viết hoa SKU, is_kct theo thuế). Lệch chuẩn này = không ánh xạ được sang Kế Toán.
import { z } from 'zod';

/** H-9: 40 tên ĐVT chuẩn của open-ketoan, đúng chữ hoa thường. */
export const UNIT_NAMES = [
  'Cái', 'Chiếc', 'Hộp', 'Lon', 'Chai', 'Gói', 'Túi', 'Bịch', 'Thùng', 'Lốc', 'Lốc_4', 'Lốc_6', 'Lốc_8', 'Vỉ', 'Hũ', 'Lọ', 'Tuýp', 'Bình', 'Can', 'Két',
  'Khay', 'Bao', 'Cuộn', 'Tờ', 'Quyển', 'Bộ', 'Đôi', 'Cặp', 'Tá', 'Kg', 'Gam', 'Lít', 'Ml', 'Mét', 'Set', 'Combo', 'Suất', 'Ống', 'Thanh', 'Miếng',
] as const;

/** H-11: thuế bán. Mã cũ R00/R05/R08/R10 tự đổi (A). */
export const TAX_CODES = ['KCT', '0', '5', '8', '10', 'KKKN'] as const;
const LEGACY_TAX: Record<string, string> = { R00: '0', R05: '5', R08: '8', R10: '10' };
export const TaxCodeSchema = z.preprocess((v) => (typeof v === 'string' ? LEGACY_TAX[v.toUpperCase()] ?? v.toUpperCase() : v), z.enum(TAX_CODES));

/** H-1: 1–64 ký tự [0-9A-Z], tự viết hoa (A). H-2 (duy nhất kể cả đã xoá) kiểm ở kho. */
export const SkuSchema = z.preprocess((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v), z.string().regex(/^[0-9A-Z]{1,64}$/, 'Mã hàng chỉ gồm chữ in hoa và số, 1–64 ký tự (H-1)'));

/** H-3 / H-4 / H-5: khuôn mã chính, mã con = cha + ≤ 2 ký tự. Trả lỗi hoặc null. */
export function skuShapeProblem(sku: string, parentSku: string | null): string | null {
  if (parentSku) {
    if (!sku.startsWith(parentSku) || sku.length - parentSku.length < 1 || sku.length - parentSku.length > 2) return 'Mã con = mã cha + 1–2 ký tự ở cuối (H-5)';
    return null;
  }
  if (/^\d{10,12}$/.test(sku)) return 'Mã toàn số 10–12 chữ số chỉ dùng cho mã con của mã 9 số (H-4)';
  if (/[A-Z]$/.test(sku) && !/^[A-Z]\d{8}$/.test(sku)) return 'Mã chính không kết thúc bằng chữ (H-3)';
  return null;
}

/** H-7: tên bắt buộc, ≤ 50 ký tự sau khi gộp khoảng trắng. */
export const ItemNameSchema = z.preprocess((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v), z.string().min(1, 'Tên hàng bắt buộc (H-7)').max(50, 'Tên hàng tối đa 50 ký tự (H-7)'));

/** H-14: giá gồm VAT, 0 ≤ giá ≤ 10^13, tối đa 2 số lẻ. */
export const PriceSchema = z.number().min(0).max(1e13).refine((n) => Math.round(n * 100) === n * 100, 'Giá tối đa 2 số lẻ (H-14)');

/** H-8: đúng một ĐVT tỉ lệ 1, ≤ 10 ĐVT, không trùng tên, ≤ 1 ĐVT bán chính. */
export const ItemUnitInputSchema = z.object({
  unit: z.string().min(1).max(32),
  ratio: z.number().positive('Tỉ lệ ĐVT phải > 0 (H-8)'),
  isDefaultSale: z.boolean().default(false),
  weightKg: z.number().min(0).nullable().default(null),
});
export const ItemUnitsSchema = z.array(ItemUnitInputSchema).min(1).max(10, 'Tối đa 10 ĐVT (H-8)').superRefine((us, ctx) => {
  if (us.filter((u) => u.ratio === 1).length !== 1) ctx.addIssue({ code: 'custom', message: 'Phải có đúng một ĐVT tỉ lệ 1 (H-8)' });
  if (new Set(us.map((u) => u.unit.toLowerCase())).size !== us.length) ctx.addIssue({ code: 'custom', message: 'Tên ĐVT không được trùng (H-8)' });
  if (us.filter((u) => u.isDefaultSale).length > 1) ctx.addIssue({ code: 'custom', message: 'Tối đa một ĐVT bán chính (H-8)' });
});

/** Cảnh báo mức W — không chặn ở chế độ độc lập, chặn khi đẩy sang Kế Toán. */
export const CatalogWarningSchema = z.object({ code: z.string().regex(/^CAT-[A-Z0-9-]+$/), message: z.string(), rule: z.string() });
export type CatalogWarning = z.infer<typeof CatalogWarningSchema>;

export function itemWarnings(i: { units: { unit: string }[]; taxCode: string; categoryLevel: number | null; noSale: boolean; hasCompanyPrice: boolean; today: string }): CatalogWarning[] {
  const w: CatalogWarning[] = [];
  for (const u of i.units) if (!(UNIT_NAMES as readonly string[]).includes(u.unit)) w.push({ code: 'CAT-UNIT-NONSTD', message: `ĐVT "${u.unit}" không có trong 40 tên chuẩn — giá có thể bị bỏ qua khi đẩy sang Kế Toán`, rule: 'H-9' });
  if (i.taxCode === '8' && i.today >= '2026-12-01') w.push({ code: 'CAT-TAX-8-EXPIRING', message: 'Thuế 8% chỉ dùng tới 31/12/2026', rule: 'H-12' });
  if (i.categoryLevel !== 3) w.push({ code: 'CAT-CATEGORY-LEVEL', message: 'Mã chính nên thuộc nhóm hàng cấp 3', rule: 'H-10' });
  if (!i.noSale && !i.hasCompanyPrice) w.push({ code: 'CAT-NO-COMPANY-PRICE', message: 'Hàng đang bán chưa có giá ở bảng giá công ty', rule: 'H-15' });
  return w;
}
