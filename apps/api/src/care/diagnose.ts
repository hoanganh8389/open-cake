// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 02:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 S005-7 — chẩn đoán L3 trên DỮ LIỆU THẬT của một đơn vị: SC-CAKE-2..5 (20-DATA-SPINE §kiểm). SC-CAKE-1/6/7/8 là kiểm tĩnh ở tests/conformance/selfcheck.mjs.
//   CHỈ ĐỌC (không sửa gì); GET /api/v1/system/diagnostics (quyền reports:read), kết quả theo từng phép kiểm: số phát hiện + tối đa 20 mẫu (mã định danh, không nội dung khách).
//   SC-CAKE-5 dùng ĐÚNG computeState của kernel (cùng hàm khi ghi) ⇒ lệch = state bị sửa ngoài kernel hoặc bug; so sánh bỏ rev (sameState).
import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { authOf, requirePermission } from '@bizcity/platform/core/auth';
import { db } from '@bizcity/platform/db/client';
import { computeState, sameState } from '@open-cake/care-kernel';
import { PgCareRepo } from './pg-care-repo.js';

export type Check = { id: string; title: string; ok: boolean; count: number; sample: string[]; note?: string };
const SAMPLE = 20;
const STATE_LIMIT = 5000;

export async function diagnoseCare(tenantId: string): Promise<{ ok: boolean; checks: Check[] }> {
  return db.transaction().execute(async (tx) => {
    const rows = async (q: ReturnType<typeof sql<{ ref: string }>>) => (await q.execute(tx)).rows.map((r) => r.ref);
    const mk = (id: string, title: string, found: string[], note?: string): Check => ({ id, title, ok: found.length === 0, count: found.length, sample: found.slice(0, SAMPLE), ...(note ? { note } : {}) });

    // SC-CAKE-2: mọi dòng sổ có sự kiện; mọi dòng đảo trỏ dòng cùng khách
    const noEvent = await rows(sql<{ ref: string }>`SELECT l.touch_id::text AS ref FROM touch_ledger l LEFT JOIN touch_events e ON e.event_id = l.event_id WHERE l.tenant_id = ${tenantId} AND e.event_id IS NULL`);
    const crossReversal = await rows(sql<{ ref: string }>`SELECT r.touch_id::text AS ref FROM touch_ledger r JOIN touch_ledger o ON o.touch_id = r.reverses_id WHERE r.tenant_id = ${tenantId} AND o.contact_id <> r.contact_id`);
    // SC-CAKE-3: không hai danh tính hiệu lực cùng (kênh, phạm vi, mã ngoài) — chỉ mục contact_identities_live đã chặn; kiểm lại phòng chỉ mục bị gỡ
    const dupIdentity = await rows(sql<{ ref: string }>`SELECT channel || '|' || scope || '|' || count(*) AS ref FROM contact_identities WHERE tenant_id = ${tenantId} AND valid_to IS NULL GROUP BY channel, scope, external_id HAVING count(*) > 1`);
    // SC-CAKE-4: không MERGE nào bằng chứng là tên (R-CAKE-ID-2)
    const nameMerge = await rows(sql<{ ref: string }>`SELECT touch_id::text AS ref FROM touch_ledger WHERE tenant_id = ${tenantId} AND kind = 'merge' AND dims->>'proof' = 'name'`);
    // SC-CAKE-5: contact_state = dựng lại từ sổ
    const repo = new PgCareRepo(tenantId, tx);
    const contacts = (await sql<{ contact_id: string }>`SELECT contact_id FROM contact_state WHERE tenant_id = ${tenantId} ORDER BY contact_id LIMIT ${STATE_LIMIT + 1}`.execute(tx)).rows.map((r) => r.contact_id);
    const drift: string[] = [];
    for (const id of contacts.slice(0, STATE_LIMIT)) {
      if (!sameState(await repo.getState(id), await computeState(repo, id, await repo.mergedFrom(id)))) drift.push(id);
    }
    const checks = [
      mk('SC-CAKE-2', 'mọi dòng sổ có sự kiện; mọi dòng đảo trỏ dòng cùng khách', [...noEvent.map((x) => `không sự kiện: ${x}`), ...crossReversal.map((x) => `đảo khác khách: ${x}`)]),
      mk('SC-CAKE-3', 'không hai danh tính hiệu lực cùng (kênh, phạm vi, mã ngoài)', dupIdentity),
      mk('SC-CAKE-4', 'không MERGE nào có bằng chứng là tên', nameMerge),
      mk('SC-CAKE-5', 'contact_state khớp dựng lại từ sổ (bỏ rev)', drift, contacts.length > STATE_LIMIT ? `chỉ kiểm ${STATE_LIMIT} khách đầu` : undefined),
    ];
    return { ok: checks.every((c) => c.ok), checks };
  });
}

export function registerDiagnostics(app: FastifyInstance): void {
  app.get('/api/v1/system/diagnostics', { preHandler: requirePermission('reports:read') }, async (req) => ({ ok: true, data: await diagnoseCare(authOf(req).tenantId) }));
}
