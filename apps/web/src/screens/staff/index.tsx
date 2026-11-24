// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — Cài đặt › Nhân viên + Vai & quyền theo mockup đã duyệt (mockup-nhan-vien, -sua-nhan-vien, -ngung, -moi,
//   -vai-quyen, -vai-rieng): danh sách kiểu WordPress Users (lọc theo vai), sheet sửa (một vai + tài khoản kênh), ngưng có xác nhận, mời; ma trận vai (hệ thống chỉ xem,
//   vai riêng bấm ô: Cho / Cấm). Vị trí trên URL (R-WEB-2): #/staff?tab=roles&user=…&invite=1&newRole=1. Nút ghi khoá kèm lý do (R-WEB-7); máy chủ kiểm lại.
// [2026-11-24 11:50 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3 — thêm tab Khoá API (#/staff?tab=keys) theo mockup đã duyệt; tách tệp theo luật < 200 dòng.
import { Tabs } from '@open-cake/ui-kit';
import { useRoute } from '../../app/route.js';
import { ApiKeysTab } from './apikeys.js';
import { StaffTab } from './people.js';
import { RolesTab } from './roles.js';

const TABS = [{ id: 'staff', label: 'Nhân viên' }, { id: 'roles', label: 'Vai & quyền' }, { id: 'keys', label: 'Khoá API' }];

export function Staff() {
  const { query, setQuery } = useRoute();
  const tab = TABS.find((t) => t.id === query.get('tab'))?.id ?? 'staff';
  return (
    <div className="page">
      <div className="mb24"><Tabs underline value={tab} onChange={(t) => setQuery({ tab: t === 'staff' ? null : t, role: null, user: null })} items={TABS} /></div>
      {tab === 'staff' ? <StaffTab /> : tab === 'roles' ? <RolesTab /> : <ApiKeysTab />}
    </div>
  );
}
