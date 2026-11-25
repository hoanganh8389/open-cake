// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 12:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: MỌI chữ hiển thị của web nằm ở đây theo khoá. Không thư viện: từ điển TypeScript `as const`
//   ⇒ thiếu / sai khoá là lỗi biên dịch. Chữ có dữ liệu là HÀM (`t.inbox.searchIn(label)`), không ghép chuỗi ở màn, không dangerouslySetInnerHTML.
//   Một tệp mỗi nhóm màn (vi/*.ts). Thêm ngôn ngữ sau: cùng hình dạng `Dict`, chọn lúc khởi động. Test chặn: apps/web/test/i18n.test.ts.
import { app } from './vi/app.js';
import { catalog } from './vi/catalog.js';
import { inbox } from './vi/inbox.js';
import { staff } from './vi/staff.js';
import { orders } from './vi/orders.js'; // [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010

export const t = { app, inbox, catalog, staff, orders } as const;
export type Dict = typeof t;
