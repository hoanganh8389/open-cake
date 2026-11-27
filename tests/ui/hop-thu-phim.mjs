// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 10:41 AM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-15 kiểm trên trình duyệt THẬT (playwright-core + Chrome đã cài, không tải trình duyệt):
//   hộp thư bản giả lập — ↓ / ↑ đổi hội thoại (URL đổi theo), / vào ô tìm, gõ lọc danh sách, Esc rời ô, Enter vào ô soạn; chụp ảnh bằng chứng.
// Chạy: pnpm run web:build && (cd apps/web && pnpm exec vite preview --port 4182) ; node tests/ui/hop-thu-phim.mjs http://localhost:4182 <thư-mục-ảnh>
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4182';
const shots = process.argv[3];
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fail = (m) => { console.error(`TRƯỢT: ${m}`); process.exitCode = 1; };
const ok = (c, m) => (c ? console.log(`ĐẠT: ${m}`) : fail(m));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/#/inbox`);
  await page.waitForSelector('.ditem');
  const conv = () => new URL(page.url()).hash.match(/conv=([^&]+)/)?.[1] ?? null;
  const first = await page.locator('.ditem').nth(0).getAttribute('id');
  const second = await page.locator('.ditem').nth(1).getAttribute('id');

  await page.locator('body').click({ position: { x: 700, y: 20 } });
  await page.keyboard.press('ArrowDown');
  ok(`conv-${conv()}` === second, '↓ chọn hội thoại kế (URL đổi theo)');
  await page.keyboard.press('ArrowUp');
  ok(`conv-${conv()}` === first, '↑ về hội thoại trước');
  ok((await page.locator('.ditem.on').getAttribute('aria-selected')) === 'true', 'dòng đang chọn có aria-selected');

  await page.keyboard.press('/');
  ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Tìm hội thoại theo tên khách'), '/ vào ô tìm');
  const before = await page.locator('.ditem').count();
  await page.keyboard.type('Khoa');
  // chờ danh sách ĐÃ lọc xong (bỏ qua lúc đang tải lại = 0 dòng)
  await page.waitForFunction(() => { const xs = [...document.querySelectorAll('.ditem .nm')]; return xs.length > 0 && xs.every((x) => /khoa/i.test(x.textContent ?? '')); }, undefined, { timeout: 5000 }).catch(() => undefined);
  const titles = await page.locator('.ditem .nm').allTextContents();
  ok(titles.length > 0 && titles.length < before && titles.every((t) => /khoa/i.test(t)), `gõ "Khoa" lọc danh sách (${before} → ${titles.length})`);
  ok(new URL(page.url()).hash.includes('q=Khoa'), 'từ khoá nằm trên URL (R-WEB-2)');
  if (shots) await page.screenshot({ path: `${shots}/phim-tim-hop-thu.png` });
  await page.keyboard.press('Escape');
  ok(await page.evaluate(() => document.activeElement === document.body), 'Esc rời ô tìm');

  await page.keyboard.press('Enter');
  ok(await page.evaluate(() => document.activeElement?.id === 'composer'), 'Enter vào ô soạn');
  await page.keyboard.type('a');
  await page.keyboard.press('ArrowDown');
  ok((await page.locator('#composer').inputValue()) === 'a', 'đang gõ trong ô soạn thì ↓ không đổi hội thoại');
} finally {
  await browser.close();
}
