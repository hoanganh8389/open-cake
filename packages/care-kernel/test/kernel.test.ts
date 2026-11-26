// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-8: ca vàng G1–G4 và luật sổ trên MemoryRepo.
// [2026-11-24 08:20 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — các ca ở scenarios.ts (dùng chung với PgCareRepo); tệp này chỉ gắn MemoryRepo + Probe bộ nhớ.
import { MemoryRepo } from '../src/index.js';
import { ACCOUNTS, defineKernelSuite, testClockAndIds } from './scenarios.js';

defineKernelSuite('MemoryRepo', async () => {
  const repo = new MemoryRepo({ accounts: structuredClone(ACCOUNTS) });
  return {
    deps: { repo, ...testClockAndIds() },
    probe: {
      ledger: async () => [...repo.data.ledger],
      events: async () => repo.data.events.length,
      versions: async () => repo.data.versions.length,
      contactIds: async () => repo.data.contacts.map((c) => c.contactId),
      mutateLedger: async (r) => { (repo.data.ledger.find((x) => x.touchId === r.touchId) as { qty: number }).qty = 5; }, // dòng đóng băng ⇒ ném lỗi
      markStaffName: async (id, name) => { const c = repo.data.contacts.find((x) => x.contactId === id)!; c.displayName = name; c.nameSource = 'staff'; }, // KN K2b
    },
  };
});
