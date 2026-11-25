// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// [2026-11-24 03:39 PM Johnny Chu - Chu Hoàng Anh] PHASE-002 — S002-1: vitest cho mọi gói.
// [2026-11-25 01:55 PM Johnny Chu - Chu Hoàng Anh] NO-CHUAN R-STD-SEC-5 (như open-ketoan vitest.config.ts): test tích hợp tạo / XOÁ database theo từng tệp ⇒ CSDL trong
//   TEST_DATABASE_URL phải có chữ "test" (vd postgres://…/cake_test); thiếu thì DỪNG trước mọi tệp, không bỏ qua. Không đặt biến ⇒ chỉ chạy test không cần Postgres.
import { defineConfig } from 'vitest/config';

const url = process.env.TEST_DATABASE_URL;
if (url) {
  const dbName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!/^[A-Za-z0-9_]*test[A-Za-z0-9_]*$/i.test(dbName)) {
    throw new Error(`Test không chạy trên CSDL "${dbName}": bộ test tạo và XOÁ database theo từng tệp. Dùng CSDL có chữ "test", vd TEST_DATABASE_URL=postgres://…/cake_test (R-STD-SEC-5).`);
  }
}

export default defineConfig({
  test: { include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.{ts,tsx}'] },
});
