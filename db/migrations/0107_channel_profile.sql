-- [2026-11-26 06:30 PM Johnny Chu - Chu Hoàng Anh] KN K2b — năng lực kênh đủ (docs/architecture/25-KET-NOI-KENH.md §3b, bizcity_touch@1 0.2):
--   tên + ảnh đại diện của danh tính kênh, tên khách theo kênh trừ khi nhân viên đã sửa tay, tên / ảnh / số thành viên nhóm,
--   trích dẫn + @nhắc + thu hồi của tin. Chỉ thêm cột, có mặc định ⇒ dòng cũ giữ nguyên nghĩa.

ALTER TABLE contacts ADD COLUMN name_source text NOT NULL DEFAULT 'channel' CHECK (name_source IN ('channel', 'staff'));
COMMENT ON COLUMN contacts.name_source IS 'channel = tên theo kênh (profile.updated được đổi); staff = nhân viên đã sửa tay, kênh không ghi đè (KN-CAP).';

ALTER TABLE contact_identities ADD COLUMN avatar_ref text;
COMMENT ON COLUMN contact_identities.avatar_ref IS 'URL ảnh đại diện do máy kết nối cấp (có hạn); Open CRM tải về kho của mình khi cần giữ lâu (KN-CAP-3). Không cookie.';

ALTER TABLE conversations ADD COLUMN title text;
ALTER TABLE conversations ADD COLUMN avatar_ref text;
ALTER TABLE conversations ADD COLUMN member_count integer CHECK (member_count IS NULL OR member_count >= 0);
COMMENT ON COLUMN conversations.title IS 'Tên nhóm / hội thoại do kênh giữ (thread.updated hoặc thread.info đi kèm tin).';

ALTER TABLE messages ADD COLUMN quote jsonb;
ALTER TABLE messages ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN revoked_at timestamptz;
COMMENT ON COLUMN messages.revoked_at IS 'Tin đã thu hồi trên kênh: nội dung và tệp bị xoá khỏi Open CRM, chỉ giữ dòng "đã thu hồi" (không đổi sổ chạm khách).';
