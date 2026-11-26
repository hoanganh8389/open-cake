// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 10:23 PM Johnny Chu - Chu Hoàng Anh] KN K6 — cấp khoá nối nội bộ lúc cài trên Postgres thật: lần đầu ⇒ Tự cài + tệp 0600 có khoá / bí mật khớp CSDL;
//   chạy lại ⇒ khoá không đổi; mất tệp ⇒ ghi lại cùng khoá; đơn vị đã chọn Hub ⇒ không đổi gì; khoá cấp ra qua được cổng nhận (connectorAuth).
import { mkdtempSync, readFileSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDb } from './fresh-db.js';

const url = process.env.TEST_DATABASE_URL;
const parse = (f: string) => Object.fromEntries(readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2))) as Record<string, string>;

describe.skipIf(!url)('cấp khoá máy kết nối lúc cài (K6)', () => {
  let dir = '', file = '';
  let prov: typeof import('../src/connector-link.js').provisionConnectorLink;
  const o = () => ({ slug: 'hoa-mai', url: 'http://cake-connector:3901/', file });
  beforeAll(async () => {
    process.env.CAKE_SECRET_KEY = 'khoa-ma-hoa-thu-0123456789abcdef0123';
    await freshDb(url!, 'cap_khoa_ket_noi');
    await (await import('../src/seed-dev.js')).seedDev('hoa-mai');
    prov = (await import('../src/connector-link.js')).provisionConnectorLink;
    dir = mkdtempSync(join(tmpdir(), 'cake-link-')); file = join(dir, 'sub', 'connector.env');
  }, 90_000);
  afterAll(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.CAKE_SECRET_KEY; });

  it('lần đầu ⇒ Tự cài + tệp khoá; chạy lại không đổi khoá; mất tệp ⇒ ghi lại cùng khoá; khoá qua cổng nhận', async () => {
    expect(await prov(o())).toBe('created');
    const a = parse(file);
    expect(a.CAKE_CONNECTOR_KEY).toMatch(/^ckn\.\d+\.[A-Za-z0-9_-]{20,}$/);
    expect(a.CAKE_CONNECTOR_SECRET!.length).toBeGreaterThanOrEqual(32);
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
    const { db } = await import('@bizcity/platform/db/client');
    const row = await db.selectFrom('channel_links').selectAll().executeTakeFirstOrThrow();
    expect(row).toMatchObject({ mode: 'self', connector_url: 'http://cake-connector:3901', updated_by: 'setup' });
    expect(row.key_sealed).not.toContain(a.CAKE_CONNECTOR_KEY);
    const { connectorAuth } = await import('../src/care/channel-link.js');
    expect(await connectorAuth(db, a.CAKE_CONNECTOR_KEY!)).toMatchObject({ secret: a.CAKE_CONNECTOR_SECRET });
    expect(await prov(o())).toBe('rewritten');
    expect(parse(file)).toEqual(a);
    unlinkSync(file);
    expect(await prov(o())).toBe('rewritten');
    expect(parse(file)).toEqual(a);
  });

  it('đơn vị đã chọn Hub ⇒ không đổi gì, không ghi tệp', async () => {
    const { db } = await import('@bizcity/platform/db/client');
    await db.updateTable('channel_links').set({ mode: 'hub' } as never).execute();
    unlinkSync(file);
    expect(await prov(o())).toBe('skipped-hub');
    expect(() => statSync(file)).toThrow();
    expect((await db.selectFrom('channel_links').select('mode').executeTakeFirstOrThrow()).mode).toBe('hub');
  });
});
