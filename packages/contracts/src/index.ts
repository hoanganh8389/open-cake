// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer contracts
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — mặt công khai duy nhất của @open-cake/contracts.
//   base/ là bản đầu của hợp đồng nền (sẽ chuyển sang @bizcity/contracts — ADR-0003); cake/ và flex/ là của open-cake.
export * from './base/api.js';
export * from './base/errors.js';
export * from './base/event.js';
export * from './base/action.js';
export * from './cake/channel.js';
export * from './cake/entities.js';
export * from './cake/touch.js';
export * from './cake/channel-command.js';
export * from './cake/contact-contract.js';
export * from './cake/actions.js';
export * from './cake/staff.js'; // [2026-11-24 11:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-7 — nhân viên + vai & quyền
export * from './flex/registry.js';
export * from './flex/records.js';
export * from './catalog/standard.js';
export * from './catalog/entities.js';
export * from './catalog/actions.js';
export * from './catalog.js';
