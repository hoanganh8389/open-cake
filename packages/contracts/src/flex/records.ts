// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: bản ghi lớp mềm (record_type + records, ≈ custom post type) — 4 action core.record.*
//   và recordDataSchema(spec): dựng zod từ khai báo trường; máy chủ kiểm và form tự sinh dùng CÙNG một hàm (R-REUSE-5).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';
import { CAKE_RECORD_TYPES, type FieldSpec, type RecordTypeSpec } from './registry.js';

const fieldSchema = (f: FieldSpec): z.ZodTypeAny => {
  const max = f.max;
  switch (f.type) {
    case 'string': return z.string().trim().min(f.required ? 1 : 0, `${f.label} không được trống`).max(max ?? 200);
    case 'text': return z.string().trim().min(f.required ? 1 : 0, `${f.label} không được trống`).max(max ?? 5000);
    case 'int': return z.coerce.number().int(`${f.label} phải là số nguyên`);
    case 'bool': return z.boolean();
    case 'date': return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${f.label} dạng YYYY-MM-DD`);
    case 'enum': return z.enum(f.options as [string, ...string[]], { errorMap: () => ({ message: `${f.label}: chọn một giá trị trong danh sách` }) });
    case 'string[]': return z.array(z.string().trim().min(1)).max(50);
    case 'json': return z.unknown();
  }
};

/** Schema của `data` cho một record_type — trường không bắt buộc được bỏ trống; trường lạ bị từ chối. */
export function recordDataSchema(spec: RecordTypeSpec) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of spec.fields) shape[f.key] = f.required ? fieldSchema(f) : fieldSchema(f).optional().or(z.literal('').transform(() => undefined));
  return z.object(shape).strict();
}

export const recordTypeOf = (key: string): RecordTypeSpec | undefined => CAKE_RECORD_TYPES.find((r) => r.key === key);

const RecordTypeKey = z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
export const RecordSchema = z.object({
  recordId: z.string(),
  type: RecordTypeKey,
  title: z.string(),
  status: z.enum(['active', 'archived']),
  data: z.record(z.unknown()),
  updatedAt: z.string().datetime({ offset: true }),
  updatedBy: z.string(),
});
export type RecordRow = z.infer<typeof RecordSchema>;

// Quyền chung core:records-*; máy chủ kiểm thêm quyền riêng của loại (spec.permissions) — PHASE-004.
export const recordList = defineActionSpec({
  id: 'core.record.list', capability: 'cake.flex', title: 'Danh sách bản ghi theo loại', kind: 'query',
  input: z.object({ type: RecordTypeKey, q: z.string().max(100).optional(), includeArchived: z.boolean().default(false) }),
  output: z.array(RecordSchema), permission: 'core:records-xem', risk: 'read', expose: { rest: 'GET /api/v1/records', mcp: 'read', ui: true },
});
export const recordCreate = defineActionSpec({
  id: 'core.record.create', capability: 'cake.flex', title: 'Tạo bản ghi', kind: 'command',
  input: z.object({ type: RecordTypeKey, data: z.record(z.unknown()) }), output: RecordSchema,
  permission: 'core:records-lap', risk: 'low', idempotent: true, emits: ['bizcity.core.record.created'], reasons: ['CAKE_RECORD_TYPE_UNKNOWN'],
  expose: { rest: 'POST /api/v1/records', ui: true },
});
export const recordUpdate = defineActionSpec({
  id: 'core.record.update', capability: 'cake.flex', title: 'Sửa bản ghi', kind: 'command',
  input: z.object({ recordId: z.string(), data: z.record(z.unknown()) }), output: RecordSchema,
  permission: 'core:records-sua', risk: 'low', idempotent: true, emits: ['bizcity.core.record.updated'],
  expose: { rest: 'PATCH /api/v1/records/:recordId', ui: true },
});
export const recordArchive = defineActionSpec({
  id: 'core.record.archive', capability: 'cake.flex', title: 'Lưu trữ bản ghi (không xoá cứng — R-DATA-8)', kind: 'command',
  input: z.object({ recordId: z.string(), archived: z.boolean().default(true) }), output: RecordSchema,
  permission: 'core:records-xoa', risk: 'low', idempotent: true, emits: ['bizcity.core.record.archived'],
  expose: { rest: 'POST /api/v1/records/:recordId/archive', ui: true },
});

export const FLEX_ACTIONS = [recordList, recordCreate, recordUpdate, recordArchive] as const;
