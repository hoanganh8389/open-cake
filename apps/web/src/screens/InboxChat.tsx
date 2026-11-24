// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-4: khung chat theo ảnh duyệt (inbox.png): đầu hội thoại · tin (cake.message.list) · dải nhãn
//   (cake.conversation.tag) · ô soạn gửi thật (cake.message.send) — lỗi hiện dưới ô soạn với lý do CAKE_*; comment có nút Trả lời riêng (cake.comment.reply).
import { useEffect, useRef, useState } from 'react';
import { commentReply, conversationTag, messageList, messageSend, type Conversation, type Message } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Btn, ChannelBadge, Face, GroupAvatar, Ic, Tag, TAG_LOOK, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { bytes, hhmm } from '../app/format.js';
import { go } from '../app/route.js';

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
  const msgs = useQueryAction(messageList, { conversationId: conv.conversationId, limit: 200 });
  const send = useAction(messageSend);
  const reply = useAction(commentReply);
  const tag = useAction(conversationTag);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.data]);
  const isComment = conv.kind === 'comment_thread';
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
        <button type="button" className="ri" title="Mở Contact 360" onClick={() => go(`contacts/${conv.contactId}`)}><Ic.user /></button>
        <button type="button" className="ri" title="Thông tin hội thoại" onClick={onToggleInfo}><Panel className={info ? 'on' : undefined} /></button>
      </div>
      <div className="msgs" ref={ref}>
        <QueryView q={msgs} empty={{ title: 'Chưa có tin nào', desc: 'Tin mới của khách sẽ hiện ở đây.' }}>
          {(ms) => <>{ms.map((m) => <Bubble key={m.messageId} m={m} name={conv.title} />)}</>}
        </QueryView>
      </div>
      <div className="dlabels">
        {LABELS.map((n) => {
          const on = conv.tags.includes(n);
          return <span key={n} onClick={() => tag.mutate({ conversationId: conv.conversationId, add: on ? [] : [n], remove: on ? [n] : [] })}><Tag name={n} size="lg" on={on} check={on} /></span>;
        })}
      </div>
      <div style={{ padding: '0 16px' }}><ActionErrorNote error={send.error ?? reply.error ?? tag.error} /></div>
      <div className="dinput" style={{ gap: 8 }}>
        <textarea className="input" style={{ flex: 1, minHeight: 44, resize: 'none', border: 0, fontSize: 16 }} value={text} disabled={busy}
          placeholder={isComment ? 'Trả lời bình luận… (Enter: trả lời công khai)' : 'Nhập tin, Shift+Enter xuống dòng, Enter gửi…'}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} aria-label="Soạn tin" />
        {isComment && <Btn out sm disabled={busy || !text.trim()} onClick={() => submit('private')}>Trả lời riêng</Btn>}
        <Btn pri sm disabled={busy || !text.trim()} onClick={() => submit()}><Ic.send />{isComment ? 'Trả lời' : 'Gửi'}</Btn>
      </div>
      <div className="xs subtle row gap8" style={{ padding: '0 16px 8px' }}>Gửi qua <b>{via.label}</b><ChannelBadge channel={isComment ? 'facebook_comment' : via.channel} /></div>
    </section>
  );
}
