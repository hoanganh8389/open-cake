-- [2026-11-25 06:45 PM Johnny Chu - Chu Hoàng Anh] PHASE-010 S010-1/5/8 — luồng đơn xuyên app (bizcity_order_flow@1): yêu cầu đặt hàng của CRM (KHÔNG phải chứng từ kế toán,
--   không nộp sổ), sự kiện trạng thái cửa hàng gửi về (chống lặp theo id sự kiện), kết nối cửa hàng theo đơn vị (khoá / bí mật lưu MÃ HOÁ AES-256-GCM, không lưu rõ).

CREATE TABLE order_requests (
  tenant_id         bigint      NOT NULL,
  order_request_id  text        NOT NULL CHECK (order_request_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  contact_id        text        NOT NULL,
  conversation_id   text,
  status            text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','confirmed','shipped','delivered','returned','rejected','expired','cancelled')),
  send_state        text        NOT NULL DEFAULT 'none' CHECK (send_state IN ('none','queued','sent')),
  send_attempts     int         NOT NULL DEFAULT 0,
  next_send_at      timestamptz,
  last_error        text,
  version           int         NOT NULL DEFAULT 1 CHECK (version >= 1),
  branch_code       text        CHECK (branch_code IS NULL OR branch_code ~ '^[A-Z0-9_.-]{1,20}$'),
  customer          jsonb       NOT NULL,          -- { name, phone, partnerCode, verified } — chụp lúc lưu, không phải bảng khách
  ship_to           jsonb,
  lines             jsonb       NOT NULL,          -- [{ line, itemId, sku, name, uom, qty, price, amount }] — giá từ bảng giá công ty
  payment           text        NOT NULL CHECK (payment IN ('cod','bank_transfer')),
  shipping          text        NOT NULL CHECK (shipping IN ('carrier','pickup')),
  preferred_carrier text,
  note              text        NOT NULL DEFAULT '',
  total             numeric(18,2) NOT NULL DEFAULT 0,
  pos_ref           text,
  order_ref         text,
  reject_reason     text,
  status_at         timestamptz,                   -- thời điểm của sự kiện POS đã áp (không lùi trạng thái — R-STD-ORD-18)
  expires_at        timestamptz,
  created_by        text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, order_request_id)
);
COMMENT ON TABLE order_requests IS 'Yêu cầu đặt hàng của CRM (cake.order_request). Đơn bán thật do cửa hàng ghi nhận lúc bàn giao vận chuyển; ở đây chỉ giữ yêu cầu và tham chiếu.';
CREATE INDEX order_requests_contact ON order_requests (tenant_id, contact_id, created_at DESC);
CREATE INDEX order_requests_queue ON order_requests (next_send_at) WHERE send_state = 'queued';

CREATE TABLE order_request_events (
  tenant_id         bigint      NOT NULL,
  event_id          text        NOT NULL,          -- id sự kiện của cửa hàng (chống lặp) hoặc local:<…> cho bước của CRM
  order_request_id  text        NOT NULL,
  type              text        NOT NULL,
  data              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  at                timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, order_request_id) REFERENCES order_requests (tenant_id, order_request_id)
);
CREATE INDEX order_request_events_req ON order_request_events (tenant_id, order_request_id, at);

CREATE TABLE pos_links (
  tenant_id         bigint      PRIMARY KEY,
  base_url          text        NOT NULL CHECK (base_url ~ '^https?://'),
  key_sealed        text        NOT NULL CHECK (key_sealed LIKE 'v1:%'),     -- khoá opb_… mã hoá (CAKE_SECRET_KEY)
  key_prefix        text        NOT NULL,
  secret_sealed     text        NOT NULL CHECK (secret_sealed LIKE 'v1:%'),  -- bí mật ký HMAC hai chiều, mã hoá
  branch_code       text        NOT NULL CHECK (branch_code ~ '^[A-Z0-9_.-]{1,20}$'),
  last_ok_at        timestamptz,
  last_sent_at      timestamptz,
  last_error        text,
  updated_by        text        NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE pos_links IS 'Kết nối cửa hàng (Open POS) của đơn vị — bizcity_order_request@1. Khoá và bí mật chỉ ở dạng mã hoá.';

ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON order_requests USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
ALTER TABLE order_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_request_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON order_request_events USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
ALTER TABLE pos_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pos_links USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
