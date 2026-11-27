-- Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
-- [2026-11-27 11:17 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-3 — siêu dữ liệu tệp (26-NOI-LUU-TEP R-STOR-4): CSDL chỉ giữ KHOÁ TƯƠNG ĐỐI + băm + cỡ + loại + tên gốc;
--   nội dung nằm ở bộ lưu (đĩa | R2). Loại tệp do máy chủ xác định từ đầu tệp (không tin đuôi / content-type phía khách). Gỡ = archived_at, không xoá dòng.

CREATE TABLE files (
  file_id        text        PRIMARY KEY CHECK (file_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id      bigint      NOT NULL,
  area           text        NOT NULL CHECK (area ~ '^[a-z][a-z0-9-]{1,29}$'),
  storage_key    text        NOT NULL UNIQUE,
  driver         text        NOT NULL CHECK (driver IN ('local', 's3')),
  sha256         text        NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes     bigint      NOT NULL CHECK (size_bytes > 0),
  kind           text        NOT NULL CHECK (kind IN ('image', 'file')),
  content_type   text        NOT NULL,
  original_name  text        NOT NULL CHECK (length(original_name) BETWEEN 1 AND 255),
  created_by     text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  archived_at    timestamptz
);
COMMENT ON TABLE files IS 'Tệp của đơn vị (đính kèm chat, …). Khoá tương đối trong bộ lưu theo bizcity_storage@1; nội dung không nằm trong CSDL.';
CREATE INDEX files_dedupe ON files (tenant_id, area, sha256) WHERE archived_at IS NULL;

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON files USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
