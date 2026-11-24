// Copyright (c) 2026 Johnny Chu (Chu Hoàng Anh) / BizCity. GPL-2.0-or-later. See LICENSE.
// @bizcity-layer web
// [2026-11-24 04:00 PM Johnny Chu - Chu Hoàng Anh] PHASE-003 — S003-3: điểm vào web. Chọn adapter: giả lập (mặc định ở phase này, ?mock=empty|error|denied|slow)
//   hoặc http (?api=http, dùng ở PHASE-007). Màn không biết adapter nào đang chạy.
// [2026-11-24 05:03 PM Johnny Chu - Chu Hoàng Anh] PHASE-017 — S017-6: thêm màn catalog (Hàng hoá · Bảng giá); ?catalog=ketoan giả lập đơn vị đã nối Kế Toán.
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionProvider, createHttpClient, createMockClient, linkCatalogToKetoan, type MockScenario } from '@open-cake/action-client';
import '@open-cake/ui-kit/tokens.css';
import '@open-cake/ui-kit/chat.css';
import { Shell } from './app/Shell.js';
import { useRoute } from './app/route.js';
import { Catalog } from './screens/Catalog.js';
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
const mock = params.get('api') === 'http' ? null : createMockClient({ scenario, latencyMs: 150 });
if (mock && params.get('catalog') === 'ketoan') linkCatalogToKetoan(mock.store.catalog); // ?catalog=ketoan: xem màn khi danh mục do Kế Toán giữ
const client = mock ?? createHttpClient();

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

createRoot(document.getElementById('root')!).render(
  <StrictMode><ActionProvider client={client}><App /></ActionProvider></StrictMode>,
);
