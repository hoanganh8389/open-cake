// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 10:23 PM Johnny Chu - Chu Hoàng Anh] KN K6 — cấp khoá nối nội bộ lúc cài (25-KET-NOI-KENH §4: Tự cài chạy sẵn, ① ② Đạt sẵn, không phải dán gì).
//   Job db-migrate chạy tệp này khi CAKE_CONNECTOR_URL có giá trị: đơn vị CHƯA có cách kết nối ⇒ đặt Tự cài trỏ vào máy kết nối trong compose + sinh khoá / bí mật (mã hoá trong
//   channel_links) và ghi CAKE_CONNECTOR_KEY / CAKE_CONNECTOR_SECRET vào tệp trên volume dùng chung để máy kết nối nạp. Chạy lại an toàn: đơn vị đã chọn Hub ⇒ không đổi; mất volume ⇒ ghi lại
//   tệp từ khoá đã lưu (giải mã bằng CAKE_SECRET_KEY). Tệp 0600; không in khoá ra log.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { sql } from 'kysely';
import { db } from '@bizcity/platform/db/client';
import './db-types.js';
import { issueConnectorKey } from './care/channel-link.js';
import { open } from './orders/clients.js';

export type LinkResult = 'created' | 'rewritten' | 'skipped-hub';

export async function provisionConnectorLink(o: { slug: string; url: string; file: string }): Promise<LinkResult> {
  const { rows: [t] } = await sql<{ id: string }>`SELECT id::text AS id FROM tenants WHERE code = ${o.slug}`.execute(db);
  if (!t) throw new Error(`Không có đơn vị "${o.slug}" — chạy sau migrate / seed.`);
  const cur = await db.selectFrom('channel_links').selectAll().where('tenant_id', '=', t.id).executeTakeFirst();
  if (cur?.mode === 'hub') return 'skipped-hub';
  let key: string, secret: string, res: LinkResult;
  if (cur?.key_sealed && cur.secret_sealed) { key = open(cur.key_sealed); secret = open(cur.secret_sealed); res = 'rewritten'; }
  else {
    const k = issueConnectorKey(t.id);
    ({ key, secret } = k.issued); res = 'created';
    const v = { mode: 'self', connector_url: o.url.replace(/\/+$/, ''), updated_by: 'setup', updated_at: new Date(), ...k.row };
    if (cur) await db.updateTable('channel_links').set(v as never).where('tenant_id', '=', t.id).execute();
    else await db.insertInto('channel_links').values({ ...v, tenant_id: t.id } as never).execute();
  }
  mkdirSync(dirname(o.file), { recursive: true });
  writeFileSync(o.file, `CAKE_CONNECTOR_KEY=${key}\nCAKE_CONNECTOR_SECRET=${secret}\n`, { mode: 0o600 });
  return res;
}

if (process.argv[1]?.endsWith('connector-link.js')) {
  const url = process.env.CAKE_CONNECTOR_URL ?? '';
  if (!url) console.log('CAKE_CONNECTOR_URL trống — bỏ qua cấp khoá máy kết nối.');
  else console.log(`Máy kết nối: ${await provisionConnectorLink({ slug: process.env.CAKE_TENANT ?? 'hoa-mai', url, file: process.env.CAKE_CONNECTOR_LINK_FILE ?? '/link/connector.env' })}`);
  await db.destroy();
}
