// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 06:28 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 — chụp các khung mockup ra evidence/build-shots/mockup-*.png (Chrome thật, 1440×900).
//   node docs/phases/PHASE-010-TRUC-CHUNG-TU-MASTER-DATA/mockup/chup.mjs
import { chromium } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'evidence', 'build-shots');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRAMES = ['gui-gia-ton', 'tao-don', 'don-trong-chat', 'don-360', 'ket-noi', 'cong-no', 'tao-khach-cong-no'];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const f of FRAMES) {
    await page.goto(`${pathToFileURL(join(here, 'index.html')).href}#${f}`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(out, `mockup-${f}.png`) });
    console.log(`đã chụp mockup-${f}.png`);
  }
} finally { await browser.close(); }
