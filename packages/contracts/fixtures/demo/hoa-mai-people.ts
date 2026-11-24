// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer fixtures
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-7: bộ dữ liệu mẫu "Shop Hoa Mai" (GIẢ LẬP — tên, số, UID là ví dụ) lấy từ bản mẫu
//   giao diện docs/ui/mockup-src/src/data.js, viết lại theo hình hợp đồng. Chị Hương mang ca vàng Facebook (comment → private reply → Page → Zalo).
import type { z } from 'zod';
import type { ChannelAccountSchema, ContactSchema, ContactStateSchema, IdentitySchema } from '../../src/index.js';

// Fixture là dữ liệu trên dây ⇒ kiểu ĐẦU VÀO của schema (chưa có nhãn ULID); test parse qua schema để kiểm.
type ChannelAccount = z.input<typeof ChannelAccountSchema>;
type Contact = z.input<typeof ContactSchema>;
type ContactState = z.input<typeof ContactStateSchema>;
type Identity = z.input<typeof IdentitySchema>;

const pad = (n: number) => String(n).padStart(20, '0');
/** ULID giả có tiền tố theo loại: A tài khoản kênh, C khách, V hội thoại, M tin. */
export const fid = (kind: 'A' | 'C' | 'V' | 'M', n: number) => `01JDA${kind}${pad(n)}`;
export const T0 = '2026-11-24T00:00:00+07:00';

export const channelAccounts: ChannelAccount[] = [
  { channelAccountId: fid('A', 1), channel: 'zalo_personal', kind: 'personal', externalAccountId: '7350219485123001001', label: 'Shop Hoa Mai', ownerUserId: '7', status: 'connected', testedAt: T0, unread: 3 },
  { channelAccountId: fid('A', 2), channel: 'zalo_personal', kind: 'personal', externalAccountId: '7350219485123001002', label: 'Hoa Mai CSKH', ownerUserId: '8', status: 'connected', testedAt: T0, unread: 2 },
  { channelAccountId: fid('A', 3), channel: 'zalo_personal', kind: 'personal', externalAccountId: '7350219485123001003', label: 'Hoa Mai Kho Sỉ', ownerUserId: '9', status: 'connected', testedAt: T0, unread: 2 },
  { channelAccountId: fid('A', 4), channel: 'facebook_page', kind: 'page', externalAccountId: '1234567890', label: 'Hoa Mai Fashion', ownerUserId: '7', status: 'connected', testedAt: T0, unread: 2 },
  { channelAccountId: fid('A', 5), channel: 'facebook_personal', kind: 'personal', externalAccountId: '100089123456790', label: 'Hoa Mai Outlet', ownerUserId: '7', status: 'auth_required', testedAt: null, unread: 0 },
  { channelAccountId: fid('A', 6), channel: 'facebook_group', kind: 'group', externalAccountId: '5550001', label: 'Hội yêu váy hoa', ownerUserId: '7', status: 'connected', testedAt: T0, unread: 1 },
];

type P = { name: string; real?: string; tags: string[]; sex: string; dob?: string; phone: string; last: string };
const people: P[] = [
  { name: 'Chị Hương (váy hoa)', real: 'Nguyễn Thu Hương', tags: ['Khách VIP', 'Đặt hàng'], sex: 'Nữ', dob: '1992-10-21', phone: '0912345671', last: '2026-11-24T10:28:00+07:00' },
  { name: 'Anh Khoa - sỉ HN', real: 'Trần Minh Khoa', tags: ['Khách sỉ'], sex: 'Nam', dob: '1988-03-05', phone: '0987654322', last: '2026-11-24T10:16:00+07:00' },
  { name: 'Lê Thảo Vy', tags: ['Đặt hàng'], sex: 'Nữ', dob: '1999-02-14', phone: '0934567893', last: '2026-11-24T10:03:00+07:00' },
  { name: 'Phạm Gia Bảo', tags: ['Chờ phản hồi'], sex: 'Nam', phone: '0905678904', last: '2026-11-24T08:20:00+07:00' },
  { name: 'Quỳnh Chi (phụ kiện)', real: 'Đỗ Quỳnh Chi', tags: ['Khách VIP'], sex: 'Nữ', dob: '1996-07-30', phone: '0976543215', last: '2026-11-24T09:42:00+07:00' },
  { name: 'Võ Thanh Tùng', tags: [], sex: 'Nam', phone: '0868123456', last: '2026-11-24T07:20:00+07:00' },
  { name: 'Hoàng Mỹ Linh', tags: ['Đặt hàng'], sex: 'Nữ', dob: '2000-09-09', phone: '0399887766', last: '2026-11-24T05:30:00+07:00' },
  { name: 'Bùi Đức Anh', tags: [], sex: 'Nam', phone: '0918223344', last: '2026-11-23T17:10:00+07:00' },
];

export const contacts: Contact[] = people.map((p, i) => ({
  contactId: fid('C', i + 1), kind: 'person', displayName: p.name, status: 'active', mergedInto: null, createdAt: T0,
}));

export const contactStates: ContactState[] = people.map((p, i) => ({
  contactId: fid('C', i + 1), stage: p.tags.includes('Đặt hàng') ? 'dat_hang' : null, tags: p.tags, ownerUserId: '7',
  lastInAt: p.last, lastOutAt: i % 2 ? p.last : null, unanswered: i % 3 === 0,
  channels: i === 0 ? { zalo_personal: 6, facebook_page: 3, facebook_comment: 2 } : { zalo_personal: 3 },
}));

/** Thuộc tính lớp mềm (entity_meta) — sinh nhật, giới tính, tên thật. */
export const contactMeta: Record<string, Record<string, string>> = Object.fromEntries(people.map((p, i) => [fid('C', i + 1), {
  'cake.contact.gender': p.sex, ...(p.dob ? { 'cake.contact.birthday': p.dob } : {}), ...(p.real ? { 'cake.contact.real_name': p.real } : {}),
}]));

const idn = (n: number, contactId: string, channel: Identity['channel'], scope: string, externalId: string, confidence: Identity['confidence'], proofKind: string | null): Identity => ({
  identityId: String(n), contactId, channel, scope, externalId, displayName: null, confidence,
  proof: proofKind ? { kind: proofKind as 'phone', eventId: `01JDAB0000000000000000T00${n % 10}` } : null, validFrom: T0, validTo: null,
});

export const identities: Identity[] = [
  ...people.map((p, i) => idn(100 + i, fid('C', i + 1), 'phone', 'global', p.phone, 'proven', 'phone')),
  ...people.map((_, i) => idn(200 + i, fid('C', i + 1), 'zalo_personal', 'global', `88${String(i + 1).padStart(10, '0')}`, 'asserted', null)),
  // Ca vàng: Chị Hương — comment (asserted) và PSID Page (proven qua private reply)
  idn(301, fid('C', 1), 'facebook_comment', 'comment:1234567890', '99887766', 'asserted', null),
  idn(302, fid('C', 1), 'facebook_page', 'page:1234567890', '2468', 'proven', 'fb_private_reply'),
];
