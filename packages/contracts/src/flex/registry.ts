// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-6: registry lớp dữ liệu mềm (canon CHUAN-DU-LIEU-TRUC-VA-LOP-MEM, R-DATA-1..9).
//   Bản đầu ở open-cake (D-PLAT-4), viết không phụ thuộc care-kernel để chuyển nguyên sang @bizcity/flex.
import { z } from 'zod';

/** Kiểu trường dùng cho cả meta lẫn record_type — đủ để màn CRUD tự sinh (RecordTypeScreen). */
export const FIELD_TYPES = ['string', 'text', 'int', 'bool', 'date', 'enum', 'string[]', 'json'] as const;
export const FieldSpecSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // enum
  pii: z.boolean().default(false),
  max: z.number().int().positive().optional(),
}).refine((f) => f.type !== 'enum' || (f.options?.length ?? 0) > 0, { message: 'enum cần options' });
export type FieldSpec = z.infer<typeof FieldSpecSchema>;

/** Tên khoá cấm ở lớp mềm (R-DATA-2, SC-DATA-2): tiền, số lượng, trạng thái, quyền, bí mật. */
export const FORBIDDEN_META_WORDS = ['price', 'amount', 'qty', 'tax', 'status', 'role', 'token', 'cookie', 'password', 'secret'] as const;
const noForbidden = (k: string) => !FORBIDDEN_META_WORDS.some((w) => k.split(/[._]/).includes(w));

export const MetaKeySpecSchema = z.object({
  store: z.enum(['entity_meta', 'user_meta', 'options']),
  key: z.string().regex(/^(bizcity\.)?[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/).refine(noForbidden, 'khoá chứa từ cấm ở lớp mềm (R-DATA-2)'),
  entityType: z.enum(['contact', 'conversation', 'channel_account', 'document', 'item']).optional(),
  scopes: z.array(z.enum(['tenant', 'channel_account', 'user'])).optional(),
  field: FieldSpecSchema,
  indexed: z.boolean().default(false),
  ownerApp: z.string().default('cake'),
}).superRefine((m, ctx) => {
  if (m.store === 'entity_meta' && !m.entityType) ctx.addIssue({ code: 'custom', message: 'entity_meta cần entityType' });
  if (m.store === 'options' && !m.scopes?.length) ctx.addIssue({ code: 'custom', message: 'options cần scopes' });
});
export type MetaKeySpec = z.infer<typeof MetaKeySpecSchema>;

export const RecordTypeSpecSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/),
  label: z.string(),
  version: z.number().int().min(1),
  fields: z.array(FieldSpecSchema).min(1),
  titleField: z.string(),
  listColumns: z.array(z.string()).min(1),
  permissions: z.object({ xem: z.string(), lap: z.string(), sua: z.string(), xoa: z.string() }),
  links: z.object({ contact: z.boolean().default(false), document: z.boolean().default(false) }).default({}),
}).superRefine((r, ctx) => {
  const keys = new Set(r.fields.map((f) => f.key));
  if (!keys.has(r.titleField)) ctx.addIssue({ code: 'custom', message: `titleField ${r.titleField} không có trong fields` });
  for (const c of r.listColumns) if (!keys.has(c)) ctx.addIssue({ code: 'custom', message: `cột ${c} không có trong fields` });
  for (const f of r.fields) if (!noForbidden(f.key)) ctx.addIssue({ code: 'custom', message: `trường ${f.key} chứa từ cấm (R-DATA-2)` });
});
export type RecordTypeSpec = z.infer<typeof RecordTypeSpecSchema>;

const perm = (x: string) => ({ xem: `cake:${x}-xem`, lap: `cake:${x}-lap`, sua: `cake:${x}-sua`, xoa: `cake:${x}-xoa` });

/** Khoá meta khởi đầu của cake (architecture/15 §4). */
export const CAKE_META_KEYS: MetaKeySpec[] = [
  { store: 'entity_meta', key: 'cake.contact.birthday', entityType: 'contact', field: { key: 'birthday', label: 'Sinh nhật', type: 'date', required: false, pii: true }, indexed: true, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.contact.gender', entityType: 'contact', field: { key: 'gender', label: 'Giới tính', type: 'enum', options: ['Nữ', 'Nam', 'Khác'], required: false, pii: false }, indexed: true, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.contact.real_name', entityType: 'contact', field: { key: 'real_name', label: 'Tên thật', type: 'string', required: false, pii: true, max: 200 }, indexed: false, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.contact.source', entityType: 'contact', field: { key: 'source', label: 'Biết shop qua', type: 'string', required: false, pii: false, max: 100 }, indexed: false, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.contact.size', entityType: 'contact', field: { key: 'size', label: 'Size hay mặc', type: 'string', required: false, pii: false, max: 20 }, indexed: false, ownerApp: 'cake' },
  // [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — cột riêng của Cake trên hàng (SPINE R-SPINE-5/10): không nằm trong bảng hàng theo chuẩn Kế Toán.
  { store: 'entity_meta', key: 'cake.item.display_name', entityType: 'item', field: { key: 'display_name', label: 'Tên khi chat', type: 'string', required: false, pii: false, max: 200 }, indexed: false, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.item.sellable', entityType: 'item', field: { key: 'sellable', label: 'Bán trong CRM', type: 'bool', required: false, pii: false }, indexed: true, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.item.image_url', entityType: 'item', field: { key: 'image_url', label: 'Ảnh', type: 'string', required: false, pii: false, max: 1000 }, indexed: false, ownerApp: 'cake' },
  { store: 'entity_meta', key: 'cake.item.description', entityType: 'item', field: { key: 'description', label: 'Mô tả', type: 'text', required: false, pii: false, max: 20000 }, indexed: false, ownerApp: 'cake' },
  { store: 'user_meta', key: 'cake.inbox.filters', field: { key: 'filters', label: 'Bộ lọc đã lưu', type: 'json', required: false, pii: false }, indexed: false, ownerApp: 'cake' },
  { store: 'user_meta', key: 'cake.contacts.columns', field: { key: 'columns', label: 'Cột hiện', type: 'string[]', required: false, pii: false }, indexed: false, ownerApp: 'cake' },
  { store: 'options', key: 'bizcity.cake.send_cap_per_hour', scopes: ['tenant', 'channel_account'], field: { key: 'send_cap_per_hour', label: 'Trần gửi mỗi giờ', type: 'int', required: true, pii: false }, indexed: false, ownerApp: 'cake' },
  { store: 'options', key: 'bizcity.cake.unmerge_window_days', scopes: ['tenant'], field: { key: 'unmerge_window_days', label: 'Số ngày được tách lại', type: 'int', required: true, pii: false }, indexed: false, ownerApp: 'cake' },
];

/** record_type khởi đầu (architecture/15 §3) — thay các bảng nhỏ của bản WP. */
export const CAKE_RECORD_TYPES: RecordTypeSpec[] = [
  { key: 'cake.quick_reply', label: 'Tin nhắn nhanh', version: 1, titleField: 'title', listColumns: ['title', 'shortcut'], permissions: perm('quick-reply'), links: { contact: false, document: false },
    fields: [{ key: 'title', label: 'Tên', type: 'string', required: true, pii: false, max: 80 }, { key: 'shortcut', label: 'Phím tắt', type: 'string', required: false, pii: false, max: 20 }, { key: 'body', label: 'Nội dung', type: 'text', required: true, pii: false, max: 2000 }] },
  { key: 'cake.label', label: 'Nhãn', version: 1, titleField: 'name', listColumns: ['name', 'tone'], permissions: perm('label'), links: { contact: false, document: false },
    fields: [{ key: 'name', label: 'Tên nhãn', type: 'string', required: true, pii: false, max: 40 }, { key: 'tone', label: 'Màu', type: 'enum', options: ['pri', 'ok', 'warn', 'out', 'none'], required: true, pii: false }] },
  { key: 'cake.saved_bank', label: 'Tài khoản ngân hàng', version: 1, titleField: 'bank', listColumns: ['bank', 'holder'], permissions: perm('saved-bank'), links: { contact: false, document: false },
    fields: [{ key: 'bank', label: 'Ngân hàng', type: 'string', required: true, pii: false }, { key: 'account_no', label: 'Số tài khoản', type: 'string', required: true, pii: true }, { key: 'holder', label: 'Chủ tài khoản', type: 'string', required: true, pii: true }] },
];
