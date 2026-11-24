// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: Vite cho apps/web.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()], server: { port: 5173 } });
