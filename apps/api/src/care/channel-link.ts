// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh theo đơn vị (25-KET-NOI-KENH §3; R-CAKE-CELL-1 sửa 2026-11-26: qua Hub HOẶC máy kết nối Tự cài).
//   channelTarget(): lệnh ra kênh đi đâu — self ⇒ {connector_url}/channel/v1/commands bằng khoá / bí mật của đơn vị; hub ⇒ CAKE_HUB_* của máy chủ (như cũ).
//   connectorAuth(): cổng nhận đọc tenant_id từ khoá `ckn.<tenant>.<ngẫu nhiên>` ⇒ so khoá + trả bí mật để kiểm chữ ký (thân touch không có tenantId).
import { randomBytes } from 'node:crypto';
import type { Db } from '@bizcity/platform/db/client';
import type { ChannelLink } from '@open-cake/contracts';
import { failure, type Ctx, type Handler } from '../runtime.js';
import { open, seal } from '../orders/clients.js';

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
        issued = { key: `ckn.${tenantId}.${randomBytes(24).toString('base64url')}`, secret: randomBytes(32).toString('base64url') };
        Object.assign(v, { key_sealed: seal(issued.key), key_prefix: `${issued.key.slice(0, issued.key.indexOf('.', 4) + 5)}…`, secret_sealed: seal(issued.secret) });
      }
    }
    if (prev) await tx.updateTable('channel_links').set(v as never).where('tenant_id', '=', tenantId).execute();
    else await tx.insertInto('channel_links').values({ ...v, tenant_id: tenantId } as never).execute();
    return view(tx, tenantId, issued);
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
