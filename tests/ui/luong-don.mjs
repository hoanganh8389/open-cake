// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 07:05 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — chạy luồng đơn trên giao diện THẬT (bản build, bộ giả lập, ?catalog=ketoan) bằng Chrome, như người dùng:
//   Cài đặt › Kết nối cửa hàng → Hộp thư › Gửi giá (thấy tồn) → + vào đơn → sheet Yêu cầu đặt hàng → Gửi → dòng hệ thống trong chat → Contact 360 › Đơn.
//   Chụp app-*.png để so với mockup đã duyệt (docs/phases/PHASE-010-…/evidence/build-shots/mockup-*.png). Hỏng bước nào thì dừng, mã thoát 1.
//   npm run web:build && node tests/ui/luong-don.mjs [thư-mục-ảnh]
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = process.argv[2] ?? 'docs/phases/PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/evidence/build-shots';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4186;
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: 'apps/web', stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const shot = (page, name) => page.screenshot({ path: join(OUT, `app-${name}.png`) }).then(() => console.log(`✔ ${name}`));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (let i = 0; i < 40; i++) { try { await page.goto(`http://localhost:${PORT}/?catalog=ketoan#/settings`); break; } catch { await page.waitForTimeout(250); } }
  await page.getByText('Kết nối cửa hàng (Open POS)').waitFor();
  await page.locator('input[placeholder="https://"]').fill('https://shop.hoamai.vn');
  await page.locator('input[placeholder="opb_…"]').fill('opb_khoaCuaHangGiaLap0123456789');
  await page.locator('input[type=password]').nth(1).fill('bi-mat-ky-gia-lap-0123456789abcdef');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('Đã nối').waitFor();
  await page.getByText('Kết nối cửa hàng (Open POS)').scrollIntoViewIfNeeded();
  await shot(page, 'ket-noi');

  await page.evaluate(() => { location.hash = '/inbox'; });
  await page.locator('.ditem').first().click();
  await page.getByTitle('Gửi giá').click();
  await page.locator('.pick-row').first().waitFor();
  await page.locator('.pick-row .badge.stock').first().waitFor();
  await shot(page, 'gui-gia-ton');
  await page.locator('.pick-row .add').nth(0).click();
  await page.locator('.pick-row .add').nth(0).click();
  await page.locator('.pick-row .add').nth(1).click();
  await page.getByRole('button', { name: /Đơn nháp · 2 món/ }).click();
  await page.getByLabel('Số điện thoại').fill('0909123456');
  await page.getByLabel('Địa chỉ').fill('12 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM');
  await shot(page, 'tao-don');
  await page.getByRole('button', { name: 'Gửi sang cửa hàng' }).click();
  await page.locator('.sysline').first().waitFor();
  await shot(page, 'don-trong-chat');

  await page.getByTitle('Mở Contact 360').first().click();
  await page.getByRole('button', { name: /Đơn \(1\)/ }).click().catch(async () => page.getByText(/Đơn \(1\)/).click());
  await page.locator('.steps').first().waitFor();
  await shot(page, 'don-360');
} catch (e) {
  console.error('✗', e.message); process.exitCode = 1;
  for (const p of browser.contexts().flatMap((c) => c.pages())) await p.screenshot({ path: join(OUT, 'app-loi.png') }).catch(() => {});
} finally { await browser.close(); preview.kill(); }
