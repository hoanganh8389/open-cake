// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 10:13 PM Johnny Chu - Chu Hoàng Anh] KN K7 — giao diện THẬT (bản build, bộ giả lập) so với mockup kết nối ① Cài đặt › Kết nối kênh, ② 4 bước Tự cài, ③ thắng nhỏ:
//   ① ② Đạt sẵn (Tự cài chạy sẵn) ⇒ ③ đặt tên, lấy QR, giả lập quét xong ⇒ số được ghi ⇒ ④ chọn người trực ⇒ nhắn thử ⇒ "Đã thử hai chiều". Hỏng bước nào thì dừng, mã thoát 1.
//   npm run web:build && node tests/ui/ket-noi-kenh.mjs [thư-mục-ảnh]
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = process.argv[2] ?? 'docs/phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4188;
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: 'apps/web', stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const shot = (page, name) => page.screenshot({ path: join(OUT, `app-${name}.png`) }).then(() => console.log(`✔ ${name}`));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1010 } });
  for (let i = 0; i < 40; i++) { try { await page.goto(`http://localhost:${PORT}/#/settings`); break; } catch { await page.waitForTimeout(250); } }
  await page.getByText('Máy kết nối', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Kiểm tra' }).click();
  await page.getByText(/kiểm lúc/).waitFor();
  await shot(page, 'kn-cai-dat-ket-noi');
  await page.evaluate(() => { location.hash = '/channels?connect=1'; });
  await page.getByText('Thiết lập Zalo trong 4 bước').waitFor();
  await page.getByText('2/4 bước xong').waitFor();
  await page.getByLabel('Tên số Zalo').fill('Zalo bán hàng — 0909 123 456');
  await page.getByRole('button', { name: 'Lấy mã QR' }).click();
  await page.getByText('Chờ quét mã').first().waitFor();
  await shot(page, 'kn-bon-buoc-qr');
  await page.getByText('3/4 bước xong').waitFor({ timeout: 15_000 }); // giả lập: mỗi lần hỏi tiến một nấc ⇒ xong ⇒ máy chủ ghi số
  await page.locator('select').selectOption({ index: 2 });
  await shot(page, 'kn-bon-buoc-nguoi-truc');
  await page.getByRole('button', { name: 'Hoàn tất & nhắn thử' }).click();
  await page.getByText('Zalo đã sẵn sàng').waitFor();
  await page.getByText('Đã thử hai chiều', { exact: true }).waitFor();
  await shot(page, 'kn-bon-buoc-xong');
} catch (e) {
  console.error('✗', e.message); process.exitCode = 1;
  for (const p of browser.contexts().flatMap((c) => c.pages())) await p.screenshot({ path: join(OUT, 'app-loi.png') }).catch(() => {});
} finally { await browser.close(); preview.kill(); }
