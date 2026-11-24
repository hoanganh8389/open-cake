// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-7: Kênh (màn mới) — tài khoản kênh của doanh nghiệp (cake.channel.list) + sheet Kết nối kênh 4 bước
//   (architecture/60-UI §3): ① khoá biz-… ② chọn kênh ③ cake.channel.connect_start ④ thắng nhỏ cake.channel.test — "Đã kết nối" chỉ khi có bằng chứng hai chiều.
import { useState } from 'react';
import { ACCOUNT_CHANNELS, channelConnectStart, channelList, channelTest, type AccountChannel } from '@open-cake/contracts';
import { useAction, useQueryAction } from '@open-cake/action-client';
import { AccountAvatar, Badge, Btn, Card, ChannelBadge, CHANNEL_LABEL, Ic, Sheet } from '@open-cake/ui-kit';
import { ActionErrorNote, QueryView } from '../app/QueryView.js';
import { when } from '../app/format.js';
import { go, useRoute } from '../app/route.js';

const STATUS: Record<string, [string, string]> = {
  connected: ['ok', 'Đang kết nối'], connecting: ['warn', 'Đang nối'], auth_required: ['warn', 'Cần đăng nhập lại'],
  checkpoint: ['err', 'Bị Facebook kiểm tra'], degraded: ['warn', 'Chập chờn'], disconnected: ['', 'Đã ngắt'],
};
const NOTE: Record<AccountChannel, string> = {
  zalo_personal: 'Quét QR bằng Zalo trên điện thoại. Chỉ dùng số phụ (API không chính thức).',
  zalo_oa: 'Đăng nhập Zalo OA chính thức, chọn OA.',
  facebook_page: 'Đăng nhập Facebook, chọn Fanpage (API chính thức). Gồm tin nhắn Page và bình luận.',
  facebook_personal: 'Facebook cá nhân qua kênh không chính thức: có thể bị Facebook kiểm tra (checkpoint). Chỉ dùng tài khoản phụ.',
  facebook_group: 'Chọn Nhóm do Fanpage của bạn quản lý; nhận bình luận trong nhóm.',
};

function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<AccountChannel>('zalo_personal');
  const start = useAction(channelConnectStart);
  const close = () => { setStep(1); start.reset(); onClose(); };
  return (
    <Sheet open={open} onClose={close} icon={Ic.link} title="Kết nối kênh" sub={`Bước ${step}/4`}
      footer={<>
        <Btn onClick={close}>Đóng</Btn>
        {step === 1 && <Btn pri onClick={() => setStep(2)}>Tiếp</Btn>}
        {step === 2 && <Btn pri onClick={() => start.mutate({ channel, label: CHANNEL_LABEL[channel] ?? channel }, { onSuccess: () => setStep(3) })} disabled={start.isPending}>Bắt đầu kết nối</Btn>}
        {step === 3 && <Btn pri onClick={() => setStep(4)}>Đã làm xong trên điện thoại / Facebook</Btn>}
      </>}>
      {step === 1 && <div className="note ok">① Khoá <code>biz-…</code> của site hợp lệ (giả lập). Bật thêm kênh không cần khoá mới.</div>}
      {step === 2 && (
        <div className="col gap8">{ACCOUNT_CHANNELS.map((c) => (
          <label key={c} className="card pad row gap16" style={{ cursor: 'pointer', borderColor: channel === c ? 'var(--primary)' : undefined }}>
            <input type="radio" name="ch" checked={channel === c} onChange={() => setChannel(c)} />
            <div className="grow"><b>{CHANNEL_LABEL[c]}</b><div className="muted sm">{NOTE[c]}</div></div>
          </label>
        ))}<ActionErrorNote error={start.error} /></div>
      )}
      {step === 3 && start.data && (
        <div className="row gap24" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 200, height: 200, borderRadius: 12, background: 'var(--muted)', display: 'grid', placeItems: 'center' }}>{start.data.nextStep === 'qr' ? <Ic.qr style={{ width: 120, height: 120 }} /> : <Ic.globe style={{ width: 96, height: 96 }} />}</div>
          <div className="muted">③ Bước kế: <b>{{ qr: 'quét QR', oauth: 'đăng nhập', approve_on_device: 'duyệt đăng nhập trên thiết bị', choose_page: 'chọn Fanpage', choose_group: 'chọn Nhóm' }[start.data.nextStep]}</b>. Trạng thái "đã kết nối" lấy từ Cell, không từ cú bấm này.</div>
        </div>
      )}
      {step === 4 && <div className="note">④ Chọn người phụ trách, chế độ mặc định <b>thủ công</b>, rồi bấm <b>Gửi thử</b> trên thẻ tài khoản để có bằng chứng hai chiều.</div>}
    </Sheet>
  );
}

export function Channels() {
  const { query, setQuery } = useRoute();
  const list = useQueryAction(channelList, {});
  const test = useAction(channelTest);
  return (
    <div className="page">
      <div className="row mb24"><h1 className="h1">Kênh</h1><span className="muted">Tài khoản của doanh nghiệp trên Zalo / Facebook</span><span className="grow" />
        <Btn pri onClick={() => setQuery({ connect: 1 })}><Ic.plus />Kết nối kênh</Btn></div>
      <ActionErrorNote error={test.error} />
      <QueryView q={list} empty={{ title: 'Chưa kết nối kênh nào', desc: 'Kết nối một số Zalo hoặc một Fanpage để bắt đầu nhận tin.', action: <Btn pri onClick={() => setQuery({ connect: 1 })}>Kết nối kênh</Btn> }}>
        {(xs) => (
          <div className="grid g3">{xs.map((a) => {
            const [tone, label] = STATUS[a.status] ?? ['', a.status];
            return (
              <Card key={a.channelAccountId}>
                <div className="row gap16" style={{ alignItems: 'flex-start' }}>
                  <AccountAvatar label={a.label} size={48} />
                  <div className="grow"><div className="h3">{a.label}</div><div className="row gap8 mt8"><ChannelBadge channel={a.channel} /><Badge tone={tone}>{label}</Badge></div>
                    <div className="xs subtle mt8">{a.testedAt ? `Gửi thử hai chiều lúc ${when(a.testedAt)}` : 'Chưa gửi thử — chưa tính là đã kết nối'}</div></div>
                </div>
                <div className="row mt16">
                  <Btn pri block onClick={() => go('inbox', { account: a.channelAccountId })}>Mở hộp thư</Btn>
                  <Btn out block disabled={test.isPending} onClick={() => test.mutate({ channelAccountId: a.channelAccountId })}>Gửi thử</Btn>
                </div>
              </Card>
            );
          })}</div>
        )}
      </QueryView>
      <ConnectSheet open={query.get('connect') === '1'} onClose={() => setQuery({ connect: null })} />
    </div>
  );
}
