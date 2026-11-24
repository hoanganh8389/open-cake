// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — đăng nhập của Cake trên phiên của nền (signSession / authPlugin):
//   POST /api/v1/auth/wp-sso — vé WordPress CÙNG KHUÔN open-ketoan (base64url(JSON).base64url(HMAC-SHA256(JSON, WP_SSO_SECRET)), sống ≤ 5 phút) ⇒ một plugin cấp vé
//     cho cả Kế Toán lẫn Cake; người dùng theo email trong đơn vị (chưa có ⇒ tạo vai viewer); quyền trong vé (nếu có) thay quyền theo vai, như open-ketoan.
//   POST /api/v1/auth/dev-login — CHỈ khi CAKE_DEV_AUTH=1 (máy dev): phiên của chủ đơn vị dev. Mặc định tắt (404), kể cả trong compose.
//   GET /api/v1/auth/me — người đang đăng nhập + quyền (giao diện ẩn / khoá nút theo đây, R-WEB-7).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { env } from '@bizcity/platform/config/env';
import { authOf, isKnownPermission, requireUser } from '@bizcity/platform/core/auth';
import { ok } from '@bizcity/platform/core/http';
import { hashPassword } from '@bizcity/platform/core/security/password';
import { signSession } from '@bizcity/platform/core/security/tokens';
import { db } from '@bizcity/platform/db/client';
import { failure } from '../runtime.js';

type Ticket = { email: string; name?: string; login?: string; perms?: string[]; tenant?: string; aud?: string; iat: number; exp: number };
const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const bad = () => failure('UNAUTHORIZED', 'Vé đăng nhập không hợp lệ hoặc đã hết hạn — mở lại từ trang quản trị.');

export function verifyWpTicket(raw: string, secret: string, nowS = Math.floor(Date.now() / 1000)): Ticket {
  if (!secret) throw failure('UNAUTHORIZED', 'Chưa cấu hình đăng nhập qua WordPress (WP_SSO_SECRET).');
  const [body, sig] = String(raw).split('.');
  if (!body || !sig) throw bad();
  const want = createHmac('sha256', secret).update(body).digest();
  const got = b64(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw bad();
  let t: Ticket;
  try { t = JSON.parse(b64(body).toString('utf8')) as Ticket; } catch { throw bad(); }
  if (!t || typeof t.email !== 'string' || !t.email.includes('@') || !(t.exp > nowS) || t.exp - t.iat > 300 || t.iat > nowS + 60) throw bad();
  // [2026-11-24 10:15 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — R-CAKE-SSO-3: vé của app khác (aud) không dùng được ở Cake.
  if (t.aud !== undefined && t.aud !== 'cake') throw bad();
  return t;
}

/** Giới hạn lần thử SAI theo IP (như open-ketoan LOGIN_LIMITS): 30 lần / 15 phút. */
const fails = new Map<string, number[]>();
const WINDOW = 15 * 60_000, MAX = 30;
const recent = (k: string, now: number) => (fails.get(k) ?? []).filter((t) => now - t < WINDOW);

async function issue(tenant: { id: string; code: string }, email: string, fullName: string, roleIfNew: string, perms?: string[]) {
  let user = await db.selectFrom('users').select(['id', 'full_name', 'role', 'is_active', 'session_version']).where('tenant_id', '=', tenant.id).where('email', '=', email).executeTakeFirst();
  if (!user) {
    user = await db.insertInto('users').values({ tenant_id: tenant.id, email, full_name: fullName, role: roleIfNew, password_hash: await hashPassword(randomBytes(24).toString('base64url')), is_active: true } as never)
      .returning(['id', 'full_name', 'role', 'is_active', 'session_version']).executeTakeFirstOrThrow();
  } else if (!user.is_active) throw failure('UNAUTHORIZED', 'Tài khoản đã bị ngưng ở Open CRM — nhờ quản lý bật lại.');
  // [2026-11-24 10:15 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — R-CAKE-SSO-7: tên theo WordPress, ghi lần vào cuối.
  await db.updateTable('users').set({ full_name: fullName, last_login_at: new Date() } as never).where('id', '=', user.id).execute();
  const kept = perms?.filter(isKnownPermission);
  const token = await signSession({ sub: String(user.id), tid: tenant.id, role: user.role, name: fullName, ...(kept ? { perms: kept } : {}), sv: Number(user.session_version) });
  return { token, user: { id: String(user.id), email, fullName, role: user.role, tenant: tenant.code } };
}

async function tenantByCode(code: string) {
  const r = await sql<{ id: string; code: string }>`SELECT id::text AS id, code FROM tenants WHERE code = ${code} AND is_active`.execute(db);
  return r.rows[0];
}

export function registerAuthRoutes(app: FastifyInstance, opts: { devTenant?: string } = {}): void {
  app.get('/api/v1/auth/wp-sso', { config: { public: true } }, async () => ok({ loginUrl: env.WP_SSO_SECRET && env.WP_SSO_LOGIN_URL ? env.WP_SSO_LOGIN_URL : null, devLogin: process.env.CAKE_DEV_AUTH === '1' }));

  app.post<{ Body: { ticket?: string } }>('/api/v1/auth/wp-sso', { config: { public: true }, bodyLimit: 16 * 1024 }, async (req) => {
    const key = `sso:${req.ip}`, now = Date.now();
    if (recent(key, now).length >= MAX) throw failure('RATE_LIMITED', 'Đăng nhập sai quá nhiều lần — chờ 15 phút rồi thử lại.');
    try {
      const t = verifyWpTicket(String(req.body?.ticket ?? ''), env.WP_SSO_SECRET);
      const tenant = await tenantByCode((t.tenant || env.WP_SSO_TENANT || '').trim());
      if (!tenant) throw failure('UNAUTHORIZED', 'Không xác định được đơn vị (WP_SSO_TENANT).');
      const email = t.email.trim().toLowerCase();
      return ok(await issue(tenant, email, (t.name || t.login || email).trim().slice(0, 255), 'viewer', t.perms));
    } catch (e) { fails.set(key, [...recent(key, now), now]); throw e; }
  });

  app.post('/api/v1/auth/dev-login', { config: { public: true } }, async () => {
    if (process.env.CAKE_DEV_AUTH !== '1') throw failure('NOT_FOUND', 'Không có.');
    const tenant = await tenantByCode(opts.devTenant ?? process.env.CAKE_TENANT ?? 'hoa-mai');
    if (!tenant) throw failure('NOT_FOUND', 'Chưa có đơn vị dev — chạy seed.');
    return ok(await issue(tenant, 'chu-shop@dev.local', 'Chủ shop (dev)', 'owner'));
  });

  app.get('/api/v1/auth/me', { preHandler: requireUser() }, async (req) => {
    const a = authOf(req);
    return ok({ actor: a.actor, name: a.actorName, role: a.role, tenantId: a.tenantId, permissions: [...a.permissions].sort() });
  });
}
