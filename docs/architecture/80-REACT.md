# open-cake · 80 — Chuẩn React trong framework

<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ARCH-REACT — chủ (2026-11-24): "ghi nhớ thêm cả chuẩn … react trong framework". Kế thừa apps/web + packages/ui-kit (provideUiKit, useApi, useCan) của open-ketoan và bản mẫu Deplao (docs/ui/mockup-src). -->

## 1. Ngăn xếp

React 18 · TypeScript strict · Vite 5 · react-router 6 · @tanstack/react-query 5 · zod (dùng lại schema `packages/contracts`) · CSS token (`tokens.css` từ bản mẫu) — **không** Tailwind ở lõi (tránh `important` đè như bản WP), **không** Redux / Zustand ở lõi.

## 2. Cấu trúc

```text
apps/web/src/
├── main.tsx                 provideUiKit(impl) → <App/>
├── app/                     Shell (thanh tiêu đề · rail · thanh trạng thái) · router · ErrorBoundary · AuthGate
├── screens/                 màn lõi: dashboard · inbox · contacts · contact-360 · channels · states
├── features/<miền>/         hook + thành phần dùng chung trong lõi (inbox/useConversation.ts …)
├── api/                     client fetch (phong bì, lỗi, requestId), queryKeys
└── sdk-modules.ts           import.meta.glob('../../../modules/*/web/index.tsx')
packages/ui-kit/src/         facade: Button, Sheet, Field, Table, Avatar, ChannelBadge, Tag, EmptyState,
                             ErrorState, LoadingState, DeniedState, Toast, useApi, useCan, useUrlState
modules/<key>/web/index.tsx  defineWebModule({ key, routes, rail?, permissions }) — chỉ import @bizcity/ui-kit
```

## 3. Luật

| Mã | Luật |
|---|---|
| **R-WEB-1** | Module web **chỉ** import `@bizcity/ui-kit` (và React); không import `apps/web/*`, không import module khác (H-CROSS-MODULE) |
| **R-WEB-2** | **URL là nguồn vị trí** — tab, bộ lọc, hội thoại đang mở, sheet đang mở đọc / ghi qua `useUrlState`; F5 về đúng chỗ; link dán được |
| **R-WEB-3** | **Dữ liệu máy chủ chỉ ở react-query**; trạng thái giao diện cục bộ dùng `useState`; không store toàn cục. Khoá query: `['cake', site, resource, params]` (`api/queryKeys.ts`) |
| **R-WEB-4** | Mọi gọi API qua `useApi` / client chung: tự gắn `Idempotency-Key` cho thao tác ghi, đọc phong bì, ném `ApiError {code, message, hint, reason, requestId}` |
| **R-WEB-5** | **4 trạng thái** mọi màn và mọi khối dữ liệu: `LoadingState` · `EmptyState` (lý do + nút) · `ErrorState` (`message`, `hint`, nút Thử lại, `requestId` sao chép) · `DeniedState` (quyền thiếu + người cần hỏi) |
| **R-WEB-6** | **Thao tác ghi qua `Sheet`**: tiêu đề = động từ + đối tượng; lỗi hiện trong sheet; khoá nút khi đang lưu; R2 (gửi, gửi hàng loạt, ghép người, kết nối kênh) có bước xác nhận. Không `alert/confirm/prompt` |
| **R-WEB-7** | `useCan('cake:contacts-gop')` để **ẩn / khoá có giải thích** (R-BLOCK-1..6: nút khoá nói vì sao + cách mở) — server vẫn là cửa thật |
| **R-WEB-8** | `ErrorBoundary` ở Shell + mỗi màn: gửi `POST /api/v1/system/client-errors {errFp, route, message, stack}` ≤ 10 / phút (R-LOG-10); không gửi nội dung tin |
| **R-WEB-9** | Realtime: một `EventSource('/api/v1/stream')` ở Shell; sự kiện ⇒ `queryClient.invalidateQueries` theo khoá; không đẩy dữ liệu qua SSE |
| **R-WEB-10** | Danh sách dài (hội thoại, tin, danh bạ) dùng ảo hoá + phân trang con trỏ (`useInfiniteQuery`) |
| **R-WEB-11** | Chữ tiếng Việt nằm trong `i18n/vi.ts` theo khoá; không ghép chuỗi có dữ liệu người dùng bằng `dangerouslySetInnerHTML`; nội dung tin hiển thị dạng văn bản, link qua bộ lọc an toàn |
| **R-WEB-12** | Token giao diện từ `tokens.css` (một màu nhấn `--primary`, 3 màu trạng thái, chữ ≥ 15 px, nút ≥ 44 px); không màu cứng trong thành phần |
| **R-WEB-13** | Huy hiệu kênh (`ChannelBadge`) trên mọi tin / dòng thời gian / avatar tài khoản (R-CAKE-UI-5); danh tính chưa xác minh hiện khác (R-CAKE-UI-6) |
| **R-WEB-14** | File < 200 dòng, kebab-case cho file, PascalCase cho thành phần; mỗi file mới có dòng bản quyền + `// @bizcity-layer web` |
| **R-WEB-15** | Truy cập: điều hướng bàn phím trong hộp thư (↑/↓ hội thoại, Enter mở, `/` tìm), nhãn `aria-*` cho nút biểu tượng |

## 4. Mẫu một màn

```tsx
// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
export function ContactsScreen() {
  const [q, setQ] = useUrlState({ tab: 'contacts', tag: '', page: 1, q: '' });
  const can = useCan();
  const list = useApi(['contacts', q], () => api.contacts.list(q));
  if (!can('cake:contacts-xem')) return <DeniedState permission="cake:contacts-xem" />;
  if (list.isLoading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.refetch} />;
  if (!list.data.items.length) return <EmptyState reason="Chưa có liên hệ nào." action={<ConnectChannelButton />} />;
  return <ContactsTable data={list.data} query={q} onQuery={setQ} />;
}
```

## 5. Kiểm

- vitest + Testing Library cho thành phần ui-kit và hook.
- Playwright: mở từng màn với REST giả lập (dữ liệu bản mẫu), chụp ảnh 1800 × 1100 vào `evidence/build-shots/`, so với `docs/ui/mockup-shots/` (đếm phần tử chính như self-check PHASE-016 bản WP); chạy trong CI ở job `web-shots`.
- Kiểm tĩnh SC-CAKE-WEB-1 (module không import ngoài ui-kit) · SC-CAKE-WEB-2 (không `alert(`/`confirm(`/`prompt(`) · SC-CAKE-WEB-3 (không màu hex trong `.tsx`).
