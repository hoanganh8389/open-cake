// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 05:44 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 S017-6/8 — màn Hàng hoá MỘT màn (mockup duyệt 2026-11-24): thanh tiêu đề · bảng · sheet theo URL (?item=<id>|new, R-WEB-2).
//   Tab bảng giá chỉ khi có ≥ 2 bảng giá (shop nhỏ chỉ có bảng công ty ⇒ giá sửa ngay trên dòng). Kế Toán giữ ⇒ một huy hiệu, không nút Thêm.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/catalog.ts.
import { catalogCategoryList, catalogItemGet, catalogItemList } from '@open-cake/contracts';
import { useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic, Pager, Search } from '@open-cake/ui-kit';
import { QueryView } from '../../app/QueryView.js';
import { hhmm } from '../../app/format.js';
import { useRoute } from '../../app/route.js';
import { EditItemSheet, NewItemSheet } from './item-sheet.js';
import { ItemTable } from './item-table.js';
import { needPermission, useCan } from '../../app/permissions.js';
import { useCatalogSource, useCompanyPrices } from './use-catalog.js';
import { t } from '../../i18n/index.js';

const PAGE = 50;
const L = t.catalog.items;

function OpenItem({ id, readonly, onClose }: { id: string; readonly: boolean; onClose: () => void }) {
  const q = useQueryAction(catalogItemGet, { itemId: id });
  return q.data ? <EditItemSheet key={q.data.item.updatedAt} it={q.data.item} readonly={readonly} onClose={onClose} /> : null;
}

export function Catalog() {
  const { query, setQuery } = useRoute();
  const page = Number(query.get('page') ?? 1);
  const q = query.get('q') ?? '';
  const cat = query.get('cat') ?? '';
  const open = query.get('item');
  const src = useCatalogSource();
  const prices = useCompanyPrices();
  const cats = useQueryAction(catalogCategoryList, {});
  const list = useQueryAction(catalogItemList, { q: q || undefined, categoryCode: cat || undefined, page, pageSize: PAGE, includeRetired: false });
  const total = list.meta?.total ?? 0;
  const ro = src.readonly;
  const canAdd = useCan('cake:catalog-lap'); // R-WEB-7
  const close = () => setQuery({ item: null });
  return (
    <div className="page flush">
      <div className="row" style={{ padding: '20px 32px 12px', flex: 'none' }}>
        <h1 className="h2" style={{ margin: 0 }}>{L.title}</h1>{list.data && <span className="muted">{total}</span>}
        {ro && <Badge tone="out"><Ic.lock style={{ width: 14, height: 14 }} />{L.fromKetoan}{src.data?.ketoan?.lastSyncAt && L.syncedAt(hhmm(src.data.ketoan.lastSyncAt))}</Badge>}
        <span className="grow" />
        <select className="input sm" style={{ width: 180 }} value={cat} aria-label={L.category} onChange={(e) => setQuery({ cat: e.target.value, page: null })}>
          <option value="">{L.allCategories}</option>{(cats.data ?? []).filter((c) => c.level === 3).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <Search placeholder={L.searchPh} sm style={{ width: 300 }} value={q} onChange={(v) => setQuery({ q: v, page: null })} />
        {!ro && <Btn pri disabled={!canAdd} title={canAdd ? undefined : needPermission('cake:catalog-lap')} onClick={() => setQuery({ item: 'new' })}><Ic.plus />{L.add}</Btn>}
      </div>
      <div className="grow" style={{ overflow: 'auto', padding: '0 32px 24px' }}>
        <QueryView q={list} empty={{ title: q || cat ? L.emptyFiltered : L.empty, desc: L.emptyDesc,
          action: !ro && !q && !cat && <Btn pri onClick={() => setQuery({ item: 'new' })}><Ic.plus />{L.add}</Btn> }}>
          {(rows) => <ItemTable rows={rows} prices={prices.byItem} readonly={ro} onOpen={(id) => setQuery({ item: id })} />}
        </QueryView>
        {total > PAGE && <div className="row mt16"><span className="grow" /><Pager page={page} total={Math.ceil(total / PAGE)} onPage={(p) => setQuery({ page: p === 1 ? null : p })} /></div>}
        {list.data && list.data.length > 0 && (
          <div className="xs subtle mt16">{ro ? L.hintReadonly : L.hintLocal}</div>
        )}
      </div>
      {open === 'new' && !ro && <NewItemSheet onClose={close} />}
      {open && open !== 'new' && <OpenItem id={open} readonly={ro} onClose={close} />}
    </div>
  );
}
