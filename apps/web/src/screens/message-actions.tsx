// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 08:46 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — mockup ⑥: thao tác trên một tin (hiện khi rê chuột) — Thả ❤️ · Thu hồi (chỉ tin của shop, có bước xác nhận R-CAKE-UI-3).
//   Gửi lệnh qua máy chủ (cake.message.react / cake.message.revoke); tin chỉ thành "đã thu hồi" khi kênh báo lại (không tự đổi tại chỗ).
import { useState } from 'react';
import { messageReact, messageRevoke, type Message } from '@open-cake/contracts';
import { useAction } from '@open-cake/action-client';
import { Btn, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../app/QueryView.js';
import { useCan } from '../app/permissions.js';
import { t } from '../i18n/index.js';

const L = t.inbox.chat;

export function MessageActions({ m }: { m: Message }) {
  const can = useCan('cake:inbox-lap');
  const react = useAction(messageReact);
  const revoke = useAction(messageRevoke);
  const [ask, setAsk] = useState(false);
  if (!can || m.revokedAt) return null;
  return (
    <>
      <div className="acts" role="toolbar" aria-label={L.actions}>
        <button type="button" title={L.react} onClick={() => react.mutate({ messageId: m.messageId, reaction: '❤️' })}>❤️</button>
        {m.direction === 'out' && <button type="button" className="danger" onClick={() => setAsk(true)}>{L.revoke}</button>}
      </div>
      <ActionErrorNote error={react.error} />
      <Sheet open={ask} onClose={() => setAsk(false)} icon={Ic.x} title={L.revokeTitle} sub={L.revokeSub}
        footer={<><Btn onClick={() => setAsk(false)}>{L.cancel}</Btn><Btn danger disabled={revoke.isPending} onClick={() => revoke.mutate({ messageId: m.messageId }, { onSuccess: () => setAsk(false) })}>{L.revoke}</Btn></>}>
        <div className="note sm">{m.text || L.image}</div>
        <ActionErrorNote error={revoke.error} />
      </Sheet>
    </>
  );
}
