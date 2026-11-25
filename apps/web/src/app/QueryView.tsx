// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: một chỗ quyết bốn trạng thái cho mọi khối dữ liệu (R-WEB-5): đang tải · lỗi (mã tra cứu) ·
//   không có quyền · trống (có lý do + nút) — màn không tự viết lại logic này.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { useEffect, useRef, type ReactNode } from 'react';
import { ApiError } from '@open-cake/action-client';
import { Btn, Ic, State } from '@open-cake/ui-kit';
import { t } from '../i18n/index.js';

export function QueryView<T>({ q, empty, children }: {
  q: { isLoading: boolean; error: Error | null; data: T | undefined; refetch: () => unknown };
  empty?: { title: string; desc?: ReactNode; action?: ReactNode; when?: (d: T) => boolean };
  children: (data: T) => ReactNode;
}) {
  if (q.isLoading) return <State kind="loading" />;
  if (q.error) {
    const e = q.error instanceof ApiError ? q.error : null;
    if (e?.code === 'FORBIDDEN' || e?.code === 'UNAUTHORIZED') {
      return <State kind="denied" title={t.app.query.denied} desc={e.hint ?? e.message} requestId={e.requestId} />;
    }
    return (
      <State kind="error" title={e?.message ?? t.app.query.loadError} desc={e?.hint} requestId={e?.requestId}
        action={<Btn out onClick={() => q.refetch()}><Ic.refresh />{t.app.query.retry}</Btn>} />
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
      {e?.requestId && <span className="subtle"> · {t.app.query.lookup} <code>{e.requestId}</code></span>}
    </div>
  );
}

// [2026-11-25 10:35 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-10: mốc "tải thêm" của danh sách con trỏ — chạm vùng nhìn thấy (IntersectionObserver) ⇒ tải trang kế;
//   kèm nút cho bàn phím / trình duyệt không có IO. Hết trang ⇒ không vẽ gì.
export function LoadMore({ q, label = t.app.query.loadMore }: { q: { hasMore: boolean; loadingMore: boolean; more: () => void }; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasMore, loadingMore, more } = q;
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && !loadingMore) more(); }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, more]);
  if (!hasMore) return null;
  return <div ref={ref} className="row" style={{ justifyContent: 'center', padding: 12 }}><Btn ghost sm disabled={loadingMore} onClick={more}>{loadingMore ? t.app.query.loading : label}</Btn></div>;
}
