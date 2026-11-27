// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-27 11:21 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-4 — tải tệp lên (26-NOI-LUU-TEP; mockup đính kèm ⑦ đã duyệt): thân là NHỊ PHÂN (application/octet-stream),
//   `area` / `name` ở query. Máy chủ xác định loại thật từ đầu tệp, chặn tệp chạy được, ảnh ≤ 10 MB / tệp ≤ 25 MB; cùng nội dung ⇒ trả tệp cũ (`deduped`).
//   `data` là Uint8Array (chạy được cả trình duyệt lẫn Node — Buffer là lớp con).
import { z } from 'zod';
import { defineActionSpec } from '../base/action.js';

export const FILE_AREAS = ['chat'] as const;

export const FileViewSchema = z.object({
  fileId: z.string(),
  area: z.enum(FILE_AREAS),
  kind: z.enum(['image', 'file']),
  contentType: z.string(),
  size: z.number().int().min(1),
  name: z.string(),
  sha256: z.string(),
  createdAt: z.string(),
  /** true ⇒ nội dung này đã có trong cùng vùng, trả lại tệp cũ (không ghi lần hai). */
  deduped: z.boolean(),
});
export type FileView = z.infer<typeof FileViewSchema>;

export const fileUpload = defineActionSpec({
  id: 'cake.file.upload', capability: 'cake.message.send', title: 'Tải tệp lên', kind: 'command',
  input: z.object({
    area: z.enum(FILE_AREAS),
    name: z.string().trim().min(1).max(255),
    data: z.custom<Uint8Array>((v) => v instanceof Uint8Array && v.length > 0, { message: 'Cần nội dung tệp' }),
  }),
  output: FileViewSchema, permission: 'cake:inbox-lap', risk: 'low', idempotent: true,
  expose: { rest: 'POST /api/v1/files', ui: true },
});

export const FILE_ACTIONS = [fileUpload] as const;
