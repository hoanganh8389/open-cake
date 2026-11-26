// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-4: Hộp thư 3 cột theo ảnh duyệt (inbox.png). Danh sách = cake.conversation.list theo tài khoản kênh
//   trên URL (?account=&conv=&filter=); cột thông tin dẫn sang Contact 360 — một người, mọi kênh (trục contact_id).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/inbox.ts.
import { useEffect, useRef, useState } from 'react';
import { channelList, contactGet, conversationList } from '@open-cake/contracts';
import { useQueryAction, useInfiniteQueryAction } from '@open-cake/action-client';
import { ChannelAvatar, Btn, ChannelBadge, ChannelDot, Face, Ic, Tag, cx } from '@open-cake/ui-kit';
import { QueryView, LoadMore } from '../app/QueryView.js';
import { hhmm } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { InboxChat } from './InboxChat.js';
import { t } from '../i18n/index.js';

// 3 tab như ảnh duyệt; 'Của tôi' vẫn có qua URL (?filter=mine) và sẽ vào menu ⋮ khi có phiên người dùng (PHASE-004).
const FILTERS = [['all', t.inbox.list.filters.all], ['unread', t.inbox.list.filters.unread], ['unanswered', t.inbox.list.filters.unanswered]] as const;

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
            <h4>{t.inbox.info.channels}</h4>
            <div className="row wrap gap8">{Object.entries(d.state.channels).map(([ch, n]) => <span key={ch} className="row gap8"><ChannelBadge channel={ch} /><span className="xs subtle">{n}</span></span>)}</div>
            <h4>{t.inbox.info.tags}</h4><div className="row wrap gap8">{d.state.tags.map((x) => <Tag key={x} name={x} size="md" />)}</div>
            <Btn out block className="mt16" onClick={() => go(`contacts/${contactId}`)}><Ic.user />{t.inbox.info.open360}</Btn>
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
  // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: con trỏ 50 hội thoại / trang, cuộn tới cuối tải tiếp.
  // [2026-11-25 10:41 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-15: ô tìm thật (q trên URL, chờ 300 ms) — phím / để vào.
  const [q, setQ] = useState(query.get('q') ?? '');
  useEffect(() => { const h = setTimeout(() => { if ((query.get('q') ?? '') !== q.trim()) setQuery({ q: q.trim() || null, conv: null }); }, 300); return () => clearTimeout(h); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const search = useRef<HTMLInputElement>(null);
  const list = useInfiniteQueryAction(conversationList, { channelAccountId: account, filter, q: query.get('q') || undefined, limit: 50 });
  const convs = list.data ?? [];
  const cur = convs.find((c) => c.conversationId === query.get('conv')) ?? convs[0];
  const acc = (accounts.data ?? []).find((a) => a.channelAccountId === (cur?.channelAccountId ?? account));
  // [2026-11-25 10:41 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-15: ↑/↓ chọn hội thoại, Enter vào ô soạn, / vào ô tìm, Esc rời ô đang gõ. Không bắt phím khi đang gõ trong ô nhập.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing) { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); return; }
      if (e.key === 'Enter' && cur) { e.preventDefault(); document.getElementById('composer')?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const i = convs.findIndex((c) => c.conversationId === cur?.conversationId);
      const next = convs[Math.min(convs.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) { setQuery({ conv: next.conversationId }); document.getElementById('conv-' + next.conversationId)?.scrollIntoView({ block: 'nearest' }); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [convs, cur, setQuery]);
  return (
    <div className="page flush">
      <div className={cx('dinbox', info && 'info')}>
        <section className="dlist">
          <div className="top"><label className="sbox"><Ic.search /><input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.inbox.list.searchIn(acc ? acc.label : null)} aria-label={t.inbox.list.searchAria} /></label>
            {account && <button type="button" className="plus" title={t.inbox.list.allAccounts} onClick={() => setQuery({ account: null, conv: null })}><Ic.x style={{ width: 22, height: 22 }} /></button>}</div>
          <div className="tabs2">
            {FILTERS.map(([id, label]) => <button type="button" key={id} className={cx(filter === id && 'on')} onClick={() => setQuery({ filter: id === 'all' ? null : id, conv: null })}>{label}</button>)}
          </div>
          <div className="items">
            <QueryView q={list} empty={{ title: t.inbox.list.emptyTitle, desc: filter === 'all' ? t.inbox.list.emptyAll : t.inbox.list.emptyFiltered }}>
              {(cs) => <>{cs.map((c) => (
                <div key={c.conversationId} id={`conv-${c.conversationId}`} role="option" aria-selected={cur?.conversationId === c.conversationId} className={cx('ditem', cur?.conversationId === c.conversationId && 'on')} onClick={() => setQuery({ conv: c.conversationId })}>
                  <div style={{ position: 'relative' }}>
                    <ChannelAvatar src={c.avatarRef} name={c.title} size={56} group={c.kind === 'group_thread'} />
                    <ChannelDot channel={(accounts.data ?? []).find((a) => a.channelAccountId === c.channelAccountId)?.channel} />
                  </div>
                  <div className="b">
                    <div className="r1">{c.pinned && <span style={{ color: 'var(--destructive)' }}>📍</span>}<span className="nm">{c.title}</span><span className="tm">{hhmm(c.lastAt)}</span></div>
                    <div className="r2"><span className="pv">{c.kind === 'comment_thread' && '💬 '}{c.lastText}</span>{c.unread ? <span className="un">{c.unread}</span> : c.lastDirection === 'out' ? <Ic.back className="rp" /> : null}</div>
                    {c.tags.length > 0 && <div className="tags">{c.tags.map((x) => <Tag key={x} name={x} />)}</div>}
                  </div>
                </div>
              ))}<LoadMore q={list} label={t.inbox.list.loadMore} /></>}
            </QueryView>
          </div>
        </section>
        {cur ? <InboxChat conv={cur} via={{ label: acc?.label ?? '', channel: acc?.channel ?? '' }} info={info} onToggleInfo={() => setInfo(!info)} /> : <section className="dchat" />}
        {info && cur && <InfoPanel contactId={cur.contactId} />}
      </div>
    </div>
  );
}
