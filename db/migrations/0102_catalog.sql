-- [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-5: danh mục độc lập sẵn ánh xạ (ADR-0004, R-CAKE-MASTER-1..5, canon R-CANON-16).
-- =============================================================================
-- 0102 Danh mục của Cake: nhóm · hàng · mã có hiệu lực · ĐVT · bảng giá · giá · liên kết đơn vị · liên kết khách.
--      Chạy một mình (catalog_source = local) nhưng hình đúng chuẩn open-ketoan / open-pos (H-1…H-18):
--        item_id ULID (khuôn items.item_id) · mã đóng / mở theo hiệu lực · đúng một ĐVT tỉ lệ 1 · giá gồm VAT 2 số lẻ.
--      Mọi bảng đồng bộ mang cùng khối ánh xạ: source · ext_id · ext_synced_at · ext_hash · push_status · push_error.
--      Khi catalog_source = ketoan: cột kế toán chỉ ghi qua MỘT cổng (catalogWriteGate ở tầng ứng dụng) — không hai chủ cùng lúc.
--      Mọi bảng: tenant_id + RLS FORCE (R-CAKE-TEN-1).
-- =============================================================================

-- ── Nhóm hàng (→ item_classes.code, kind group) ───────────────────────────────
CREATE TABLE catalog_categories (
  tenant_id      bigint      NOT NULL,
  code           text        NOT NULL CHECK (code ~ '^[0-9A-Z_-]{1,32}$'),
  name           text        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  parent_code    text,
  level          smallint    NOT NULL CHECK (level BETWEEN 1 AND 3),
  kind           text        NOT NULL DEFAULT 'group' CHECK (kind IN ('group', 'brand', 'industry', 'type')),
  is_active      boolean     NOT NULL DEFAULT true,
  source         text        NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'ketoan')),
  ext_id         text,
  ext_synced_at  timestamptz,
  ext_hash       text,
  push_status    text        NOT NULL DEFAULT 'local' CHECK (push_status IN ('local', 'sent', 'accepted', 'rejected')),
  push_error     text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, code),
  FOREIGN KEY (tenant_id, parent_code) REFERENCES catalog_categories (tenant_id, code),
  CHECK ((level = 1) = (parent_code IS NULL))
);
COMMENT ON TABLE catalog_categories IS 'Nhóm hàng 3 cấp của Cake; khi ánh xạ ext_id = item_classes.code của Kế Toán (H-17).';

-- ── Hàng (khuôn items của open-ketoan) ────────────────────────────────────────
CREATE TABLE catalog_items (
  item_id            text        PRIMARY KEY CHECK (item_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id          bigint      NOT NULL,
  sku                text        NOT NULL CHECK (sku ~ '^[0-9A-Z]{1,64}$'),          -- ảnh chụp mã hiện hành (H-1…H-5)
  name               text        NOT NULL CHECK (length(name) BETWEEN 1 AND 50),     -- H-7
  base_unit          text        NOT NULL,
  category_code      text,
  item_kind          text        CHECK (item_kind IN ('goods','material','finished','service','tool','asset','gift','packaging','other')),
  tax_code           text        NOT NULL CHECK (tax_code IN ('KCT', '0', '5', '8', '10', 'KKKN')), -- H-11
  is_kct             boolean     GENERATED ALWAYS AS (tax_code = 'KCT') STORED,       -- H-13
  parent_item_id     text        REFERENCES catalog_items (item_id),
  status             text        NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
  no_sale            boolean     NOT NULL DEFAULT false,
  -- cột vận hành của Cake: sửa được cả khi nguồn = ketoan
  display_name       text        CHECK (length(display_name) <= 200),
  is_sellable_in_crm boolean     NOT NULL DEFAULT true,
  image_url          text,
  description        text,
  -- khối ánh xạ
  source             text        NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'ketoan')),
  ext_id             text,       -- items.item_id của Kế Toán
  ext_synced_at      timestamptz,
  ext_hash           text,
  push_status        text        NOT NULL DEFAULT 'local' CHECK (push_status IN ('local', 'sent', 'accepted', 'rejected')),
  push_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, category_code) REFERENCES catalog_categories (tenant_id, code),
  CHECK (parent_item_id IS DISTINCT FROM item_id)
);
COMMENT ON TABLE catalog_items IS 'Hàng của Cake. Khoá là item_id (không đổi); SKU đổi bằng đóng / mở dòng ở catalog_item_codes. Không xoá — status retired (R-MD-4).';
CREATE UNIQUE INDEX catalog_items_name_ci ON catalog_items (tenant_id, lower(name));            -- H-7
CREATE UNIQUE INDEX catalog_items_ext ON catalog_items (tenant_id, ext_id) WHERE ext_id IS NOT NULL;
CREATE INDEX catalog_items_category ON catalog_items (tenant_id, category_code);

-- ── Mã có hiệu lực (→ item_codes) ─────────────────────────────────────────────
CREATE TABLE catalog_item_codes (
  tenant_id   bigint      NOT NULL,
  item_id     text        NOT NULL REFERENCES catalog_items (item_id),
  kind        text        NOT NULL CHECK (kind IN ('sku', 'barcode', 'alias') OR kind ~ '^external:[a-z0-9-]+$'),
  code        text        NOT NULL CHECK (length(code) BETWEEN 1 AND 160),
  valid_from  timestamptz NOT NULL DEFAULT now(),
  valid_to    timestamptz CHECK (valid_to IS NULL OR valid_to >= valid_from),
  PRIMARY KEY (tenant_id, kind, code, valid_from)
);
COMMENT ON TABLE catalog_item_codes IS 'Mã hàng theo hiệu lực. SKU đã dùng không cấp lại cho hàng khác, kể cả hàng đã xoá (H-2).';
CREATE UNIQUE INDEX catalog_item_codes_sku_once ON catalog_item_codes (tenant_id, code) WHERE kind = 'sku';
CREATE UNIQUE INDEX catalog_item_codes_live ON catalog_item_codes (tenant_id, kind, code) WHERE valid_to IS NULL;
CREATE UNIQUE INDEX catalog_item_codes_one_live_sku ON catalog_item_codes (tenant_id, item_id) WHERE kind = 'sku' AND valid_to IS NULL;

-- ── Đơn vị tính (→ item_units) ────────────────────────────────────────────────
CREATE TABLE catalog_item_units (
  tenant_id        bigint      NOT NULL,
  item_id          text        NOT NULL REFERENCES catalog_items (item_id),
  unit             text        NOT NULL CHECK (length(unit) BETWEEN 1 AND 32), -- tên ngoài 40 tên chuẩn ⇒ cảnh báo CAT-UNIT-NONSTD (H-9), không chặn
  ratio            numeric(18,6) NOT NULL CHECK (ratio > 0),
  is_default_sale  boolean     NOT NULL DEFAULT false,
  weight_kg        numeric(12,3) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  PRIMARY KEY (tenant_id, item_id, unit)
);
COMMENT ON TABLE catalog_item_units IS 'ĐVT của hàng: đúng một dòng tỉ lệ 1 (ĐVT gốc), tối đa 10, tối đa một ĐVT bán chính (H-8). Số dòng kiểm ở hợp đồng.';
CREATE UNIQUE INDEX catalog_item_units_base ON catalog_item_units (tenant_id, item_id) WHERE ratio = 1;
CREATE UNIQUE INDEX catalog_item_units_default_sale ON catalog_item_units (tenant_id, item_id) WHERE is_default_sale;

-- ── Bảng giá (→ price_lists) và giá (→ product_prices) ────────────────────────
CREATE TABLE catalog_price_lists (
  tenant_id      bigint      NOT NULL,
  code           text        NOT NULL CHECK (code ~ '^[0-9A-Z_-]{1,32}$'),
  name           text        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  is_company     boolean     NOT NULL DEFAULT false,
  is_active      boolean     NOT NULL DEFAULT true,
  source         text        NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'ketoan')),
  ext_id         text,
  ext_synced_at  timestamptz,
  ext_hash       text,
  push_status    text        NOT NULL DEFAULT 'local' CHECK (push_status IN ('local', 'sent', 'accepted', 'rejected')),
  push_error     text,
  PRIMARY KEY (tenant_id, code)
);
COMMENT ON TABLE catalog_price_lists IS 'Bảng giá; đúng một bảng giá công ty mỗi đơn vị (CONGTY).';
CREATE UNIQUE INDEX catalog_price_lists_company ON catalog_price_lists (tenant_id) WHERE is_company;

CREATE TABLE catalog_prices (
  tenant_id        bigint        NOT NULL,
  price_list_code  text          NOT NULL,
  item_id          text          NOT NULL REFERENCES catalog_items (item_id),
  unit             text          NOT NULL,
  price            numeric(18,2) NOT NULL CHECK (price >= 0),   -- gồm VAT (H-14)
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, price_list_code, item_id, unit),
  FOREIGN KEY (tenant_id, price_list_code) REFERENCES catalog_price_lists (tenant_id, code),
  FOREIGN KEY (tenant_id, item_id, unit) REFERENCES catalog_item_units (tenant_id, item_id, unit)  -- ĐVT giá phải là ĐVT của hàng (H-14)
);
COMMENT ON TABLE catalog_prices IS 'Giá gồm VAT theo (bảng giá, hàng, ĐVT). Khoá theo item_id; SKU chỉ để hiển thị.';

-- ── Liên kết đơn vị Cake ↔ Kế Toán ────────────────────────────────────────────
CREATE TABLE tenant_links (
  tenant_id          bigint      PRIMARY KEY,
  catalog_source     text        NOT NULL DEFAULT 'local' CHECK (catalog_source IN ('local', 'ketoan')),
  okt_base_url       text,
  okt_tenant_id      text,       -- đọc từ health của khoá, không gõ tay (R-CAKE-MASTER-4)
  branch_code        text,
  external_ref       text        CHECK (external_ref IS NULL OR external_ref ~ '^opencake:[a-z0-9-]+$'),
  connected_at       timestamptz,
  last_health_ok_at  timestamptz,
  paused             boolean     NOT NULL DEFAULT false,
  feed_cursor        jsonb,      -- con trỏ kéo meta / products / prices (PHASE-010)
  CHECK (catalog_source = 'local' OR (okt_base_url IS NOT NULL AND okt_tenant_id IS NOT NULL))
);
COMMENT ON TABLE tenant_links IS 'Nguồn danh mục của đơn vị và liên kết sang Kế Toán. Không giữ khoá bí mật ở đây (khoá ở vault).';

-- ── Liên kết khách ↔ đối tượng ở app khác ────────────────────────────────────
CREATE TABLE contact_links (
  tenant_id    bigint      NOT NULL,
  contact_id   text        NOT NULL REFERENCES contacts (contact_id),
  app          text        NOT NULL CHECK (app IN ('ketoan', 'pos', 'kiot')),
  kind         text        NOT NULL CHECK (kind IN ('partner')),
  ref_code     text        NOT NULL,   -- mã gửi đi: SĐT đã xác minh → CAKE-<contact_id> → KHACH-LE (R-CAKE-MASTER-5)
  ref_id       text,                   -- id bên kia trả về (lưu định danh, R-MD-2)
  push_status  text        NOT NULL DEFAULT 'local' CHECK (push_status IN ('local', 'sent', 'accepted', 'rejected')),
  push_error   text,
  linked_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, contact_id, app, kind)
);
COMMENT ON TABLE contact_links IS 'Khách của Cake ↔ đối tượng công nợ ở Kế Toán (và app bán khác). Tên / MST sau khi liên kết do Kế Toán giữ.';
CREATE UNIQUE INDEX contact_links_ref ON contact_links (tenant_id, app, kind, ref_code) WHERE ref_code <> 'KHACH-LE';

-- ── RLS FORCE mọi bảng ────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['catalog_categories','catalog_items','catalog_item_codes','catalog_item_units','catalog_price_lists','catalog_prices','tenant_links','contact_links'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id))', t);
  END LOOP;
END $$;
