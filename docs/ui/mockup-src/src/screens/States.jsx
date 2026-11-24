// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-002/003 — bốn trạng thái của mọi màn (R-OC-UI-5), sheet, toast, thẻ "Cần cài", bộ thành phần.
import React, { useState } from 'react';
import { Ic, Btn, Badge, Chip, State, Toast, Gate, Avatar, Tabs } from '../ui.jsx';

export default function States() {
	const [toast, setToast] = useState(null);
	return (
		<div className="page">
			<h1 className="h1 mb8">Bốn trạng thái · thành phần</h1>
			<div className="muted mb24">Mỗi màn của Open CRM có đủ: đang tải · trống · lỗi · không có quyền. Lỗi luôn 4 trường (code / message / hint / help_code). Không alert / confirm / prompt.</div>
			<div className="grid g2 mb24">
				<div className="card"><div className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}><b>Đang tải</b><span className="muted sm">khung xám, không spinner giữa màn</span></div><State kind="loading" /></div>
				<div className="card"><div className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}><b>Trống</b><span className="muted sm">một câu + một nút làm gì tiếp</span></div><State kind="empty" title="Chưa có hội thoại nào" desc="Kết nối số Zalo đầu tiên để nhận tin. Hội thoại sẽ hiện ở đây ngay khi khách nhắn." action={<Btn pri><Ic.qr />Kết nối Zalo</Btn>} /></div>
				<div className="card"><div className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}><b>Lỗi</b><span className="muted sm">4 trường, nút Thử lại</span></div><State kind="error" title="Không tải được danh sách liên hệ" desc={<span><span className="kbd">OC-NET-01</span> Máy chủ không trả lời sau 10 giây. <b>Gợi ý:</b> kiểm tra mạng rồi thử lại; nếu lặp lại, xem Nhật ký. <a>help: OC-NET-01</a></span>} action={<Btn out><Ic.refresh />Thử lại</Btn>} /></div>
				<div className="card"><div className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}><b>Không có quyền</b><span className="muted sm">nói ai cấp, không đổ lỗi</span></div><State kind="denied" title="Bạn chưa được giao số Zalo nào" desc="Quản lý giao số cho bạn ở Cài đặt → Nhân viên. Sau đó tải lại trang này." action={<Btn out>Tải lại</Btn>} /></div>
			</div>
			<h2 className="h2 mb16">Thẻ "Cần cài …" (tính năng thuộc plugin khác)</h2>
			<div className="grid g2 mb24">
				<Gate need="Zalo Brain" why="Trợ lý trả lời, gợi ý AI, Facebook/Messenger qua Composio. Open CRM chạy đủ một mình; cài thêm thì các mục này sáng lên, không xung đột bảng." />
				<Gate need="Automation" why="Kịch bản kéo-thả, node AI, trợ lý thiết kế. Open CRM phát sự việc và nhận hành động qua hợp đồng có phiên bản." />
			</div>
			<h2 className="h2 mb16">Bộ thành phần</h2>
			<div className="card pad">
				<div className="row wrap mb16"><Btn pri>Nút chính</Btn><Btn>Nút phụ</Btn><Btn out>Viền</Btn><Btn ghost>Mờ</Btn><Btn danger>Nguy hiểm</Btn><Btn pri disabled>Vô hiệu</Btn><Btn pri sm>Nhỏ</Btn><Btn pri icon><Ic.plus /></Btn></div>
				<div className="row wrap mb16"><Badge>Mặc định</Badge><Badge tone="pri">Nhấn</Badge><Badge tone="ok" dot>Đã gửi</Badge><Badge tone="warn" dot>Chờ</Badge><Badge tone="err" dot>Lỗi</Badge><Badge tone="out">Viền</Badge></div>
				<div className="row wrap mb16"><Chip>Bộ lọc</Chip><Chip on>Đang chọn</Chip><Chip><Ic.tag />Có biểu tượng</Chip></div>
				<div className="row wrap mb16"><Avatar name="Nguyễn Thu Hương" size="sm" /><Avatar name="Nguyễn Thu Hương" online channel="Z" /><Avatar name="Hoa Mai Fashion" size="lg" channel="F" /><span className="muted sm">Avatar chữ, một màu xám; huy hiệu kênh Z/F/B; chấm xanh = đang kết nối</span></div>
				<div className="row wrap mb16"><Tabs items={[{ id: 'a', label: 'Tab viên' }, { id: 'b', label: 'Thứ hai' }]} value="a" /><Tabs underline items={[{ id: 'a', label: 'Tab gạch' }, { id: 'b', label: 'Thứ hai' }]} value="a" /></div>
				<div className="row wrap"><input className="input" style={{ width: 260 }} placeholder="Ô nhập 44 px" readOnly /><select className="input" style={{ width: 200 }}><option>Chọn</option></select><Btn pri onClick={() => setToast('ok')}>Hiện toast thành công</Btn><Btn out onClick={() => setToast('err')}>Hiện toast lỗi</Btn></div>
			</div>
			{toast && <Toast tone={toast}>{toast === 'ok' ? 'Đã gắn nhãn "Khách VIP" cho 3 liên hệ' : 'OC-SEND-03 · Vượt trần gửi hôm nay (200/200). Gợi ý: đổi số gửi hoặc hẹn giờ ngày mai.'}<button className="menu-dots" style={{ color: '#fff' }} onClick={() => setToast(null)}><Ic.x style={{ width: 16, height: 16 }} /></button></Toast>}
		</div>
	);
}
