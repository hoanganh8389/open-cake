// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 S005-1 — CÙNG bộ kịch bản care-kernel (scenarios.ts) chạy trên PgCareRepo + Postgres thật:
//   một cửa, phát lại, phiên bản, quay lui, chỉ-thêm (trigger CSDL thật), ghép / tách, dựng lại trạng thái. Mỗi ca một đơn vị mới (không dựng lại CSDL).
//   Chạy: TEST_DATABASE_URL=postgres://… npm test. Không có ⇒ bỏ qua.
import { beforeAll, describe } from 'vitest';
import { ACCOUNTS, defineKernelSuite, testClockAndIds } from '../../../packages/care-kernel/test/scenarios.js';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('PgCareRepo', () => {
  let seq = 0;
  beforeAll(async () => { await freshDb(url!, 'care'); }, 60_000);

  defineKernelSuite('PgCareRepo', async () => {
    const { db } = await import('@bizcity/platform/db/client');
    const { sql } = await import('kysely');
    const { PgCareRepo, toLedger } = await import('../src/care/pg-care-repo.js');
    const n = ++seq;
    const { rows: [t] } = await sql<{ id: string }>`INSERT INTO tenants (code, name) VALUES (${`kiem-${n}`}, ${`Đơn vị kiểm ${n}`}) RETURNING id::text AS id`.execute(db);
    const tenantId = t!.id;
    for (const a of ACCOUNTS) {
      await db.insertInto('channel_accounts').values({ channel_account_id: `${a.channelAccountId}-${n}`, tenant_id: tenantId, channel: a.channel, kind: a.kind, external_account_id: a.externalAccountId, label: a.label, status: a.status, owner_user_id: null, cell_ref: null, connected_at: null, tested_at: null }).execute();
    }
    const repo = new PgCareRepo(tenantId, db);
    return {
      deps: { repo, ...testClockAndIds(n * 1_000_000) },
      probe: {
        ledger: async () => (await db.selectFrom('touch_ledger').selectAll().where('tenant_id', '=', tenantId).orderBy('touch_id').execute()).map(toLedger),
        events: async () => Number((await db.selectFrom('touch_events').select((e) => e.fn.countAll<string>().as('n')).where('tenant_id', '=', tenantId).executeTakeFirstOrThrow()).n),
        versions: async () => Number((await db.selectFrom('touch_event_versions').select((e) => e.fn.countAll<string>().as('n')).where('tenant_id', '=', tenantId).executeTakeFirstOrThrow()).n),
        contactIds: async () => (await db.selectFrom('contacts').select('contact_id').where('tenant_id', '=', tenantId).execute()).map((r) => r.contact_id),
        mutateLedger: async (r) => { await sql`UPDATE touch_ledger SET qty = 5 WHERE touch_id = ${r.touchId}`.execute(db); }, // trigger cake_append_only chặn
      },
    };
  }, { replays: 50, timeoutMs: 60_000 }); // CSDL trong Docker trên Windows: mỗi lần phát lại là một giao dịch nhiều câu
});
