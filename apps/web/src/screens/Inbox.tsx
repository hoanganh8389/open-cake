// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-4: Hộp thư 3 cột theo ảnh duyệt (inbox.png). Danh sách = cake.conversation.list theo tài khoản kênh
//   trên URL (?account=&conv=&filter=); cột thông tin dẫn sang Contact 360 — một người, mọi kênh (trục contact_id).
import { useState } from 'react';
import { channelList, contactGet, conversationList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Btn, ChannelBadge, ChannelDot, Face, GroupAvatar, Ic, Tag, cx } from '@open-cake/ui-kit';
import { QueryView } from '../app/QueryView.js';
import { hhmm } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { InboxChat } from './InboxChat.js';

// 3 tab như ảnh duyệt; 'Của tôi' vẫn có qua URL (?filter=mine) và sẽ vào menu ⋮ khi có phiên người dùng (PHASE-004).
const FILTERS = [['all', 'Tất cả'], ['unread', 'Chưa đọc'], ['unanswered', 'Chờ trả lời']] as const;

function InfoPanel({ contactId }: { contactId: string }) {
  const c = useQueryAction(contactGet, { contactId });
  return (
    <aside className="dinfo">
      <QueryView q={c}>
        {(d) => (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <Face name={d.contact.displayName} size={88} />
              <div style={{ fontSize: 20, fontWeight: 600 }}>{d.contact.displayName}</div>
              <div className="muted">{String(d.meta['cake.contact.real_name'] ?? '')}</div>
            </div>
            <h4>Kênh của khách này</h4>
            <div className="row wrap gap8">{Object.entries(d.state.channels).map(([ch, n]) => <span key={ch} className="row gap8"><ChannelBadge channel={ch} /><span className="xs subtle">{n}</span></span>)}</div>
            <h4>Nhãn</h4><div className="row wrap gap8">{d.state.tags.map((t) => <Tag key={t} name={t} size="md" />)}</div>
            <Btn out block className="mt16" onClick={() => go(`contacts/${contactId}`)}><Ic.user />Mở Contact 360</Btn>
          </>
        )}
      </QueryView>
    </aside>
  );
}

export function Inbox() {
  const { query, setQuery } = useRoute();
  const account = query.get('account') ?? undefined;
  const filter = (query.get('filter') ?? 'all') as 'all' | 'unread' | 'unanswered' | 'mine';
  const [info, setInfo] = useState(false);
  const accounts = useQueryAction(channelList, {});
  const list = useQueryAction(conversationList, { channelAccountId: account, filter, limit: 200 });
  const convs = list.data ?? [];
  const cur = convs.find((c) => c.conversationId === query.get('conv')) ?? convs[0];
  const acc = (accounts.data ?? []).find((a) => a.channelAccountId === (cur?.channelAccountId ?? account));
  return (
    <div className="page flush">
      <div className={cx('dinbox', info && 'info')}>
        <section className="dlist">
          <div className="top"><div className="sbox"><Ic.search />{acc ? acc.label : 'Mọi tài khoản kênh'}</div>
            {account && <button type="button" className="plus" title="Xem mọi tài khoản" onClick={() => setQuery({ account: null, conv: null })}><Ic.x style={{ width: 22, height: 22 }} /></button>}</div>
          <div className="tabs2">
            {FILTERS.map(([id, label]) => <button type="button" key={id} className={cx(filter === id && 'on')} onClick={() => setQuery({ filter: id === 'all' ? null : id, conv: null })}>{label}</button>)}
          </div>
          <div className="items">
            <QueryView q={list} empty={{ title: 'Không có hội thoại', desc: filter === 'all' ? 'Khi khách nhắn tới tài khoản kênh này, hội thoại sẽ hiện ở đây.' : 'Không có hội thoại khớp bộ lọc.' }}>
              {(cs) => <>{cs.map((c) => (
                <div key={c.conversationId} className={cx('ditem', cur?.conversationId === c.conversationId && 'on')} onClick={() => setQuery({ conv: c.conversationId })}>
                  <div style={{ position: 'relative' }}>
                    {c.kind === 'group_thread' ? <GroupAvatar /> : <Face name={c.title} size={56} />}
                    <ChannelDot channel={(accounts.data ?? []).find((a) => a.channelAccountId === c.channelAccountId)?.channel} />
                  </div>
                  <div className="b">
                    <div className="r1">{c.pinned && <span style={{ color: '#ef4444' }}>📍</span>}<span className="nm">{c.title}</span><span className="tm">{hhmm(c.lastAt)}</span></div>
                    <div className="r2"><span className="pv">{c.kind === 'comment_thread' && '💬 '}{c.lastText}</span>{c.unread ? <span className="un">{c.unread}</span> : c.lastDirection === 'out' ? <Ic.back className="rp" /> : null}</div>
                    {c.tags.length > 0 && <div className="tags">{c.tags.map((t) => <Tag key={t} name={t} />)}</div>}
                  </div>
                </div>
              ))}</>}
            </QueryView>
          </div>
        </section>
        {cur ? <InboxChat conv={cur} via={{ label: acc?.label ?? '', channel: acc?.channel ?? '' }} info={info} onToggleInfo={() => setInfo(!info)} /> : <section className="dchat" />}
        {info && cur && <InfoPanel contactId={cur.contactId} />}
      </div>
    </div>
  );
}
