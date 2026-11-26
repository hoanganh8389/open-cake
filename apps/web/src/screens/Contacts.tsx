// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-5: Danh bạ theo ảnh duyệt (contacts.png) trên cake.contact.list — lọc nhãn / giới tính / sinh nhật /
//   tìm, sắp xếp, phân trang số, tất cả trên URL. Bấm dòng ⇒ Contact 360. Thanh trạng thái Send Guard chưa có nguồn ⇒ ghi rõ, không số giả.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/inbox.ts.
import { contactList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { ChannelAvatar, Chip, Face, Ic, Pager, Search, StatusBar, Tabs, Tag, TAG_LOOK } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { ContactsChannelTools } from './contacts-channel.js'; // [2026-11-26 08:46 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3
import { ddmm, ddmmyyyy } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { t } from '../i18n/index.js';

const TABS = [
  { id: 'contacts', label: t.inbox.contacts.tabs.contacts, icon: Ic.user },
  { id: 'groups', label: t.inbox.contacts.tabs.groups, icon: Ic.users },
  { id: 'invites', label: t.inbox.contacts.tabs.invites, icon: Ic.userPlus },
  { id: 'history', label: t.inbox.contacts.tabs.history, icon: Ic.note },
];

export function Contacts() {
  const { query, setQuery } = useRoute();
  const page = Number(query.get('page') ?? 1);
  const tag = query.get('tag') ?? undefined;
  const gender = query.get('gender') ?? undefined;
  const q = query.get('q') ?? '';
  const sort = (query.get('sort') ?? 'last') as 'last' | 'name';
  const list = useQueryAction(contactList, { page, pageSize: 50, tag, gender, q: q || undefined, sort });
  const total = list.meta?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div className="page flush">
      <div className="row" style={{ padding: '16px 32px 0' }}>
        <Tabs items={TABS.map((x) => ({ ...x, count: x.id === 'contacts' ? total : null }))} value="contacts" onChange={(id) => id !== 'contacts' && go('soon', { what: id })} />
      </div>
      <div className="row wrap" style={{ padding: '16px 32px' }}>
        {Object.keys(TAG_LOOK).map((x) => <Chip key={x} on={tag === x} onClick={() => setQuery({ tag: tag === x ? null : x, page: null })}><Ic.tag />{x}</Chip>)}
        {[t.inbox.contacts.female, t.inbox.contacts.male].map((g) => <Chip key={g} on={gender === g} onClick={() => setQuery({ gender: gender === g ? null : g, page: null })}>{g}</Chip>)}
        <Chip on={sort === 'name'} onClick={() => setQuery({ sort: sort === 'name' ? null : 'name' })}>{t.inbox.contacts.sortName}</Chip>
        <Search placeholder={t.inbox.contacts.searchPh} sm style={{ width: 360 }} value={q} onChange={(v) => setQuery({ q: v, page: null })} />
        <ContactsChannelTools />
      </div>
      <div className="grow" style={{ overflow: 'auto', padding: '0 32px' }}>
        <QueryView q={list} empty={{ title: t.inbox.contacts.emptyTitle, desc: t.inbox.contacts.emptyDesc }}>
          {(rows) => (
            <table className="tbl">
              <thead><tr><th style={{ width: 64 }}>{t.inbox.contacts.thisPage(rows.length)}</th><th /><th>{t.inbox.contacts.colGender}</th><th>{t.inbox.contacts.colBirthday}</th><th>{t.inbox.contacts.colPhone}</th><th className="r">{t.inbox.contacts.colLast}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.contact.contactId} onClick={() => go(`contacts/${r.contact.contactId}`)} style={{ cursor: 'pointer' }}>
                    <td>{r.avatarRef ? <ChannelAvatar src={r.avatarRef} name={r.contact.displayName} size={48} /> : <Face name={r.contact.displayName} size={48} female={r.gender === t.inbox.contacts.female} />}</td>
                    <td>
                      <div style={{ fontSize: 19 }}>{r.contact.displayName}{r.state.unanswered && <span className="onl" title={t.inbox.contacts.unanswered} />}</div>
                      {r.realName && r.realName !== r.contact.displayName && <div className="xs subtle">{r.realName}</div>}
                      {r.state.tags.length > 0 && <div className="row gap8" style={{ marginTop: 6 }}>{r.state.tags.map((x) => <Tag key={x} name={x} />)}</div>}
                    </td>
                    <td>{r.gender && <span className={`gender ${r.gender === t.inbox.contacts.female ? 'f' : 'm'}`}>{r.gender === t.inbox.contacts.female ? '♀' : '♂'} {r.gender}</span>}</td>
                    <td className="muted">{r.birthday ? ddmmyyyy(r.birthday) : ''}</td>
                    <td>{r.phone ?? <span className="subtle">—</span>}</td>
                    <td className="r muted">{r.state.lastInAt ? ddmm(r.state.lastInAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryView>
        {list.data && list.data.length > 0 && <div className="row" style={{ padding: '16px 0 24px' }}>
          <span className="muted sm">{t.inbox.contacts.total(total)}</span><span className="grow" />
          <Pager page={page} total={pages} onPage={(p) => setQuery({ page: p === 1 ? null : p })} /><span className="grow" /><span className="muted sm">{t.inbox.contacts.pageOf(page, pages)}</span>
        </div>}
      </div>
      <StatusBar><span>{t.inbox.contacts.sendGuard} <b>—</b> {t.inbox.contacts.sendGuardLater}</span></StatusBar>
    </div>
  );
}
