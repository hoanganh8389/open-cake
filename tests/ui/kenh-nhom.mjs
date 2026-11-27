// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 08:35 PM Johnny Chu - Chu Hoàng Anh] KN K2b-2 — giao diện THẬT (bản build, bộ giả lập) so với mockup ⑥ Hộp thư nhóm và ⑤ Danh bạ:
//   tên / số thành viên nhóm, tên người gửi từng tin, @nhắc, trích dẫn, tin đã thu hồi, reaction; danh bạ có ảnh. Hỏng bước nào thì dừng, mã thoát 1.
//   pnpm run web:build && node tests/ui/kenh-nhom.mjs [thư-mục-ảnh]
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = process.argv[2] ?? 'docs/phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4187;
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: 'apps/web', stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const shot = (page, name) => page.screenshot({ path: join(OUT, `app-${name}.png`) }).then(() => console.log(`✔ ${name}`));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1010 } });
  for (let i = 0; i < 40; i++) { try { await page.goto(`http://localhost:${PORT}/#/inbox`); break; } catch { await page.waitForTimeout(250); } }
  await page.locator('.ditem', { hasText: 'Hội yêu váy hoa' }).first().click();
  await page.getByText('248 thành viên').waitFor();
  await page.locator('.dmsg .snd', { hasText: 'Lê Thảo Vy' }).waitFor();
  await page.locator('.dmsg .ment').first().waitFor();
  await page.locator('.dmsg .quote').first().waitFor();
  await page.getByText('Tin nhắn đã được thu hồi').waitFor();
  await shot(page, 'kn-hop-thu-nhom');
  // [2026-11-26 08:46 PM Johnny Chu - Chu Hoàng Anh] KN K2b-3 — rê chuột tin của shop ⇒ Thu hồi ⇒ xác nhận ⇒ "đã thu hồi" (giả lập áp ngay điều kênh báo lại)
  const own = page.locator('.dmsg.out', { hasText: 'Shop gửi nhầm link' }).first();
  await own.hover();
  await own.locator('.acts').waitFor();
  await shot(page, 'kn-tin-thao-tac');
  await own.locator('.acts .danger').click();
  await page.getByRole('dialog').waitFor();
  await shot(page, 'kn-thu-hoi-xac-nhan');
  await page.getByRole('dialog').getByRole('button', { name: 'Thu hồi' }).click();
  await page.locator('.dmsg.out .bb.revoked').first().waitFor();
  await page.evaluate(() => { location.hash = '/contacts'; });
  await page.locator('table tbody tr').first().waitFor();
  await shot(page, 'kn-danh-ba');
  await page.getByRole('button', { name: 'Đồng bộ từ kênh' }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng bộ từ kênh' }).click();
  await page.getByText('Đã gửi lệnh. Khách và nhóm').waitFor();
  await shot(page, 'kn-dong-bo-danh-ba');
} catch (e) {
  console.error('✗', e.message); process.exitCode = 1;
  for (const p of browser.contexts().flatMap((c) => c.pages())) await p.screenshot({ path: join(OUT, 'app-loi.png') }).catch(() => {});
} finally { await browser.close(); preview.kill(); }
