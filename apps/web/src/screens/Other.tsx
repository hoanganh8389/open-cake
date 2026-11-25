// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — màn chưa tới phase nói rõ vì sao + phase nào (R-NO-FAKE, R-BLOCK-1) thay vì số giả;
//   trang "Bốn trạng thái" để duyệt bộ thành phần (S003-1).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { Badge, Btn, Card, Gate, Ic, State } from '@open-cake/ui-kit';
import { t } from '../i18n/index.js';

export function NotYet({ id }: { id: string }) {
  const [title, why] = t.app.soon.items[id] ?? t.app.soon.fallback;
  return <div className="page"><h1 className="h1 mb24">{title}</h1><Gate need={t.app.soon.gate} why={why} /></div>;
}

export function States() {
  const s = t.app.states;
  return (
    <div className="page">
      <h1 className="h1 mb24">{s.title}</h1>
      <div className="muted mb16">{s.hintBefore} <code>?mock=empty</code>, <code>?mock=error</code>, <code>?mock=denied</code>, <code>?mock=slow</code> {s.hintAfter}</div>
      <div className="grid g2">
        <Card><State kind="loading" /></Card>
        <Card><State kind="empty" title={s.emptyTitle} desc={s.emptyDesc} action={<Btn pri>{t.app.shell.connectChannel}</Btn>} /></Card>
        <Card><State kind="error" title={s.errorTitle} desc={s.errorDesc} requestId="mock-12" action={<Btn out><Ic.refresh />{t.app.query.retry}</Btn>} /></Card>
        <Card><State kind="denied" title={t.app.query.denied} desc={s.deniedDesc} /></Card>
      </div>
      {/* [2026-11-25 12:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 S007-8 — như ảnh chuẩn states.png: thẻ 'Cần cài …' + bộ thành phần. */}
      <h3 className="h3 mt24 mb16">{s.gatesTitle}</h3>
      <div className="grid g2">{s.gates.map((g) => <Gate key={g.need} need={g.need} why={g.why} />)}</div>
      <h3 className="h3 mt24 mb16">{s.kitTitle}</h3>
      <Card>
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          <Btn pri>{s.kit.pri}</Btn><Btn>{s.kit.def}</Btn><Btn out>{s.kit.out}</Btn><Btn ghost>{s.kit.ghost}</Btn><Btn danger>{s.kit.danger}</Btn><Btn pri disabled>{s.kit.disabled}</Btn><Btn pri sm>{s.kit.sm}</Btn><Btn pri icon aria-label={s.kit.pri}><Ic.plus /></Btn>
        </div>
        <div className="row gap8 mt16" style={{ flexWrap: 'wrap' }}>
          <Badge>{s.badges.def}</Badge><Badge tone="pri">{s.badges.pri}</Badge><Badge tone="ok" dot>{s.badges.ok}</Badge><Badge tone="warn" dot>{s.badges.warn}</Badge><Badge tone="err" dot>{s.badges.err}</Badge>
        </div>
      </Card>
    </div>
  );
}
