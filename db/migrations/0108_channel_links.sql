-- [2026-11-26 09:55 PM Johnny Chu - Chu Hoàng Anh] KN K5 — cách kết nối kênh theo đơn vị (docs/architecture/25-KET-NOI-KENH.md §3, §3a; D-KN-1: một cách cho cả đơn vị):
--   hub  = như cũ: Cake ⇄ Hub BizCity (CAKE_HUB_* của máy chủ) ⇄ Cell.
--   self = Tự cài: Cake ⇄ máy kết nối gọn zalo-hub-connector (cùng docker compose), cùng hợp đồng bizcity_touch@1 / bizcity_channel_command@1, cùng khuôn ký.
--   Khoá nối `ckn.<tenant_id>.<ngẫu nhiên>` + bí mật ký do Cake SINH, trả một lần, lưu MÃ HOÁ (cùng khuôn khoá cửa hàng, v1:aes-256-gcm). Cổng nhận đọc
--   tenant_id từ khoá ⇒ ngữ cảnh đơn vị ⇒ so khoá + chữ ký (thân touch không mang tenantId — hợp đồng cấm).

CREATE TABLE channel_links (
  tenant_id      bigint      PRIMARY KEY,
  mode           text        NOT NULL DEFAULT 'hub' CHECK (mode IN ('hub', 'self')),
  connector_url  text,
  key_sealed     text,
  key_prefix     text,
  secret_sealed  text,
  last_ok_at     timestamptz,
  last_error     text,
  updated_by     text        NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (mode = 'hub' OR (connector_url IS NOT NULL AND key_sealed IS NOT NULL AND secret_sealed IS NOT NULL))
);
COMMENT ON TABLE channel_links IS 'Cách kết nối kênh của đơn vị (hub | self). Khoá / bí mật máy kết nối lưu mã hoá; không bao giờ trả lại nguyên văn sau lần sinh.';

ALTER TABLE channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON channel_links USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
