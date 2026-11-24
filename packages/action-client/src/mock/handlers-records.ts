// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: handler giả lập lớp mềm core.record.* — kiểm data bằng recordDataSchema (cùng hàm máy chủ sẽ dùng),
//   loại chưa đăng ký ⇒ CAKE_RECORD_TYPE_UNKNOWN, lưu trữ thay vì xoá (R-DATA-8).
import { recordDataSchema, recordTypeOf, type RecordRow } from '@open-cake/contracts';
import { ApiError } from '../client.js';
import { byTimeDesc, iso, type Store } from './store.js';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- input đã qua zod ở adapter

const specOf = (type: string) => {
  const spec = recordTypeOf(type);
  if (!spec) throw ApiError.reason('CAKE_RECORD_TYPE_UNKNOWN');
  return spec;
};
const checkData = (type: string, data: unknown) => {
  const spec = specOf(type);
  const r = recordDataSchema(spec).safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new ApiError({ code: 'VALIDATION_ERROR', message: i?.message ?? 'Dữ liệu không hợp lệ.', field: i?.path.join('.') });
  }
  return { spec, data: r.data as Record<string, unknown> };
};
const find = (s: Store, id: string) => {
  const r = s.records.find((x) => x.recordId === id);
  if (!r) throw new ApiError({ code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi.' });
  return r;
};

export const recordHandlers: Record<string, (s: Store, input: Any) => unknown> = {
  'core.record.list': (s, i) => {
    specOf(i.type);
    const q = String(i.q ?? '').toLowerCase();
    return s.records
      .filter((r) => r.type === i.type && (i.includeArchived || r.status === 'active') && (!q || r.title.toLowerCase().includes(q)))
      .sort((a, b) => byTimeDesc(a.updatedAt, b.updatedAt));
  },
  'core.record.create': (s, i) => {
    const { spec, data } = checkData(i.type, i.data);
    const row: RecordRow = { recordId: `rec-${++s.seq}`, type: i.type, title: String(data[spec.titleField] ?? ''), status: 'active', data, updatedAt: iso(s.now()), updatedBy: '7' };
    s.records.push(row);
    return row;
  },
  'core.record.update': (s, i) => {
    const row = find(s, i.recordId);
    const { spec, data } = checkData(row.type, i.data);
    Object.assign(row, { data, title: String(data[spec.titleField] ?? ''), updatedAt: iso(s.now()), updatedBy: '7' });
    return row;
  },
  'core.record.archive': (s, i) => {
    const row = find(s, i.recordId);
    Object.assign(row, { status: i.archived ? 'archived' : 'active', updatedAt: iso(s.now()), updatedBy: '7' });
    return row;
  },
};
