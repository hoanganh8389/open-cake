// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh theo đơn vị (25-KET-NOI-KENH §3; R-CAKE-CELL-1 sửa 2026-11-26: qua Hub HOẶC máy kết nối Tự cài).
//   channelTarget(): lệnh ra kênh đi đâu — self ⇒ {connector_url}/channel/v1/commands bằng khoá / bí mật của đơn vị; hub ⇒ CAKE_HUB_* của máy chủ (như cũ).
//   connectorAuth(): cổng nhận đọc tenant_id từ khoá `ckn.<tenant>.<ngẫu nhiên>` ⇒ so khoá + trả bí mật để kiểm chữ ký (thân touch không có tenantId).
import { randomBytes } from 'node:crypto';
import type { Db } from '@bizcity/platform/db/client';
import type { ChannelLink } from '@open-cake/contracts';
import { failure, newUlid, type Ctx, type Handler } from '../runtime.js';
import { open, seal, signBody } from '../orders/clients.js';
import { notifyChanged } from '../stream.js';

export const CONNECTOR_COMMANDS_PATH = '/channel/v1/commands';
export const HUB_COMMANDS_PATH = '/channel/v1/commands';
export type ChannelTarget = { kind: 'hub' | 'self'; url: string; key: string; secret: string };

const hubEnv = () => {
  const url = process.env.CAKE_HUB_URL ?? '', key = process.env.CAKE_HUB_SITE_KEY ?? '', secret = process.env.CAKE_HUB_SECRET ?? '';
  return url && key.length >= 16 && secret.length >= 32 ? { url: url.replace(/\/+$/, ''), key, secret } : null;
};

/** Đích lệnh của đơn vị. Chưa cấu hình ⇒ NOT_READY (không ghi tin "đang gửi" treo). */
export async function channelTarget(tx: Db, tenantId: string): Promise<ChannelTarget> {
  const l = await tx.selectFrom('channel_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
  if (l?.mode === 'self') return { kind: 'self', url: l.connector_url!.replace(/\/+$/, '') + CONNECTOR_COMMANDS_PATH, key: open(l.key_sealed!), secret: open(l.secret_sealed!) };
  const h = hubEnv();
  if (!h) throw failure('NOT_READY', 'Đơn vị chưa có cách kết nối kênh: chọn Tự cài (máy kết nối) hoặc máy chủ chưa nối Hub (CAKE_HUB_URL, CAKE_HUB_SITE_KEY, CAKE_HUB_SECRET).');
  return { kind: 'hub', key: h.key, secret: h.secret, url: h.url + HUB_COMMANDS_PATH };
}

/** Cổng nhận: khoá Bearer `ckn.<tenant>.…` ⇒ {tenantId, secret} nếu đúng khoá của đơn vị đang ở chế độ Tự cài; sai ⇒ null. */
export async function connectorAuth(tx: Db, bearer: string): Promise<{ tenantId: string; secret: string } | null> {
  const m = /^ckn\.([1-9][0-9]{0,18})\.[A-Za-z0-9_-]{20,}$/.exec(bearer);
  if (!m) return null;
  const l = await tx.selectFrom('channel_links').selectAll().where('tenant_id', '=', m[1]!).executeTakeFirst();
  if (l?.mode !== 'self' || !l.key_sealed || open(l.key_sealed) !== bearer) return null;
  return { tenantId: m[1]!, secret: open(l.secret_sealed!) };
}

// [2026-11-26 10:06 PM Johnny Chu - Chu Hoàng Anh] KN K7 — gọi API tài khoản của máy kết nối (Bearer khoá nối; POST ký thân như lệnh). Chỉ ở chế độ Tự cài.
async function connectorCall<T>(tx: Db, tenantId: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const t = await channelTarget(tx, tenantId);
  if (t.kind !== 'self') throw failure('CONFLICT', 'Kết nối số qua Hub chưa có ở Open CRM — đơn vị đang dùng BizCity Hub; quét QR ở trang của Hub.', { reason: 'CAKE_CHANNEL_NOT_CONNECTED' });
  const raw = body === undefined ? undefined : JSON.stringify(body);
  let res: Response;
  try {
    res = await fetch(t.url.replace(/\/channel\/v1\/commands$/, '') + path, {
      method, body: raw, signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${t.key}`, ...(raw !== undefined ? { 'content-type': 'application/json', 'x-bizcity-signature': signBody(t.secret, raw) } : {}) },
    });
  } catch { throw failure('NOT_READY', 'Không tới được máy kết nối — kiểm Cài đặt › Kết nối kênh.'); }
  const j = (await res.json().catch(() => null)) as T & { error?: { code?: string; message?: string } } | null;
  if (!res.ok) throw failure(res.status === 404 ? 'NOT_FOUND' : 'CONFLICT', j?.error?.message ?? `Máy kết nối trả ${res.status}`, { reason: 'CAKE_CHANNEL_NOT_CONNECTED' });
  return j as T;
}
type QrView = { status: string; qrDataUri?: string; error?: string };
const qrOut = (flowId: string, q: QrView) => ({ flowId, status: (q.status ?? 'idle') as never, qrRef: q.qrDataUri ?? null, error: q.error ?? null });

/** Sinh khoá nối + bí mật mới của đơn vị (đã mã hoá cho CSDL + bản rõ để trả MỘT lần). Dùng ở cake.channel_link.set và ở cấp khoá lúc cài (connector-link.ts). */
export function issueConnectorKey(tenantId: string) {
  const issued = { key: `ckn.${tenantId}.${randomBytes(24).toString('base64url')}`, secret: randomBytes(32).toString('base64url') };
  return { issued, row: { key_sealed: seal(issued.key), key_prefix: `${issued.key.slice(0, issued.key.indexOf('.', 4) + 5)}…`, secret_sealed: seal(issued.secret) } };
}

async function view(tx: Db, tenantId: string, issued: ChannelLink['issued'] = null): Promise<ChannelLink> {
  const l = await tx.selectFrom('channel_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
  const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
  return {
    mode: (l?.mode ?? 'hub') as ChannelLink['mode'], connectorUrl: l?.connector_url ?? null, keyPrefix: l?.key_prefix ?? null, hasSecret: !!l?.secret_sealed,
    hubReady: !!hubEnv(), lastOkAt: iso(l?.last_ok_at), lastError: l?.last_error ?? null, issued,
  };
}

export const channelLinkHandlers: Record<string, Handler> = {
  'cake.channel_link.get': ({ tx, tenantId }: Ctx) => view(tx, tenantId),
  'cake.channel_link.set': async ({ tx, tenantId, actor }: Ctx, i) => {
    const prev = await tx.selectFrom('channel_links').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
    let issued: ChannelLink['issued'] = null;
    const v: Record<string, unknown> = { mode: i.mode, updated_by: actor, updated_at: new Date() };
    if (i.mode === 'self') {
      v.connector_url = i.connectorUrl;
      if (i.rotate || !prev?.key_sealed) {
        const k = issueConnectorKey(tenantId);
        issued = k.issued;
        Object.assign(v, k.row);
      }
    }
    if (prev) await tx.updateTable('channel_links').set(v as never).where('tenant_id', '=', tenantId).execute();
    else await tx.insertInto('channel_links').values({ ...v, tenant_id: tenantId } as never).execute();
    return view(tx, tenantId, issued);
  },
  'cake.channel.connect_start': async ({ tx, tenantId }: Ctx, i) => {
    if (i.channel !== 'zalo_personal' && i.channel !== 'facebook_personal') throw failure('CONFLICT', 'Máy kết nối chỉ có Zalo cá nhân và Facebook cá nhân; kênh khác kết nối qua BizCity Hub.', { reason: 'CAKE_CHANNEL_NOT_CONNECTED' });
    const fb = i.channel === 'facebook_personal';
    const id = i.flowId ?? (await connectorCall<{ account: { id: string } }>(tx, tenantId, 'POST', '/accounts', { label: i.label, ...(fb ? { platform: 'facebook_personal' } : {}) })).account.id;
    if (fb) return { flowId: id, nextStep: 'approve_on_device' as const, qrRef: null }; // Facebook: nhập tài khoản ở giao diện, không QR
    const q = await connectorCall<QrView>(tx, tenantId, 'POST', `/accounts/${encodeURIComponent(id)}/qr`, {});
    return { flowId: id, nextStep: 'qr' as const, qrRef: q.qrDataUri ?? null };
  },
  'cake.channel.connect_status': async ({ tx, tenantId }: Ctx, i) => qrOut(i.flowId, await connectorCall<QrView>(tx, tenantId, 'GET', `/accounts/${encodeURIComponent(i.flowId)}/qr`)),
  'cake.channel.connect_finish': async ({ tx, tenantId, userId }: Ctx, i) => {
    const list = await connectorCall<{ accounts: { id: string; label: string; platform?: string; zaloUid: string | null; fbUid?: string | null; running: boolean }[] }>(tx, tenantId, 'GET', '/accounts');
    const a = list.accounts.find((x) => x.id === i.flowId);
    const fb = a?.platform === 'facebook_personal';
    const uid = fb ? a?.fbUid : a?.zaloUid;
    if (!a || !uid || !a.running) throw failure('CONFLICT', fb ? 'Nick Facebook chưa đăng nhập xong — hoàn tất các bước xác minh rồi thử lại.' : 'Số chưa đăng nhập xong — quét QR rồi thử lại.', { reason: 'CAKE_CHANNEL_NOT_CONNECTED' });
    const channel = fb ? 'facebook_personal' : 'zalo_personal';
    const now = new Date();
    const prev = await tx.selectFrom('channel_accounts').select(['channel_account_id']).where('tenant_id', '=', tenantId).where('channel', '=', channel).where('external_account_id', '=', uid).executeTakeFirst();
    const id = prev?.channel_account_id ?? newUlid();
    if (prev) await tx.updateTable('channel_accounts').set({ cell_ref: a.id, status: 'connected', connected_at: now, label: a.label }).where('tenant_id', '=', tenantId).where('channel_account_id', '=', id).execute();
    else await tx.insertInto('channel_accounts').values({ channel_account_id: id, tenant_id: tenantId, channel, kind: 'personal', external_account_id: uid, label: a.label, owner_user_id: userId ?? null, cell_ref: a.id, status: 'connected', connected_at: now } as never).execute();
    await notifyChanged(tx, tenantId, ['cake.channel.manage']);
    return { channelAccountId: id, externalAccountId: uid, label: a.label, status: 'connected' as const };
  },
  // [2026-11-26 10:39 PM Johnny Chu - Chu Hoàng Anh] KN W4b-2 — một bước đăng nhập Facebook; thân đi nguyên sang máy kết nối (không giữ lại), kết quả chỉ gồm trạng thái / ô cần nhập.
  'cake.channel.fb_login': async ({ tx, tenantId }: Ctx, i) => {
    const body = i.action === 'start' ? { action: 'start', identifier: i.identifier, password: i.password } : i.action === 'submit' ? { action: 'submit', input: i.answers } : i.action === 'cookies' ? { action: 'cookies', cookies: i.cookies } : { action: i.action };
    const r = await connectorCall<{ login: { status: string; message?: string; fields?: { id: string; type: string; name?: string; description?: string; options?: string[] }[]; uid?: string } }>(tx, tenantId, 'POST', `/accounts/${encodeURIComponent(i.flowId)}/fb-login`, body);
    const l = r.login;
    return { status: l.status as never, message: l.message ?? null, uid: l.uid ?? null, fields: l.fields?.map((f) => ({ id: f.id, type: f.type, name: f.name ?? null, description: f.description ?? null, options: f.options ?? null })) ?? null };
  },
  'cake.channel_link.test': async ({ tx, tenantId }: Ctx) => {
    const t = await channelTarget(tx, tenantId);
    if (t.kind !== 'self') throw failure('VALIDATION_ERROR', 'Kiểm máy kết nối chỉ dùng khi đơn vị chọn Tự cài.');
    let status = 0;
    try { status = (await fetch(t.url.replace(/\/channel\/v1\/commands$/, '/health'), { headers: { authorization: `Bearer ${t.key}` }, signal: AbortSignal.timeout(5000) })).status; } catch { status = 0; } // nuot-loi: ghi vào last_error
    await tx.updateTable('channel_links').set(status === 200 ? { last_ok_at: new Date(), last_error: null } : { last_error: status ? `HTTP ${status}` : 'không tới được máy kết nối' }).where('tenant_id', '=', tenantId).execute();
    return view(tx, tenantId);
  },
};
