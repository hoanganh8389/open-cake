// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-5: Danh bạ theo ảnh duyệt (contacts.png) trên cake.contact.list — lọc nhãn / giới tính / sinh nhật /
//   tìm, sắp xếp, phân trang số, tất cả trên URL. Bấm dòng ⇒ Contact 360. Thanh trạng thái Send Guard chưa có nguồn ⇒ ghi rõ, không số giả.
import { contactList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Chip, Face, Ic, Pager, Search, StatusBar, Tabs, Tag, TAG_LOOK } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { ddmm, ddmmyyyy } from '../app/format.js';
import { go, useRoute } from '../app/route.js';

const TABS = [
  { id: 'contacts', label: 'Liên hệ', icon: Ic.user },
  { id: 'groups', label: 'Nhóm', icon: Ic.users },
  { id: 'invites', label: 'Lời mời', icon: Ic.userPlus },
  { id: 'history', label: 'Lịch sử', icon: Ic.note },
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
        <Tabs items={TABS.map((t) => ({ ...t, count: t.id === 'contacts' ? total : null }))} value="contacts" onChange={(id) => id !== 'contacts' && go('soon', { what: id })} />
      </div>
      <div className="row wrap" style={{ padding: '16px 32px' }}>
        {Object.keys(TAG_LOOK).map((t) => <Chip key={t} on={tag === t} onClick={() => setQuery({ tag: tag === t ? null : t, page: null })}><Ic.tag />{t}</Chip>)}
        {['Nữ', 'Nam'].map((g) => <Chip key={g} on={gender === g} onClick={() => setQuery({ gender: gender === g ? null : g, page: null })}>{g}</Chip>)}
        <Chip on={sort === 'name'} onClick={() => setQuery({ sort: sort === 'name' ? null : 'name' })}>Tên A → Z</Chip>
        <Search placeholder="Tên, số điện thoại…" sm style={{ width: 360 }} value={q} onChange={(v) => setQuery({ q: v, page: null })} />
      </div>
      <div className="grow" style={{ overflow: 'auto', padding: '0 32px' }}>
        <QueryView q={list} empty={{ title: 'Không có liên hệ khớp bộ lọc', desc: 'Bỏ bớt bộ lọc hoặc kết nối thêm kênh để khách tự vào danh bạ.' }}>
          {(rows) => (
            <table className="tbl">
              <thead><tr><th style={{ width: 64 }}>Trang này ({rows.length})</th><th /><th>Giới tính</th><th>Sinh nhật</th><th>Điện thoại</th><th className="r">Tin gần nhất</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.contact.contactId} onClick={() => go(`contacts/${r.contact.contactId}`)} style={{ cursor: 'pointer' }}>
                    <td><Face name={r.contact.displayName} size={48} female={r.gender === 'Nữ'} /></td>
                    <td>
                      <div style={{ fontSize: 19 }}>{r.contact.displayName}{r.state.unanswered && <span className="onl" title="Chờ trả lời" />}</div>
                      {r.state.tags.length > 0 && <div className="row gap8" style={{ marginTop: 6 }}>{r.state.tags.map((t) => <Tag key={t} name={t} />)}</div>}
                    </td>
                    <td>{r.gender && <span className={`gender ${r.gender === 'Nữ' ? 'f' : 'm'}`}>{r.gender === 'Nữ' ? '♀' : '♂'} {r.gender}</span>}</td>
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
          <span className="muted sm">{total} liên hệ</span><span className="grow" />
          <Pager page={page} total={pages} onPage={(p) => setQuery({ page: p === 1 ? null : p })} /><span className="grow" /><span className="muted sm">Trang {page}/{pages}</span>
        </div>}
      </div>
      <StatusBar><span>Hàng chờ gửi và hạn mức: <b>—</b> (có ở PHASE-011 Send Guard)</span></StatusBar>
    </div>
  );
}
