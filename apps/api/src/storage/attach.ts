// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 01:26 PM Johnny Chu - Chu Hoàng Anh] PHASE-018 / S007-3 — đính kèm khi gửi tin (mockup ⑦–⑩ đã duyệt):
//   resolveOutgoing(): mỗi tệp phải là `file:<id>` đã tải qua cake.file.upload, của ĐÚNG đơn vị, vùng chat, chưa gỡ; loại / tên / MIME / cỡ lấy từ bảng files
//     (không tin client); kênh không gửi được tệp (Facebook cá nhân — KN-CAP-2) ⇒ từ chối trước khi ghi gì.
//   withFileLinks(): lệnh trong hàng chờ GIỮ `file:<id>`; mỗi lần gửi (kể cả gửi lại) mới đổi sang đường dẫn ký 15 phút — lệnh có thể chờ tới 10 phút, dài hơn hạn link.
import type { Db } from '@bizcity/platform/db/client';
import type { ChannelCommand } from '@open-cake/contracts';
import { failure } from '../runtime.js';
import { fileLink } from './routes.js';

type Attachment = ChannelCommand['content']['attachments'][number];

const FILE_REF = /^file:([0-9A-HJKMNP-TV-Z]{26})$/;
/** Kênh gửi được ảnh / tệp qua máy kết nối hoặc Hub. */
const CAN_ATTACH = new Set(['zalo_personal']);
export const LINK_TTL_SEC = 15 * 60;

export async function resolveOutgoing(tx: Db, tenantId: string, channel: string, atts: Attachment[]): Promise<Attachment[]> {
  if (!atts.length) return [];
  if (!CAN_ATTACH.has(channel)) {
    throw failure('VALIDATION_ERROR', channel === 'facebook_personal'
      ? 'Facebook cá nhân chỉ gửi chữ — gửi ảnh / tệp cho khách Facebook: dùng Fanpage.'
      : 'Kênh này chưa gửi được ảnh / tệp.', { field: 'attachments' });
  }
  const ids = atts.map((a) => FILE_REF.exec(a.ref)?.[1]);
  if (ids.some((x) => !x)) throw failure('VALIDATION_ERROR', 'Tệp đính kèm phải tải lên trước (cake.file.upload) và gửi dạng file:<mã>.', { field: 'attachments' });
  const rows = await tx.selectFrom('files').select(['file_id', 'kind', 'content_type', 'original_name', 'size_bytes'])
    .where('tenant_id', '=', tenantId).where('area', '=', 'chat').where('archived_at', 'is', null).where('file_id', 'in', ids as string[]).execute();
  const by = new Map(rows.map((r) => [r.file_id, r]));
  return ids.map((id) => {
    const r = by.get(id!);
    if (!r) throw failure('NOT_FOUND', 'Có tệp đính kèm không tồn tại hoặc đã gỡ — tải lại tệp.', { field: 'attachments' });
    return { type: r.kind as 'image' | 'file', ref: `file:${r.file_id}`, name: r.original_name, mime: r.content_type, size: Number(r.size_bytes) };
  });
}

/** Bản lệnh để gửi đi: `file:<id>` ⇒ đường dẫn ký mới. Không đổi bản đã lưu trong hàng chờ. */
export async function withFileLinks(tx: Db, tenantId: string, cmd: ChannelCommand): Promise<ChannelCommand> {
  const atts = cmd.content?.attachments ?? [];
  if (!atts.some((a) => FILE_REF.test(a.ref))) return cmd;
  const out = [];
  for (const a of atts) {
    const m = FILE_REF.exec(a.ref);
    out.push(m ? { ...a, ref: (await fileLink(tx, tenantId, m[1]!, LINK_TTL_SEC)).url } : a);
  }
  return { ...cmd, content: { ...cmd.content, attachments: out } };
}
