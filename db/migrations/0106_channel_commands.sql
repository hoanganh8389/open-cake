-- [2026-11-26 12:54 AM Johnny Chu - Chu Hoàng Anh] PHASE-006 S006-3 / PHASE-007 — lệnh ra kênh bizcity_channel_command@1 (contracts/BIZCITY-CHANNEL-COMMAND-v1):
--   hàng chờ (outbox) Cake → Hub. Lệnh ghi CÙNG giao dịch với dòng sổ của tin; Hub trả 202 ⇒ accepted; mạng / 5xx ⇒ queued, gửi lại CÙNG Idempotency-Key
--   (Hub chống lặp); quá 10 phút ⇒ given_up và tin thành "chưa rõ đã gửi" — KHÔNG tự gửi khoá mới (R-CAKE-SEND-2). Kết quả thật về bằng delivery.updated.

CREATE TABLE channel_commands (
  tenant_id          bigint      NOT NULL,
  command_key        text        NOT NULL CHECK (command_key ~ '^cake:\d+:[a-z_]+:\d+$'),
  operation          text        NOT NULL,
  channel_account_id text        NOT NULL REFERENCES channel_accounts(channel_account_id),
  message_id         text        REFERENCES messages(message_id),
  body               jsonb       NOT NULL,
  state              text        NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','accepted','rejected','given_up')),
  attempts           integer     NOT NULL DEFAULT 0,
  next_at            timestamptz NOT NULL DEFAULT now(),
  last_error         text,
  created_by         text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  done_at            timestamptz,
  PRIMARY KEY (tenant_id, command_key)
);
COMMENT ON TABLE channel_commands IS 'Hàng chờ lệnh ra kênh (Cake → Hub → Cell). body chứa nội dung tin (dữ liệu cá nhân) — không log, không đưa vào sự kiện (R-CAKE-PII-1).';
CREATE INDEX channel_commands_due ON channel_commands (next_at) WHERE state = 'queued';

-- Người gửi tin ra (nhân viên) — hiện trên bong bóng; null với tin vào / tin gửi từ điện thoại.
ALTER TABLE messages ADD COLUMN sent_by text;

ALTER TABLE channel_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_commands FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON channel_commands USING (bizcity_tenant_visible(tenant_id)) WITH CHECK (bizcity_tenant_visible(tenant_id));
