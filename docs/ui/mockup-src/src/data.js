// [2026-11-23 06:59 PM Johnny Chu - Chu Hoàng Anh] PHASE-001…016 — số liệu GIẢ LẬP cho bản mẫu. Tên, số, UID là ví dụ.
export const accounts = [
	{ id: 'a1', name: 'Shop Hoa Mai', ch: 'Z', uid: '7350219485123001001', phone: '0901234567', on: true, unread: 3, folder: true },
	{ id: 'a2', name: 'Hoa Mai CSKH', ch: 'Z', uid: '7350219485123001002', phone: '0912345678', on: true, unread: 2 },
	{ id: 'a3', name: 'Hoa Mai Kho Sỉ', ch: 'Z', uid: '7350219485123001003', phone: '0938112233', on: true, unread: 2, folder: true },
	{ id: 'a4', name: 'Ngọc Lan - Sale', ch: 'Z', uid: '7350219485123001004', phone: '0977445566', on: true, unread: 2 },
	{ id: 'a5', name: 'Hoa Mai Fashion', ch: 'F', uid: '100089123456789', on: true, unread: 2, ext: true },
	{ id: 'a6', name: 'Hoa Mai Outlet', ch: 'F', uid: '100089123456790', on: false, unread: 0, ext: true },
	{ id: 'a7', name: 'Hoa Mai Bot', ch: 'B', uid: '7012345678', handle: '@hoamai_shop_bot', on: true, unread: 2, ext: true },
];

export const contacts = [
	{ name: 'Chị Hương (váy hoa)', real: 'Nguyễn Thu Hương', tags: ['Khách VIP', 'Đặt hàng'], sex: 'Nữ', dob: '21/10/1992', phone: '0912345671', last: '19-10', note: true },
	{ name: 'Anh Khoa - sỉ HN', real: 'Trần Minh Khoa', tags: ['Khách sỉ'], sex: 'Nam', dob: '05/03/1988', phone: '0987654322', last: '19-10', note: true },
	{ name: 'Lê Thảo Vy', tags: ['Đặt hàng'], sex: 'Nữ', dob: '14/02/1999', phone: '0934567893', last: '18-10' },
	{ name: 'Phạm Gia Bảo', tags: ['Chờ phản hồi'], sex: 'Nam', phone: '0905678904', last: '18-10', note: true },
	{ name: 'Quỳnh Chi (phụ kiện)', real: 'Đỗ Quỳnh Chi', tags: ['Khách VIP'], sex: 'Nữ', dob: '30/07/1996', phone: '0976543215', last: '18-10' },
	{ name: 'Võ Thanh Tùng', tags: [], sex: 'Nam', phone: '0868123456', last: '17-10' },
	{ name: 'Hoàng Mỹ Linh', tags: ['Đặt hàng'], sex: 'Nữ', dob: '09/09/2000', phone: '0399887766', last: '17-10', note: true },
	{ name: 'Bùi Đức Anh', tags: [], sex: 'Nam', phone: '0918223344', last: '17-10' },
	{ name: 'Chị Thảo (sofa)', real: 'Ngô Phương Thảo', tags: ['Khách sỉ'], sex: 'Nữ', phone: '0945667788', last: '17-10', note: true },
	{ name: 'Đặng Hải Nam', tags: [], sex: 'Nam', phone: '0377112233', last: '16-10' },
];

export const tagTone = { 'Khách VIP': 'warn', 'Đặt hàng': 'pri', 'Khách sỉ': 'out', 'Chờ phản hồi': '', 'Đã chốt đơn': 'ok' };

export const conversations = [
	{ id: 'c1', name: 'Chị Hương (váy hoa)', at: '10:28', last: 'Dạ chị chuyển khoản rồi nhé, em check giúp chị', tags: ['Khách VIP', 'Đặt hàng'], pin: true, unread: 0, mine: true },
	{ id: 'c2', name: 'Khách sỉ Hoa Mai 2026', at: '10:24', last: 'Minh: Lô váy hoa đợt 2 về chưa shop…', group: true, unread: 12, mention: true },
	{ id: 'c3', name: 'Anh Khoa - sỉ HN', at: '10:16', last: 'Anh lấy 20 bộ, báo giá sỉ giúp anh nha', tags: ['Khách sỉ'], unread: 2 },
	{ id: 'c4', name: 'Lê Thảo Vy', at: '10:03', last: '[Hình ảnh]', tags: ['Đặt hàng'], unread: 1 },
	{ id: 'c5', name: 'Quỳnh Chi (phụ kiện)', at: '09:42', last: 'Lấy 2 cái có freeship không shop?', tags: ['Khách VIP'], replied: true },
	{ id: 'c6', name: 'Hội yêu váy hoa', at: '09:15', last: 'Hoa Mai: BST Thu – Đông đã lên kệ!', group: true, replied: true },
	{ id: 'c7', name: 'Phạm Gia Bảo', at: '08:20', last: 'File: Bao-gia-si-T10.pdf', tags: ['Chờ phản hồi'], replied: true },
	{ id: 'c8', name: 'Võ Thanh Tùng', at: '07:20', last: 'Mẫu này còn size 42 không ạ?', muted: true, replied: true },
	{ id: 'c9', name: 'Hoàng Mỹ Linh', at: '05:30', last: 'Cảm ơn shop, váy đẹp lắm ạ', tags: ['Đặt hàng'], replied: true },
];

export const messages = [
	{ out: true, at: '09:14', text: 'Dạ còn chị ơi! Mẫu này shop có 3 màu: hồng, xanh mint và vàng ạ' },
	{ out: true, at: '09:14', img: 'Váy hoa Thu – Đông · 3 màu' },
	{ at: '09:18', text: 'Chị lấy 2 cái màu hồng size M nhé. Có freeship không em?', react: '♥' },
	{ out: true, at: '09:19', text: 'Đơn từ 2 sản phẩm shop freeship toàn quốc luôn ạ. Tổng 2 váy là 780.000đ, chị gửi giúp em địa chỉ nhận hàng nhé!', react: '👍' },
	{ at: '09:22', text: '12 Nguyễn Trãi, P. Bến Thành, Q.1, TP.HCM — 0912 345 671' },
	{ out: true, at: '09:24', file: { name: 'Hoa-don-HM1024.pdf', size: '177.86 KB' } },
	{ at: '10:28', text: 'Dạ chị chuyển khoản rồi nhé, em check giúp chị' },
];

export const campaigns = [
	{ id: 'k1', name: 'Tri ân khách hàng tháng 10', status: 'running', kind: 'Tin nhắn', total: 40, sent: 26, err: 2, wait: 12, created: '16/10/2026', gap: '45 giây – 1,5 phút', from: '08:00 mỗi ngày', cap: 200 },
	{ id: 'k2', name: 'Mời vào nhóm Khách sỉ', status: 'paused', kind: 'Mời vào nhóm', total: 120, sent: 64, err: 2 },
	{ id: 'k3', name: 'Kết bạn khách mới từ Fanpage', status: 'draft', kind: 'Hỗn hợp', total: 75, sent: 0, err: 0 },
	{ id: 'k4', name: 'Flash sale 9.9 — khách cũ', status: 'done', kind: 'Tin nhắn', total: 286, sent: 279, err: 7 },
];
export const campaignTargets = [
	['Nguyễn Thu Hương', '0912345671', '07:53 · 19/10'], ['Trần Minh Khoa', '0987654322', '07:59 · 19/10'], ['Lê Thảo Vy', '0934567893', '08:05 · 19/10'],
	['Phạm Gia Bảo', '0905678904', '08:11 · 19/10'], ['Đỗ Quỳnh Chi', '0976543215', '08:17 · 19/10'], ['Võ Thanh Tùng', '0868123456', '08:23 · 19/10'],
	['Hoàng Mỹ Linh', '0399887766', '08:29 · 19/10'], ['Bùi Đức Anh', '0918223344', '08:35 · 19/10'],
];

export const employees = [
	{ group: 'Bán hàng', list: [
		{ name: 'Nguyễn Thị Lan', user: '@lan.nguyen', modules: 2, accounts: 1, since: '19/10/2026', online: true },
		{ name: 'Trần Văn Minh', user: '@minh.tran', modules: 1, accounts: 2, since: '19/10/2026', online: true },
	] },
	{ group: 'Chăm sóc khách hàng', list: [
		{ name: 'Lê Hoàng Yến', user: '@yen.le', modules: 3, accounts: 1, since: '19/10/2026', online: true },
		{ name: 'Phạm Quốc Bảo', user: '@bao.pham', modules: 1, accounts: 0, since: '13/10/2026', off: true },
	] },
];

export const tasks = {
	'Cần làm': [
		{ t: 'Gọi lại 8 khách khiếu nại giao chậm', pri: 'Khẩn cấp', due: '18 thg 10', who: ['Nguyễn Thị Lan'], c: 2 },
		{ t: 'Cập nhật bảng giá sỉ lên nhóm Zalo', pri: 'Bình thường', due: '22 thg 10', who: ['Trần Văn Minh'] },
		{ t: 'Thiết kế banner BST Thu – Đông', pri: 'Cao', due: '23 thg 10', who: ['Lê Hoàng Yến', 'Trần Văn Minh'] },
	],
	'Đang làm': [
		{ t: 'Trả lời tin hỏi giá tồn cuối tuần', pri: 'Cao', due: '20 thg 10', who: ['Nguyễn Thị Lan'], c: 3, p: [12, 25] },
		{ t: 'Chụp ảnh 12 mẫu váy hoa mới', pri: 'Bình thường', due: '21 thg 10', who: ['Lê Hoàng Yến'], p: [7, 12] },
		{ t: 'Kiểm kho size S–M trước flash sale', pri: 'Bình thường', due: '20 thg 10', who: ['Phạm Quốc Bảo'], p: [1, 4] },
	],
	'Xem xét': [ { t: 'Lên nội dung chiến dịch Tri ân tháng 10', pri: 'Cao', due: '19 thg 10', who: ['Trần Văn Minh', 'Nguyễn Thị Lan'], c: 5 } ],
	'Hoàn thành': [ { t: 'Tổng hợp phản hồi khách tuần 41', pri: 'Thấp', due: '17 thg 10', who: ['Lê Hoàng Yến'] } ],
	'Huỷ': [],
};
export const priTone = { 'Khẩn cấp': 'err', 'Cao': 'warn', 'Bình thường': 'pri', 'Thấp': '' };

export const apps = [
	{ code: 'BT', name: 'Báo cáo doanh thu', by: 'Hoa Mai Tech · v1.2.0', on: true, where: 'Chỉ giao diện', desc: 'Xem doanh thu theo ngày, kênh và nhân viên ngay trong Open CRM.', slots: ['Trang riêng', 'Kịch bản'], cta: 'Mở' },
	{ code: 'TN', name: 'Tạo đơn nhanh', by: 'Hoa Mai Tech · v0.9.3', on: true, where: 'Chạy trên máy chủ', desc: 'Panel tạo đơn ngay trong khung chat, đẩy sang Open Kiot và in phiếu giao hàng.', slots: ['Panel chat', 'Nút soạn tin'], cta: 'Dùng trong màn chat' },
	{ code: 'TV', name: 'Tích điểm thành viên', by: 'Loyalty VN · v2.0.1', on: false, where: 'Dịch vụ ngoài', desc: 'Đồng bộ điểm thưởng với hệ thống thành viên, node kịch bản cộng điểm khi chốt đơn.', slots: ['Kịch bản'], cta: 'Bật' },
];

export const integrations = {
	ai: [ { name: 'Trợ lý bán hàng', meta: 'Agent Guru · Zalo Brain', def: true, on: true }, { name: 'CSKH Hoa Mai', meta: 'Agent Guru · Zalo Brain', on: true } ],
	pos: [
		{ name: 'Open Kiot', desc: 'Sổ bán lẻ Bizcity. Tra đơn, tạo đơn từ chat; sự việc kiot.order.* kéo nhắc chăm sóc.', on: true, bizcity: true },
		{ name: 'KiotViet', desc: 'Tra cứu đơn hàng, khách hàng ngay trong chat. Tạo đơn hàng từ kịch bản.', on: true },
		{ name: 'Haravan', desc: 'Nền tảng TMĐT Việt Nam. Tra cứu đơn hàng, khách hàng Haravan trong chat.' },
		{ name: 'Sapo', desc: 'Quản lý bán hàng đa kênh Sapo. Tra cứu đơn, khách hàng theo SĐT.' },
		{ name: 'Nhanh.vn', desc: 'Phần mềm bán hàng đa kênh Nhanh.vn. Quản lý đơn hàng, kho, khách hàng.', on: true },
		{ name: 'Pancake POS', desc: 'Pancake POS/OMS. Tra cứu khách hàng, đơn hàng, sản phẩm và tạo đơn ngay trong chat.' },
	],
	pay: [
		{ name: 'Open Kế Toán', desc: 'Sổ cái Bizcity. Nhận ketoan.invoice.issued / debt.due để nhắc công nợ, gửi giấy tờ.', on: true, bizcity: true },
		{ name: 'Casso', desc: 'Nhận webhook khi có giao dịch chuyển khoản VietQR. Tự động xác nhận đơn.', on: true },
		{ name: 'SePay', desc: 'Nhận webhook giao dịch từ SePay. Kích hoạt kịch bản tự động khi nhận tiền.', on: true },
	],
	ship: [ { name: 'GHN', desc: 'Tra cứu vận đơn Giao Hàng Nhanh ngay trong chat.' }, { name: 'GHTK', desc: 'Tra cứu vận đơn Giao Hàng Tiết Kiệm.' }, { name: 'Viettel Post', desc: 'Tra cứu vận đơn Viettel Post.' } ],
	msg: [ { name: 'Telegram', desc: 'Báo quản lý qua Telegram từ kịch bản.' }, { name: 'Email SMTP', desc: 'Gửi email từ kịch bản, nhận thư vào hộp thư.' } ],
};

export const report = {
	kpis: [
		['Tin nhắn hôm nay', '684', '301 gửi · 383 nhận', '+16%'], ['Tổng tin nhắn (7 ngày)', '4.826', '2140 gửi · 2686 nhận'],
		['Liên hệ', '1.248', '932 bạn bè'], ['Nhóm', '37', ''],
		['Chiến dịch', '5', '2 đang chạy'], ['Lời mời KB', '182', '64 gửi · 118 nhận'],
		['Kịch bản chạy', '1.380', '97% thành công'], ['AI requests', '956', '1.284.500 tokens · toàn ứng dụng'],
	],
	days: ['13/10', '14/10', '15/10', '16/10', '17/10', '18/10', '19/10'],
	sent: [270, 285, 300, 280, 330, 345, 300],
	recv: [330, 350, 365, 345, 410, 430, 390],
	growth: [18, 24, 21, 30, 28, 36, 40],
	labels: [['Đặt hàng', 100], ['Khách VIP', 74], ['Khách sỉ', 50], ['Chờ phản hồi', 40]],
};

export const workflowNodes = [
	{ id: 'n1', x: 520, y: 40, kind: 'KÍCH HOẠT', title: 'Khi có tin nhắn mới', body: 'Tất cả tin nhắn', icon: 'chat', start: true },
	{ id: 'n2', x: 520, y: 200, kind: 'LOGIC', title: 'Lọc tin quảng cáo', body: 'Nếu $trigger.content không chứa "quảng cáo"', icon: 'branch' },
	{ id: 'n3', x: 520, y: 360, kind: 'AI', title: 'AI phân loại ý định', body: 'Trợ lý bán hàng · phân loại: hỏi giá, đặt hàng, khiếu nại', icon: 'sparkle' },
	{ id: 'n4', x: 520, y: 520, kind: 'LOGIC', title: 'Rẽ nhánh theo ý định', body: 'Phân 3 nhánh: hỏi giá, đặt hàng, khiếu nại', icon: 'branch' },
	{ id: 'n5', x: 160, y: 700, kind: 'HÀNH ĐỘNG', title: 'Gửi bảng giá', body: 'Dạ shop gửi bảng giá mới nhất…', icon: 'send' },
	{ id: 'n6', x: 520, y: 700, kind: 'HÀNH ĐỘNG', title: 'Gắn nhãn "Đặt hàng"', body: 'Gắn 1 nhãn (Open CRM)', icon: 'tag' },
	{ id: 'n7', x: 880, y: 700, kind: 'THÔNG BÁO', title: 'Báo quản lý qua Telegram', body: 'Telegram → Chat ID…', icon: 'bell' },
];
export const triggers = [
	['chat', 'Khi nhận tin nhắn', 'Kích hoạt khi có tin nhắn mới (cá nhân hoặc nhóm) - Zalo'],
	['userPlus', 'Khi có lời mời kết bạn', 'Kích hoạt khi ai đó gửi lời mời kết bạn đến bạn'],
	['users', 'Khi có sự kiện nhóm', 'Kích hoạt khi thành viên vào/rời nhóm, thay đổi admin…'],
	['smile', 'Khi có người react tin nhắn', 'Kích hoạt khi ai đó thả cảm xúc vào tin nhắn'],
	['tag', 'Khi gán hoặc gỡ nhãn', 'Kích hoạt khi nhãn được gán hoặc gỡ khỏi hội thoại'],
	['calendar', 'Chạy theo lịch hẹn', 'Tự động kích hoạt theo lịch (hàng ngày, hàng giờ…)'],
	['play', 'Chạy thủ công', 'Kích hoạt bằng tay từ giao diện, dùng để test kịch bản'],
	['card', 'Khi nhận thanh toán', 'Kích hoạt khi nhận webhook thanh toán từ Casso / SePay (VietQR)'],
	['globe', 'Webhook bên ngoài', 'Kích hoạt khi nhận dữ liệu từ webhook bên thứ 3 gửi sang'],
	['zap', 'Khi API/ứng dụng gọi', 'Kích hoạt khi hệ thống ngoài hoặc ứng dụng đã cài gọi POST…'],
];
