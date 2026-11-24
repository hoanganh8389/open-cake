// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: Vite cho apps/web.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — dev: /api sang API cục bộ (npm run api:dev hoặc compose).
export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:8120' } } });
