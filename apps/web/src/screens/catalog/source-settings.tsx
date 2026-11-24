// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-8 — Cài đặt › Nguồn danh mục (mockup-nguon.png): hai lựa chọn, "Lấy từ Kế Toán" khoá có lý do tới PHASE-010;
//   đơn vị theo SPINE: tenant slug + branch_code (không hiện id nội bộ Kế Toán).
import { Badge, cx } from '@open-cake/ui-kit';
import { when } from '../../app/format.js';
import { useCatalogSource } from './use-catalog.js';

export function CatalogSourceSettings() {
  const { data } = useCatalogSource();
  if (!data) return null;
  const ketoan = data.catalogSource === 'ketoan';
  return (
    <section className="mb24" style={{ maxWidth: 880 }}>
      <h3 className="h3 mb16">Nguồn danh mục hàng</h3>
      <div className="col gap16">
        <div className={cx('choice', !ketoan && 'on')}><span className="dot" /><div><b>Shop tự quản</b> {!ketoan && <Badge tone="ok">đang dùng</Badge>}
          <div className="sm muted mt8">Thêm, sửa hàng và giá ngay trong Open CRM. Dữ liệu đã theo chuẩn Kế Toán.</div></div></div>
        <div className={cx('choice', ketoan ? 'on' : 'off')}><span className="dot" /><div><b>Lấy từ Open Kế Toán</b> {ketoan ? <Badge tone="ok">đang dùng</Badge> : <Badge tone="out">sắp có</Badge>}
          <div className="sm muted mt8">Kế Toán giữ mã, tên, giá, thuế; Open CRM nhận bản sao để chat và gửi giá. Cần khoá 1API của doanh nghiệp.</div></div></div>
      </div>
      <dl className="kv mt24">
        <dt>Mã đơn vị (tenant)</dt><dd><code>{data.tenant}</code></dd>
        <dt>Chi nhánh bán</dt><dd>{data.branchCode ? <code>{data.branchCode}</code> : <span className="subtle">— đặt khi nối Kế Toán</span>}</dd>
        <dt>Liên kết Kế Toán</dt><dd>{data.ketoan ? <>{data.ketoan.baseUrl}{data.ketoan.lastSyncAt && <span className="xs subtle"> · cập nhật {when(data.ketoan.lastSyncAt)}</span>}</> : <span className="subtle">chưa nối</span>}</dd>
      </dl>
    </section>
  );
}
