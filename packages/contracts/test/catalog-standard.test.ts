// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — chuẩn hàng hoá H-* nằm trong hợp đồng: dữ liệu độc lập vẫn ánh xạ được sang open-ketoan.
import { describe, expect, it } from 'vitest';
import { ALL_ACTIONS, ItemUnitsSchema, SkuSchema, TaxCodeSchema, catalogItemCreate, catalogWriteGate, itemWarnings, skuShapeProblem } from '../src/index.js';

const ok = (r: { success: boolean }) => r.success;
describe('chuẩn mã / tên / ĐVT / thuế (H-1…H-13)', () => {
  it('SKU tự viết hoa, chỉ [0-9A-Z] (H-1)', () => {
    expect(SkuSchema.parse(' ab12 ')).toBe('AB12');
    expect(ok(SkuSchema.safeParse('VAY HOA'))).toBe(false);
    expect(ok(SkuSchema.safeParse('VÁY'))).toBe(false);
  });
  it('mã chính không kết thúc bằng chữ; mã con = cha + 1–2 ký tự (H-3…H-5)', () => {
    expect(skuShapeProblem('101010001', null)).toBeNull();
    expect(skuShapeProblem('Q10101000', null)).toBeNull();
    expect(skuShapeProblem('10101000A', null)).toMatch(/H-3/);
    expect(skuShapeProblem('1010100011', null)).toMatch(/H-4/);
    expect(skuShapeProblem('101010001M', '101010001')).toBeNull();
    expect(skuShapeProblem('101010001ABC', '101010001')).toMatch(/H-5/);
  });
  it('đúng một ĐVT tỉ lệ 1, không trùng, ≤ 1 ĐVT bán chính (H-8)', () => {
    expect(ok(ItemUnitsSchema.safeParse([{ unit: 'Cái', ratio: 1 }, { unit: 'Hộp', ratio: 10 }]))).toBe(true);
    expect(ok(ItemUnitsSchema.safeParse([{ unit: 'Cái', ratio: 2 }]))).toBe(false);
    expect(ok(ItemUnitsSchema.safeParse([{ unit: 'Cái', ratio: 1 }, { unit: 'cái', ratio: 1 }]))).toBe(false);
  });
  it('thuế: mã cũ R08 tự đổi thành 8; mã lạ bị chặn (H-11)', () => {
    expect(TaxCodeSchema.parse('R08')).toBe('8');
    expect(TaxCodeSchema.parse('kct')).toBe('KCT');
    expect(ok(TaxCodeSchema.safeParse('15'))).toBe(false);
  });
  it('tạo hàng: tên > 50 ký tự và mã sai khuôn bị chặn ở cửa (H-7, H-3)', () => {
    const base = { sku: '101010009', name: 'Váy', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' };
    expect(ok(catalogItemCreate.input.safeParse(base))).toBe(true);
    expect(ok(catalogItemCreate.input.safeParse({ ...base, name: 'x'.repeat(51) }))).toBe(false);
    expect(ok(catalogItemCreate.input.safeParse({ ...base, sku: '10101000A' }))).toBe(false);
  });
  it('cảnh báo mức W: ĐVT ngoài 40 tên chuẩn, thuế 8% sắp hết, thiếu giá công ty', () => {
    const w = itemWarnings({ units: [{ unit: 'cái' }], taxCode: '8', categoryLevel: 3, noSale: false, hasCompanyPrice: false, today: '2026-12-05' });
    expect(w.map((x) => x.code).sort()).toEqual(['CAT-NO-COMPANY-PRICE', 'CAT-TAX-8-EXPIRING', 'CAT-UNIT-NONSTD']);
  });
});

describe('cổng ghi duy nhất theo nguồn danh mục (R-OKT-CONN-4)', () => {
  it('local: ghi mọi cột; ketoan: chặn cột kế toán, cho cột vận hành', () => {
    expect(catalogWriteGate('local', ['name', 'taxCode'])).toEqual({ ok: true });
    expect(catalogWriteGate('ketoan', ['name', 'taxCode', 'displayName'])).toEqual({ ok: false, blocked: ['name', 'taxCode'] });
    expect(catalogWriteGate('ketoan', ['displayName', 'isSellableInCrm'])).toEqual({ ok: true });
  });
  it('danh mục app = 19 cake + 4 lớp mềm + 9 danh mục', () => expect(ALL_ACTIONS.length).toBe(32));
});
