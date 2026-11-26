// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — bước ③ Đăng nhập số Zalo (mockup kết nối ②): đặt tên ⇒ connect_start (QR từ máy kết nối) ⇒ hỏi connect_status mỗi 2 giây
//   ⇒ success ⇒ connect_finish (máy chủ ghi channel_accounts) ⇒ onDone. "Tạo mã mới" gửi lại flowId (cùng số, không thêm số mới). Đạt chỉ khi máy chủ đã ghi số.
import { useEffect, useRef, useState } from 'react';
import { channelConnectFinish, channelConnectStart, channelConnectStatus } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Badge, Btn, Ic } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../../app/QueryView.js';
import { t } from '../../i18n/index.js';

const L = t.setup.steps;
const LIVE = new Set(['idle', 'starting', 'waiting_scan', 'scanned']);

export type Connected = { channelAccountId: string; label: string };

export function QrStep({ onDone }: { onDone: (a: Connected) => void }) {
  const [label, setLabel] = useState('');
  const start = useAction(channelConnectStart);
  const finish = useAction(channelConnectFinish);
  const flowId = start.data?.flowId ?? '';
  const st = useQueryAction(channelConnectStatus, { flowId }, { enabled: !!flowId });
  const status = st.data?.status ?? (flowId ? 'waiting_scan' : 'idle');
  const qr = st.data?.qrRef ?? start.data?.qrRef ?? null;
  const finishing = useRef(false);

  useEffect(() => {
    if (!flowId || !LIVE.has(status)) return;
    const h = setInterval(() => void st.refetch(), 2000);
    return () => clearInterval(h);
  }, [flowId, status]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch ổn định theo flowId

  useEffect(() => {
    if (status !== 'success' || finishing.current) return;
    finishing.current = true;
    finish.mutate({ flowId }, { onSuccess: (a) => onDone(a), onError: () => { finishing.current = false; } });
  }, [status, flowId]); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ chạy khi trạng thái đổi

  const go = () => { finishing.current = false; start.mutate({ channel: 'zalo_personal', label: label.trim(), ...(flowId ? { flowId } : {}) }, { onSuccess: () => { if (flowId) void st.refetch(); } }); };
  const tone = status === 'success' ? 'ok' : status === 'declined' || status === 'error' || status === 'expired' ? 'err' : 'pri';
  return (
    <>
      {flowId && <div style={{ marginBottom: 8 }}><Badge tone={tone}>{L.st[status]}</Badge></div>}
      <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
        <div className="col" style={{ gap: 12, minWidth: 320 }}>
          <label className="sm" htmlFor="zl-label"><b>{L.label}</b></label>
          <input id="zl-label" className="input" value={label} placeholder={L.labelPh} disabled={!!flowId} onChange={(e) => setLabel(e.target.value)} />
          <div className="sm muted">{L.scanHow[0]}<b>{L.scanHow[1]}</b>{L.scanHow[2]}<b>{L.scanHow[3]}</b>{L.scanHow[4]}</div>
          <div className="row gap8">
            {!flowId && <Btn pri disabled={!label.trim() || start.isPending} onClick={go}><Ic.qr />{L.start}</Btn>}
            {flowId && <Btn out sm disabled={start.isPending || finish.isPending} onClick={go}><Ic.refresh />{L.newQr}</Btn>}
          </div>
          {st.data?.error && <div className="note warn">{st.data.error}</div>}
          <ActionErrorNote error={start.error ?? finish.error ?? st.error} />
        </div>
        {flowId && <div className="qrbox">{qr?.startsWith('data:image/') ? <img src={qr} alt={L.st.waiting_scan} /> : <Ic.qr />}</div>}
      </div>
    </>
  );
}
