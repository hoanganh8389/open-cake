-- [2026-11-24 09:48 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 S004-5 — thành viên tài khoản kênh: ai thấy hội thoại của tài khoản nào (40-SECURITY §2).
--   Nhân viên không có cake:all-inbox-xem chỉ thấy hội thoại của tài khoản mình là thành viên, hoặc hội thoại được giao cho mình.
CREATE TABLE channel_account_members (
  tenant_id           bigint      NOT NULL,
  channel_account_id  text        NOT NULL REFERENCES channel_accounts (channel_account_id),
  user_id             text        NOT NULL CHECK (user_id ~ '^[1-9][0-9]{0,18}$'),  -- users.id của nền (người đăng nhập)
  added_at            timestamptz NOT NULL DEFAULT now(),
  added_by            text        NOT NULL,                                         -- actor (user:<id>)
  PRIMARY KEY (tenant_id, channel_account_id, user_id)
);
COMMENT ON TABLE channel_account_members IS 'Giao tài khoản kênh cho nhân viên; đổi = ghi bằng chứng (cake.channel.members_set, quyền rủi ro cao).';
CREATE INDEX channel_account_members_user ON channel_account_members (tenant_id, user_id);

ALTER TABLE channel_account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_account_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON channel_account_members USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
