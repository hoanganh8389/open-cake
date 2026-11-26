// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — Cài đặt › Kết nối kênh (mockup kết nối ① đã duyệt): chọn Tự cài / BizCity Hub, máy kết nối (địa chỉ, khoá nối, kiểm tra,
//   đổi khoá), khoá + bí mật chỉ hiện MỘT lần ngay sau khi sinh, gợi ý Hub. Chỉ chủ (settings:write). Bảng từng kênh của máy kết nối: đợt sau (máy kết nối chưa báo theo kênh).
import { useState } from 'react';
import { channelLinkGet, channelLinkSet, channelLinkTest } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { when } from '../../app/format.js';
import { useCan } from '../../app/permissions.js';
import { t } from '../../i18n/index.js';
import { HubOffer } from './HubOffer.js';

const L = t.setup.link;

function ModeCard({ on, off, icon, title, meta, desc, onPick }: { on: boolean; off?: boolean; icon: JSX.Element; title: string; meta: JSX.Element; desc: string; onPick: () => void }) {
  return (
    <button type="button" className={`choice${on ? ' on' : ''}${off ? ' off' : ''}`} style={{ textAlign: 'left' }} disabled={off} onClick={onPick}>
      <span className="dot" />
      <div><div className="row gap8">{icon}<b>{title}</b>{meta}</div><div className="sm muted mt8">{desc}</div></div>
    </button>
  );
}

export function ChannelLinkSettings() {
  const can = useCan('settings:write');
  const q = useQueryAction(channelLinkGet, {}, { enabled: can });
  const set = useAction(channelLinkSet);
  const test = useAction(channelLinkTest);
  const [url, setUrl] = useState<string | null>(null);
  const d = q.data;
  if (!can || !d) return null;
  const self = d.mode === 'self';
  const v = url ?? d.connectorUrl ?? '';
  const busy = set.isPending || test.isPending;
  const issued = set.data?.issued;
  const save = (rotate = false) => set.mutate({ mode: 'self', connectorUrl: v, rotate }, { onSuccess: () => setUrl(null) });
  const ico = { width: 16, height: 16 };
  return (
    <section className="mb24">
      <h3 className="h3">{L.title}</h3><div className="sm muted mt8 mb16">{L.sub}</div>
      <div className="grid mb16" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1056 }}>
        <ModeCard on={self} icon={<Ic.terminal style={ico} />} title={L.self} desc={L.selfDesc} onPick={() => !self && v && save()}
          meta={<>{self && <Badge tone="ok">{L.inUse}</Badge>}<Badge>{L.free}</Badge></>} />
        <ModeCard on={!self} off={!d.hubReady && self} icon={<Ic.cloud style={ico} />} title={L.hub} desc={d.hubReady ? L.hubDesc : L.hubNotReady} onPick={() => self && set.mutate({ mode: 'hub', rotate: false })}
          meta={<>{!self && <Badge tone="ok">{L.inUse}</Badge>}<span className="xs subtle">{L.hubMeta}</span></>} />
      </div>
      <div className="card pad" style={{ maxWidth: 1056 }}>
        <div className="row gap8"><b>{L.connector}</b><span className="xs subtle">{d.lastOkAt ? L.checkedAt(when(d.lastOkAt)) : L.notChecked}</span>
          {d.lastError ? <Badge tone="err">{L.err(d.lastError)}</Badge> : d.lastOkAt ? <Badge tone="ok" dot>{L.ok}</Badge> : null}<span className="grow" />
          <Btn out sm disabled={!self || busy} onClick={() => test.mutate({})}><Ic.refresh />{L.check}</Btn></div>
        <dl className="kv mt16">
          <dt>{L.url}</dt><dd><input className="input sm" style={{ width: 360 }} value={v} placeholder="http://cake-connector:3901" onChange={(e) => setUrl(e.target.value.trim())} />
            {' '}<Btn pri sm disabled={busy || !/^https?:\/\//.test(v) || (self && v === d.connectorUrl)} onClick={() => save()}>{L.save}</Btn>
            <div className="xs subtle mt8">{L.urlHint}</div></dd>
          <dt>{L.key}</dt><dd>{d.keyPrefix ? <><code>{d.keyPrefix}</code> <span className="xs subtle">{L.keyHint}</span> <Btn ghost sm disabled={busy || !self} onClick={() => save(true)}>{L.rotate}</Btn></> : <span className="xs subtle">{L.noKey}</span>}</dd>
        </dl>
        {issued && (
          <div className="note warn mt16">
            <b>{L.issuedTitle}</b>
            <dl className="kv mt8"><dt><code>{L.issuedKey}</code></dt><dd className="secret">{issued.key}</dd><dt><code>{L.issuedSecret}</code></dt><dd className="secret">{issued.secret}</dd></dl>
            <div className="xs mt8">{L.issuedHint}</div>
          </div>
        )}
        <ActionErrorNote error={set.error ?? test.error} />
      </div>
      {self && <HubOffer variant="settings" hubReady={d.hubReady} onGo={() => set.mutate({ mode: 'hub', rotate: false })} />}
    </section>
  );
}
