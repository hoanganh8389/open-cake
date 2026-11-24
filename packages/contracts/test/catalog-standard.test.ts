// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:58 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — chuẩn hàng hoá H-* nằm trong hợp đồng: dữ liệu độc lập vẫn ánh xạ được sang open-ketoan.
import { describe, expect, it } from 'vitest';
import { ALL_ACTIONS, CAKE_META_KEYS, ITEM_LOCAL_META, ItemUnitsSchema, SkuSchema, TaxCodeSchema, catalogItemCreate, catalogWriteGate, itemRefOf, itemWarnings, skuShapeProblem } from '../src/index.js';

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
  it('local: ghi mọi cột; ketoan: chặn mọi cột kế toán, chỉ cho `local` (lớp mềm)', () => {
    expect(catalogWriteGate('local', ['name', 'taxCode'])).toEqual({ ok: true });
    expect(catalogWriteGate('ketoan', ['name', 'taxCode', 'local'])).toEqual({ ok: false, blocked: ['name', 'taxCode'] });
    expect(catalogWriteGate('ketoan', ['local'])).toEqual({ ok: true });
  });
  it('cột riêng của Cake là khoá lớp mềm đã đăng ký (R-SPINE-5, R-CANON-15)', () => {
    const keys = new Set(CAKE_META_KEYS.filter((m) => m.entityType === 'item').map((m) => m.key));
    for (const k of Object.values(ITEM_LOCAL_META)) expect(keys.has(k), k).toBe(true);
  });
  it('danh mục app = 19 cake + 4 lớp mềm + 9 danh mục', () => expect(ALL_ACTIONS.length).toBe(32));
});

// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — ItemRef trên dây theo bizcity_spine@1 §3.
describe('ItemRef trên dây (SPINE R-SPINE-1, R-SPINE-9)', () => {
  const base = { itemId: '01JDAP00000000000000000001', sku: '101010001' };
  const sync = { source: 'local' as const, extId: null, extVersion: null, extSyncedAt: null, pushStatus: 'local' as const, pushError: null };
  it('chưa gắn Kế Toán ⇒ khoá cục bộ + mã, KHÔNG có ô id', () => {
    const r = itemRefOf({ ...base, sync });
    expect(r).toEqual({ local: 'cake:item:01JDAP00000000000000000001', code: '101010001' });
    expect('id' in r).toBe(false);
    expect((r as { local: string }).local).toMatch(/^[a-z][a-z0-9-]*:[a-z][a-z0-9_-]*:[A-Za-z0-9_.-]{1,64}$/); // khuôn local_key của SPINE
  });
  it('đã gắn ⇒ chỉ id của chủ', () => expect(itemRefOf({ ...base, sync: { ...sync, source: 'ketoan', extId: '01JKT000000000000000000001' } })).toEqual({ id: '01JKT000000000000000000001' }));
});
