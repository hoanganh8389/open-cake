// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer api
// [2026-11-27 11:17 AM Johnny Chu - Chu Hoàng Anh] PHASE-018 S018-3 — kiểm tệp khi nhận (R-STOR-7, mockup đính kèm ⑦⑧ đã duyệt — D-ATT-1):
//   loại xác định từ ĐẦU TỆP (magic bytes), không tin đuôi / content-type phía khách; ảnh JPG / PNG / WebP ≤ 10 MB; PDF, Word, Excel, ZIP ≤ 25 MB;
//   chặn tệp chạy được theo nội dung (MZ, ELF, Mach-O, `#!`) VÀ theo đuôi. Đuôi lưu = đuôi của loại thật (khách đặt .jpg cho tệp PNG ⇒ lưu .png).

export const LIMITS = { image: 10 * 1024 * 1024, file: 25 * 1024 * 1024 } as const;
const BLOCKED_EXT = new Set(['exe', 'dll', 'com', 'bat', 'cmd', 'msi', 'scr', 'ps1', 'vbs', 'js', 'mjs', 'cjs', 'jar', 'apk', 'sh', 'bin', 'app', 'deb', 'rpm', 'php', 'py']);

export type Sniffed = { kind: 'image' | 'file'; contentType: string; ext: string };
export class FileRejected extends Error {
  constructor(readonly reason: 'FILE_EMPTY' | 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED', message: string) { super(message); }
}

const starts = (b: Buffer, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Buffer, s: string, at = 0) => b.subarray(at, at + s.length).toString('latin1') === s;
const extOf = (name: string) => (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? '').toLowerCase();

/** Loại thật của tệp; tệp không cho phép ⇒ FileRejected (lý do + câu cho người dùng). */
export function sniffFile(data: Buffer, originalName: string): Sniffed {
  if (!data.length) throw new FileRejected('FILE_EMPTY', 'Tệp rỗng.');
  const ext = extOf(originalName);
  const exec = starts(data, [0x4d, 0x5a]) || starts(data, [0x7f, 0x45, 0x4c, 0x46]) || starts(data, [0xcf, 0xfa, 0xed, 0xfe]) || starts(data, [0xfe, 0xed, 0xfa, 0xcf]) || ascii(data, '#!');
  if (exec || BLOCKED_EXT.has(ext)) throw new FileRejected('FILE_TYPE_NOT_ALLOWED', 'Loại tệp không được gửi (tệp chạy được).');

  let t: Sniffed | null = null;
  if (starts(data, [0xff, 0xd8, 0xff])) t = { kind: 'image', contentType: 'image/jpeg', ext: 'jpg' };
  else if (starts(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) t = { kind: 'image', contentType: 'image/png', ext: 'png' };
  else if (ascii(data, 'RIFF') && ascii(data, 'WEBP', 8)) t = { kind: 'image', contentType: 'image/webp', ext: 'webp' };
  else if (ascii(data, '%PDF-')) t = { kind: 'file', contentType: 'application/pdf', ext: 'pdf' };
  else if (starts(data, [0x50, 0x4b, 0x03, 0x04])) {
    // Word / Excel mới là ZIP: phân theo đuôi khai (nội dung cùng là ZIP) — đuôi khác ⇒ ZIP thường
    if (ext === 'docx') t = { kind: 'file', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
    else if (ext === 'xlsx') t = { kind: 'file', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
    else t = { kind: 'file', contentType: 'application/zip', ext: 'zip' };
  } else if (starts(data, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // Word / Excel cũ (OLE2)
    t = ext === 'xls' ? { kind: 'file', contentType: 'application/vnd.ms-excel', ext: 'xls' } : { kind: 'file', contentType: 'application/msword', ext: 'doc' };
  }
  if (!t) throw new FileRejected('FILE_TYPE_NOT_ALLOWED', 'Loại tệp không được gửi — chỉ ảnh JPG / PNG / WebP, PDF, Word, Excel, ZIP.');
  if (data.length > LIMITS[t.kind]) {
    throw new FileRejected('FILE_TOO_LARGE', `${t.kind === 'image' ? 'Ảnh' : 'Tệp'} ${(data.length / 1048576).toFixed(1)} MB — vượt giới hạn ${LIMITS[t.kind] / 1048576} MB.`);
  }
  return t;
}
