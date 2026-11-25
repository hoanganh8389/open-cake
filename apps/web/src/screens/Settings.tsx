// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: Cài đặt — danh mục lớp mềm (record_type) lấy từ registry, mỗi loại mở RecordTypeScreen tự sinh;
//   phần Nhân viên / Trần gửi nói rõ phase, không làm giả.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { CAKE_RECORD_TYPES } from '@open-cake/contracts';
import { Badge, Card, Gate, Ic } from '@open-cake/ui-kit';
import { go } from '../app/route.js';
import { CatalogSourceSettings } from './catalog/source-settings.js';
import { t } from '../i18n/index.js';

export function Settings() {
  return (
    <div className="page">
      <h1 className="h1 mb24">{t.app.settings.title}</h1>
      <CatalogSourceSettings />
      <h3 className="h3 mb16">{t.app.settings.recordTypes}</h3>
      <div className="grid g3 mb24">
        {CAKE_RECORD_TYPES.map((r) => (
          <Card key={r.key}>
            <button type="button" className="row gap16" style={{ width: '100%', textAlign: 'left' }} onClick={() => go(`records/${r.key}`)}>
              <div className="icon-circle"><Ic.note /></div>
              <div className="grow"><div className="h3">{r.label}</div><div className="xs subtle mt8">{t.app.settings.fields(r.fields.length)} · <Badge>{r.key}</Badge></div></div>
              <Ic.chevron style={{ width: 18, height: 18, transform: 'rotate(-90deg)' }} />
            </button>
          </Card>
        ))}
      </div>
      <div className="col gap16">
        {/* [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Nhân viên & quyền đã có màn thật. */}
        <Card>
          <button type="button" className="row gap16" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('staff')}>
            <div className="icon-circle"><Ic.users /></div>
            <div className="grow"><div className="h3">{t.app.settings.staff}</div><div className="xs subtle mt8">{t.app.settings.staffDesc}</div></div>
            <Ic.chevron style={{ width: 18, height: 18, transform: 'rotate(-90deg)' }} />
          </button>
        </Card>
        <Gate need={t.app.settings.sendGuard} why={t.app.settings.sendGuardWhy} />
      </div>
    </div>
  );
}
