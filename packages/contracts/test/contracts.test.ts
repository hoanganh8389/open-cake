// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-8: fixture hợp đồng hợp lệ; ca sai bị từ chối đúng luật trục contact.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ChannelCommandSchema, ContactLookupInputSchema, ContactLookupResultSchema, IdentityKeySchema, ProofSchema, TouchSchema, apiSuccess,
  ApiFailureSchema, MessageSchema, contactMerge,
} from '../src/index.js';

const fx = (name: string) => JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8'));
const issues = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe('bizcity_touch@1', () => {
  // [2026-11-26 03:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-4 — 2 ví dụ Zalo trùng từng chữ với bài test buildBizcityTouch của zalo-hub (PHASE-018)
  it.each(['touch.page-message.json', 'touch.comment.json', 'touch.zalo-delivery.json', 'touch.zalo-message.json', 'touch.zalo-message-sent.json', 'touch.fb-personal-message.json'])('%s hợp lệ', (f) => {
    const r = TouchSchema.safeParse(fx(f));
    expect(issues(r)).toEqual([]);
  });
  it('từ chối kênh "facebook" trơn', () => {
    expect(TouchSchema.safeParse({ ...fx('touch.page-message.json'), channel: 'facebook' }).success).toBe(false);
  });
  it('từ chối PSID mà scope global (PSID chỉ có nghĩa trong page:<id>)', () => {
    const t = fx('touch.page-message.json');
    t.sender.scope = 'global';
    expect(issues(TouchSchema.safeParse(t)).join()).toMatch(/không hợp với kênh facebook_page/);
  });
  it('từ chối thân có contactId / tenantId (Cell không quyết người, không quyết đơn vị)', () => {
    expect(TouchSchema.safeParse({ ...fx('touch.page-message.json'), contactId: '01JDAC00000000000000000001' }).success).toBe(false);
    expect(TouchSchema.safeParse({ ...fx('touch.page-message.json'), tenantId: '1' }).success).toBe(false);
  });
  it('comment phải có anchor.commentId', () => {
    const t = fx('touch.comment.json');
    t.thread.anchor = { postId: 'p_555' };
    expect(issues(TouchSchema.safeParse(t)).join()).toMatch(/anchor.commentId/);
  });
  it('docKey phải bắt đầu bằng kênh', () => {
    expect(TouchSchema.safeParse({ ...fx('touch.comment.json'), docKey: 'facebook_page|1|2|3' }).success).toBe(false);
  });
});

describe('bizcity_channel_command@1', () => {
  it('private reply hợp lệ', () => expect(issues(ChannelCommandSchema.safeParse(fx('channel-command.private-reply.json')))).toEqual([]));
  it('trả lời comment không qua tài khoản Zalo', () => {
    const c = { ...fx('channel-command.private-reply.json'), channel: 'zalo_personal' };
    expect(issues(ChannelCommandSchema.safeParse(c)).join()).toMatch(/facebook_page/);
  });
  it('khoá idempotency đúng khuôn cake:<touch>:<việc>:<lần>', () => {
    expect(ChannelCommandSchema.safeParse({ ...fx('channel-command.private-reply.json'), idempotencyKey: 'abc' }).success).toBe(false);
  });
});

describe('bizcity_contact@1', () => {
  it('lookup mẫu hợp lệ', () => {
    const { input, result } = fx('contact.lookup.json');
    expect(ContactLookupInputSchema.safeParse(input).success).toBe(true);
    expect(ContactLookupResultSchema.safeParse(result).success).toBe(true);
  });
});

describe('trục contact — luật danh tính', () => {
  it('không có bằng chứng "name" (R-CAKE-ID-2)', () => {
    expect(ProofSchema.safeParse({ kind: 'name' }).success).toBe(false);
    expect(ProofSchema.safeParse({ kind: 'human' }).success).toBe(false); // thiếu người xác nhận
    expect(ProofSchema.safeParse({ kind: 'human', userId: '7' }).success).toBe(true);
  });
  it('ghép không được tự ghép với chính mình', () => {
    const id = '01JDAC00000000000000000001';
    expect(contactMerge.input.safeParse({ contactId: id, intoContactId: id, proof: { kind: 'phone' } }).success).toBe(false);
  });
  it('scope theo kênh', () => {
    expect(IdentityKeySchema.safeParse({ channel: 'facebook_group', scope: 'group:5550001', externalId: '1' }).success).toBe(true);
    expect(IdentityKeySchema.safeParse({ channel: 'facebook_group', scope: 'page:5550001', externalId: '1' }).success).toBe(false);
  });
});

describe('phong bì bizcity_api@1', () => {
  it('thành công và thất bại đúng hình', () => {
    const ok = apiSuccess(MessageSchema.array()).safeParse({ ok: true, data: [], meta: { requestId: 'r_1', nextCursor: null } });
    expect(issues(ok)).toEqual([]);
    const fail = ApiFailureSchema.safeParse({ ok: false, error: { code: 'CONFLICT', message: 'Quá 24 giờ', requestId: 'r_2', details: { reason: 'CAKE_WINDOW_CLOSED' } } });
    expect(issues(fail)).toEqual([]);
    expect(ApiFailureSchema.safeParse({ ok: false, error: { code: 'POSTING_FAILED', message: 'x' } }).success).toBe(false); // mã kế toán không thuộc cake
  });
});
