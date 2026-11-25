// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 09:57 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-8: ErrorBoundary ở Shell + mỗi màn. Màn lỗi = State "error" sẵn có (không màn mới) kèm mã lỗi errFp;
//   báo về POST /api/v1/system/client-errors khi có máy chủ (giả lập: chỉ console), ≤ 10 lần / phút, cắt độ dài, KHÔNG gửi nội dung tin / dữ liệu màn.
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: chữ hiển thị chuyển sang i18n/vi/app.ts.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Btn, Ic, State } from '@open-cake/ui-kit';
import { t } from '../i18n/index.js';

type Reporter = (body: { errFp: string; route: string; message: string; stack?: string; where: string }) => void;
let reporter: Reporter | null = null;
const sent: number[] = [];
/** main.tsx gắn khi nói chuyện với máy chủ. */
export const setErrorReporter = (r: Reporter | null) => { reporter = r; };

/** Dấu vân tay ngắn (8 hex) của thông điệp + dòng đầu stack — cùng lỗi ⇒ cùng mã để tra log. */
export function errFp(message: string, stack = ''): string {
  let h = 5381;
  for (const ch of `${message}|${stack.split('\n')[1] ?? ''}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0').slice(-8);
}

export class ErrorBoundary extends Component<{ where: string; children: ReactNode }, { error: Error | null; fp: string }> {
  override state = { error: null as Error | null, fp: '' };
  static getDerivedStateFromError(error: Error) { return { error, fp: errFp(error.message, error.stack) }; }
  override componentDidCatch(error: Error, _info: ErrorInfo) {
    const t = Date.now();
    while (sent.length && t - sent[0]! > 60_000) sent.shift();
    if (sent.length >= 10) return;
    sent.push(t);
    const body = { errFp: this.state.fp || errFp(error.message, error.stack), route: location.hash.split('?')[0]!.slice(0, 200), message: error.message.slice(0, 300), stack: error.stack?.slice(0, 2000), where: this.props.where };
    if (reporter) reporter(body); else console.error('[ErrorBoundary]', body);
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <State kind="error" title={t.app.errorBoundary.title} requestId={`errFp ${this.state.fp}`}
          desc={t.app.errorBoundary.desc}
          action={<Btn out onClick={() => this.setState({ error: null, fp: '' })}><Ic.refresh />{t.app.errorBoundary.reload}</Btn>} />
      </div>
    );
  }
}
