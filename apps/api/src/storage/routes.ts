// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 11:21 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-4 — đường tệp:
//   POST /api/v1/files?area=chat&name=…   (action cake.file.upload — thân NHỊ PHÂN application/octet-stream ≤ 26 MB; quyền / bằng chứng / chống gửi lặp như mọi action)
//   GET  /api/v1/files/:fileId            tải về trong app (quyền cake:inbox-xem, RLS theo đơn vị)
//   GET  /files/v1/:vé                    tải bằng vé ký (bộ đĩa) — cho Cell / máy kết nối lấy tệp khi gửi lên Zalo; không cần đăng nhập, vé hết hạn 10 phút
//   fileLink()                            đường dẫn ký cho một tệp: bộ đĩa ⇒ CAKE_PUBLIC_URL + /files/v1/<vé>; bộ s3 ⇒ URL ký sẵn của R2.
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Db } from '@bizcity/platform/db/client';
import { db } from '@bizcity/platform/db/client';
import { authOf, requirePermission } from '@bizcity/platform/core/auth';
import type { FileView } from '@open-cake/contracts';
import { failure, type Handler } from '../runtime.js';
import { loadFile, saveFile } from './files.js';
import { driverOf, verifyLocalToken } from './index.js';
import { LIMITS } from './sniff.js';

export const UPLOAD_MAX_BYTES = LIMITS.file + 1024 * 1024; // tệp lớn nhất + khoảng dư; quá trần ⇒ 413 trước khi đọc hết thân
const EXT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', zip: 'application/zip', doc: 'application/msword', xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const fileHandlers: Record<string, Handler> = {
  'cake.file.upload': ({ tx, tenantId, actor }, i) => saveFile(tx, { tenantId, actor, area: i.area, name: i.name, data: Buffer.from(i.data as Uint8Array) }),
};

/** Tiêu đề trả tệp: không để trình duyệt đoán loại, không đệm chung, tên tệp an toàn. */
function sendFile(reply: FastifyReply, data: Buffer, contentType: string, name: string, inline: boolean) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return reply
    .header('content-type', contentType).header('x-content-type-options', 'nosniff').header('cache-control', 'private, max-age=300')
    .header('content-disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`)
    .send(data);
}

/** Đường dẫn ký (mặc định 10 phút) cho một tệp của đơn vị. Tệp không có / đã gỡ ⇒ NOT_FOUND. */
export async function fileLink(tx: Db, tenantId: string, fileId: string, ttlSec = 600): Promise<{ url: string; file: Pick<FileView, 'name' | 'contentType' | 'size' | 'kind'> }> {
  const r = await tx.selectFrom('files').select(['storage_key', 'driver', 'original_name', 'content_type', 'size_bytes', 'kind'])
    .where('tenant_id', '=', tenantId).where('file_id', '=', fileId).where('archived_at', 'is', null).executeTakeFirst();
  if (!r) throw failure('NOT_FOUND', 'Không có tệp này.');
  const d = await driverOf(r.driver);
  if (!d) throw failure('NOT_READY', `Tệp nằm ở bộ lưu "${r.driver}" nhưng bộ này đang tắt (chẩn đoán SC-STOR-0).`);
  const signed = await d.signedUrl(r.storage_key, ttlSec, r.content_type);
  const url = signed.startsWith('/') ? `${(process.env.CAKE_PUBLIC_URL ?? '').replace(/\/+$/, '')}${signed}` : signed;
  return { url, file: { name: r.original_name, contentType: r.content_type, size: Number(r.size_bytes), kind: r.kind as FileView['kind'] } };
}

export function registerFileRoutes(app: FastifyInstance): void {
  // Thân nhị phân của POST /api/v1/files ⇒ đầu vào action { data, area, name } (area / name ở query; name UTF-8 mã hoá URL).
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: UPLOAD_MAX_BYTES }, (req, body, done) => {
    const q = (req.query ?? {}) as { area?: string; name?: string };
    done(null, { data: body, area: q.area, name: q.name });
  });

  app.get<{ Params: { fileId: string } }>('/api/v1/files/:fileId', { preHandler: requirePermission('cake:inbox-xem' as never) }, async (req, reply) => {
    const got = await db.transaction().execute((tx) => loadFile(tx, authOf(req).tenantId, req.params.fileId));
    if (!got) throw failure('NOT_FOUND', 'Không có tệp này.');
    return sendFile(reply, got.data, got.file.contentType, got.file.name, got.file.kind === 'image');
  });

  // vé dài hơn trần maxParamLength (100) của Fastify ⇒ route '*' thay cho ':token'
  app.get<{ Params: { '*': string } }>('/files/v1/*', { config: { public: true } }, async (req, reply) => {
    const key = verifyLocalToken(req.params['*'] ?? '');
    if (!key) return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Vé tải tệp sai hoặc đã hết hạn.' } });
    const data = await (await driverOf('local'))!.get(key);
    if (!data) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Không có tệp này.' } });
    const ext = key.slice(key.lastIndexOf('.') + 1);
    return sendFile(reply, data, EXT_TYPE[ext] ?? 'application/octet-stream', key.slice(key.lastIndexOf('/') + 1), false);
  });
}
