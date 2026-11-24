// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-3, S002-6, S002-7, S002-8: danh mục action, registry lớp mềm, bộ mẫu Hoa Mai đều đúng hợp đồng.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CAKE_ACTIONS, CAKE_META_KEYS, CAKE_REASONS, CAKE_RECORD_TYPES, ChannelAccountSchema, ContactSchema, ContactStateSchema, ConversationSchema,
  IdentitySchema, MessageSchema, MetaKeySpecSchema, RecordTypeSpecSchema, TimelineItemSchema, cakeCatalog, createActionCatalog, defineActionSpec,
} from '../src/index.js';
import { channelAccounts, contactMeta, contactStates, contacts, identities } from '../fixtures/demo/hoa-mai-people.js';
import { conversations, messagesByConversation, timelineHuong } from '../fixtures/demo/hoa-mai-inbox.js';

describe('danh mục action (R-CANON-14)', () => {
  it('có đủ 19 action, không trùng id / route', () => {
    expect(Object.keys(cakeCatalog)).toHaveLength(CAKE_ACTIONS.length);
    expect(CAKE_ACTIONS.length).toBe(19);
  });
  it('lý do lỗi khai trong action đều có trong CAKE_REASONS', () => {
    for (const a of CAKE_ACTIONS) for (const r of a.reasons ?? []) expect(Object.keys(CAKE_REASONS), `${a.id}: ${r}`).toContain(r);
  });
  it('command gọi từ ngoài đều idempotent; AI không chạm action rủi ro cao', () => {
    for (const a of CAKE_ACTIONS) {
      if (a.kind === 'command') expect(a.idempotent || a.risk === 'low', a.id).toBeTruthy();
      if (a.risk === 'high') expect(a.expose.mcp, a.id).toBeUndefined();
    }
  });
  it('chặn trùng route và khai sai khuôn', () => {
    const base = { capability: 'x.y', title: 't', kind: 'query' as const, input: z.object({}), output: z.object({}), permission: 'cake:a-xem', risk: 'read' as const };
    const a = defineActionSpec({ ...base, id: 'cake.a.list', expose: { rest: 'GET /api/v1/a' } });
    const b = defineActionSpec({ ...base, id: 'cake.b.list', expose: { rest: 'GET /api/v1/a' } });
    expect(() => createActionCatalog([a, b])).toThrow(/trùng route/);
    expect(() => defineActionSpec({ ...base, id: 'Cake.Bad', expose: {} })).toThrow(/sai khuôn/);
    expect(() => defineActionSpec({ ...base, id: 'cake.x.go', kind: 'command', risk: 'high', expose: { mcp: 'propose' } })).toThrow(/rủi ro cao/);
  });
});

describe('registry lớp mềm (R-CANON-15)', () => {
  it('mọi khoá meta và record_type khởi đầu hợp lệ', () => {
    for (const m of CAKE_META_KEYS) expect(MetaKeySpecSchema.safeParse(m).success, m.key).toBe(true);
    for (const r of CAKE_RECORD_TYPES) expect(RecordTypeSpecSchema.safeParse(r).success, r.key).toBe(true);
  });
  it('chặn khoá chứa từ cấm (tiền, trạng thái, bí mật)', () => {
    const bad = { store: 'entity_meta', key: 'cake.contact.price', entityType: 'contact', field: { key: 'price', label: 'Giá', type: 'int' } };
    expect(MetaKeySpecSchema.safeParse(bad).success).toBe(false);
  });
});

describe('bộ mẫu Shop Hoa Mai đúng hợp đồng', () => {
  const all = <T>(s: z.ZodType<T>, xs: unknown[]) => xs.forEach((x, i) => { const r = s.safeParse(x); expect(r.success, `#${i} ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true); });
  it('tài khoản kênh, khách, trạng thái, danh tính, hội thoại, tin, dòng thời gian', () => {
    all(ChannelAccountSchema, channelAccounts);
    all(ContactSchema, contacts);
    all(ContactStateSchema, contactStates);
    all(IdentitySchema, identities);
    all(ConversationSchema, conversations);
    all(MessageSchema, Object.values(messagesByConversation).flat());
    all(TimelineItemSchema, timelineHuong);
  });
  it('khoá meta dùng trong bộ mẫu đều đã đăng ký (R-DATA-1)', () => {
    const registered = new Set(CAKE_META_KEYS.map((m) => m.key));
    for (const kv of Object.values(contactMeta)) for (const k of Object.keys(kv)) expect(registered, k).toContain(k);
  });
  it('ca vàng: một người, nhiều mặt Facebook + Zalo, một contact_id', () => {
    const huong = contacts[0]!.contactId;
    const chans = new Set(identities.filter((i) => i.contactId === huong).map((i) => i.channel));
    expect([...chans].sort()).toEqual(['facebook_comment', 'facebook_page', 'phone', 'zalo_personal']);
    expect(new Set(timelineHuong.map((t) => t.contactId))).toEqual(new Set([huong]));
    const psid = identities.find((i) => i.channel === 'facebook_page');
    expect(psid?.confidence).toBe('proven');
    expect(psid?.proof?.kind).toBe('fb_private_reply');
  });
});
