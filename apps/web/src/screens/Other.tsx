// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:10 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — màn chưa tới phase nói rõ vì sao + phase nào (R-NO-FAKE, R-BLOCK-1) thay vì số giả;
//   trang "Bốn trạng thái" để duyệt bộ thành phần (S003-1).
import { Btn, Card, Gate, Ic, State } from '@open-cake/ui-kit';

const SOON: Record<string, [string, string]> = {
  reports: ['Báo cáo', 'Báo cáo đếm từ sổ chạm khách — có ở PHASE-012 khi có máy chủ và sổ thật.'],
  campaigns: ['Chiến dịch gửi hàng loạt', 'Module broadcast + Send Guard — PHASE-011.'],
  workflow: ['Kịch bản tự động', 'Kịch bản và skill chạy ở Twin Brain qua MCP — PHASE-013. Open CRM chỉ cung cấp sự kiện và action.'],
  integrations: ['Kết nối mở rộng', 'Nối Kế Toán / POS bằng hợp đồng bizcity_* — PHASE-010.'],
  tasks: ['Công việc nội bộ', 'Module tasks — PHASE-012.'],
  apps: ['Ứng dụng, API & Webhook', 'Khoá API site và webhook ra — PHASE-013.'],
  settings: ['Cài đặt', 'Nhân viên, quyền, trần gửi — PHASE-004 và PHASE-011.'],
  groups: ['Nhóm khách', 'Có sau khi có máy chủ.'],
  invites: ['Lời mời kết bạn', 'Cần Cell hỗ trợ kết bạn — sau PHASE-006.'],
  history: ['Lịch sử sổ chăm sóc', 'Xem từng khách ở Contact 360; bảng tổng hợp có ở PHASE-012.'],
};

export function NotYet({ id }: { id: string }) {
  const [title, why] = SOON[id] ?? ['Chưa có', 'Màn này chưa nằm trong phase hiện tại.'];
  return <div className="page"><h1 className="h1 mb24">{title}</h1><Gate need="Chưa có ở bản này" why={why} /></div>;
}

export function States() {
  return (
    <div className="page">
      <h1 className="h1 mb24">Bốn trạng thái</h1>
      <div className="muted mb16">Mở màn bất kỳ kèm <code>?mock=empty</code>, <code>?mock=error</code>, <code>?mock=denied</code>, <code>?mock=slow</code> (trước dấu #) để xem trạng thái thật của màn đó.</div>
      <div className="grid g2">
        <Card><State kind="loading" /></Card>
        <Card><State kind="empty" title="Chưa có hội thoại" desc="Khi khách nhắn tới, hội thoại sẽ hiện ở đây." action={<Btn pri>Kết nối kênh</Btn>} /></Card>
        <Card><State kind="error" title="Không tải được dữ liệu" desc="Bấm Thử lại; nếu còn lỗi, gửi mã tra cứu cho quản trị." requestId="mock-12" action={<Btn out><Ic.refresh />Thử lại</Btn>} /></Card>
        <Card><State kind="denied" title="Bạn chưa có quyền xem mục này" desc="Nhờ quản lý cấp quyền cake:contacts-xem." /></Card>
      </div>
    </div>
  );
}
