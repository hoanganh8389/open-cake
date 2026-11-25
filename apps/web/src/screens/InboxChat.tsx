// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-4: khung chat theo ảnh duyệt (inbox.png): đầu hội thoại · tin (cake.message.list) · dải nhãn
//   (cake.conversation.tag) · ô soạn gửi thật (cake.message.send) — lỗi hiện dưới ô soạn với lý do CAKE_*; comment có nút Trả lời riêng (cake.comment.reply).
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-7 — thêm nút Gửi giá; Tin nhắn nhanh + Gửi giá tách ra composer-panels.tsx (một khuôn bảng chọn).
import { useLayoutEffect, useRef, useState } from 'react';
import { commentReply, conversationTag, messageList, messageSend, type Conversation, type Message } from '@open-cake/contracts';
import { useAction, useInfiniteQueryAction } from '@open-cake/action-client';
import { Btn, ChannelBadge, Face, GroupAvatar, Ic, Tag, TAG_LOOK, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, LoadMore, QueryView } from '../app/QueryView.js';
import { bytes, hhmm } from '../app/format.js';
import { go } from '../app/route.js';
import { PricePicker, QuickReplies } from './composer-panels.js';
import { needPermission, useCan } from '../app/permissions.js';

const LABELS = Object.keys(TAG_LOOK);
const Panel = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>;

function Bubble({ m, name }: { m: Message; name: string }) {
  const img = m.attachments.find((a) => a.type === 'image');
  const file = m.attachments.find((a) => a.type === 'file');
  return (
    <div className={cx('dmsg', m.direction === 'out' && 'out')}>
      {m.direction === 'in' && <Face name={name} size={40} />}
      {img ? (
        <div className="img"><div className="pic" style={{ height: 160, display: 'grid', placeItems: 'center' }}><Ic.image style={{ width: 64, height: 64, opacity: 0.4 }} /></div>
          <div className="cap">{img.name ?? 'Hình ảnh'}</div><span className="tp">{hhmm(m.at)}</span></div>
      ) : (
        <div className="bb">
          {file ? <div className="file"><span className="pdf">PDF</span><div style={{ flex: 1 }}><b>{file.name}</b><div className="muted" style={{ fontSize: 15 }}>{bytes(file.size)} Nhấn để tải</div></div><Ic.download style={{ width: 22, height: 22 }} /></div> : m.text}
          <span className="ts">{hhmm(m.at)}{m.direction === 'out' && m.delivery && m.delivery !== 'sent' ? ` · ${m.delivery === 'accepted' ? 'đang gửi' : m.delivery === 'unknown' ? 'chưa rõ đã gửi' : m.delivery}` : ''}</span>
          {m.reaction && <span className="re" style={m.direction === 'out' ? { left: 8 } : { right: 16 }}>{m.reaction}</span>}
        </div>
      )}
    </div>
  );
}

export function InboxChat({ conv, via, info, onToggleInfo }: { conv: Conversation; via: { label: string; channel: string }; info: boolean; onToggleInfo: () => void }) {
  // [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: trang tin MỚI NHẤT trước (50 tin), cuộn lên đầu tải tin cũ hơn; hiển thị cũ → mới.
  const msgs = useInfiniteQueryAction(messageList, { conversationId: conv.conversationId, limit: 50 });
  const shown = msgs.data ? [...msgs.pages].reverse().flat() : undefined;
  const send = useAction(messageSend);
  const reply = useAction(commentReply);
  const tag = useAction(conversationTag);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'quick' | 'price' | null>(null);
  const insert = (t: string) => { setText((cur) => (cur.trim() ? `${cur.trimEnd()} ${t}` : t)); setPanel(null); };
  const toggle = (k: 'quick' | 'price') => setPanel(panel === k ? null : k);
  const ref = useRef<HTMLDivElement>(null);
  // chèn tin cũ ở đầu ⇒ giữ nguyên chỗ đang đọc; trang mới nhất đổi (tin mới, mở hội thoại) ⇒ xuống cuối.
  const seen = useRef({ pages: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (msgs.pages.length > seen.current.pages && seen.current.pages > 0) el.scrollTop += el.scrollHeight - seen.current.h;
    else el.scrollTop = el.scrollHeight;
    seen.current = { pages: msgs.pages.length, h: el.scrollHeight };
  }, [msgs.pages]);
  const isComment = conv.kind === 'comment_thread';
  const canWrite = useCan('cake:inbox-lap'); // R-WEB-7: gắn nhãn, gửi, trả lời
  const why = canWrite ? undefined : needPermission('cake:inbox-lap');
  const submit = (mode?: 'public' | 'private') => {
    const t = text.trim();
    if (!t) return;
    const done = { onSuccess: () => setText('') };
    if (isComment) reply.mutate({ conversationId: conv.conversationId, mode: mode ?? 'public', text: t }, done);
    else send.mutate({ conversationId: conv.conversationId, text: t, attachments: [] }, done);
  };
  const busy = send.isPending || reply.isPending;
  return (
    <section className="dchat">
      <div className="hd">
        {conv.kind === 'group_thread' ? <GroupAvatar size={56} /> : <Face name={conv.title} size={56} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{conv.title}</div>
          <div className="tags">{conv.tags.map((t) => <Tag key={t} name={t} size="md" />)}{isComment && <span className="badge">Bình luận · bài {conv.anchor?.postId}</span>}</div>
        </div>
        <button type="button" className="ri" title="Mở Contact 360" aria-label="Mở Contact 360" onClick={() => go(`contacts/${conv.contactId}`)}><Ic.user /></button>
        <button type="button" className="ri" title="Thông tin hội thoại" aria-label="Thông tin hội thoại" onClick={onToggleInfo}><Panel className={info ? 'on' : undefined} /></button>
      </div>
      <div className="msgs" ref={ref}>
        <QueryView q={{ ...msgs, data: shown }} empty={{ title: 'Chưa có tin nào', desc: 'Tin mới của khách sẽ hiện ở đây.' }}>
          {(ms) => <><LoadMore q={msgs} label="Tải tin cũ hơn" />{ms.map((m) => <Bubble key={m.messageId} m={m} name={conv.title} />)}</>}
        </QueryView>
      </div>
      <div className="dlabels">
        {LABELS.map((n) => {
          const on = conv.tags.includes(n);
          return <span key={n} title={why} style={canWrite ? undefined : { cursor: 'not-allowed', opacity: 0.6 }} onClick={() => canWrite && tag.mutate({ conversationId: conv.conversationId, add: on ? [] : [n], remove: on ? [n] : [] })}><Tag name={n} size="lg" on={on} check={on} /></span>;
        })}
      </div>
      <div style={{ padding: '0 16px' }}><ActionErrorNote error={send.error ?? reply.error ?? tag.error} /></div>
      {panel === 'quick' && <QuickReplies onPick={insert} />}
      {panel === 'price' && <PricePicker onPick={insert} />}
      <div className="dinput" style={{ gap: 8 }}>
        <Btn ghost icon title="Tin nhắn nhanh" aria-label="Tin nhắn nhanh" className={cx(panel === 'quick' && 'on')} onClick={() => toggle('quick')}><Ic.bolt /></Btn>
        <Btn ghost icon title="Gửi giá" aria-label="Gửi giá" className={cx(panel === 'price' && 'on')} onClick={() => toggle('price')}><Ic.tag /></Btn>
        <textarea id="composer" className="input" style={{ flex: 1, minHeight: 44, resize: 'none', border: 0, fontSize: 16 }} value={text} disabled={busy}
          placeholder={isComment ? 'Trả lời bình luận… (Enter: trả lời công khai)' : 'Nhập tin, Shift+Enter xuống dòng, Enter gửi…'}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} aria-label="Soạn tin" />
        {isComment && <Btn out sm disabled={!canWrite || busy || !text.trim()} title={why} onClick={() => submit('private')}>Trả lời riêng</Btn>}
        <Btn pri sm disabled={!canWrite || busy || !text.trim()} title={why} onClick={() => submit()}><Ic.send />{isComment ? 'Trả lời' : 'Gửi'}</Btn>
      </div>
      <div className="xs subtle row gap8" style={{ padding: '0 16px 8px' }}>Gửi qua <b>{via.label}</b><ChannelBadge channel={isComment ? 'facebook_comment' : via.channel} /></div>
    </section>
  );
}
