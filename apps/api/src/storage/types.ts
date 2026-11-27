// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 10:51 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-2 — MỘT cổng lưu tệp, hai bộ (R-STOR-2): `local` (đĩa của app, bản Tự cài) | `s3` (R2 / S3 / MinIO).
//   Mã nghiệp vụ chỉ gọi cổng này; không `fs` / SDK S3 cho tệp nghiệp vụ ở chỗ khác (SC-STOR-1). CSDL chỉ giữ khoá tương đối (R-STOR-4).

export type StoredObject = { key: string; size: number };
export type CopyPage = { copied: number; next: string | null };

export interface StorageDriver {
  readonly kind: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  /** null khi không có. */
  get(key: string): Promise<Buffer | null>;
  head(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /**
   * Chép mọi tệp dưới `from` sang `to` (cùng phần đuôi khoá), từng lượt tối đa `maxKeys` tệp, theo thứ tự khoá.
   * Trả `next` = khoá cuối đã chép để gọi tiếp (`startAfter`); null khi xong. Chép lại tệp đã có thì ghi đè cùng nội dung ⇒ tiếp tục sau khi dừng không sinh trùng.
   */
  copyPrefix(from: string, to: string, opts?: { startAfter?: string; maxKeys?: number }): Promise<CopyPage>;
  deletePrefix(prefix: string): Promise<number>;
  usage(prefix: string): Promise<{ objects: number; bytes: number }>;
  /**
   * Đường dẫn tải có hạn (R-STOR-3). s3: URL ký sẵn của nhà cung cấp. local: đường dẫn tương đối `/files/v1/<vé>` do app phục vụ
   * (vé ký HMAC, kiểm ở verifyLocalToken) — nơi gọi tự ghép tên miền của instance.
   */
  signedUrl(key: string, ttlSec: number, contentType?: string): Promise<string>;
}
