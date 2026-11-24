// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: điểm vào web. Chọn adapter: giả lập (mặc định ở phase này, ?mock=empty|error|denied|slow)
//   hoặc http (?api=http, dùng ở PHASE-007). Màn không biết adapter nào đang chạy.
// [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-6: thêm màn catalog (Hàng hoá · Bảng giá); ?catalog=ketoan giả lập đơn vị đã nối Kế Toán.
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionProvider, createHttpClient, createMixClient, createMockClient, linkCatalogToKetoan, type ActionClient, type MockScenario } from '@open-cake/action-client';
import { State } from '@open-cake/ui-kit';
import '@open-cake/ui-kit/tokens.css';
import '@open-cake/ui-kit/chat.css';
import { Shell } from './app/Shell.js';
import { ensureSession, getToken } from './app/session.js';
import { useRoute } from './app/route.js';
import { Catalog } from './screens/catalog/index.js';
import { Channels } from './screens/Channels.js';
import { Contact360 } from './screens/Contact360.js';
import { Contacts } from './screens/Contacts.js';
import { Dashboard } from './screens/Dashboard.js';
import { Inbox } from './screens/Inbox.js';
import { NotYet, States } from './screens/Other.js';
import { RecordTypeScreen } from './screens/RecordTypeScreen.js';
import { Settings } from './screens/Settings.js';

const params = new URLSearchParams(location.search);
const scenario = (params.get('mock') ?? 'normal') as MockScenario;
const api = params.get('api'); // không có = giả lập · http = máy chủ cho mọi màn · mix = action máy chủ đã có đi http, còn lại giả lập
const mock = api === 'http' ? null : createMockClient({ scenario, latencyMs: 150 });
if (mock && params.get('catalog') === 'ketoan') linkCatalogToKetoan(mock.store.catalog); // ?catalog=ketoan: xem màn khi danh mục do Kế Toán giữ
// [2026-11-24 07:55 PM Johnny Chu - Chu Hoàng Anh] PHASE-016 — ?api=mix: Hàng hoá chạy máy chủ thật, màn khác vẫn giả lập tới phase của nó.
// [2026-11-24 08:34 PM Johnny Chu - Chu Hoàng Anh] PHASE-007 — mix hỏi máy chủ danh sách action đã có (không còn viết cứng năng lực).
// [2026-11-24 09:07 PM Johnny Chu - Chu Hoàng Anh] PHASE-004 — nói chuyện với máy chủ ⇒ cần phiên (SSO WordPress hoặc đăng nhập dev); giả lập thì không.
const http = () => createHttpClient({ getToken });
const session = mock && api !== 'mix' ? Promise.resolve({ ok: true as const }) : ensureSession();
const clientReady: Promise<ActionClient> = !mock ? Promise.resolve(http()) : api === 'mix' ? createMixClient(mock, http()) : Promise.resolve(mock);

function App() {
  const { path, query } = useRoute();
  const [screen = 'inbox', id] = path;
  let view: ReactNode;
  if (screen === 'inbox') view = <Inbox />;
  else if (screen === 'contacts' && id) view = <Contact360 key={id} contactId={id} />;
  else if (screen === 'contacts') view = <Contacts />;
  else if (screen === 'channels') view = <Channels />;
  else if (screen === 'catalog') view = <Catalog />;
  else if (screen === 'dashboard') view = <Dashboard />;
  else if (screen === 'states') view = <States />;
  else if (screen === 'settings') view = <Settings />;
  else if (screen === 'records' && id) view = <RecordTypeScreen key={id} typeKey={id} />;
  else view = <NotYet id={screen === 'soon' ? query.get('what') ?? '' : screen} />;
  return <Shell screen={screen} account={query.get('account')}>{view}</Shell>;
}

/** Không có phiên ⇒ một màn báo (thành phần State sẵn có), có nút sang trang đăng nhập WordPress nếu máy chủ khai. */
function NeedLogin({ loginUrl }: { loginUrl: string | null }) {
  return (
    <div className="page" style={{ maxWidth: 560, margin: '10vh auto' }}>
      <State kind="denied" title="Cần đăng nhập" desc="Mở Open CRM từ trang quản trị bizcity (WordPress) để đăng nhập một lần."
        action={loginUrl ? <a className="btn pri" href={loginUrl}>Đăng nhập qua WordPress</a> : undefined} />
    </div>
  );
}

void Promise.all([session, clientReady]).then(([s, client]) => createRoot(document.getElementById('root')!).render(
  <StrictMode>{s.ok ? <ActionProvider client={client}><App /></ActionProvider> : <NeedLogin loginUrl={s.loginUrl} />}</StrictMode>,
));
