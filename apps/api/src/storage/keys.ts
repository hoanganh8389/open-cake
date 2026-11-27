// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — khoá tệp theo đề xuất bizcity_storage@1 (26-NOI-LUU-TEP §4.1; chủ chốt Q-STOR-1 = A, 2026-11-27):
//   <app>/sites/<slug Workspace>/<vùng>/<tenant>/<yyyy>/<mm>/<sha256[0:16]>-<ngẫu nhiên 8>.<đuôi>
//   `sites/<slug>` luôn có (bản một công ty: `_default`) ⇒ hai site cùng tenant_id = 1 không bao giờ chung khoá; tên gốc của khách KHÔNG nằm trong khoá.
import { randomBytes } from 'node:crypto';

const APP = /^[a-z][a-z0-9-]{1,19}$/;
const SITE = /^(_default|[a-z][a-z0-9-]{2,29})$/;
const AREA = /^[a-z][a-z0-9-]{1,29}$/;
const TENANT = /^[1-9][0-9]{0,18}$/;
const SHA = /^[0-9a-f]{64}$/;
const EXT = /^[a-z0-9]{1,8}$/;
/** Khoá hợp lệ: đoạn chữ thường / số / `._-`, không `..`, không `/` đầu — chặn thoát khỏi thư mục gốc ở bộ đĩa. */
const KEY = /^[a-z][a-z0-9-]*(\/[A-Za-z0-9_][A-Za-z0-9._-]*)+$/;

export type KeyParts = { app: string; site: string; area: string; tenantId: string; sha256: string; ext: string; at?: Date };

export function buildKey(p: KeyParts): string {
  if (!APP.test(p.app)) throw new Error(`app không hợp lệ: ${p.app}`);
  if (!SITE.test(p.site)) throw new Error(`slug site không hợp lệ: ${p.site}`);
  if (!AREA.test(p.area)) throw new Error(`vùng không hợp lệ: ${p.area}`);
  if (!TENANT.test(p.tenantId)) throw new Error('tenant_id không hợp lệ');
  if (!SHA.test(p.sha256)) throw new Error('sha256 không hợp lệ');
  const ext = p.ext.toLowerCase();
  if (!EXT.test(ext)) throw new Error(`đuôi tệp không hợp lệ: ${p.ext}`);
  const at = p.at ?? new Date();
  const yyyy = String(at.getUTCFullYear()), mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  return `${p.app}/sites/${p.site}/${p.area}/${p.tenantId}/${yyyy}/${mm}/${p.sha256.slice(0, 16)}-${randomBytes(4).toString('hex')}.${ext}`;
}

/** Tiền tố của cả một site trong một app — đơn vị nhân bản / dọn (R-STOR-5). */
export function sitePrefix(app: string, site: string): string {
  if (!APP.test(app) || !SITE.test(site)) throw new Error('app / slug site không hợp lệ');
  return `${app}/sites/${site}/`;
}

export function assertKey(key: string): string {
  if (!KEY.test(key) || key.split('/').some((s) => s === '..' || s === '.')) throw new Error(`khoá tệp không hợp lệ: ${key}`);
  return key;
}

export function assertPrefix(prefix: string): string {
  if (!prefix.endsWith('/')) throw new Error('tiền tố phải kết thúc bằng "/"');
  assertKey(prefix.slice(0, -1));
  return prefix;
}
