// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: RecordTypeScreen — màn CRUD TỰ SINH từ record_type (≈ màn quản trị custom post type của WordPress):
//   cột = listColumns, form = fields, kiểm = recordDataSchema (cùng hàm máy chủ). Thêm một loại bản ghi = thêm một khai báo, không viết màn mới (canon §4).
import { useState } from 'react';
import { recordArchive, recordCreate, recordDataSchema, recordList, recordTypeOf, recordUpdate, type FieldSpec, type RecordRow, type RecordTypeSpec } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Chip, Ic, Search, Sheet, State } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go, useRoute } from '../app/route.js';

type Draft = Record<string, unknown>;
const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v === undefined || v === null || v === '' ? '—' : String(v));

function Field({ f, value, onChange }: { f: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  const label = <label className="sm muted">{f.label}{f.required && ' *'}{f.pii && <span className="xs subtle"> · dữ liệu cá nhân</span>}</label>;
  const common = { className: 'input mt8', 'aria-label': f.label };
  let input;
  if (f.type === 'text') input = <textarea {...common} rows={4} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  else if (f.type === 'enum') input = <select {...common} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">— chọn —</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>;
  else if (f.type === 'bool') input = <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} aria-label={f.label} />;
  else if (f.type === 'string[]') input = <input {...common} value={Array.isArray(value) ? value.join(', ') : ''} onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} placeholder="cách nhau dấu phẩy" />;
  else input = <input {...common} type={f.type === 'int' ? 'number' : f.type === 'date' ? 'date' : 'text'} maxLength={f.max} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  return <div className="mt16">{label}{input}</div>;
}

function RecordSheet({ spec, row, onClose }: { spec: RecordTypeSpec; row: RecordRow | 'new'; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(row === 'new' ? {} : row.data);
  const create = useAction(recordCreate);
  const update = useAction(recordUpdate);
  const check = recordDataSchema(spec).safeParse(draft); // kiểm ngay trên máy khách bằng cùng schema
  const save = () => (row === 'new'
    ? create.mutate({ type: spec.key, data: draft }, { onSuccess: onClose })
    : update.mutate({ recordId: row.recordId, data: draft }, { onSuccess: onClose }));
  const busy = create.isPending || update.isPending;
  return (
    <Sheet open onClose={onClose} icon={Ic.note} title={row === 'new' ? `Thêm ${spec.label.toLowerCase()}` : `Sửa ${spec.label.toLowerCase()}`}
      footer={<><Btn onClick={onClose}>Huỷ</Btn><Btn pri disabled={busy || !check.success} onClick={save}>Lưu</Btn></>}>
      {spec.fields.map((f) => <Field key={f.key} f={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />)}
      {!check.success && Object.keys(draft).length > 0 && <div className="xs subtle mt16">{check.error.issues[0]?.message}</div>}
      <ActionErrorNote error={create.error ?? update.error} />
    </Sheet>
  );
}

export function RecordTypeScreen({ typeKey }: { typeKey: string }) {
  const spec = recordTypeOf(typeKey);
  const { query, setQuery } = useRoute();
  const q = query.get('q') ?? '';
  const archived = query.get('archived') === '1';
  const list = useQueryAction(recordList, { type: typeKey, q: q || undefined, includeArchived: archived }, { enabled: !!spec });
  const archive = useAction(recordArchive);
  const [open, setOpen] = useState<RecordRow | 'new' | null>(null);
  if (!spec) return <div className="page"><State kind="empty" title="Loại bản ghi chưa đăng ký" desc={`"${typeKey}" không có trong registry lớp mềm (R-DATA-1).`} action={<Btn out onClick={() => go('settings')}>Về Cài đặt</Btn>} /></div>;
  const cols = spec.listColumns.map((k) => spec.fields.find((f) => f.key === k)!);
  return (
    <div className="page">
      <div className="row mb16"><Btn ghost icon title="Về Cài đặt" onClick={() => go('settings')}><Ic.back /></Btn><h1 className="h1">{spec.label}</h1><Badge>{spec.key} · v{spec.version}</Badge><span className="grow" />
        <Btn pri onClick={() => setOpen('new')}><Ic.plus />Thêm</Btn></div>
      <div className="row mb16"><Search sm placeholder={`Tìm ${spec.label.toLowerCase()}…`} style={{ width: 360 }} value={q} onChange={(v) => setQuery({ q: v })} />
        <Chip on={archived} onClick={() => setQuery({ archived: archived ? null : 1 })}>Gồm cả đã lưu trữ</Chip></div>
      <ActionErrorNote error={archive.error} />
      <QueryView q={list} empty={{ title: `Chưa có ${spec.label.toLowerCase()}`, action: <Btn pri onClick={() => setOpen('new')}>Thêm</Btn> }}>
        {(rows) => (
          <table className="tbl">
            <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th>Cập nhật</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.recordId} style={{ opacity: r.status === 'archived' ? 0.55 : 1, cursor: 'pointer' }} onClick={() => setOpen(r)}>
                {cols.map((c) => <td key={c.key}>{c.pii ? '•••' : show(r.data[c.key])}</td>)}
                <td className="muted sm">{when(r.updatedAt)}</td>
                <td className="r" onClick={(e) => e.stopPropagation()}><Btn sm ghost disabled={archive.isPending} onClick={() => archive.mutate({ recordId: r.recordId, archived: r.status === 'active' })}>{r.status === 'active' ? 'Lưu trữ' : 'Dùng lại'}</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </QueryView>
      {open && <RecordSheet key={open === 'new' ? 'new' : open.recordId} spec={spec} row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
