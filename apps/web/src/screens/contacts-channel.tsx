// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-26 08:46 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — mockup ⑤: Danh bạ › "Đồng bộ từ kênh" (bạn bè + nhóm, tên + ảnh) và "Tìm theo số điện thoại".
//   Chỉ gửi lệnh; khách / nhóm hiện trong danh bạ khi kênh trả về (touch backfill — không thông báo, không tự trả lời). Tài khoản chưa kết nối không có trong danh sách chọn.
import { useState } from 'react';
import { channelList, contactFind, directorySync } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { Btn, CHANNEL_LABEL, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote } from '../app/QueryView.js';
import { useCan } from '../app/permissions.js';
import { t } from '../i18n/index.js';

const L = t.inbox.contacts.channel;
const PERSONAL = ['zalo_personal', 'facebook_personal'];

export function ContactsChannelTools() {
  const accs = (useQueryAction(channelList, {}).data ?? []).filter((a) => a.status === 'connected' && PERSONAL.includes(a.channel));
  const sync = useAction(directorySync);
  const find = useAction(contactFind);
  const canSync = useCan('cake:channels-lap');
  const canFind = useCan('cake:inbox-lap');
  const [open, setOpen] = useState<'sync' | 'find' | null>(null);
  const [acc, setAcc] = useState('');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const accountId = acc || accs[0]?.channelAccountId || '';
  const close = () => { setOpen(null); setDone(false); setPhone(''); };
  const run = () => (open === 'sync' ? sync.mutate({ channelAccountId: accountId }, { onSuccess: () => setDone(true) }) : find.mutate({ channelAccountId: accountId, phone }, { onSuccess: () => setDone(true) }));
  if (!accs.length) return null;
  return (
    <>
      {canFind && <Btn out sm onClick={() => setOpen('find')}><Ic.search />{L.find}</Btn>}
      {canSync && <Btn out sm onClick={() => setOpen('sync')}><Ic.refresh />{L.sync}</Btn>}
      <Sheet open={open !== null} onClose={close} icon={open === 'sync' ? Ic.refresh : Ic.search} title={open === 'sync' ? L.sync : L.find} sub={open === 'sync' ? L.syncSub : L.findSub}
        footer={<><Btn onClick={close}>{L.close}</Btn>{!done && <Btn pri disabled={!accountId || (open === 'find' && !phone) || sync.isPending || find.isPending} onClick={run}>{open === 'sync' ? L.sync : L.find}</Btn>}</>}>
        <dl className="kv">
          <dt>{L.account}</dt>
          <dd><select className="input sm" style={{ width: '100%' }} value={accountId} onChange={(e) => setAcc(e.target.value)}>{accs.map((a) => <option key={a.channelAccountId} value={a.channelAccountId}>{a.label} · {CHANNEL_LABEL[a.channel] ?? a.channel}</option>)}</select></dd>
          {open === 'find' && <><dt>{L.phone}</dt><dd><input className="input sm" style={{ width: '100%' }} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} placeholder="0909 123 456" /></dd></>}
        </dl>
        {done && <div className="note sm mt16">{open === 'sync' ? L.syncDone : L.findDone}</div>}
        <ActionErrorNote error={sync.error ?? find.error} />
      </Sheet>
    </>
  );
}
