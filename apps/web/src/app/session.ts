// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — phiên của web khi nói chuyện với máy chủ (?api=http | mix; giả lập không cần):
//   ?sso=<vé WordPress> ⇒ đổi lấy phiên rồi xoá khỏi địa chỉ · phiên trong sessionStorage (đóng tab là hết) · không có phiên mà máy chủ bật đăng nhập dev ⇒ tự lấy.
//   Không có cách nào ⇒ trả loginUrl (nút "Đăng nhập qua WordPress") hoặc null.
const KEY = 'cake.token';

const read = (): string | null => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
const save = (t: string) => { try { sessionStorage.setItem(KEY, t); } catch { /* kho bị chặn: phiên chỉ sống trong trang */ } memo = t; };
let memo: string | null = read();

export const getToken = () => memo;

/** Bảo đảm có phiên. Trả { ok: true } hoặc { ok: false, loginUrl } để giao diện báo "Cần đăng nhập". */
export async function ensureSession(base = ''): Promise<{ ok: true } | { ok: false; loginUrl: string | null }> {
  const url = new URL(location.href);
  const ticket = url.searchParams.get('sso');
  if (ticket) {
    url.searchParams.delete('sso');
    history.replaceState(null, '', url.toString()); // vé không nằm lại trên địa chỉ / lịch sử
    const r = await fetch(`${base}/api/v1/auth/wp-sso`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket }) }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { save(r.data.token); return { ok: true }; }
  }
  if (memo) return { ok: true };
  const info = await fetch(`${base}/api/v1/auth/wp-sso`).then((x) => x.json()).catch(() => null);
  if (info?.data?.devLogin) {
    const r = await fetch(`${base}/api/v1/auth/dev-login`, { method: 'POST' }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { save(r.data.token); return { ok: true }; }
  }
  return { ok: false, loginUrl: info?.data?.loginUrl ?? null };
}
