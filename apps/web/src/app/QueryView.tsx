// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: một chỗ quyết bốn trạng thái cho mọi khối dữ liệu (R-WEB-5): đang tải · lỗi (mã tra cứu) ·
//   không có quyền · trống (có lý do + nút) — màn không tự viết lại logic này.
import type { ReactNode } from 'react';
import { ApiError } from '@open-cake/action-client';
import { Btn, Ic, State } from '@open-cake/ui-kit';

export function QueryView<T>({ q, empty, children }: {
  q: { isLoading: boolean; error: Error | null; data: T | undefined; refetch: () => unknown };
  empty?: { title: string; desc?: ReactNode; action?: ReactNode; when?: (d: T) => boolean };
  children: (data: T) => ReactNode;
}) {
  if (q.isLoading) return <State kind="loading" />;
  if (q.error) {
    const e = q.error instanceof ApiError ? q.error : null;
    if (e?.code === 'FORBIDDEN' || e?.code === 'UNAUTHORIZED') {
      return <State kind="denied" title="Bạn chưa có quyền xem mục này" desc={e.hint ?? e.message} requestId={e.requestId} />;
    }
    return (
      <State kind="error" title={e?.message ?? 'Có lỗi khi tải dữ liệu'} desc={e?.hint} requestId={e?.requestId}
        action={<Btn out onClick={() => q.refetch()}><Ic.refresh />Thử lại</Btn>} />
    );
  }
  if (q.data === undefined) return <State kind="loading" />;
  const isEmpty = empty && (empty.when ? empty.when(q.data) : Array.isArray(q.data) && q.data.length === 0);
  if (isEmpty) return <State kind="empty" title={empty.title} desc={empty.desc} action={empty.action} />;
  return <>{children(q.data)}</>;
}

/** Lỗi của thao tác ghi, hiện trong sheet / dưới ô soạn (không alert). */
export function ActionErrorNote({ error }: { error: Error | null }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <div className="note warn sm" role="alert">
      <b>{error.message}</b>{e?.hint && <> — {e.hint}</>}
      {e?.requestId && <span className="subtle"> · Mã tra cứu: <code>{e.requestId}</code></span>}
    </div>
  );
}
