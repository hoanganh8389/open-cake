-- [2026-11-24 04:47 PM Johnny Chu - Chu Hoàng Anh] PHASE-005 — S005-1: bảng care-kernel (architecture/20-DATA-SPINE §1, cổng CareRepo).
-- =============================================================================
-- 0101 Trục contact_id: khách · danh tính · tài khoản kênh · hội thoại · một cửa sự việc · sổ chạm khách chỉ thêm · tin · dẫn xuất.
--      Dải số 01xx là của app open-cake; dải 00xx dành cho migration nền của @bizcity/platform (D-PLAT-5, nguồn "platform").
--      Mọi bảng: tenant_id + RLS FORCE (R-CAKE-TEN-1). Sổ (touch_events, touch_event_versions, touch_ledger) chỉ thêm (R-CAKE-LEDGER-1).
--      Không cột cookie / token / khoá E2EE (R-CAKE-CELL-1, SC-CAKE-6).
-- =============================================================================

-- Hàm RLS dùng chung (cùng định nghĩa với open-ketoan 0041; CREATE OR REPLACE an toàn khi nền đã tạo).
CREATE OR REPLACE FUNCTION bizcity_tenant_visible(row_tenant bigint) RETURNS boolean
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(NULLIF(current_setting('bizcity.tenant_id', true), '')::bigint = row_tenant, true)
$$;

CREATE OR REPLACE FUNCTION cake_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Sổ chạm khách chỉ được thêm (%). Hãy ghi dòng đảo thay vì sửa hoặc xoá.', TG_TABLE_NAME
    USING ERRCODE = 'P0001', HINT = 'R-CAKE-LEDGER-1';
END $$;
COMMENT ON FUNCTION cake_append_only() IS 'Trigger chặn UPDATE / DELETE / TRUNCATE trên sổ của open-cake (R-CAKE-LEDGER-1, chép khuôn 0006 open-ketoan).';

-- ── Người ─────────────────────────────────────────────────────────────────────
CREATE TABLE contacts (
  contact_id    text        PRIMARY KEY CHECK (contact_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id     bigint      NOT NULL,
  kind          text        NOT NULL CHECK (kind IN ('person', 'org')),
  display_name  text        NOT NULL,
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'archived')),
  merged_into   text        REFERENCES contacts(contact_id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'merged') = (merged_into IS NOT NULL)),
  CHECK (merged_into IS DISTINCT FROM contact_id)
);
COMMENT ON TABLE contacts IS 'Trục contact_id: một người / tổ chức doanh nghiệp chăm sóc. ID không dùng lại; ghép = status merged + merged_into, không xoá (R-CAKE-SPINE-2).';
CREATE INDEX contacts_merged_into ON contacts (tenant_id, merged_into) WHERE merged_into IS NOT NULL;

CREATE TABLE contact_identities (
  identity_id   text        PRIMARY KEY,
  tenant_id     bigint      NOT NULL,
  contact_id    text        NOT NULL REFERENCES contacts(contact_id),
  channel       text        NOT NULL CHECK (channel IN ('zalo_personal','zalo_oa','facebook_personal','facebook_page','facebook_comment','facebook_group','phone','email','tax_code','bank_account','web')),
  scope         text        NOT NULL CHECK (scope ~ '^(global|site|(oa|page|comment|group|account):[A-Za-z0-9_-]+)$'),
  external_id   text        NOT NULL,
  display_name  text,
  confidence    text        NOT NULL CHECK (confidence IN ('proven', 'asserted', 'guessed')),
  proof         jsonb       CHECK (proof IS NULL OR proof->>'kind' IN ('phone','email','tax_code','fb_private_reply','human','channel')),
  valid_from    timestamptz NOT NULL,
  valid_to      timestamptz CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK (confidence <> 'proven' OR proof IS NOT NULL)
);
COMMENT ON TABLE contact_identities IS 'Danh tính kênh của khách (channel, scope, external_id): PSID chỉ có nghĩa trong page:<id>. Đổi khách = đóng dòng (valid_to) + mở dòng mới. Không bằng chứng "name" (R-CAKE-ID-1..3). external_id là dữ liệu cá nhân.';
CREATE UNIQUE INDEX contact_identities_live ON contact_identities (tenant_id, channel, scope, external_id) WHERE valid_to IS NULL;
CREATE INDEX contact_identities_contact ON contact_identities (tenant_id, contact_id);

-- ── Kênh, hội thoại ───────────────────────────────────────────────────────────
CREATE TABLE channel_accounts (
  channel_account_id  text        PRIMARY KEY,
  tenant_id           bigint      NOT NULL,
  channel             text        NOT NULL CHECK (channel IN ('zalo_personal','zalo_oa','facebook_personal','facebook_page','facebook_group')),
  kind                text        NOT NULL CHECK (kind IN ('personal','page','group','oa')),
  external_account_id text        NOT NULL,
  label               text        NOT NULL,
  owner_user_id       text,
  cell_ref            text,
  status              text        NOT NULL DEFAULT 'connecting' CHECK (status IN ('connected','connecting','auth_required','checkpoint','degraded','disconnected')),
  capabilities        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  connected_at        timestamptz,
  tested_at           timestamptz,
  UNIQUE (tenant_id, channel, external_account_id)
);
COMMENT ON TABLE channel_accounts IS 'Tài khoản kênh của doanh nghiệp. Trạng thái là sự thật từ Cell. KHÔNG có cookie / token / khoá (R-CAKE-CELL-1); cell_ref chỉ là tham chiếu.';

CREATE TABLE conversations (
  conversation_id     text        PRIMARY KEY,
  tenant_id           bigint      NOT NULL,
  channel_account_id  text        NOT NULL REFERENCES channel_accounts(channel_account_id),
  external_thread_id  text        NOT NULL,
  contact_id          text        NOT NULL REFERENCES contacts(contact_id),
  kind                text        NOT NULL CHECK (kind IN ('dm','comment_thread','group_thread')),
  anchor              jsonb,
  last_at             timestamptz,
  last_direction      text        CHECK (last_direction IN ('in','out')),
  window_until        timestamptz,
  assignee_user_id    text,
  UNIQUE (tenant_id, channel_account_id, external_thread_id),
  CHECK (kind <> 'comment_thread' OR anchor ? 'commentId')
);
COMMENT ON TABLE conversations IS 'Luồng trên một tài khoản kênh, trỏ đúng một contact_id; đổi người chỉ qua ghép / tách. window_until: cửa sổ 24 giờ Fanpage.';
CREATE INDEX conversations_contact ON conversations (tenant_id, contact_id);
CREATE INDEX conversations_comment ON conversations (tenant_id, channel_account_id, (anchor->>'commentId')) WHERE kind = 'comment_thread';

-- ── Một cửa và sổ ─────────────────────────────────────────────────────────────
CREATE TABLE touch_events (
  event_id     text        PRIMARY KEY,
  tenant_id    bigint      NOT NULL,
  source       text        NOT NULL,
  doc_key      text        NOT NULL,
  version      integer     NOT NULL CHECK (version >= 1),
  type         text        NOT NULL,
  payload      jsonb       NOT NULL,
  actor        text        NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source, doc_key)
);
COMMENT ON TABLE touch_events IS 'Một cửa submitTouchIn: khoá tự nhiên (source, doc_key) + version chỉ tăng (R-CAKE-EVENT-1). Phiên bản cũ chép sang touch_event_versions trước khi thay.';

CREATE TABLE touch_event_versions (
  tenant_id    bigint      NOT NULL,
  event_id     text        NOT NULL REFERENCES touch_events(event_id),
  version      integer     NOT NULL,
  payload      jsonb       NOT NULL,
  archived_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, version)
);
COMMENT ON TABLE touch_event_versions IS 'Lịch sử phiên bản của sự việc — chỉ thêm.';

CREATE TABLE touch_ledger (
  touch_id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id           bigint      NOT NULL,
  event_id            text        NOT NULL REFERENCES touch_events(event_id),
  contact_id          text        NOT NULL REFERENCES contacts(contact_id),
  conversation_id     text        REFERENCES conversations(conversation_id),
  channel_account_id  text        REFERENCES channel_accounts(channel_account_id),
  channel             text,
  kind                text        NOT NULL CHECK (kind IN ('message','comment','reaction','call','note','tag','stage','assign','merge','identity','document','task','broadcast_target')),
  direction           text        NOT NULL CHECK (direction IN ('in','out','none')),
  qty                 smallint    NOT NULL CHECK (qty IN (1, -1)),
  is_reversal         boolean     NOT NULL DEFAULT false,
  reverses_id         bigint      UNIQUE REFERENCES touch_ledger(touch_id),
  dims                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  at                  timestamptz NOT NULL,
  CHECK (is_reversal = (reverses_id IS NOT NULL)),
  CHECK (is_reversal = (qty = -1))
);
COMMENT ON TABLE touch_ledger IS 'Sổ chạm khách: mỗi lần chạm khách một dòng; chỉ thêm (trigger); sửa = dòng đảo (reverses_id UNIQUE ⇒ mỗi dòng đảo tối đa một lần). Báo cáo chỉ đọc sổ + dẫn xuất.';
CREATE INDEX touch_ledger_contact ON touch_ledger (tenant_id, contact_id, at);
CREATE INDEX touch_ledger_event ON touch_ledger (event_id);

CREATE TABLE messages (
  message_id           text        PRIMARY KEY,
  tenant_id            bigint      NOT NULL,
  touch_id             bigint      NOT NULL REFERENCES touch_ledger(touch_id),
  conversation_id      text        NOT NULL REFERENCES conversations(conversation_id),
  external_message_id  text        NOT NULL,
  direction            text        NOT NULL CHECK (direction IN ('in','out')),
  body                 text        NOT NULL DEFAULT '',
  attachments          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  e2ee                 boolean     NOT NULL DEFAULT false,
  delivery             text        CHECK (delivery IN ('accepted','sent','delivered','read','failed','unknown')),
  at                   timestamptz NOT NULL,
  UNIQUE (tenant_id, conversation_id, external_message_id)
);
COMMENT ON TABLE messages IS 'Nội dung tin (dữ liệu cá nhân) tách khỏi sổ; delivery chỉ đổi qua sự việc delivery.updated. Không log, không đưa vào sự kiện (R-CAKE-PII-1).';

CREATE TABLE contact_state (
  contact_id    text        PRIMARY KEY REFERENCES contacts(contact_id),
  tenant_id     bigint      NOT NULL,
  tags          text[]      NOT NULL DEFAULT '{}',
  last_in_at    timestamptz,
  last_out_at   timestamptz,
  unanswered    boolean     NOT NULL DEFAULT false,
  channels      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  rev           integer     NOT NULL DEFAULT 1
);
COMMENT ON TABLE contact_state IS 'Dẫn xuất của touch_ledger, cập nhật cùng giao dịch, dựng lại được (bizcity cake rebuild-state; R-CAKE-LEDGER-2, SC-CAKE-5).';

-- ── Chỉ thêm ──────────────────────────────────────────────────────────────────
CREATE TRIGGER touch_ledger_append_only BEFORE UPDATE OR DELETE ON touch_ledger FOR EACH ROW EXECUTE FUNCTION cake_append_only();
CREATE TRIGGER touch_ledger_no_truncate BEFORE TRUNCATE ON touch_ledger FOR EACH STATEMENT EXECUTE FUNCTION cake_append_only();
CREATE TRIGGER touch_event_versions_append_only BEFORE UPDATE OR DELETE ON touch_event_versions FOR EACH ROW EXECUTE FUNCTION cake_append_only();
CREATE TRIGGER touch_event_versions_no_truncate BEFORE TRUNCATE ON touch_event_versions FOR EACH STATEMENT EXECUTE FUNCTION cake_append_only();
CREATE TRIGGER touch_events_no_delete BEFORE DELETE ON touch_events FOR EACH ROW EXECUTE FUNCTION cake_append_only();
CREATE TRIGGER touch_events_no_truncate BEFORE TRUNCATE ON touch_events FOR EACH STATEMENT EXECUTE FUNCTION cake_append_only();

-- ── RLS FORCE mọi bảng ────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts','contact_identities','channel_accounts','conversations','touch_events','touch_event_versions','touch_ledger','messages','contact_state'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id))', t);
  END LOOP;
END $$;
