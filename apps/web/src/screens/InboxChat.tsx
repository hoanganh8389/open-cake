// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-4: khung chat theo ảnh duyệt (inbox.png): đầu hội thoại · tin (cake.message.list) · dải nhãn
//   (cake.conversation.tag) · ô soạn gửi thật (cake.message.send) — lỗi hiện dưới ô soạn với lý do CAKE_*; comment có nút Trả lời riêng (cake.comment.reply).
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-7 — thêm nút Gửi giá; Tin nhắn nhanh + Gửi giá tách ra composer-panels.tsx (một khuôn bảng chọn).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/inbox.ts.
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/5/8 — nút Đơn nháp + sheet Yêu cầu đặt hàng; bước của đơn hiện thành dòng hệ thống xen giữa tin (mockup-don-trong-chat), không gửi khách.
import { useLayoutEffect, useRef, useState } from 'react';
import { commentReply, conversationTag, messageList, messageSend, orderRequestList, type Conversation, type Message, type OrderRequest } from '@open-cake/contracts';
import { useAction, useInfiniteQueryAction, useQueryAction } from '@open-cake/action-client';
import { ChannelAvatar, Btn, ChannelBadge, Ic, Tag, TAG_LOOK, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, LoadMore, QueryView } from '../app/QueryView.js';
import { bytes, hhmm } from '../app/format.js';
import { go } from '../app/route.js';
import { PricePicker, QuickReplies } from './composer-panels.js';
import { OrderSheet, type CartLine } from './orders/OrderSheet.js';
import { OrderSysLine } from './orders/parts.js';
import { needPermission, useCan } from '../app/permissions.js';
import { t } from '../i18n/index.js';

const LABELS = Object.keys(TAG_LOOK);
type Row = { at: string; m?: Message; o?: OrderRequest; e?: OrderRequest['events'][number] };
/** Tin + bước đơn theo thời gian; bước cũ hơn tin cũ nhất đang tải thì chờ cuộn lên mới hiện. */
const interleave = (ms: Message[], os: OrderRequest[]): Row[] => {
  const ms0 = ms[0] ? Date.parse(ms[0].at) : 0; // so THỜI ĐIỂM, không so chuỗi (tin có thể ghi +07:00, sự kiện ghi Z)
  const ev = os.flatMap((o) => o.events.filter((e) => Date.parse(e.at) >= ms0).map((e) => ({ at: e.at, o, e })));
  return [...ms.map((m) => ({ at: m.at, m })), ...ev].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
};
const Panel = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>;

// [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 — tin lỗi / chưa rõ đã gửi ⇒ nút Gửi lại (tin MỚI, khoá mới — nhân viên quyết, máy không tự gửi lại; R-CAKE-SEND-2).
/** [2026-11-26 08:35 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — @nhắc tô màu theo vị trí ký tự (kênh gửi pos / len). */
function withMentions(text: string, ms: Message['mentions']) {
  if (!ms?.length) return text;
  const out: (string | JSX.Element)[] = [];
  let i = 0;
  for (const [k, x] of [...ms].sort((a, b) => a.pos - b.pos).entries()) {
    if (x.pos < i || x.pos + x.len > text.length) continue;
    out.push(text.slice(i, x.pos), <span key={k} className="ment">{text.slice(x.pos, x.pos + x.len)}</span>);
    i = x.pos + x.len;
  }
  return [...out, text.slice(i)];
}

function Bubble({ m, name, group, onResend }: { m: Message; name: string; group?: boolean; onResend?: (m: Message) => void }) {
  const img = m.attachments.find((a) => a.type === 'image');
  const file = m.attachments.find((a) => a.type === 'file');
  return (
    <div className={cx('dmsg', m.direction === 'out' && 'out')}>
      {m.direction === 'in' && <ChannelAvatar src={m.sender?.avatarRef} name={m.sender?.name ?? name} size={40} />}
      <div>
      {group && m.direction === 'in' && m.sender && <div className="snd">{m.sender.name}</div>}
      {m.revokedAt ? <div className="bb revoked">{t.inbox.chat.revoked}<span className="ts">{hhmm(m.at)}</span></div> : img ? (
        <div className="img"><div className="pic" style={{ height: 160, display: 'grid', placeItems: 'center' }}><Ic.image style={{ width: 64, height: 64, opacity: 0.4 }} /></div>
          <div className="cap">{img.name ?? t.inbox.chat.image}</div><span className="tp">{hhmm(m.at)}</span></div>
      ) : (
        <div className="bb">
          {file ? <div className="file"><span className="pdf">PDF</span><div style={{ flex: 1 }}><b>{file.name}</b><div className="muted" style={{ fontSize: 15 }}>{bytes(file.size)} {t.inbox.chat.tapToDownload}</div></div><Ic.download style={{ width: 22, height: 22 }} /></div> : <>{m.quote && <div className="quote"><b>{t.inbox.chat.quoteLabel}</b><div>{m.quote.text}</div></div>}{withMentions(m.text, m.mentions)}</>}
          <span className="ts">{hhmm(m.at)}{m.direction === 'out' && m.delivery && m.delivery !== 'sent' ? ` · ${t.inbox.chat.delivery[m.delivery] ?? m.delivery}` : ''}
            {onResend && m.direction === 'out' && (m.delivery === 'failed' || m.delivery === 'unknown') && <> · <button type="button" className="link" onClick={() => onResend(m)}>{t.inbox.chat.resend}</button></>}</span>
          {m.reaction && <span className="re" style={m.direction === 'out' ? { left: 8 } : { right: 16 }}>{m.reaction}</span>}
        </div>
      )}
      </div>
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
  const canOrder = useCan('cake:don-lap');
  const orders = useQueryAction(orderRequestList, { conversationId: conv.conversationId });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheet, setSheet] = useState(false);
  const addToCart = (l: Omit<CartLine, 'qty'>) => setCart((c) => (c.some((x) => x.itemId === l.itemId) ? c.map((x) => (x.itemId === l.itemId ? { ...x, qty: x.qty + 1 } : x)) : [...c, { ...l, qty: 1 }]));
  const insert = (s: string) => { setText((cur) => (cur.trim() ? `${cur.trimEnd()} ${s}` : s)); setPanel(null); };
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
    const body = text.trim();
    if (!body) return;
    const done = { onSuccess: () => setText('') };
    if (isComment) reply.mutate({ conversationId: conv.conversationId, mode: mode ?? 'public', text: body }, done);
    else send.mutate({ conversationId: conv.conversationId, text: body, attachments: [] }, done);
  };
  const busy = send.isPending || reply.isPending;
  return (
    <section className="dchat">
      <div className="hd">
        <ChannelAvatar src={conv.avatarRef} name={conv.title} size={56} group={conv.kind === 'group_thread'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{conv.title}</div>
          {conv.kind === 'group_thread' && conv.memberCount != null && <div className="xs subtle">{t.inbox.chat.members(conv.memberCount)}</div>}
          <div className="tags">{conv.tags.map((x) => <Tag key={x} name={x} size="md" />)}{isComment && <span className="badge">{t.inbox.chat.commentOnPost(conv.anchor?.postId)}</span>}</div>
        </div>
        {canOrder && <Btn out sm onClick={() => setSheet(true)}><Ic.store />{t.orders.cart(cart.length)}</Btn>}
        <button type="button" className="ri" title={t.inbox.chat.open360} aria-label={t.inbox.chat.open360} onClick={() => go(`contacts/${conv.contactId}`)}><Ic.user /></button>
        <button type="button" className="ri" title={t.inbox.chat.threadInfo} aria-label={t.inbox.chat.threadInfo} onClick={onToggleInfo}><Panel className={info ? 'on' : undefined} /></button>
      </div>
      <div className="msgs" ref={ref}>
        <QueryView q={{ ...msgs, data: shown }} empty={{ title: t.inbox.chat.emptyTitle, desc: t.inbox.chat.emptyDesc }}>
          {(ms) => <><LoadMore q={msgs} label={t.inbox.chat.loadOlder} />{interleave(ms, orders.data ?? []).map((r) => (r.m ? <Bubble key={r.m.messageId} m={r.m} name={conv.title} group={conv.kind === 'group_thread'} onResend={(x) => send.mutate({ conversationId: conv.conversationId, text: x.text, attachments: x.attachments })} /> : <OrderSysLine key={`${r.o!.orderRequestId}-${r.e!.type}-${r.at}`} o={r.o!} e={r.e!} />))}</>}
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
      {panel === 'price' && <PricePicker onPick={insert} onAdd={canOrder ? addToCart : undefined} />}
      <div className="dinput" style={{ gap: 8 }}>
        <Btn ghost icon title={t.inbox.chat.quickReplies} aria-label={t.inbox.chat.quickReplies} className={cx(panel === 'quick' && 'on')} onClick={() => toggle('quick')}><Ic.bolt /></Btn>
        <Btn ghost icon title={t.inbox.chat.sendPrice} aria-label={t.inbox.chat.sendPrice} className={cx(panel === 'price' && 'on')} onClick={() => toggle('price')}><Ic.tag /></Btn>
        <textarea id="composer" className="input" style={{ flex: 1, minHeight: 44, resize: 'none', border: 0, fontSize: 16 }} value={text} disabled={busy}
          placeholder={isComment ? t.inbox.chat.phComment : t.inbox.chat.phMessage}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} aria-label={t.inbox.chat.composeAria} />
        {isComment && <Btn out sm disabled={!canWrite || busy || !text.trim()} title={why} onClick={() => submit('private')}>{t.inbox.chat.replyPrivate}</Btn>}
        <Btn pri sm disabled={!canWrite || busy || !text.trim()} title={why} onClick={() => submit()}><Ic.send />{isComment ? t.inbox.chat.reply : t.inbox.chat.send}</Btn>
      </div>
      <div className="xs subtle row gap8" style={{ padding: '0 16px 8px' }}>{t.inbox.chat.via} <b>{via.label}</b><ChannelBadge channel={isComment ? 'facebook_comment' : via.channel} /></div>
      {canOrder && <OrderSheet open={sheet} onClose={() => setSheet(false)} contactId={conv.contactId} conversationId={conv.conversationId} name={conv.title} cart={cart} setCart={setCart} />}
    </section>
  );
}
