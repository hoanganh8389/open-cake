// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-6: Contact 360 (màn mới) — một contact_id, dòng thời gian mọi kênh (cake.contact.timeline),
//   danh tính + độ tin + bằng chứng (R-CAKE-UI-6), gợi ý cùng người (cake.contact.suggestions) và Ghép có bằng chứng / Tách lại (cake.contact.merge / unmerge).
import { useState } from 'react';
import { contactGet, contactMerge, contactSuggestions, contactTimeline, contactUnmerge, type Identity } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Card, ChannelBadge, CHANNEL_LABEL, Face, Ic, Sheet, Tag, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go } from '../app/route.js';

const ME = '7'; // người dùng giả lập (PHASE-004 thay bằng phiên thật)
const PROOF = [['human', 'Tôi xác nhận là cùng một người'], ['phone', 'Trùng số điện thoại đã xác minh'], ['email', 'Trùng email đã xác minh']] as const;
const DIR = { in: '← vào', out: '→ ra', none: '•' } as const;
const KIND: Record<string, string> = { message: 'Tin', comment: 'Bình luận', reaction: 'Cảm xúc', call: 'Cuộc gọi', note: 'Ghi chú', tag: 'Nhãn', stage: 'Giai đoạn', assign: 'Giao việc', merge: 'Ghép', identity: 'Danh tính', document: 'Chứng từ', task: 'Việc', broadcast_target: 'Gửi hàng loạt' };

function IdentityRow({ x }: { x: Identity }) {
  const proven = x.confidence === 'proven';
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="row gap8">
        <ChannelBadge channel={x.channel} /><span className="grow" />
        {proven ? <Badge tone="ok" title="Có bằng chứng — dùng được để ghép tự động">đã xác minh · {x.proof?.kind}</Badge> : <Badge title="Chưa có bằng chứng — không dùng để ghép tự động">chưa xác minh</Badge>}
      </div>
      <div className="sm mt8" style={{ fontStyle: proven ? 'normal' : 'italic', wordBreak: 'break-all' }}>{x.externalId}{x.scope !== 'global' && <span className="xs subtle"> · {x.scope}</span>}</div>
    </div>
  );
}

export function Contact360({ contactId }: { contactId: string }) {
  const c = useQueryAction(contactGet, { contactId });
  const tl = useQueryAction(contactTimeline, { contactId, limit: 200 });
  const sug = useQueryAction(contactSuggestions, { contactId });
  const merge = useAction(contactMerge);
  const unmerge = useAction(contactUnmerge);
  const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const [proof, setProof] = useState<(typeof PROOF)[number][0]>('human');
  const [merged, setMerged] = useState<{ id: string; name: string; until: string } | null>(null);
  const doMerge = () => pick && merge.mutate(
    { contactId: pick.id, intoContactId: contactId, proof: proof === 'human' ? { kind: 'human', userId: ME } : { kind: proof } },
    { onSuccess: (r) => { setMerged({ ...pick, until: r.unmergeUntil }); setPick(null); } },
  );
  return (
    <div className="page">
      <QueryView q={c}>
        {(d) => (
          <>
            <div className="row gap16 mb24">
              <Btn ghost icon title="Quay lại danh bạ" onClick={() => go('contacts')}><Ic.back /></Btn>
              <Face name={d.contact.displayName} size={72} />
              <div className="grow">
                <h1 className="h1">{d.contact.displayName}</h1>
                <div className="row wrap gap8 mt8">
                  {d.contact.status === 'merged' && <Badge tone="warn">Đã ghép vào khách khác</Badge>}
                  {d.state.tags.map((t) => <Tag key={t} name={t} size="md" />)}
                  {Object.entries(d.state.channels).map(([ch, n]) => <span key={ch} className="row gap8"><ChannelBadge channel={ch} /><span className="xs subtle">{n} lần</span></span>)}
                </div>
              </div>
              <Btn pri onClick={() => go('inbox')}><Ic.chat />Nhắn tin</Btn>
            </div>
            {merged && (
              <div className="note ok mb16 row gap8" role="status">
                Đã ghép <b>{merged.name}</b> vào khách này. Tách lại được tới {when(merged.until)}.
                <span className="grow" />
                <Btn sm out disabled={unmerge.isPending} onClick={() => unmerge.mutate({ contactId: merged.id }, { onSuccess: () => setMerged(null) })}>Tách lại</Btn>
              </div>
            )}
            <ActionErrorNote error={unmerge.error} />
            <div className="grid" style={{ gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <div className="col gap16">
                <Card><h3 className="h3 mb16">Danh tính ({d.identities.length})</h3>{d.identities.map((x) => <IdentityRow key={x.identityId} x={x} />)}</Card>
                <Card>
                  <h3 className="h3">Có thể là cùng người</h3>
                  <div className="muted sm mt8">Chỉ là gợi ý (cùng tên). Hệ thống không tự ghép khi chưa có bằng chứng.</div>
                  <QueryView q={sug} empty={{ title: 'Không có gợi ý', desc: 'Chưa thấy khách nào trùng.' }}>
                    {(xs) => <>{xs.map((s) => (
                      <div key={s.contactId} className="row gap8 mt16">
                        <Face name={s.displayName} size={40} />
                        <div className="grow"><b>{s.displayName}</b><div className="xs subtle">{CHANNEL_LABEL[s.identity.channel]} · {s.identity.externalId}</div></div>
                        <Btn sm out onClick={() => setPick({ id: s.contactId, name: s.displayName })}>Ghép…</Btn>
                      </div>
                    ))}</>}
                  </QueryView>
                </Card>
                <Card><h3 className="h3">Liên kết app anh em</h3><div className="muted sm mt8">{d.links.length ? d.links.map((l) => `${l.app}: ${l.refCode}`).join(' · ') : 'Chưa liên kết Kế Toán / POS (PHASE-010).'}</div></Card>
              </div>
              <Card>
                <h3 className="h3 mb16">Dòng thời gian mọi kênh</h3>
                <QueryView q={tl} empty={{ title: 'Chưa có lần chạm nào' }}>
                  {(items) => <>{items.map((t) => (
                    <div key={t.touchId} className={cx('row gap16')} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', opacity: t.isReversal ? 0.7 : 1 }}>
                      <span className="muted sm" style={{ width: 96, flex: 'none' }}>{when(t.at)}</span>
                      <span style={{ width: 150, flex: 'none' }}>{t.channel ? <ChannelBadge channel={t.channel} /> : <Badge>{KIND[t.kind] ?? t.kind}</Badge>}</span>
                      <span className="subtle sm" style={{ width: 48, flex: 'none' }}>{DIR[t.direction]}</span>
                      <span className="grow">{t.summary}{t.docRef && <> <Badge tone="out">{t.docRef}</Badge></>}</span>
                    </div>
                  ))}</>}
                </QueryView>
              </Card>
            </div>
            <Sheet open={!!pick} onClose={() => setPick(null)} icon={Ic.users} title={`Ghép "${pick?.name ?? ''}" vào ${d.contact.displayName}`}
              sub="Danh tính, hội thoại của khách kia chuyển sang khách này. Lịch sử cũ giữ nguyên. Tách lại được trong 30 ngày."
              footer={<><Btn onClick={() => setPick(null)}>Huỷ</Btn><Btn pri disabled={merge.isPending} onClick={doMerge}>Ghép</Btn></>}>
              <div className="h3">Bằng chứng</div>
              <div className="col gap8 mt8">{PROOF.map(([k, label]) => (
                <label key={k} className="row gap8" style={{ cursor: 'pointer' }}><input type="radio" name="proof" checked={proof === k} onChange={() => setProof(k)} />{label}</label>
              ))}</div>
              <div className="note sm mt16">Không ghép chỉ vì trùng tên (R-CAKE-ID-2).</div>
              <ActionErrorNote error={merge.error} />
            </Sheet>
          </>
        )}
      </QueryView>
    </div>
  );
}
