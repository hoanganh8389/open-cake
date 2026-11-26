// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-26 04:54 PM Johnny Chu - Chu Hoàng Anh] KN-1 · PHASE-007 S007-6 — chụp các khung mockup kết nối kênh ra evidence/build-shots/mockup-*.png (Chrome thật, 1440×1010).
//   node docs/phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/mockup/chup.mjs
import { chromium } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'evidence', 'build-shots');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRAMES = ['cai-dat-ket-noi', 'bon-buoc-tu-cai', 'bon-buoc-xong', 'bon-buoc-hub', 'danh-ba-dong-bo', 'hop-thu-nhom', 'dinh-kem-soan', 'dinh-kem-loi', 'dinh-kem-da-gui', 'dinh-kem-gioi-han']; // [2026-11-26 11:16 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 S007-3 — + 4 khung đính kèm ảnh / tệp

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1010 } });
  for (const f of FRAMES) {
    await page.goto(`${pathToFileURL(join(here, 'index.html')).href}#${f}`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(out, `mockup-kn-${f}.png`) });
    console.log(`đã chụp mockup-kn-${f}.png`);
  }
} finally { await browser.close(); }
