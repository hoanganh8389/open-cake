// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 01:55 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN SC-USER-5 / R-USER-13 — bizcity.authz.json phải khớp đúng sổ đăng ký đang chạy (như open-ketoan authz-manifest.test.ts).
//   Lệch ⇒ trượt: đổi quyền / vai / phạm vi khoá / user meta thì chạy `pnpm run authz:manifest` rồi commit tệp sinh ra. UPDATE_AUTHZ=1 ⇒ ghi tệp thay vì so.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestText } from '../src/auth/authz-manifest.js';

const FILE = join(__dirname, '..', '..', '..', 'bizcity.authz.json');

describe('bizcity.authz.json (bizcity_authz_manifest@1)', () => {
  it('khớp sổ đăng ký quyền / vai / phạm vi khoá / user meta', () => {
    const now = manifestText();
    if (process.env.UPDATE_AUTHZ === '1') writeFileSync(FILE, now);
    expect(existsSync(FILE), 'chưa có bizcity.authz.json — chạy pnpm run authz:manifest').toBe(true);
    expect(readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).toBe(now);
  });
});
