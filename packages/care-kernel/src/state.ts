// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-5: contact_state là DẪN XUẤT của sổ (R-CAKE-LEDGER-2). Một hàm duy nhất tính từ sổ —
//   dùng cả khi ghi (cùng giao dịch) lẫn khi dựng lại (bizcity cake rebuild-state) ⇒ hai đường không thể lệch nhau (SC-CAKE-5).
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — bất đồng bộ; "dòng còn hiệu lực" tính THUẦN trên tập dòng (dòng đảo mang cùng eventId /
//   contactId với dòng gốc nên nằm cùng tập) — không hỏi kho từng dòng (quan trọng khi kho là Postgres).
import type { CareRepo, LedgerRow, StateRow } from './types.js';

/** Dòng còn hiệu lực trong một tập = không phải dòng đảo và chưa bị một dòng đảo TRONG TẬP đảo. */
export function effectiveRows(rows: LedgerRow[]): LedgerRow[] {
  const reversed = new Set(rows.filter((r) => r.reversesId !== null).map((r) => r.reversesId));
  return rows.filter((r) => !r.isReversal && !reversed.has(r.touchId));
}

/** Sổ của một khách gồm cả các khách đã ghép vào khách này (giải merged_into, không sửa dòng cũ). */
export async function ledgerOfPerson(repo: CareRepo, contactId: string, mergedFrom: string[]): Promise<LedgerRow[]> {
  return (await Promise.all([contactId, ...mergedFrom].map((id) => repo.ledgerByContact(id)))).flat();
}

export async function computeState(repo: CareRepo, contactId: string, mergedFrom: string[] = []): Promise<StateRow> {
  const rows = effectiveRows(await ledgerOfPerson(repo, contactId, mergedFrom)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.touchId - b.touchId);
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
  const prev = await repo.getState(contactId);
  return { contactId, tags: [...tags], lastInAt, lastOutAt, unanswered: lastConvDir === 'in', channels, rev: (prev?.rev ?? 0) + 1 };
}

/** Tính lại và ghi trạng thái của một khách (gồm khách đã ghép vào) — dùng sau mọi lần ghi sổ. */
export async function refreshState(repo: CareRepo, contactId: string): Promise<void> {
  await repo.putState(await computeState(repo, contactId, await repo.mergedFrom(contactId)));
}

/** So hai trạng thái bỏ qua rev — dùng cho kiểm SC-CAKE-5. */
export const sameState = (a: StateRow | undefined, b: StateRow | undefined) => {
  if (!a || !b) return a === b;
  const norm = (s: StateRow) => JSON.stringify({ ...s, rev: 0, tags: [...s.tags].sort(), channels: Object.fromEntries(Object.entries(s.channels).sort()) });
  return norm(a) === norm(b);
};
