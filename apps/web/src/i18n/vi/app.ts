// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-25 12:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: từ điển tiếng Việt nhóm "app" (khoá → chữ; chữ có dữ liệu = hàm nhận tham số).
// [2026-11-25 12:06 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11: khung (Shell, đăng nhập, bốn trạng thái, lỗi), Cài đặt, Tổng quan, màn "chưa có".
export const app = {
  money: { suffix: 'đ' },
  shell: {
    nav: { dashboard: 'Tổng quan', inbox: 'Hộp thư', contacts: 'Danh bạ', catalog: 'Hàng hoá & bảng giá', reports: 'Báo cáo', work: 'Công việc', settings: 'Cài đặt' },
    work: {
      heading: 'CÔNG VIỆC',
      campaigns: 'Chiến dịch gửi hàng loạt', workflow: 'Kịch bản tự động', integrations: 'Kết nối mở rộng', tasks: 'Công việc nội bộ', apps: 'Ứng dụng, API & Webhook',
      integrationsNote: 'Kế Toán · POS · PHASE-010',
    },
    accountTitle: (label: string, channel: string, connected: boolean) => `${label} · ${channel} · ${connected ? 'đang kết nối' : 'chưa kết nối'}`,
    connectChannel: 'Kết nối kênh',
    mockBadge: 'Bản giả lập', mockTitle: 'Dữ liệu giả lập theo hợp đồng — chưa nối máy chủ (PHASE-007)',
    mixBadge: 'Một phần giả lập', mixTitle: 'Hàng hoá chạy máy chủ thật; màn khác còn giả lập (PHASE-007)',
    channels: 'Kênh', states: 'Bốn trạng thái', notifications: 'Thông báo', more: 'Thêm',
  },
  query: {
    denied: 'Bạn chưa có quyền xem mục này', loadError: 'Có lỗi khi tải dữ liệu', retry: 'Thử lại',
    lookup: 'Mã tra cứu:', loadMore: 'Tải thêm', loading: 'Đang tải…',
  },
  errorBoundary: {
    title: 'Màn này gặp lỗi', desc: 'Dữ liệu của bạn không bị ảnh hưởng. Thử tải lại màn; nếu lặp lại, gửi mã lỗi bên dưới cho người quản trị.', reload: 'Tải lại màn',
  },
  needPermission: (permission: string) => `Bạn chưa có quyền ${permission} — nhờ quản lý cấp ở Cài đặt › Nhân viên.`,
  login: { title: 'Cần đăng nhập', desc: 'Mở Open CRM từ trang quản trị bizcity (WordPress) để đăng nhập một lần.', viaWp: 'Đăng nhập qua WordPress' },
  settings: {
    title: 'Cài đặt', recordTypes: 'Danh mục nhỏ (lớp dữ liệu mềm)', fields: (n: number) => `${n} trường`,
    staff: 'Nhân viên & quyền', staffDesc: 'Mời, đổi vai, giao tài khoản kênh, ngưng · vai riêng Cho / Cấm',
    sendGuard: 'Trần gửi (Send Guard)', sendGuardWhy: 'Trần mỗi giờ, giờ được gửi, danh sách không nhận — PHASE-011.',
  },
  soon: {
    items: {
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
    } as Record<string, readonly [string, string]>,
    fallback: ['Chưa có', 'Màn này chưa nằm trong phase hiện tại.'] as readonly [string, string],
    gate: 'Chưa có ở bản này',
  },
  states: {
    title: 'Bốn trạng thái', hintBefore: 'Mở màn bất kỳ kèm', hintAfter: '(trước dấu #) để xem trạng thái thật của màn đó.',
    emptyTitle: 'Chưa có hội thoại', emptyDesc: 'Khi khách nhắn tới, hội thoại sẽ hiện ở đây.',
    errorTitle: 'Không tải được dữ liệu', errorDesc: 'Bấm Thử lại; nếu còn lỗi, gửi mã tra cứu cho quản trị.',
    deniedDesc: 'Nhờ quản lý cấp quyền cake:contacts-xem.',
  },
  dashboard: {
    title: 'Tổng quan', accounts: (n: number) => `${n} tài khoản kênh`, addAccount: 'Thêm tài khoản', accountsHeading: 'Tài khoản',
    empty: 'Chưa có tài khoản kênh', unread: (n: number) => `${n} chưa đọc`, details: 'Chi tiết kênh', reconnect: 'Kết nối lại',
  },
} as const;
