// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 05:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-Q1 · R-LOG-4 — logger THẬT của API (cakeLoggerOptions) không để lọt PII của khách / bí mật vào dòng log:
//   khoá của nền (phone, email, token, secret, body, authorization…) + khoá riêng Cake (CAKE_PII). Không cần CSDL.
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { CAKE_PII, cakeLoggerOptions } from '../src/observability.js';

describe('nhật ký không chứa dữ liệu cá nhân / bí mật', () => {
  it('che khoá của nền + CAKE_PII ở cấp 1 và cấp 2; giữ mã, trạng thái, version của app', async () => {
    const lines: string[] = [];
    const app = Fastify({ logger: { ...cakeLoggerOptions('9.9.9'), stream: { write: (s: string) => { lines.push(s); } } } });
    const secret = { phone: '0909123456', email: 'lan@vi-du.vn', token: 'tok-bi-mat', secret: 'kc_bi-mat', body: 'thân yêu cầu' };
    const pii = Object.fromEntries(CAKE_PII.map((k) => [k, `PII-${k}`]));
    app.log.info({ ...secret, ...pii, contact: { ...secret, ...pii, contactId: '01J000CONTACT' }, status: 'accepted' }, 'thử che');
    await app.close();
    const line = lines.find((l) => l.includes('thử che'))!;
    expect(line).toBeTruthy();
    for (const v of [...Object.values(secret), ...Object.values(pii)]) expect(line).not.toContain(v);
    const o = JSON.parse(line) as Record<string, unknown>;
    expect(o).toMatchObject({ service: 'open-cake-api', version: '9.9.9', status: 'accepted', contact: { contactId: '01J000CONTACT', displayName: '***' } });
  });
});
