// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-2: phong bì API đúng hình bizcity_api@1 của open-ketoan
//   (packages/contracts/src/api.ts) + phân trang con trỏ (đề xuất minor Q-API-1). Bản đầu — chuyển sang @bizcity/contracts khi có.
import { z } from 'zod';
import { ErrorCodeSchema } from './errors.js';

/** Phân trang số (chuẩn bizcity_api@1): danh bạ, chiến dịch, báo cáo. Trần 200. */
export const PageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  total: z.number().int().min(0),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

/** Phân trang con trỏ (+cake): tin nhắn, dòng thời gian, hội thoại. Con trỏ mờ (base64url của (at, id)). */
export const CursorMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable().optional(),
});
export type CursorMeta = z.infer<typeof CursorMetaSchema>;

/** Biên nhận bằng chứng trả về sau mỗi thao tác ghi (bizcity_evidence@1). */
export const ReceiptSchema = z.object({ evidenceId: z.string(), hash: z.string(), at: z.string() });

export const SuccessMetaSchema = z
  .object({ requestId: z.string().optional(), receipt: ReceiptSchema.optional(), replayed: z.boolean().optional() })
  .and(PageMetaSchema.partial())
  .and(CursorMetaSchema.partial());

/** `{ ok: true, data, meta? }` — tạo schema cho một kiểu `data` cụ thể. */
export const apiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data, meta: SuccessMetaSchema.optional() });

/** Gợi ý cách gỡ (bizcity_remedy@1, rút gọn cho phía giao diện). */
export const RemedySchema = z.object({
  steps: z.array(z.string()).min(1),
  owner: z.enum(['user', 'admin', 'developer', 'system']),
});

/** `{ ok: false, error }` — lý do cụ thể nằm ở `details.reason` có tiền tố chủ (vd `CAKE_WINDOW_CLOSED`). */
export const ApiFailureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().optional(),
    traceId: z.string().optional(),
    details: z
      .object({
        reason: z.string().regex(/^[A-Z][A-Z0-9_]+$/).optional(),
        field: z.string().optional(),
        hint: z.string().optional(),
        help_code: z.string().optional(),
        remedy: RemedySchema.optional(),
      })
      .passthrough()
      .optional(),
  }),
});
export type ApiFailure = z.infer<typeof ApiFailureSchema>;
