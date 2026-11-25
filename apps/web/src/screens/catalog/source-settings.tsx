// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — Cài đặt › Nguồn danh mục (mockup-nguon.png): hai lựa chọn, "Lấy từ Kế Toán" khoá có lý do tới PHASE-010;
//   đơn vị theo SPINE: tenant slug + branch_code (không hiện id nội bộ Kế Toán).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { Badge, cx } from '@open-cake/ui-kit';
import { when } from '../../app/format.js';
import { useCatalogSource } from './use-catalog.js';
import { t } from '../../i18n/index.js';

const L = t.catalog.source;

export function CatalogSourceSettings() {
  const { data } = useCatalogSource();
  if (!data) return null;
  const ketoan = data.catalogSource === 'ketoan';
  return (
    <section className="mb24" style={{ maxWidth: 880 }}>
      <h3 className="h3 mb16">{L.title}</h3>
      <div className="col gap16">
        <div className={cx('choice', !ketoan && 'on')}><span className="dot" /><div><b>{L.local}</b> {!ketoan && <Badge tone="ok">{L.inUse}</Badge>}
          <div className="sm muted mt8">{L.localDesc}</div></div></div>
        <div className={cx('choice', ketoan ? 'on' : 'off')}><span className="dot" /><div><b>{L.ketoan}</b> {ketoan ? <Badge tone="ok">{L.inUse}</Badge> : <Badge tone="out">{L.soon}</Badge>}
          <div className="sm muted mt8">{L.ketoanDesc}</div></div></div>
      </div>
      <dl className="kv mt24">
        <dt>{L.tenant}</dt><dd><code>{data.tenant}</code></dd>
        <dt>{L.branch}</dt><dd>{data.branchCode ? <code>{data.branchCode}</code> : <span className="subtle">{L.branchNone}</span>}</dd>
        <dt>{L.link}</dt><dd>{data.ketoan ? <>{data.ketoan.baseUrl}{data.ketoan.lastSyncAt && <span className="xs subtle">{L.updatedAt(when(data.ketoan.lastSyncAt))}</span>}</> : <span className="subtle">{L.notLinked}</span>}</dd>
      </dl>
    </section>
  );
}
