// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6/8 — đọc dùng chung cho màn Hàng hoá, Gửi giá trong chat, Cài đặt: nguồn danh mục + giá công ty theo hàng.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { useMemo } from 'react';
import { catalogPriceList, catalogSourceGet, type PriceRow } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { t } from '../../i18n/index.js';

export const COMPANY = 'CONGTY';
export const TAX_LABEL: Record<string, string> = t.catalog.tax;

/** Nguồn danh mục của đơn vị; readonly = Kế Toán giữ cột kế toán (giao diện là lớp thứ hai, máy chủ chặn bằng cổng ghi). */
export function useCatalogSource() {
  const q = useQueryAction(catalogSourceGet, {});
  return { ...q, readonly: q.data?.catalogSource === 'ketoan' };
}

/** Giá công ty theo ĐVT bán chính, tra theo itemId — một lần gọi cho cả bảng (không gọi từng hàng). */
export function useCompanyPrices(enabled = true) {
  const q = useQueryAction(catalogPriceList, { priceListCode: COMPANY, page: 1, pageSize: 200 }, { enabled });
  const byItem = useMemo(() => new Map<string, PriceRow>((q.data ?? []).filter((p) => p.isDefaultUnit).map((p) => [p.itemId, p])), [q.data]);
  return { ...q, byItem };
}
