// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-25 02:12 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-8 · NO-CHUAN R-STD-TEST-1 — MỘT lệnh kiểm tĩnh của repo, không cần cài thêm gì, không cần CSDL:
//   node tests/conformance/selfcheck.mjs   ⇒ bảng điểm SC-*, kết luận ĐẠT / KHÔNG ĐẠT, mã thoát 0 / 1; ghi bằng chứng output/latest/evidence.txt (R-QG-6).
//   Phát hiện có sẵn được chấp nhận tạm ghi ở baseline.json (rỗng — nợ mới không vào baseline). SC-CAKE-2..5 cần dữ liệu thật ⇒ chẩn đoán L3, không ở đây.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
const read = (f) => readFileSync(f, 'utf8');
const walk = (dir, re) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (n === 'node_modules' || n === 'dist') return [];
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p] : [];
});
const baseline = new Set(JSON.parse(read(join(ROOT, 'tests/conformance/baseline.json'))).accepted ?? []);
const results = [];
/** Một phép kiểm: trả danh sách phát hiện `tệp:dòng  mô tả`; rỗng = ĐẠT. */
function check(id, title, fn) {
  let found;
  try { found = fn(); } catch (e) { found = [`lỗi khi kiểm: ${e.message}`]; }
  const open = found.filter((f) => !baseline.has(`${id} ${f}`));
  results.push({ id, title, ok: open.length === 0, found: open, accepted: found.length - open.length });
}

// ── Dữ liệu ─────────────────────────────────────────────────────────────
const SQL = walk(join(ROOT, 'db/migrations'), /\.sql$/).sort();
const sqlAll = SQL.map((f) => ({ f, s: read(f) }));

check('SC-CAKE-1', 'sổ chạm khách chỉ thêm: trigger chặn UPDATE / DELETE / TRUNCATE', () => {
  const all = sqlAll.map((x) => x.s).join('\n');
  const need = [['touch_ledger', 'UPDATE OR DELETE'], ['touch_ledger', 'TRUNCATE'], ['touch_event_versions', 'UPDATE OR DELETE'], ['touch_event_versions', 'TRUNCATE'], ['touch_events', 'DELETE'], ['touch_events', 'TRUNCATE']];
  return need.filter(([t, op]) => !new RegExp(`CREATE TRIGGER \\w+ BEFORE ${op} ON ${t}\\b`, 'i').test(all)).map(([t, op]) => `db/migrations  thiếu trigger BEFORE ${op} ON ${t}`);
});

check('SC-CAKE-6', 'không cột bí mật kênh (cookie, access_token, page_token, e2ee_key) trong CSDL', () =>
  sqlAll.flatMap(({ f, s }) => s.split('\n').flatMap((l, i) => (/^\s*(cookie|access_token|page_token|e2ee_key)\s/i.test(l) ? [`${rel(f)}:${i + 1}  ${l.trim()}`] : []))));

check('SC-CAKE-7', 'mọi bảng có tenant_id bật + ép RLS (ENABLE + FORCE)', () => {
  const tables = [], rls = new Set();
  for (const { f, s } of sqlAll) {
    for (const m of s.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)) if (/^\s*tenant_id\s/m.test(m[2])) tables.push({ t: m[1], f });
    for (const m of s.matchAll(/FOREACH t IN ARRAY ARRAY\[([^\]]+)\]([\s\S]*?)END LOOP/g)) {
      if (/ENABLE ROW LEVEL SECURITY/.test(m[2]) && /FORCE ROW LEVEL SECURITY/.test(m[2])) for (const t of m[1].matchAll(/'(\w+)'/g)) rls.add(t[1]);
    }
    for (const m of s.matchAll(/ALTER TABLE (\w+) FORCE ROW LEVEL SECURITY/g)) if (new RegExp(`ALTER TABLE ${m[1]} ENABLE ROW LEVEL SECURITY`).test(s)) rls.add(m[1]);
  }
  return tables.filter(({ t }) => !rls.has(t)).map(({ t, f }) => `${rel(f)}  bảng ${t} có tenant_id nhưng chưa ENABLE + FORCE RLS`);
});

// ── API ─────────────────────────────────────────────────────────────────
const API = walk(join(ROOT, 'apps/api/src'), /\.ts$/);
check('SC-CAKE-8', 'không route nhận tenantId / siteId từ body / query / input (đơn vị lấy từ phiên hoặc khoá)', () => {
  const inApi = API.flatMap((f) => read(f).split('\n').flatMap((l, i) => (/\b(body|query|params|input|i)\??\.(tenantId|siteId)\b/.test(l) && !/^\s*\/\//.test(l) ? [`${rel(f)}:${i + 1}  ${l.trim().slice(0, 100)}`] : [])));
  const inContracts = walk(join(ROOT, 'packages/contracts/src'), /\.ts$/).flatMap((f) => read(f).split('\n').flatMap((l, i) => (/input:\s*z\.object\(\{[^)]*\b(tenantId|siteId)\s*:/.test(l) ? [`${rel(f)}:${i + 1}  action nhận ${l.match(/\b(tenantId|siteId)\b/)[1]} từ đầu vào`] : [])));
  return [...inApi, ...inContracts];
});

// ── Web (cùng luật với apps/web/test/*.test.ts — ở đây để một lệnh trả lời được) ──
const WEB = walk(join(ROOT, 'apps/web/src'), /\.tsx?$/);
const codeLines = (f) => read(f).split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, ''));
check('SC-CAKE-WEB-1', 'màn web chỉ import react, @open-cake/{ui-kit,action-client,contracts} hoặc tệp nội bộ', () =>
  WEB.flatMap((f) => [...read(f).matchAll(/from '([^']+)'/g)].map((m) => m[1]).filter((s) => !/^(react|react-dom\/client|@open-cake\/(ui-kit|action-client|contracts)(\/.*)?|\..*)$/.test(s)).map((s) => `${rel(f)}  import ${s}`)));
check('SC-CAKE-WEB-2', 'không alert / confirm / prompt', () =>
  WEB.flatMap((f) => codeLines(f).flatMap((l, i) => (/(^|[^.\w])(alert|confirm|prompt)\(|window\.(alert|confirm|prompt)\(/.test(l) ? [`${rel(f)}:${i + 1}`] : []))));
check('SC-CAKE-WEB-3', 'không màu hex trong .tsx (màu lấy từ token)', () =>
  WEB.filter((f) => f.endsWith('.tsx')).flatMap((f) => codeLines(f).flatMap((l, i) => (/['"`]#[0-9a-fA-F]{3,8}\b/.test(l) ? [`${rel(f)}:${i + 1}  ${l.trim().slice(0, 80)}`] : []))));
check('R-WEB-14', 'tệp web < 200 dòng', () =>
  [...WEB, ...walk(join(ROOT, 'packages/ui-kit/src'), /\.tsx?$/)].filter((f) => read(f).split('\n').length > 200).map((f) => `${rel(f)}  ${read(f).split('\n').length} dòng`));

// ── Nếp repo ────────────────────────────────────────────────────────────
check('R-SIG', 'chữ ký R-SIG không mang tên công cụ / mô hình (chỉ người)', () =>
  [...API, ...WEB, ...SQL, ...walk(join(ROOT, 'packages'), /\.tsx?$/)].flatMap((f) => read(f).split('\n').flatMap((l, i) => (/\[\d{4}-\d{2}-\d{2} [^\]]*\b(Claude|GPT|Copilot|Gemini|Cursor|Opus|Sonnet)\b/i.test(l) ? [`${rel(f)}:${i + 1}`] : []))));

// ── Kết quả ─────────────────────────────────────────────────────────────
const ok = results.every((r) => r.ok);
const lines = [
  `selfcheck open-cake — ${new Date().toISOString()}`,
  ...results.map((r) => `${r.ok ? 'ĐẠT ' : 'TRƯỢT'} ${r.id.padEnd(14)} ${r.title}${r.accepted ? ` (baseline ${r.accepted})` : ''}${r.found.length ? `\n${r.found.slice(0, 20).map((x) => `       · ${x}`).join('\n')}` : ''}`),
  `KẾT LUẬN: ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'} (${results.filter((r) => r.ok).length}/${results.length})`,
];
console.log(lines.join('\n'));
mkdirSync(join(ROOT, 'output/latest'), { recursive: true });
writeFileSync(join(ROOT, 'output/latest/evidence.txt'), `${lines.join('\n')}\n`);
process.exitCode = ok ? 0 : 1;
