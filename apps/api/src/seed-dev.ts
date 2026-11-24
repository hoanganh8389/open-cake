// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — dữ liệu dev (GIẢ LẬP, Shop Hoa Mai): đơn vị, nguồn danh mục local, bảng giá công ty, 5 nhóm hàng.
//   Không tạo hàng: thêm hàng qua màn Hàng hoá (đi đúng đường action). Chạy lại an toàn (ON CONFLICT DO NOTHING). Không dùng ở bản thật.
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — thêm 2 tài khoản kênh và các lần chạm khách GIẢ LẬP đi qua MỘT CỬA submitTouchIn (đúng đường ingress):
//   ca vàng G1 (bình luận → shop trả lời riêng → khách nhắn Fanpage ⇒ MỘT khách) + một hội thoại Zalo. Chạy lại ⇒ "unchanged", không nhân đôi.
import { sql } from 'kysely';
import { db } from '@bizcity/platform/db/client';
import { submitTouchIn } from '@open-cake/care-kernel';
import { PgCareRepo } from './care/pg-care-repo.js';
import './db-types.js';
import { newUlid } from './runtime.js';

const PAGE = '1234567890', ZALO = '7350219485123001001';
type Who = { scope: string; externalId: string; displayName: string };
const SHOP_PAGE: Who = { scope: `page:${PAGE}`, externalId: PAGE, displayName: 'Hoa Mai Fashion' };
const SHOP_ZALO: Who = { scope: 'global', externalId: ZALO, displayName: 'Shop Hoa Mai' };

/** Một bizcity_touch@1 GIẢ LẬP (khuôn như contracts/fixtures). minsAgo: thời điểm xảy ra so với lúc gieo. */
function touch(o: { channel: string; account: string; accKind: string; thread: { id: string; kind: string; anchor?: unknown }; msg: string; dir: 'inbound' | 'outbound'; type: string; who: Who; text: string; minsAgo: number; hints?: Record<string, unknown> }) {
  return {
    contract: 'bizcity_touch@1', eventId: newUlid(), type: o.type, occurredAt: new Date(Date.now() - o.minsAgo * 60_000).toISOString(), source: 'cell:dev-gia-lap',
    docKey: `${o.channel}|${o.account}|${o.thread.id}|${o.msg}`, version: 1, channel: o.channel, channelAccount: { externalAccountId: o.account, kind: o.accKind },
    thread: { externalThreadId: o.thread.id, kind: o.thread.kind, anchor: o.thread.anchor ?? null }, sender: { ...o.who, avatarRef: null }, direction: o.dir,
    content: { type: 'text', text: o.text, attachments: [] }, hints: o.hints ?? {}, encryption: { e2ee: false, decryptedOnCell: false }, delivery: null, history: { backfill: false, cursor: null },
  };
}

export async function seedDev(slug = process.env.CAKE_TENANT ?? 'hoa-mai'): Promise<string> {
  await sql`INSERT INTO tenants (code, name) VALUES (${slug}, 'Shop Hoa Mai (giả lập)') ON CONFLICT (code) DO NOTHING`.execute(db);
  const { rows: [t] } = await sql<{ id: string }>`SELECT id::text AS id FROM tenants WHERE code = ${slug}`.execute(db);
  const tenantId = t!.id;
  await db.insertInto('tenant_links').values({ tenant_id: tenantId, tenant: slug }).onConflict((o) => o.column('tenant_id').doNothing()).execute();
  await db.insertInto('catalog_price_lists').values({ tenant_id: tenantId, code: 'CONGTY', name: 'Bảng giá công ty', is_company: true, ext_id: null, ext_version: null, ext_synced_at: null, push_error: null })
    .onConflict((o) => o.columns(['tenant_id', 'code']).doNothing()).execute();
  const cats: [string, string, string | null, number][] = [['10', 'Thời trang', null, 1], ['1010', 'Váy', '10', 2], ['101010', 'Váy hoa', '1010', 3], ['1020', 'Phụ kiện', '10', 2], ['102020', 'Phụ kiện tóc', '1020', 3]];
  for (const [code, name, parent, level] of cats) {
    await db.insertInto('catalog_categories').values({ tenant_id: tenantId, code, name, parent_code: parent, level, ext_id: null, ext_version: null, ext_synced_at: null, push_error: null, updated_at: new Date() })
      .onConflict((o) => o.columns(['tenant_id', 'code']).doNothing()).execute();
  }

  // Tài khoản kênh: trạng thái là sự thật của Cell; ở đây GIẢ LẬP "đã kết nối". Không có cookie / token nào (R-CAKE-CELL-1).
  for (const [channel, kind, ext, label] of [['facebook_page', 'page', PAGE, 'Hoa Mai Fashion'], ['zalo_personal', 'personal', ZALO, 'Shop Hoa Mai']] as const) {
    await db.insertInto('channel_accounts').values({ channel_account_id: newUlid(), tenant_id: tenantId, channel, kind, external_account_id: ext, label, status: 'connected', owner_user_id: null, cell_ref: 'cell:dev-gia-lap', connected_at: new Date(), tested_at: null })
      .onConflict((o) => o.columns(['tenant_id', 'channel', 'external_account_id']).doNothing()).execute();
  }

  const huong: Who = { scope: `comment:${PAGE}`, externalId: '99887766', displayName: 'Nguyễn Thu Hương' };
  const cmt = { channel: 'facebook_comment', account: PAGE, accKind: 'page', thread: { id: 'p_555:c_777', kind: 'comment_thread', anchor: { postId: 'p_555', commentId: 'c_777' } } };
  const dm = { channel: 'facebook_page', account: PAGE, accKind: 'page', thread: { id: 't_2468', kind: 'dm' } };
  const zl = { channel: 'zalo_personal', account: ZALO, accKind: 'personal', thread: { id: 'u_880001', kind: 'dm' } };
  const touches = [
    touch({ ...cmt, msg: 'c_777', dir: 'inbound', type: 'comment.received', who: huong, text: 'Váy hoa này giá sao shop?', minsAgo: 50 }),
    touch({ ...cmt, msg: 'r_1', dir: 'outbound', type: 'comment.replied', who: { ...SHOP_PAGE, scope: `comment:${PAGE}` }, text: 'Dạ váy 390.000đ ạ, em nhắn riêng chị nhé!', minsAgo: 45 }),
    touch({ ...dm, msg: 'm_1', dir: 'inbound', type: 'message.received', who: { scope: `page:${PAGE}`, externalId: '2468', displayName: 'Nguyễn Thu Hương' }, text: 'Còn size M không shop?', minsAgo: 30, hints: { privateReplyOf: 'c_777' } }),
    touch({ ...zl, msg: 'z_1', dir: 'inbound', type: 'message.received', who: { scope: 'global', externalId: '880001', displayName: 'Anh Khoa - sỉ HN' }, text: 'Anh lấy 20 bộ, báo giá sỉ giúp anh nha', minsAgo: 20 }),
    touch({ ...zl, msg: 'z_2', dir: 'outbound', type: 'message.sent', who: SHOP_ZALO, text: 'Dạ em gửi bảng giá sỉ ngay ạ', minsAgo: 15 }),
    touch({ ...zl, msg: 'z_3', dir: 'inbound', type: 'message.received', who: { scope: 'global', externalId: '880001', displayName: 'Anh Khoa - sỉ HN' }, text: 'Ok em, gửi luôn nhé', minsAgo: 5 }),
  ];
  const deps = { repo: new PgCareRepo(tenantId, db), now: () => new Date().toISOString(), newId: () => newUlid() };
  for (const x of touches) await submitTouchIn(deps, x);
  return tenantId;
}

if (process.argv[1]?.endsWith('seed-dev.js')) {
  console.log(`Đơn vị dev: ${await seedDev()}`);
  await db.destroy();
}
