// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-3: khai báo năng lực (action spec) theo canon R-CANON-14:
//   một chức năng = một spec ⇒ REST + MCP + React (useAction) + sự kiện. Spec chỉ là HỢP ĐỒNG (không có run()); máy chủ hiện thực sau.
import type { z } from 'zod';
import { EVENT_TYPE_RE } from './event.js';

/** R0 đọc · R1 nháp · R2 gửi / đổi người (cần người xác nhận) — open-ketoan R-REV-9, canon §5. */
export type Risk = 'read' | 'low' | 'medium' | 'high';

export interface ActionExpose {
  /** `GET /api/v1/...` — một route REST duy nhất cho action. */
  rest?: `${'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'} /api/v1/${string}`;
  /** MCP: `read` (R0) hoặc `propose` (tạo nháp / cần confirm_token). Không khai ⇒ AI không gọi được. */
  mcp?: 'read' | 'propose';
  /** có hook React `useAction` / `useQueryAction`. */
  ui?: boolean;
}

export interface ActionSpec<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  /** `<app>.<thực thể>.<việc>` — vd `cake.message.send`. */
  id: string;
  /** năng lực công bố ở /system/capabilities — vd `cake.message.send`. */
  capability: string;
  title: string;
  kind: 'query' | 'command';
  input: I;
  output: O;
  /** `cake:<chức-năng>-<xem|lap|sua|xoa|huy|duyet|xuat|gop>` */
  permission: string;
  risk: Risk;
  /** command gọi từ ngoài bắt buộc Idempotency-Key. */
  idempotent?: boolean;
  emits?: readonly string[];
  /** lý do lỗi riêng có thể trả (details.reason). */
  reasons?: readonly string[];
  expose: ActionExpose;
}

const ACTION_ID_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const PERMISSION_RE = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

/** Khai một action spec — kiểm khuôn ngay khi nạp module (lỗi khai báo = lỗi lập trình, ném luôn). */
export function defineActionSpec<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(spec: ActionSpec<I, O>): ActionSpec<I, O> {
  if (!ACTION_ID_RE.test(spec.id)) throw new Error(`action id sai khuôn: ${spec.id}`);
  if (!PERMISSION_RE.test(spec.permission)) throw new Error(`quyền sai khuôn ở ${spec.id}: ${spec.permission}`);
  for (const t of spec.emits ?? []) if (!EVENT_TYPE_RE.test(t)) throw new Error(`sự kiện sai khuôn ở ${spec.id}: ${t}`);
  if (spec.kind === 'command' && spec.expose.rest?.startsWith('GET ')) throw new Error(`command không dùng GET: ${spec.id}`);
  if (spec.expose.mcp && spec.risk === 'high') throw new Error(`AI không được gọi action rủi ro cao: ${spec.id}`);
  return spec;
}

export type ActionCatalog = Readonly<Record<string, ActionSpec>>;

/** Gom spec thành danh mục; chặn trùng id và trùng route (SC-REUSE-4). */
export function createActionCatalog(specs: readonly ActionSpec[]): ActionCatalog {
  const byId: Record<string, ActionSpec> = {};
  const routes = new Map<string, string>();
  for (const s of specs) {
    if (byId[s.id]) throw new Error(`trùng action id: ${s.id}`);
    byId[s.id] = s;
    const r = s.expose.rest;
    if (r) {
      const prev = routes.get(r);
      if (prev) throw new Error(`trùng route ${r}: ${prev} và ${s.id}`);
      routes.set(r, s.id);
    }
  }
  return Object.freeze(byId);
}

export type ActionInput<S extends ActionSpec> = z.input<S['input']>;
export type ActionOutput<S extends ActionSpec> = z.output<S['output']>;
