// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-5: contact_state là DẪN XUẤT của sổ (R-CAKE-LEDGER-2). Một hàm duy nhất tính từ sổ —
//   dùng cả khi ghi (cùng giao dịch) lẫn khi dựng lại (bizcity cake rebuild-state) ⇒ hai đường không thể lệch nhau (SC-CAKE-5).
import type { CareRepo, LedgerRow, StateRow } from './types.js';

/** Dòng còn hiệu lực = không phải dòng đảo và chưa bị đảo. */
export const effectiveRows = (repo: CareRepo, rows: LedgerRow[]) => rows.filter((r) => !r.isReversal && !repo.isReversed(r.touchId));

/** Sổ của một khách gồm cả các khách đã ghép vào khách này (giải merged_into, không sửa dòng cũ). */
export function ledgerOfPerson(repo: CareRepo, contactId: string, mergedFrom: string[]): LedgerRow[] {
  return [contactId, ...mergedFrom].flatMap((id) => repo.ledgerByContact(id));
}

export function computeState(repo: CareRepo, contactId: string, mergedFrom: string[] = []): StateRow {
  const rows = effectiveRows(repo, ledgerOfPerson(repo, contactId, mergedFrom)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.touchId - b.touchId);
  const channels: Record<string, number> = {};
  const tags = new Set<string>();
  let lastInAt: string | null = null, lastOutAt: string | null = null, lastConvDir: 'in' | 'out' | null = null;
  for (const r of rows) {
    if (r.channel) channels[r.channel] = (channels[r.channel] ?? 0) + 1;
    if (r.kind === 'tag') {
      const tag = String(r.dims.tag ?? '');
      if (r.dims.op === 'remove') tags.delete(tag); else tags.add(tag);
    }
    if (r.kind === 'message' || r.kind === 'comment') {
      if (r.direction === 'in') lastInAt = r.at;
      if (r.direction === 'out') lastOutAt = r.at;
      if (r.direction !== 'none') lastConvDir = r.direction;
    }
  }
  const prev = repo.getState(contactId);
  return { contactId, tags: [...tags], lastInAt, lastOutAt, unanswered: lastConvDir === 'in', channels, rev: (prev?.rev ?? 0) + 1 };
}

/** So hai trạng thái bỏ qua rev — dùng cho kiểm SC-CAKE-5. */
export const sameState = (a: StateRow | undefined, b: StateRow | undefined) => {
  if (!a || !b) return a === b;
  const norm = (s: StateRow) => JSON.stringify({ ...s, rev: 0, tags: [...s.tags].sort(), channels: Object.fromEntries(Object.entries(s.channels).sort()) });
  return norm(a) === norm(b);
};
