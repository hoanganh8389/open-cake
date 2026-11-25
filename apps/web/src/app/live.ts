// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 10:02 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-9: MỘT luồng /api/v1/stream cho cả app (gắn ở App). Đọc bằng fetch + Authorization (EventSource không gửi
//   được header ⇒ sẽ phải để token trên URL). "changed" ⇒ gộp 500 ms rồi làm mới truy vấn (useInvalidateAll) — chỉ truy vấn ĐANG hiện tải lại, theo quyền của người xem.
//   Rớt / "bye" ⇒ nối lại sau 3 s, giãn tới 30 s; 401 ⇒ dừng (phiên hết — màn khác sẽ báo cần đăng nhập). Giả lập: không chạy.
import { useEffect } from 'react';
import { useInvalidateAll } from '@open-cake/action-client';

export function useLiveUpdates(enabled: boolean, getToken: () => string | null, base = '') {
  const refresh = useInvalidateAll();
  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    let wait = 3000, timer: ReturnType<typeof setTimeout> | undefined, flush: ReturnType<typeof setTimeout> | undefined;
    const changed = () => { clearTimeout(flush); flush = setTimeout(refresh, 500); };
    const run = async () => {
      try {
        const t = getToken();
        const res = await fetch(`${base}/api/v1/stream`, { headers: t ? { authorization: `Bearer ${t}` } : {}, signal: ac.signal });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const ev = buf.slice(0, i); buf = buf.slice(i + 2);
            if (/^event: hello/m.test(ev)) wait = 3000;
            if (/^event: changed/m.test(ev)) changed();
          }
        }
        changed(); // nối lại sau khi rớt: có thể đã lỡ gợi ý
      } catch { if (ac.signal.aborted) return; }
      timer = setTimeout(() => void run(), wait);
      wait = Math.min(wait * 2, 30_000);
    };
    void run();
    return () => { ac.abort(); clearTimeout(timer); clearTimeout(flush); };
  }, [enabled, getToken, base, refresh]);
}
