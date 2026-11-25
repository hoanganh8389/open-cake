// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 12:04 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — R-WEB-11 chặn: chữ tiếng Việt chỉ được nằm trong apps/web/src/i18n (web) và packages/ui-kit/src/vi.ts (ui-kit).
//   Quét mã (bỏ chú thích): dòng còn ký tự có dấu ngoài các tệp đó ⇒ trượt, chỉ rõ tệp:dòng.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ALLOWED = [/apps[\\/]web[\\/]src[\\/]i18n[\\/]/, /packages[\\/]ui-kit[\\/]src[\\/]vi\.ts$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mts)$/.test(n) && !n.endsWith('.d.ts') ? [p] : [];
  });
}

const SLASH = '/', STAR = '*', NL = '\n', BS = '\\';
const QUOTES = new Set(["'", '"', '`']);
/** Bỏ chú thích dòng và khối (kể cả trong JSX), giữ chuỗi và số dòng — quét từng ký tự để URL "https://" trong chuỗi không bị cắt. */
function stripComments(src: string): string {
  let out = '';
  let q: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!, nx = src[i + 1];
    if (q) {
      out += ch;
      if (ch === BS) { out += nx ?? ''; i++; } else if (ch === q) q = null;
      continue;
    }
    if (ch === SLASH && nx === SLASH) { while (i < src.length && src[i] !== NL) i++; out += NL; continue; }
    if (ch === SLASH && nx === STAR) {
      i += 2;
      while (i < src.length && !(src[i] === STAR && src[i + 1] === SLASH)) { if (src[i] === NL) out += NL; i++; }
      i++;
      continue;
    }
    if (QUOTES.has(ch)) q = ch;
    out += ch;
  }
  return out;
}

describe('R-WEB-11: chữ nằm trong tệp ngôn ngữ', () => {
  it('không còn chữ tiếng Việt viết thẳng trong màn / thành phần', () => {
    const bad: string[] = [];
    for (const f of [...files(join(ROOT, 'apps/web/src')), ...files(join(ROOT, 'packages/ui-kit/src'))]) {
      if (ALLOWED.some((re) => re.test(f))) continue;
      stripComments(readFileSync(f, 'utf8')).split(NL).forEach((line, i) => { if (VI.test(line)) bad.push(`${relative(ROOT, f)}:${i + 1}  ${line.trim().slice(0, 90)}`); });
    }
    expect(bad).toEqual([]);
  });
});
