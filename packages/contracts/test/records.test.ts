// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: recordDataSchema dựng đúng luật từ khai báo trường; danh mục app gồm cả core.record.*.
import { describe, expect, it } from 'vitest';
import { ALL_ACTIONS, appCatalog, recordDataSchema, recordTypeOf } from '../src/index.js';

describe('recordDataSchema (R-REUSE-5: máy chủ và form dùng chung)', () => {
  const quick = recordTypeOf('cake.quick_reply')!;
  it('dữ liệu đúng qua; trường không bắt buộc bỏ trống được', () => {
    expect(recordDataSchema(quick).safeParse({ title: 'Chào', body: 'Dạ shop chào chị' }).success).toBe(true);
    expect(recordDataSchema(quick).safeParse({ title: 'Chào', shortcut: '', body: 'x' }).success).toBe(true);
  });
  it('thiếu trường bắt buộc / trường lạ / sai enum bị chặn với câu tiếng Việt', () => {
    const r = recordDataSchema(quick).safeParse({ title: '  ', body: 'x' });
    expect(r.success).toBe(false);
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('Tên không được trống');
    expect(recordDataSchema(quick).safeParse({ title: 'a', body: 'b', price: 1 }).success).toBe(false);
    expect(recordDataSchema(recordTypeOf('cake.label')!).safeParse({ name: 'x', tone: 'tim' }).success).toBe(false);
  });
});

describe('danh mục app', () => {
  it("action cake + lớp mềm + danh mục, không trùng id / route", () => {
    expect(ALL_ACTIONS.length).toBe(55); // [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — + 8 action nhân viên / vai
    expect(Object.keys(appCatalog)).toHaveLength(55);
  });
});
