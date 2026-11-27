// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 12:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 S007-8 — chụp TỰ ĐỘNG 4 màn có ảnh chuẩn (docs/ui/mockup-shots: inbox, contacts, dashboard, states) trên Chrome thật,
//   đếm "phần tử chính" rút từ chính ảnh chuẩn. Phần tử thuộc phase sau ghi `later` — báo ra nhưng không tính tỉ lệ. Màn < 90 % ⇒ trượt (điều kiện "Xong khi" của PHASE-007).
//   Không so điểm ảnh: ảnh chuẩn là bản vẽ (dữ liệu, cỡ khung khác), so phần tử mới có nghĩa.
// Chạy: pnpm run web:build && (cd apps/web && pnpm exec vite preview --port 4184) ; node tests/ui/chup-man.mjs http://localhost:4184 <thư-mục-ảnh>
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4184';
const shots = process.argv[3];
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const has = (sel, n = 1) => async (p) => (await p.locator(sel).count()) >= n;
const text = (s) => async (p) => (await p.getByText(s, { exact: false }).count()) > 0;
const all = (...fs) => async (p) => { for (const f of fs) if (!(await f(p))) return false; return true; };

const SCREENS = [
  { id: 'inbox', hash: '#/inbox', ready: '.dmsg', items: [
    ['rail tài khoản kênh có số chưa đọc', has('.racc .n')],
    ['nút + kết nối kênh trên rail', has('.radd')],
    ['các mục điều hướng', has('.nb2', 6)],
    ['ô tìm hội thoại', has('.dlist .sbox input')],
    ['tab lọc (Tất cả / Chưa đọc / …)', has('.tabs2 button', 3)],
    ['dòng hội thoại: tên + giờ', all(has('.ditem .nm', 5), has('.ditem .tm', 5))],
    ['số chưa đọc trên dòng', has('.ditem .un')],
    ['nhãn trên dòng', has('.ditem .tags')],
    ['dấu đã trả lời trên dòng', has('.ditem .rp')],
    ['đầu khung chat: tên + nhãn', all(has('.dchat .hd .nm'), has('.dchat .hd .tags'))],
    ['bong bóng tin vào và tin ra', all(has('.dmsg:not(.out)'), has('.dmsg.out'))],
    ['tin ảnh có chú thích', has('.dmsg .img')],
    ['tin tệp (PDF, Nhấn để tải)', has('.dmsg .file')],
    ['hàng nhãn nhanh dưới khung chat', has('.dlabels')],
    ['ô soạn', has('#composer')],
    ['nút tin nhắn nhanh / gửi giá', has('.dinput button', 2)],
    ['nút mở Contact 360 / thông tin', has('.dchat .hd .ri', 2)],
    ['gợi ý trả lời AI', async () => false, 'PHASE-013'],
    ['thanh công cụ soạn đầy đủ (ảnh, tệp, video, ghi âm)', async () => false, 'PHASE-006'],
  ] },
  { id: 'contacts', hash: '#/contacts', ready: 'table.tbl tbody tr', items: [
    ['tab Liên hệ có số lượng', has('.tabs .tab.on .muted')],
    ['tab Nhóm / Lời mời / Lịch sử', has('.tabs .tab', 4)],
    ['lọc theo nhãn', has('.chip', 5)],
    ['lọc giới tính', all(text('Nữ'), text('Nam'))],
    ['sắp xếp theo tên', text('A → Z')],
    ['ô tìm (tên, số điện thoại)', has('.search input')],
    ['cột Giới tính / Sinh nhật / Điện thoại', all(text('Giới tính'), text('Sinh nhật'), text('Điện thoại'))],
    ['dòng khách có avatar + tên', has('table.tbl tbody tr', 5)],
    ['nhãn trên dòng khách', has('table.tbl tbody .tags, table.tbl tbody [class*="tag"]')],
    ['thanh trạng thái hàng chờ gửi', has('.statusbar')],
    ['phân trang', has('.pager')],
    ['ô chọn nhiều + Thao tác', has('table.tbl tbody input[type="checkbox"]')],
    ['tên thật dưới tên hiển thị', text('Nguyễn Thu Hương')],
  ] },
  { id: 'dashboard', hash: '#/dashboard', ready: '.grid .card', items: [
    ['tiêu đề + số tài khoản', all(text('Tổng quan'), text('tài khoản'))],
    ['nút Thêm tài khoản', text('Thêm tài khoản')],
    ['thẻ tài khoản (≥ 3)', has('.grid .card', 3)],
    ['avatar + tên + mã tài khoản trên thẻ', has('.grid .card .avatar', 3)],
    ['nút Chat mỗi thẻ', async (p) => (await p.getByRole('button', { name: 'Chat' }).count()) >= 3],
    ['nút thứ hai (chi tiết / kết nối lại)', has('.grid .card .btn', 6)],
    ['nhãn kênh trên thẻ', text('Zalo')],
    ['ô tìm tài khoản', has('.page .search input')],
    ['Gộp tài khoản / Thêm workspace / Hỗ trợ', async () => false, 'PHASE-014'],
  ] },
  { id: 'states', hash: '#/states', ready: '.state', items: [
    ['đang tải (khung xám)', has('.skeleton')],
    ['trống: một câu + một nút', has('.state .btn.pri')],
    ['lỗi: mã tra cứu + Thử lại', all(text('mock-12'), text('Thử lại'))],
    ['không có quyền', all(has('.state', 3), text('chưa có quyền'))], // khung 'đang tải' không mang lớp .state ⇒ 3 thẻ .state
    ['thẻ "Cần cài …" (tính năng plugin khác)', has('.gate')],
    ['bộ thành phần (nút, huy hiệu)', has('.btn.danger')],
  ] },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let failed = false;
try {
  for (const s of SCREENS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/${s.hash}`);
    await page.waitForSelector(s.ready, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    let ok = 0, total = 0;
    const lines = [];
    for (const [name, check, later] of s.items) {
      const pass = await check(page).catch(() => false);
      if (later) { lines.push(`   ${pass ? '✓' : '·'} ${name} — để ${later}`); continue; }
      total++; if (pass) ok++;
      lines.push(`   ${pass ? '✓' : '✗'} ${name}`);
    }
    const pct = Math.round((ok / total) * 100);
    if (pct < 90) failed = true;
    console.log(`${pct >= 90 ? 'ĐẠT ' : 'TRƯỢT'} ${s.id}: ${ok}/${total} = ${pct} %`);
    console.log(lines.join('\n'));
    if (shots) await page.screenshot({ path: `${shots}/auto-${s.id}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
process.exitCode = failed ? 1 : 0;
