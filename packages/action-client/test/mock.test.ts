// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 03:52 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-2: bộ giả lập phủ đủ danh mục action, trả đúng hợp đồng, đúng luật gửi / ghép; adapter http dựng đúng request.
import { describe, expect, it } from 'vitest';
import {
  channelList, channelTest, contactGet, contactList, contactMerge, contactSuggestions, contactTimeline, contactUnmerge,
  conversationList, conversationTag, messageList, messageSend,
} from '@open-cake/contracts';
import { fid } from '@open-cake/contracts/demo';
import { ApiError, buildRequest, createMockClient, missingMockHandlers } from '../src/index.js';

const HUONG = fid('C', 1);
const HUONG_FB = fid('C', 9);

describe('bộ giả lập — phủ hợp đồng', () => {
  it('mọi action trong danh mục có handler', () => expect(missingMockHandlers()).toEqual([]));
  it('danh sách tài khoản kênh, hội thoại, tin đúng hợp đồng', async () => {
    const c = createMockClient();
    expect((await c.call(channelList, {})).data).toHaveLength(6);
    const convs = await c.call(conversationList, { filter: 'all', limit: 50 });
    expect(convs.data[0]?.pinned).toBe(true);
    expect(convs.meta.nextCursor).toBeNull();
    expect((await c.call(messageList, { conversationId: fid('V', 1), limit: 50 })).data).toHaveLength(7);
  });
  it('danh bạ phân trang số', async () => {
    const r = await createMockClient().call(contactList, { page: 1, pageSize: 5, sort: 'last' });
    expect(r.data).toHaveLength(5);
    expect(r.meta.total).toBe(9);
  });
});

describe('luật gửi (R-CAKE-SEND)', () => {
  it('gửi tin ⇒ delivery accepted, hội thoại cập nhật, dòng thời gian thêm một dòng', async () => {
    const c = createMockClient();
    const before = (await c.call(contactTimeline, { contactId: HUONG, limit: 200 })).data.length;
    const m = await c.call(messageSend, { conversationId: fid('V', 1), text: 'Dạ em nhận được rồi ạ', attachments: [] });
    expect(m.data.delivery).toBe('accepted');
    expect((await c.call(contactTimeline, { contactId: HUONG, limit: 200 })).data.length).toBe(before + 1);
  });
  it('tin rỗng bị chặn ở hợp đồng', async () => {
    await expect(createMockClient().call(messageSend, { conversationId: fid('V', 1), text: '  ', attachments: [] })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('tài khoản chưa kết nối ⇒ CAKE_CHANNEL_NOT_CONNECTED', async () => {
    await expect(createMockClient().call(channelTest, { channelAccountId: fid('A', 5) })).rejects.toMatchObject({ reason: 'CAKE_CHANNEL_NOT_CONNECTED' });
  });
  it('Fanpage quá 24 giờ ⇒ CAKE_WINDOW_CLOSED', async () => {
    const c = createMockClient();
    c.store.now = () => new Date('2026-11-26T10:00:00+07:00');
    const e = await c.call(messageSend, { conversationId: fid('V', 5), text: 'Chào chị', attachments: [] }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ code: 'CONFLICT', reason: 'CAKE_WINDOW_CLOSED' });
  });
  it('gắn nhãn cập nhật cả hội thoại và trạng thái khách', async () => {
    const c = createMockClient();
    const r = await c.call(conversationTag, { conversationId: fid('V', 1), add: ['Đã chốt đơn'], remove: [] });
    expect(r.data.tags).toContain('Đã chốt đơn');
    expect((await c.call(contactGet, { contactId: HUONG })).data.state.tags).toContain('Đã chốt đơn');
  });
});

describe('ca vàng G5 — ghép có bằng chứng, tách lại được (R-CAKE-ID-2)', () => {
  it('gợi ý cùng người theo tên — chỉ là gợi ý, không tự ghép', async () => {
    const c = createMockClient();
    const s = await c.call(contactSuggestions, { contactId: HUONG });
    expect(s.data.map((x) => x.contactId)).toEqual([HUONG_FB]);
    expect((await c.call(contactGet, { contactId: HUONG_FB })).data.contact.status).toBe('active');
  });
  it('ghép theo tên bị chặn; ghép có người xác nhận thì chuyển danh tính, dòng thời gian gộp', async () => {
    const c = createMockClient();
    await expect(c.call(contactMerge, { contactId: HUONG_FB, intoContactId: HUONG, proof: { kind: 'name' } as never })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await c.call(contactMerge, { contactId: HUONG_FB, intoContactId: HUONG, proof: { kind: 'human', userId: '7' } });
    const huong = (await c.call(contactGet, { contactId: HUONG })).data;
    expect(huong.identities.map((i) => i.channel)).toContain('facebook_personal');
    const tl = (await c.call(contactTimeline, { contactId: HUONG, limit: 200 })).data;
    expect(tl.some((t) => t.channel === 'facebook_personal')).toBe(true);
    expect(tl[0]?.kind).toBe('merge');
    await c.call(contactUnmerge, { contactId: HUONG_FB });
    expect((await c.call(contactGet, { contactId: HUONG_FB })).data.contact.status).toBe('active');
    expect((await c.call(contactGet, { contactId: HUONG })).data.identities.map((i) => i.channel)).not.toContain('facebook_personal');
  });
  it('không tự ghép chính mình', async () => {
    await expect(createMockClient().call(contactMerge, { contactId: HUONG, intoContactId: HUONG, proof: { kind: 'phone' } })).rejects.toMatchObject({ reason: 'CAKE_MERGE_SELF' });
  });
});

describe('bốn trạng thái theo kịch bản', () => {
  it('empty ⇒ danh sách rỗng; error ⇒ có mã tra cứu; denied ⇒ FORBIDDEN nêu quyền', async () => {
    expect((await createMockClient({ scenario: 'empty' }).call(contactList, { page: 1, pageSize: 50, sort: 'last' })).data).toEqual([]);
    await expect(createMockClient({ scenario: 'error' }).call(channelList, {})).rejects.toMatchObject({ code: 'INTERNAL_ERROR', requestId: 'mock-1' });
    await expect(createMockClient({ scenario: 'denied' }).call(contactList, { page: 1, pageSize: 50, sort: 'last' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('adapter http — dựng request từ expose.rest', () => {
  it('GET có tham số đường dẫn + query; POST có thân', () => {
    expect(buildRequest(messageList, { conversationId: 'X1', limit: 50 })).toEqual({ method: 'GET', url: '/api/v1/conversations/X1/messages?limit=50', body: undefined });
    expect(buildRequest(conversationTag, { conversationId: 'X1', add: ['a'], remove: [] })).toEqual({ method: 'POST', url: '/api/v1/conversations/X1/tags', body: '{"add":["a"],"remove":[]}' });
  });
});

describe('lớp mềm core.record.* (R-CANON-15)', async () => {
  const { recordArchive, recordCreate, recordList, recordUpdate } = await import('@open-cake/contracts');
  it('tạo / sửa / lưu trữ đúng luật; loại chưa đăng ký bị chặn', async () => {
    const c = createMockClient();
    expect((await c.call(recordList, { type: 'cake.quick_reply', includeArchived: false })).data).toHaveLength(3);
    const r = await c.call(recordCreate, { type: 'cake.quick_reply', data: { title: 'Cảm ơn', body: 'Shop cảm ơn chị ạ' } });
    expect(r.data.title).toBe('Cảm ơn');
    await expect(c.call(recordCreate, { type: 'cake.quick_reply', data: { title: '', body: 'x' } })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'title' });
    await expect(c.call(recordList, { type: 'cake.unknown', includeArchived: false })).rejects.toMatchObject({ reason: 'CAKE_RECORD_TYPE_UNKNOWN' });
    await c.call(recordUpdate, { recordId: r.data.recordId, data: { title: 'Cảm ơn chị', body: 'Shop cảm ơn chị ạ' } });
    await c.call(recordArchive, { recordId: r.data.recordId, archived: true });
    expect((await c.call(recordList, { type: 'cake.quick_reply', includeArchived: false })).data).toHaveLength(3);
    expect((await c.call(recordList, { type: 'cake.quick_reply', includeArchived: true })).data.find((x) => x.recordId === r.data.recordId)?.status).toBe('archived');
  });
});

describe('danh mục độc lập sẵn ánh xạ (ADR-0004)', async () => {
  const { catalogItemCreate, catalogItemList, catalogItemUpdate, catalogPriceSet } = await import('@open-cake/contracts');
  it('local: tạo đúng chuẩn, trùng mã / tên bị chặn, đặt giá theo ĐVT của mã', async () => {
    const c = createMockClient();
    expect((await c.call(catalogItemList, { page: 1, pageSize: 50, includeRetired: false })).data).toHaveLength(4);
    const it1 = await c.call(catalogItemCreate, { sku: '101010004', name: 'Váy hoa Thu Đông — đỏ', units: [{ unit: 'Cái', ratio: 1, isDefaultSale: true }], taxCode: 'R08', categoryCode: '101010' });
    expect(it1.data.taxCode).toBe('8');
    expect(it1.data.warnings.map((w) => w.code)).toContain('CAT-NO-COMPANY-PRICE');
    await expect(c.call(catalogItemCreate, { sku: '101010004', name: 'Khác', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_SKU_TAKEN' });
    await expect(c.call(catalogItemCreate, { sku: '101010005', name: 'váy hoa thu đông — đỏ', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_ITEM_NAME_TAKEN' });
    await expect(c.call(catalogPriceSet, { priceListCode: 'CONGTY', itemId: it1.data.itemId, unit: 'Hộp', price: 1 })).rejects.toMatchObject({ field: 'unit' });
    await c.call(catalogPriceSet, { priceListCode: 'CONGTY', itemId: it1.data.itemId, unit: 'Cái', price: 390000 });
    expect((await c.call(catalogItemList, { q: '101010004', page: 1, pageSize: 50, includeRetired: false })).data[0]?.warnings.map((w) => w.code)).not.toContain('CAT-NO-COMPANY-PRICE');
  });
  it('ketoan: cột kế toán chỉ đọc ở mọi trạng thái, cột vận hành vẫn sửa được', async () => {
    const c = createMockClient();
    c.store.catalog.source = 'ketoan';
    const id = c.store.catalog.items[0]!.itemId;
    await expect(c.call(catalogItemUpdate, { itemId: id, patch: { name: 'Đổi tên' } })).rejects.toMatchObject({ reason: 'CAKE_CATALOG_READONLY' });
    await expect(c.call(catalogItemCreate, { sku: '199999999', name: 'Mới', units: [{ unit: 'Cái', ratio: 1 }], taxCode: '8' })).rejects.toMatchObject({ reason: 'CAKE_CATALOG_READONLY' });
    expect((await c.call(catalogItemUpdate, { itemId: id, patch: { displayName: 'Váy hồng (bán chạy)' } })).data.displayName).toBe('Váy hồng (bán chạy)');
    const { catalogPriceList, catalogSourceGet } = await import('@open-cake/contracts');
    expect((await c.call(catalogPriceList, { priceListCode: 'CONGTY', page: 1, pageSize: 200 })).data.length).toBeGreaterThanOrEqual(4);
    expect((await c.call(catalogSourceGet, {})).data).toMatchObject({ catalogSource: 'ketoan', externalRef: 'opencake:hoa-mai' });
  });
});
