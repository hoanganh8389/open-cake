// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-2: khuôn sự kiện bizcity_event@1 (open-ketoan BIZCITY-EVENT-v1 1.3.0-draft):
//   type = <key>.<thực thể>.<việc quá khứ>; data chỉ mã và số, không PII.
import { z } from 'zod';

export const ActorSchema = z.object({
  kind: z.enum(['user', 'apikey', 'ai', 'system', 'service']),
  id: z.string(),
  via: z.string().optional(), // vd 'mcp:twin-brain', 'cell:zalohub-01'
  onBehalfOf: z.string().optional(),
  turnId: z.string().optional(),
});
export type Actor = z.infer<typeof ActorSchema>;

/** `bizcity.cake.touch.recorded` · `bizcity.cake.contact.merged` … */
export const EVENT_TYPE_RE = /^bizcity\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/;

export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().regex(EVENT_TYPE_RE),
  version: z.number().int().min(1),
  tenantId: z.string(),
  occurredAt: z.string().datetime(),
  source: z.object({ module: z.string(), moduleVersion: z.string() }),
  subject: z.string().optional(), // docRef hoặc contact:<id>
  actor: ActorSchema,
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  data: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())])),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
