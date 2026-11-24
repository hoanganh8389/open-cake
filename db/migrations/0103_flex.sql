-- [2026-11-24 06:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 S016-2b — lớp dữ liệu mềm bản đầu ở open-cake (D-PLAT-4; canon open-hub CHUAN-DU-LIEU-TRUC-VA-LOP-MEM, R-CANON-15).
-- =============================================================================
-- 0103 Lớp mềm kiểu WordPress: user_meta (≈ wp_usermeta) · entity_meta (≈ wp_postmeta) · record_types + records (≈ custom post type).
--      options / cài đặt dùng setting_values của nền @bizcity/platform (dải 00xx), không lặp ở đây.
--      Khoá / loại phải có trong registry (R-DATA-1, CAKE_META_KEYS / CAKE_RECORD_TYPES ở @open-cake/contracts) — kiểm ở tầng action, không ở DB.
--      Không đặt ở đây: ID trục của chính nó, tiền, số lượng, thuế suất, trạng thái chứng từ, quyền, danh tính kênh, bí mật (R-DATA-2).
--      Tệp này chuyển nguyên sang @bizcity/flex ở P7 (đổi nguồn migration, giữ tên tệp đã áp).
-- =============================================================================

CREATE TABLE user_meta (
  tenant_id   bigint      NOT NULL,
  user_id     bigint      NOT NULL,          -- users.id của nền; người dùng trên dây là sub = wp:<id> (SPINE trục user)
  key         text        NOT NULL CHECK (key ~ '^(bizcity\.)?[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  value       jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  bigint,
  PRIMARY KEY (tenant_id, user_id, key)
);
COMMENT ON TABLE user_meta IS 'Tuỳ chọn cá nhân (cột đang ẩn, bộ lọc lưu…). Khoá phải có trong registry (R-DATA-1).';

CREATE TABLE entity_meta (
  tenant_id    bigint      NOT NULL,
  entity_type  text        NOT NULL CHECK (entity_type IN ('contact', 'conversation', 'channel_account', 'document', 'item')),
  entity_id    text        NOT NULL,         -- ID trục (contact_id, item_id cục bộ…) — không bằng tên / mã (R-DATA-3)
  key          text        NOT NULL CHECK (key ~ '^(bizcity\.)?[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  value        jsonb       NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   bigint,
  PRIMARY KEY (tenant_id, entity_type, entity_id, key)
);
COMMENT ON TABLE entity_meta IS 'Vài trường phụ gắn vào thực thể trục (≈ wp_postmeta). Cột riêng của Cake trên hàng ở đây: cake.item.* (R-CAKE-MASTER-7, SPINE R-SPINE-5/10).';
CREATE INDEX entity_meta_key ON entity_meta (tenant_id, entity_type, key);
-- Khoá khai indexed: true trong registry (R-DATA-5, tối đa 5 khoá chỉ mục / app).
CREATE INDEX entity_meta_contact_birthday ON entity_meta (tenant_id, (value #>> '{}')) WHERE key = 'cake.contact.birthday';
CREATE INDEX entity_meta_contact_gender   ON entity_meta (tenant_id, (value #>> '{}')) WHERE key = 'cake.contact.gender';
CREATE INDEX entity_meta_item_sellable    ON entity_meta (tenant_id, (value #>> '{}')) WHERE key = 'cake.item.sellable';

CREATE TABLE record_types (
  key            text        PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  app            text        NOT NULL,
  label          text        NOT NULL,
  schema         jsonb       NOT NULL,       -- JSON Schema sinh từ zod của registry
  version        integer     NOT NULL CHECK (version >= 1),
  permissions    jsonb       NOT NULL,       -- {xem, lap, sua, xoa}
  list_columns   text[]      NOT NULL,
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE record_types IS 'Bản chép registry loại bản ghi của database này (đồng bộ lúc khởi động từ mã). Không theo đơn vị.';

CREATE TABLE records (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id      text        NOT NULL UNIQUE CHECK (record_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id      bigint      NOT NULL,
  type           text        NOT NULL REFERENCES record_types (key),
  type_version   integer     NOT NULL CHECK (type_version >= 1),   -- R-DATA-7: đọc bản cũ qua bộ chuyển đổi
  title          text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parent_id      bigint      REFERENCES records (id),
  owner_user_id  bigint,
  contact_id     text        REFERENCES contacts (contact_id),
  doc_ref        text        CHECK (doc_ref IS NULL OR doc_ref ~ '^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*:[A-Za-z0-9_.-]{1,64}$'),
  data           jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     bigint,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     bigint,
  archived_at    timestamptz,
  CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);
COMMENT ON TABLE records IS 'Bản ghi nhỏ không đáng một bảng (tin nhắn nhanh, nhãn, tài khoản ngân hàng…). Xoá = archived_at, không DELETE khi đã được tham chiếu (R-DATA-8).';
CREATE INDEX records_list ON records (tenant_id, type, status, updated_at DESC);

-- ── RLS FORCE (bảng theo đơn vị) ─────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_meta','entity_meta','records'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id))', t);
  END LOOP;
END $$;
