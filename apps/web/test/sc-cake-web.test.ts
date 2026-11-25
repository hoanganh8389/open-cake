// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 12:27 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — kiểm tĩnh SC-CAKE-WEB-1..3 (80-REACT §6, điều kiện "Xong khi" của PHASE-007):
//   1 · màn web chỉ import react, @open-cake/{ui-kit,action-client,contracts} hoặc tệp trong app (không thư viện giao diện khác);
//   2 · không alert( / confirm( / prompt( (lỗi hiện trong màn, R-BLOCK);  3 · không màu hex trong .tsx (màu lấy từ token, R-WEB-12).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const WEB = join(ROOT, 'apps/web/src');
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []; });
const code = (f: string) => readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, ''));
const hits = (re: RegExp, only = /\.tsx?$/) => files(WEB).filter((f) => only.test(f)).flatMap((f) => code(f).flatMap((l, i) => (re.test(l) ? [`${relative(ROOT, f)}:${i + 1}  ${l.trim().slice(0, 90)}`] : [])));

describe('SC-CAKE-WEB', () => {
  it('SC-CAKE-WEB-1: chỉ import react, gói @open-cake cho phép, hoặc tệp nội bộ', () => {
    const ok = /^(react|react-dom\/client|@open-cake\/(ui-kit|action-client|contracts)(\/.*)?|\..*)$/;
    const bad = files(WEB).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]!).filter((s) => !ok.test(s)).map((s) => `${relative(ROOT, f)}: ${s}`));
    expect(bad).toEqual([]);
  });
  it('SC-CAKE-WEB-2: không alert / confirm / prompt', () => expect(hits(/(^|[^.\w])(alert|confirm|prompt)\(|window\.(alert|confirm|prompt)\(/)).toEqual([]));
  it('SC-CAKE-WEB-3: không màu hex trong .tsx', () => expect(hits(/['"`]#[0-9a-fA-F]{3,8}\b/, /\.tsx$/)).toEqual([]));
});
