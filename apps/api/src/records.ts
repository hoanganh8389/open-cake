// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — lớp mềm core.record.* trên bảng records (0103): kiểm data bằng recordDataSchema (CÙNG hàm form web và giả lập dùng,
//   R-REUSE-5), loại chưa đăng ký ⇒ CAKE_RECORD_TYPE_UNKNOWN, quyền chung core:records-* (route) + quyền RIÊNG của loại (spec.permissions) kiểm ở đây,
//   lưu trữ thay vì xoá (R-DATA-8). RLS theo đơn vị.
import { sql } from 'kysely';
import { recordDataSchema, recordTypeOf, type RecordRow } from '@open-cake/contracts';
import { cakeError, failure, newUlid, type Ctx, type Handler } from './runtime.js';

type Op = 'xem' | 'lap' | 'sua' | 'xoa';
const specOf = (ctx: Ctx, type: string, op: Op) => {
  const spec = recordTypeOf(type);
  if (!spec) throw cakeError('CAKE_RECORD_TYPE_UNKNOWN');
  if (!ctx.can(spec.permissions[op])) throw failure('FORBIDDEN', `Bạn chưa có quyền ${spec.permissions[op]} (${spec.label}).`);
  return spec;
};
const checkData = (spec: NonNullable<ReturnType<typeof recordTypeOf>>, data: unknown) => {
  const r = recordDataSchema(spec).safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    throw failure('VALIDATION_ERROR', i?.message ?? 'Dữ liệu không hợp lệ.', { field: i?.path.join('.') });
  }
  const out = r.data as Record<string, unknown>;
  return { data: out, title: String(out[spec.titleField] ?? '').slice(0, 200) };
};

type Row = { record_id: string; type: string; title: string; status: 'active' | 'archived'; data: Record<string, unknown>; updated_at: Date; updated_by: string | null };
const view = (r: Row): RecordRow => ({ recordId: r.record_id, type: r.type, title: r.title, status: r.status, data: r.data, updatedAt: new Date(r.updated_at).toISOString(), updatedBy: r.updated_by ?? '' });
const COLS = sql`record_id, type, title, status, data, updated_at, updated_by::text AS updated_by`;
async function one(ctx: Ctx, recordId: string): Promise<Row> {
  const r = (await sql<Row>`SELECT ${COLS} FROM records WHERE tenant_id = ${ctx.tenantId} AND record_id = ${recordId}`.execute(ctx.tx)).rows[0];
  if (!r) throw failure('NOT_FOUND', 'Không tìm thấy bản ghi.');
  return r;
}

export const recordHandlers: Record<string, Handler> = {
  'core.record.list': async (ctx, i) => {
    specOf(ctx, i.type, 'xem');
    const q = String(i.q ?? '').trim();
    const r = await sql<Row>`SELECT ${COLS} FROM records WHERE tenant_id = ${ctx.tenantId} AND type = ${i.type}
      ${i.includeArchived ? sql`` : sql`AND status = 'active'`} ${q ? sql`AND title ILIKE ${`%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`}` : sql``}
      ORDER BY updated_at DESC LIMIT 500`.execute(ctx.tx);
    return r.rows.map(view);
  },
  'core.record.create': async (ctx, i) => {
    const spec = specOf(ctx, i.type, 'lap');
    const { data, title } = checkData(spec, i.data);
    const r = await sql<Row>`INSERT INTO records (record_id, tenant_id, type, type_version, title, data, created_by, updated_by)
      VALUES (${newUlid()}, ${ctx.tenantId}, ${spec.key}, ${spec.version}, ${title}, ${JSON.stringify(data)}::jsonb, ${ctx.userId}, ${ctx.userId}) RETURNING ${COLS}`.execute(ctx.tx);
    return view(r.rows[0]!);
  },
  'core.record.update': async (ctx, i) => {
    const cur = await one(ctx, i.recordId);
    const spec = specOf(ctx, cur.type, 'sua');
    if (cur.status === 'archived') throw failure('CONFLICT', 'Bản ghi đang lưu trữ — khôi phục trước khi sửa.');
    const { data, title } = checkData(spec, i.data);
    const r = await sql<Row>`UPDATE records SET data = ${JSON.stringify(data)}::jsonb, title = ${title}, type_version = ${spec.version}, updated_at = now(), updated_by = ${ctx.userId}
      WHERE tenant_id = ${ctx.tenantId} AND record_id = ${i.recordId} RETURNING ${COLS}`.execute(ctx.tx);
    return view(r.rows[0]!);
  },
  'core.record.archive': async (ctx, i) => {
    const cur = await one(ctx, i.recordId);
    specOf(ctx, cur.type, 'xoa');
    const r = await sql<Row>`UPDATE records SET status = ${i.archived ? 'archived' : 'active'}, archived_at = ${i.archived ? sql`now()` : null}, updated_at = now(), updated_by = ${ctx.userId}
      WHERE tenant_id = ${ctx.tenantId} AND record_id = ${i.recordId} RETURNING ${COLS}`.execute(ctx.tx);
    return view(r.rows[0]!);
  },
};
