// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 04:17 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-9: danh mục action đầy đủ của app = action cake + action lớp mềm (core.record.*).
import { createActionCatalog } from './base/action.js';
import { CAKE_ACTIONS } from './cake/actions.js';
import { FLEX_ACTIONS } from './flex/records.js';
import { CATALOG_ACTIONS } from './catalog/actions.js';
import { STAFF_ACTIONS } from './cake/staff.js'; // [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7
import { API_KEY_ACTIONS } from './cake/apikeys.js'; // [2026-11-24 11:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-3

export const ALL_ACTIONS = [...CAKE_ACTIONS, ...STAFF_ACTIONS, ...API_KEY_ACTIONS, ...FLEX_ACTIONS, ...CATALOG_ACTIONS] as const;
export const appCatalog = createActionCatalog(ALL_ACTIONS);
