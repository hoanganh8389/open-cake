// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — màn chưa tới phase nói rõ vì sao + phase nào (R-NO-FAKE, R-BLOCK-1) thay vì số giả;
//   trang "Bốn trạng thái" để duyệt bộ thành phần (S003-1).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { Btn, Card, Gate, Ic, State } from '@open-cake/ui-kit';
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
    </div>
  );
}
