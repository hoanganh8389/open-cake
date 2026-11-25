// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-6: Contact 360 (màn mới) — một contact_id, dòng thời gian mọi kênh (cake.contact.timeline),
//   danh tính + độ tin + bằng chứng (R-CAKE-UI-6), gợi ý cùng người (cake.contact.suggestions) và Ghép có bằng chứng / Tách lại (cake.contact.merge / unmerge).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/inbox.ts.
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-5 — cột phải có hai tab: Dòng thời gian · Đơn (mockup-don-360); tab ở URL (?tab=orders, R-WEB-2).
import { useState } from 'react';
import { contactGet, contactMerge, contactSuggestions, contactTimeline, contactUnmerge, orderRequestList, type Identity } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Card, ChannelBadge, CHANNEL_LABEL, Face, Ic, Sheet, Tabs, Tag, cx } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go, useRoute } from '../app/route.js';
import { ContactOrders } from './orders/ContactOrders.js';
import { needPermission, useCan } from '../app/permissions.js';
import { t } from '../i18n/index.js';

const ME = '7'; // người dùng giả lập (PHASE-004 thay bằng phiên thật)
const PROOF = [['human', t.inbox.c360.proof.human], ['phone', t.inbox.c360.proof.phone], ['email', t.inbox.c360.proof.email]] as const;
const DIR = t.inbox.c360.dir;
const KIND = t.inbox.c360.kind;

function IdentityRow({ x }: { x: Identity }) {
  const proven = x.confidence === 'proven';
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="row gap8">
        <ChannelBadge channel={x.channel} /><span className="grow" />
        {proven ? <Badge tone="ok" title={t.inbox.c360.provenTitle}>{t.inbox.c360.proven(x.proof?.kind)}</Badge> : <Badge title={t.inbox.c360.unprovenTitle}>{t.inbox.c360.unproven}</Badge>}
      </div>
      <div className="sm mt8" style={{ fontStyle: proven ? 'normal' : 'italic', wordBreak: 'break-all' }}>{x.externalId}{x.scope !== 'global' && <span className="xs subtle"> · {x.scope}</span>}</div>
    </div>
  );
}

export function Contact360({ contactId }: { contactId: string }) {
  const c = useQueryAction(contactGet, { contactId });
  const tl = useQueryAction(contactTimeline, { contactId, limit: 200 });
  const sug = useQueryAction(contactSuggestions, { contactId });
  const orders = useQueryAction(orderRequestList, { contactId }, { enabled: useCan('cake:don-xem') });
  const { query, setQuery } = useRoute();
  const tab = query.get('tab') === 'orders' ? 'orders' : 'timeline';
  const merge = useAction(contactMerge);
  const unmerge = useAction(contactUnmerge);
  const canMerge = useCan('cake:contacts-gop'); // R-WEB-7: ghép / tách là quyền rủi ro cao
  const whyMerge = canMerge ? undefined : needPermission('cake:contacts-gop');
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
              <Btn ghost icon title={t.inbox.c360.back} onClick={() => go('contacts')}><Ic.back /></Btn>
              <Face name={d.contact.displayName} size={72} />
              <div className="grow">
                <h1 className="h1">{d.contact.displayName}</h1>
                <div className="row wrap gap8 mt8">
                  {d.contact.status === 'merged' && <Badge tone="warn">{t.inbox.c360.mergedAway}</Badge>}
                  {d.state.tags.map((x) => <Tag key={x} name={x} size="md" />)}
                  {Object.entries(d.state.channels).map(([ch, n]) => <span key={ch} className="row gap8"><ChannelBadge channel={ch} /><span className="xs subtle">{t.inbox.c360.times(n)}</span></span>)}
                </div>
              </div>
              <Btn pri onClick={() => go('inbox')}><Ic.chat />{t.inbox.c360.message}</Btn>
            </div>
            {merged && (
              <div className="note ok mb16 row gap8" role="status">
                {t.inbox.c360.mergedPre} <b>{merged.name}</b> {t.inbox.c360.mergedPost(when(merged.until))}
                <span className="grow" />
                <Btn sm out disabled={!canMerge || unmerge.isPending} title={whyMerge} onClick={() => unmerge.mutate({ contactId: merged.id }, { onSuccess: () => setMerged(null) })}>{t.inbox.c360.unmerge}</Btn>
              </div>
            )}
            <ActionErrorNote error={unmerge.error} />
            <div className="grid" style={{ gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <div className="col gap16">
                <Card><h3 className="h3 mb16">{t.inbox.c360.identities(d.identities.length)}</h3>{d.identities.map((x) => <IdentityRow key={x.identityId} x={x} />)}</Card>
                <Card>
                  <h3 className="h3">{t.inbox.c360.maybeSame}</h3>
                  <div className="muted sm mt8">{t.inbox.c360.maybeSameNote}</div>
                  <QueryView q={sug} empty={{ title: t.inbox.c360.noSuggest, desc: t.inbox.c360.noSuggestDesc }}>
                    {(xs) => <>{xs.map((s) => (
                      <div key={s.contactId} className="row gap8 mt16">
                        <Face name={s.displayName} size={40} />
                        <div className="grow"><b>{s.displayName}</b><div className="xs subtle">{CHANNEL_LABEL[s.identity.channel]} · {s.identity.externalId}</div></div>
                        <Btn sm out disabled={!canMerge} title={whyMerge} onClick={() => setPick({ id: s.contactId, name: s.displayName })}>{t.inbox.c360.mergeDots}</Btn>
                      </div>
                    ))}</>}
                  </QueryView>
                </Card>
                <Card><h3 className="h3">{t.inbox.c360.links}</h3><div className="muted sm mt8">{d.links.length ? d.links.map((l) => `${l.app}: ${l.refCode}`).join(' · ') : t.inbox.c360.noLinks}</div></Card>
              </div>
              <Card>
                <div className="mb16"><Tabs value={tab} onChange={(id) => setQuery({ tab: id === 'orders' ? 'orders' : null })} items={[{ id: 'timeline', label: t.orders.c360.tabTimeline }, { id: 'orders', label: t.orders.c360.tabOrders(orders.data?.length ?? 0) }]} /></div>
                {tab === 'orders' ? <ContactOrders orders={orders.data ?? []} /> : <QueryView q={tl} empty={{ title: t.inbox.c360.noTouch }}>
                  {(items) => <>{items.map((x) => (
                    <div key={x.touchId} className={cx('row gap16')} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', opacity: x.isReversal ? 0.7 : 1 }}>
                      <span className="muted sm" style={{ width: 96, flex: 'none' }}>{when(x.at)}</span>
                      <span style={{ width: 150, flex: 'none' }}>{x.channel ? <ChannelBadge channel={x.channel} /> : <Badge>{KIND[x.kind] ?? x.kind}</Badge>}</span>
                      <span className="subtle sm" style={{ width: 48, flex: 'none' }}>{DIR[x.direction]}</span>
                      <span className="grow">{x.summary}{x.docRef && <> <Badge tone="out">{x.docRef}</Badge></>}</span>
                    </div>
                  ))}</>}
                </QueryView>}
              </Card>
            </div>
            <Sheet open={!!pick} onClose={() => setPick(null)} icon={Ic.users} title={t.inbox.c360.mergeTitle(pick?.name ?? '', d.contact.displayName)}
              sub={t.inbox.c360.mergeSub}
              footer={<><Btn onClick={() => setPick(null)}>{t.inbox.c360.cancel}</Btn><Btn pri disabled={merge.isPending} onClick={doMerge}>{t.inbox.c360.merge}</Btn></>}>
              <div className="h3">{t.inbox.c360.proofHead}</div>
              <div className="col gap8 mt8">{PROOF.map(([k, label]) => (
                <label key={k} className="row gap8" style={{ cursor: 'pointer' }}><input type="radio" name="proof" checked={proof === k} onChange={() => setProof(k)} />{label}</label>
              ))}</div>
              <div className="note sm mt16">{t.inbox.c360.noNameMerge}</div>
              <ActionErrorNote error={merge.error} />
            </Sheet>
          </>
        )}
      </QueryView>
    </div>
  );
}
