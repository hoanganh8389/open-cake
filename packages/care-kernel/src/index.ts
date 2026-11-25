// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer kernel
// [2026-11-24 04:21 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — mặt công khai DUY NHẤT của @open-cake/care-kernel (như @bizcity/kernel của open-ketoan).
export * from './types.js';
export * from './errors.js';
export * from './memory-repo.js';
export { resolveIdentity, type ResolveInput, type ResolveResult } from './identity.js';
export { submitTouchIn, type SubmitResult } from './submit-touch.js';
export { assignConversation, tagContact } from './commands.js';
export { requestSend, deliveryAdvances, type SendResult } from './send.js'; // [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3
export { mergeContacts, unmergeContact, UNMERGE_WINDOW_DAYS } from './merge.js';
export { computeState, effectiveRows, refreshState, sameState } from './state.js';
