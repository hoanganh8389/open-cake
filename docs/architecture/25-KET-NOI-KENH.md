# 25 — Kết nối kênh: hai luồng (Tự cài · BizCity Hub), một chuẩn 4 bước

<!-- [2026-11-26 04:54 PM Johnny Chu - Chu Hoàng Anh] KN-1 — tài liệu nghiệp vụ: hai cách nối Zalo / Facebook vào Open CRM; mặc định Tự cài chạy sẵn; gợi ý BizCity Hub kèm quyền lợi trợ lý. Mockup chờ duyệt: PHASE-007 mockup kết nối ①–④. -->

> **Trạng thái:** chủ duyệt 2026-11-26 (mockup kết nối ①–④, D-KN-1…4, nhãn bước ④, sửa R-CAKE-CELL-1) · chưa có mã · **Chuẩn gốc:** R-SETUP-4 của bizcity-twin-ai (`docs/rules/PHASE-0-RULE-FOUR-STEP-SETUP-AXIS.md`, mẫu ở `core/channel-gateway/docs/PHASE-0.83-FOUR-STEP-SETUP/`) · **Liên quan:** [60-UI §3](60-UI.md#3-sheet-kết-nối-kênh--4-bước-r-lean-4-connect-setup1-của-zalo-brain), [10-ARCHITECTURE](10-ARCHITECTURE.md), hợp đồng [`bizcity_touch@1`](../contracts/BIZCITY-TOUCH-v1.md), [`bizcity_channel_command@1`](../contracts/BIZCITY-CHANNEL-COMMAND-v1.md)

## 1. Một câu

Doanh nghiệp nối Zalo / Facebook vào Open CRM theo **một trong hai cách**: **Tự cài** (máy kết nối chạy ngay trên máy chủ của doanh nghiệp, miễn phí, **mặc định và chạy sẵn sau khi cài**) hoặc **BizCity Hub** (qua `zalo.bizcity.vn` bằng khoá 1API, có thêm **trợ lý AI trả lời, MCP, quản lý từ xa**). Cả hai đi cùng **một màn 4 bước** và **cùng hai hợp đồng** — Open CRM không phân biệt tin đến từ đâu.

## Mockup chờ duyệt

| Khung | Ảnh |
|---|---|
| ① Cài đặt › Kết nối kênh: hai cách (Tự cài đang dùng · BizCity Hub), máy kết nối, khoá nối, quyền lợi Hub | [mockup-kn-cai-dat-ket-noi](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-cai-dat-ket-noi.png) |
| ② 4 bước — Tự cài mặc định: ① ② Đạt sẵn, ③ quét QR, ④ khoá | [mockup-kn-bon-buoc-tu-cai](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-bon-buoc-tu-cai.png) |
| ③ Đã sẵn sàng: nhắn thử hai chiều có bằng chứng + gợi ý Hub (không chặn) | [mockup-kn-bon-buoc-xong](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-bon-buoc-xong.png) |
| ④ 4 bước — BizCity Hub: khoá 1API, Zalo Hub, ④ Agent Guru + tự trả lời + quyền lợi | [mockup-kn-bon-buoc-hub](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-bon-buoc-hub.png) |
| ⑤ Danh bạ đồng bộ từ kênh (§3b): bạn bè + nhóm, tên + ảnh, "chưa xác minh" / "đã xác minh", tìm theo SĐT, FB thiếu năng lực thì ẩn nút <!-- [2026-11-26 06:20 PM Johnny Chu - Chu Hoàng Anh] KN-4 --> | [mockup-kn-danh-ba-dong-bo](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-danh-ba-dong-bo.png) |
| ⑥ Hộp thư nhóm (§3b): tên, ảnh, thành viên + vai, tên + ảnh người gửi, trích dẫn, @nhắc, reaction, thu hồi; quản lý nhóm để đợt sau | [mockup-kn-hop-thu-nhom](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/evidence/build-shots/mockup-kn-hop-thu-nhom.png) |

Nguồn: [mockup/index.html](../phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/mockup/index.html) · chụp lại: `node docs/phases/PHASE-007-GIAO-DIEN-HOP-THU-DANH-BA-360/mockup/chup.mjs`

## 2. Hai luồng

| | **Tự cài** (mặc định) | **BizCity Hub** (`zalo.bizcity.vn`) |
|---|---|---|
| Dành cho | doanh nghiệp muốn tự chủ toàn bộ, chỉ cần CRM (hộp thư, danh bạ, đơn) | doanh nghiệp muốn thêm trợ lý AI và không muốn tự giữ máy kết nối |
| Máy kết nối | chạy cùng Open CRM (cùng `docker compose`): Zalo cá nhân qua `zca-js`, Facebook cá nhân qua `fbchat-v2`, … | Cell của BizCity (cùng các thư viện trên, BizCity vận hành) |
| Phiên đăng nhập / cookie | nằm trong máy kết nối, trên máy chủ của doanh nghiệp | nằm trong Cell, trên hạ tầng BizCity |
| Khoá | **khoá nối nội bộ** sinh khi cài (không phải dán) | **khoá 1API** `biz-…` lấy ở trang tài khoản BizCity |
| Chi phí | miễn phí | theo gói 1API |
| Trợ lý AI trả lời khách (Cell chat, Agent Guru) | — | ✓ |
| MCP: trợ lý tra / làm việc với Kế Toán · POS · CRM (chỉ tạo nháp, người duyệt — R-CAKE-CELL-2) | — | ✓ |
| Quản lý từ xa: xem / quét lại QR, theo dõi số, cảnh báo rớt phiên | trên máy chủ của mình | ✓ từ bất cứ đâu |
| Khi Zalo / Facebook đổi giao thức | doanh nghiệp tự cập nhật máy kết nối | BizCity cập nhật |
| Hợp đồng với Open CRM | `bizcity_touch@1` vào · `bizcity_channel_command@1` ra | giống hệt |

**Nguyên tắc:** Tự cài là sản phẩm hoàn chỉnh, không phải bản dùng thử bị khoá. Hub là **quyền lợi thêm**, không phải điều kiện để CRM chạy.

## 3. Đường đi kỹ thuật

```text
Tự cài:      máy kết nối ──ký HMAC (khoá nối nội bộ)──► Open CRM  POST /ingress/v1/touch
             Open CRM    ──ký HMAC, Idempotency-Key──►  máy kết nối POST /channel/v1/commands

BizCity Hub: Cell ──► Hub (khoá site, ký) ──► Open CRM POST /ingress/v1/touch          (đã có — PHASE-006)
             Open CRM ──► Hub POST /channel/v1/commands ──► Cell                         (đã có phía Cake)
```

- **Cùng thân, cùng khuôn ký** (`X-Bizcity-Signature: t=…,v1=hmac-sha256(bí mật, t.thân)`), cùng chống lặp theo `Idempotency-Key`. Phía Open CRM chỉ khác **một chỗ**: gửi lệnh tới đâu và ký bằng bí mật nào (đọc từ cấu hình kết nối của đơn vị).
- Máy kết nối Tự cài **không cần Hub** và không gọi ra ngoài trừ Zalo / Facebook.
- Đổi từ Tự cài sang Hub (hoặc ngược lại) **không mất lịch sử**: sổ chạm khách, khách, hội thoại giữ nguyên; tài khoản kênh khớp lại theo `externalAccountId` (uid Zalo / id Facebook).
- Bí mật kênh (cookie, token, khoá E2EE) **không bao giờ** vào CSDL Open CRM ở cả hai luồng (R-CAKE-CELL-1, SC-CAKE-6).

## 3a. Nối zalo-hub vào Open CRM — Zalo (zca) + Facebook cá nhân (fbchat-v2)

<!-- [2026-11-26 05:40 PM Johnny Chu - Chu Hoàng Anh] KN-2 — chủ 2026-11-26: "zalo-hub đã ready cho fbchat v2; nối vào open-cake + self host zca, fbchat là ok". -->

<!-- [2026-11-26 06:05 PM Johnny Chu - Chu Hoàng Anh] KN-3 — chủ: "tự cài chỉ cần đơn giản có zca, fbchat để kết nối zalo, fb; không cần tính năng trợ lý, agent". -->
**Cùng mã nguồn zalo-hub, hai bản đóng gói** (chốt D-KN-2): BizCity Hub chạy **Cell đầy đủ** (kênh + trợ lý / agent / MCP); Tự cài chạy **máy kết nối gọn `zalo-hub-connector`** — chỉ zca (Zalo) + fbchat-v2 (Facebook), **không có** trợ lý, agent, LLM, MCP, harness, bảng điều khiển. Phần kênh dùng chung đã có sẵn ở zalo-hub:

| Đã có ở zalo-hub `main` (2026-11-26) | Bằng chứng |
|---|---|
| Zalo cá nhân qua `zca-js`: QR, tin hai chiều, chống trùng gửi | `src/zalo/**`, `/wp/outbound` |
| Facebook cá nhân qua `fbchat-v2`: bridge `fbchat-bridge-e2ee` + `fbchat-login` (repo AGPL `bizcity-fb-bridge`) **đóng sẵn trong image** (`FB_BRIDGE_BIN=/app/bin/fbchat-bridge-e2ee`), đăng nhập mật khẩu, tin hai chiều | PHASE-017, hợp đồng `zalo-hub-bridge/1.3`, PR #8 #9 |
| Tin FB đi ra cùng đường tin Zalo, thêm `platform: facebook_personal` và cờ `e2ee` | `contracts/fixtures/fb017/inbound_forward.facebook.json` |
| Dựng `bizcity_touch@1` cho tin Zalo (chưa nối vào đường tin đến) | PR #4 PHASE-018, `src/hub-sink/bizcity-touch.ts` |
| Chế độ "cell-local" (tenant 0): chạy không cần Hub nhưng **không phát gì ra ngoài** | `src/hub-sink/hub-sink.ts` `isHubAccount` |

**Ánh xạ tin Facebook cá nhân → `bizcity_touch@1`** (thêm vào `buildBizcityTouch`, cùng hàm với Zalo):

| Trường | Zalo cá nhân | Facebook cá nhân |
|---|---|---|
| `channel` | `zalo_personal` | `facebook_personal` |
| `channelAccount.externalAccountId` | uid Zalo của nick | `fbUid` của nick |
| `docKey` | `zalo_personal\|uid\|thread\|msgId` | `facebook_personal\|fbUid\|thread\|mid.$…` |
| `sender.scope` | `global` | `global` (luật của Cake: FB cá nhân chỉ `global`) |
| `encryption` | `{e2ee:false, decryptedOnCell:false}` | `{e2ee: <cờ e2ee>, decryptedOnCell: <cờ e2ee>}` — tin mã hoá đầu-cuối được giải ở Cell, khoá không rời Cell |
| Lệnh ra (`message.send`) | lõi `/wp/outbound` | lõi `/wp/outbound` với `platform=facebook_personal` (đã có ở 1.3) |

**Hai bản đóng gói:**

| | BizCity Hub — Cell đầy đủ | Tự cài — `zalo-hub-connector` |
|---|---|---|
| Chạy ở | `zalo.bizcity.vn` (BizCity vận hành) | cùng `docker compose` của Open CRM: dịch vụ `cake-connector`, volume giữ phiên |
| Gồm | kênh + trợ lý AI, agent, MCP, harness, bảng điều khiển | **chỉ kênh**: zca-js, bridge fbchat-v2, hợp đồng touch / command, API đăng nhập (QR Zalo, mật khẩu FB), hàng gửi + chống trùng |
| Không có | — | LLM, trợ lý, agent, MCP, harness, bảng điều khiển, Hub sink — không có trong image, không phải "tắt đi" |
| Tin vào | Cell ⇒ Hub `/zalo-hub/touch` ⇒ Cake | máy kết nối ⇒ **thẳng** Cake `/ingress/v1/touch`, tự ký bằng khoá nối nội bộ |
| Lệnh ra | Cake ⇒ Hub ⇒ Cell `/channel/v1/commands` | Cake ⇒ **thẳng** máy kết nối `/channel/v1/commands`, ký bằng khoá nối nội bộ |
| Đăng nhập ở bước ③ | Cake hỏi qua Hub | Cake gọi thẳng API của máy kết nối (tạo số, QR, trạng thái, đăng nhập FB) |
| Facebook cá nhân | theo gói | bật / tắt ở Cài đặt › Kết nối kênh (mặc định tắt) |
| Cấu hình | tenant theo khoá 1API | 2 biến: `CAKE_URL`, `CAKE_CONNECTOR_SECRET` (open-setup sinh sẵn) |

**Giấy phép:** bridge Facebook là AGPL và chạy như tiến trình riêng trong image; bản Tự cài ghi rõ nguồn (repo `bizcity-fb-bridge`) ở Cài đặt › Kết nối kênh và trong `NOTICE`. Không gộp mã bridge vào Open CRM.

**Việc theo repo, theo thứ tự:**

| # | Repo | Việc | Cần cho |
|---|---|---|---|
| K1 | zalo-hub (PHASE-018) | nối `buildBizcityTouch` vào đường tin đến sau cờ `targets` (S018-5/6) | Hub, Zalo |
| K2 | zalo-hub (PHASE-018) | `buildBizcityTouch` nhận tin FB (bảng trên); `/channel/v1/commands` nhận `channel=facebook_personal` | Hub + Tự cài, FB |
| K2b | open-cake + zalo-hub | hợp đồng 0.2 + năng lực §3b: tên / ảnh, danh bạ (`directory.sync`, `contact.find`), nhóm (`thread.updated`), trích dẫn, @nhắc, thu hồi, reaction | cả hai |
| K3 | bizcity-llm-router (PHASE-0.3) | `/zalo-hub/touch` + `/channel/v1/commands` (H1…H5) | Hub |
| K4 | zalo-hub | **bản gọn `zalo-hub-connector`**: điểm vào riêng (`src/connector/main.ts`) chỉ nạp phần kênh (zca, fbchat-v2, hàng gửi, chống trùng) + Dockerfile target `connector`; không kéo mã trợ lý / agent / LLM / MCP. Hành vi: `CAKE_URL` + `CAKE_CONNECTOR_SECRET` ⇒ phát touch thẳng Cake (ký HMAC) cho tài khoản cell-local; `/channel/v1/commands` + API tài khoản nhận chữ ký khoá nối thay cho cell secret của Hub | Tự cài |
| K5 | open-cake | cấu hình kết nối theo đơn vị (`mode`, đích lệnh, bí mật — mã hoá); cổng nhận chấp nhận chữ ký của máy kết nối; `cake.channel.connect_start` / trạng thái 4 bước gọi Cell (Tự cài) hoặc Hub | cả hai |
| K6 | open-cake | `docker-compose.yml` thêm `cake-connector` (image `zalo-hub-connector`, cổng nội bộ, volume phiên), open-setup sinh khoá nối nội bộ cho cả hai phía ⇒ ① ② Đạt sẵn | Tự cài |
| K7 | open-cake (PHASE-007 S007-6) | màn Cài đặt › Kết nối kênh + 4 bước theo mockup kết nối ①–④ | cả hai |

Đề xuất làm **K1 → K2 → K2b → K4 → K5 → K6 → K7** (K3 song song ở router): chạy thật được Zalo + FB qua Hub trước, rồi đóng gói bản gọn cho Tự cài từ cùng mã kênh.

## 3b. Năng lực máy kết nối: gọn nhưng đủ năng lực kênh

<!-- [2026-11-26 06:01 PM Johnny Chu - Chu Hoàng Anh] KN-4 — chủ 2026-11-26: "cake-connector lean để kết nối và đảm bảo danh bạ, nhóm, tên, ảnh, các năng lực tại Zalo, FB full là ok. Còn lại đồng ý." -->

**"Gọn"** = không trợ lý / agent / LLM / MCP. **"Đủ"** = mọi năng lực Zalo cá nhân và Facebook cá nhân mà CRM cần — giống hệt Cell đầy đủ, vì cùng mã kênh. Bảng dưới là phạm vi bắt buộc của `zalo-hub-connector` (và của Cell khi đi qua Hub).

| Năng lực | Zalo (zca — hàm Cell đang dùng) | Facebook (fbchat-v2) | Hợp đồng chở | Open CRM dùng ở |
|---|---|---|---|---|
| Tin chữ · ảnh · tệp · thoại · nhãn dán · video, hai chiều | `sendMessage`, `sendSticker`, sự kiện tin đến | tin 1-1 và nhóm (1.3) | touch `message.*` + `attachments` · command `message.send` ✓ có | Hộp thư |
| **Tên + ảnh đại diện người nhắn** | `getUserInfo`, thông tin người gửi trong tin | `threadName` / hồ sơ (PR #9) | touch `sender.displayName` + `sender.avatarRef` ✓ có — **máy kết nối phải điền `avatarRef`** (hiện builder để `null`) | Hộp thư, Danh bạ, Contact 360 |
| **Danh bạ** (bạn bè của nick) | `getAllFriends`, `findUser` (SĐT ⇒ uid) | danh sách bạn (cần kiểm bridge) | **thêm** command `directory.sync` ⇒ trả về từng touch `profile.updated` `backfill: true` · **thêm** command `contact.find` (SĐT ⇒ uid, bằng chứng `phone`) | Danh bạ (khách `asserted`; SĐT tìm được ⇒ danh tính `proven`) |
| **Nhóm**: tên, ảnh, thành viên, phó nhóm | `getAllGroups`, `getGroupInfo`, `getGroupMembersInfo`, `getPendingGroupMembers` | nhóm chat FB (cần kiểm bridge) | **thêm** touch `thread.updated` `{name, avatarRef, memberCount, members[]?}` (khi đổi + khi `directory.sync`) | Hộp thư nhóm, Danh bạ › Nhóm |
| Hồ sơ đổi (đổi tên / ảnh) | sự kiện của zca | sự kiện của bridge | **thêm** touch `profile.updated` | Danh bạ, Contact 360 (không ghi đè tên nhân viên đã sửa tay) |
| Trích dẫn · @nhắc | `quote`, `mentions` trong tin | trả lời tin (cần kiểm) | **thêm** `content.quote`, `content.mentions[]` vào touch và command | Hộp thư |
| Thu hồi tin | `undo` | gỡ tin (cần kiểm) | **thêm** command `message.revoke`; touch version+1 `content.type = revoked` | Hộp thư |
| Reaction | `addReaction`, sự kiện reaction | reaction (cần kiểm) | touch `reaction.added` ✓ có · **thêm** command `reaction.add` | Hộp thư |
| Đã xem · đang gõ | sự kiện đã xem, `sendTypingEvent` | đã đọc (cần kiểm) | command `thread.mark_read` ✓ có; `delivery.updated` `read` ✓ có; đang gõ: bỏ qua | Hộp thư (Đã xem) |
| Lịch sử cũ | `getGroupChatHistory`, `getContext` | lịch sử (cần kiểm) | command `history.sync` ✓ có ⇒ touch `backfill: true` | Hộp thư, Contact 360 |
| Quản lý nhóm (thêm / bớt thành viên, đổi tên, đổi ảnh, phó nhóm, chặn, chuyển trưởng nhóm, tạo nhóm) | `addUserToGroup`, `removeUserFromGroup`, `changeGroupName`, `changeGroupAvatar`, `add/removeGroupDeputy`, `add/removeGroupBlockedMember`, `changeGroupOwner`, `createGroup` | — | **thêm** command `group.*` (đợt sau) | Danh bạ › Nhóm |
| Kết bạn | `sendFriendRequest` | — | **thêm** command `friend.request` (đợt sau) | Contact 360 |
| Bình chọn · ghi chú nhóm | `createPoll`, `createNote` | — | để sau | — |
| Tin mã hoá đầu-cuối | — | `fbchat-bridge-e2ee` | touch `encryption` ✓ có (giải ở máy kết nối) | Hộp thư |

**Luật năng lực:**

| Mã | Luật |
|---|---|
| KN-CAP-1 | Máy kết nối gọn và Cell đầy đủ **chung một mã kênh**; năng lực kênh mới thêm một lần, có ở cả hai bản |
| KN-CAP-2 | Máy kết nối báo `capabilities` của từng tài khoản (`account.status`); Open CRM chỉ hiện nút cho năng lực có trong danh sách — FB thiếu gì thì nút đó không hiện, không lỗi |
| KN-CAP-3 | Ảnh (đại diện, nhóm, tệp) đi bằng `avatarRef` / `ref` là URL có hạn của máy kết nối; Open CRM tải về kho tệp của mình khi cần giữ lâu, không giữ cookie để tải |
| KN-CAP-4 | Danh bạ từ kênh vào Open CRM là danh tính `asserted`; chỉ SĐT tìm được bằng `contact.find` / khách tự gửi mới thành `proven` (R-CAKE-ID-2 — không ghép theo tên) |
| KN-CAP-5 | `directory.sync` chạy khi đăng nhập xong (bước ③) và theo yêu cầu; kết quả là touch `backfill: true` ⇒ không bắn tự động, không thông báo |

**Hợp đồng cần nâng** (đợt K2b, trước K4): `bizcity_touch@1` 0.2 — loại `profile.updated`, `thread.updated`; `content.quote`, `content.mentions`, `content.type = revoked`. `bizcity_channel_command@1` 0.2 — `directory.sync`, `contact.find`, `message.revoke`, `reaction.add`; `group.*`, `friend.request` để đợt sau. Thêm trường vẫn giữ `@1` (chỉ thêm, không đổi nghĩa).

## 4. Mặc định: Tự cài chạy sẵn

Khi cài Open CRM (open-setup hoặc `docker compose up`):

1. Máy kết nối gọn (`cake-connector` — image `zalo-hub-connector`, chỉ zca + fbchat-v2, §3a) được dựng cùng, **khoá nối nội bộ sinh tự động** và ghi vào cả hai phía.
2. Ngay lần mở đầu, màn 4 bước đã **Đạt ① ②** (kiểm thật bằng máy chủ, không giả định — R-S4-2). Người dùng chỉ còn **③ quét QR** và **④ chọn người trực**.
3. Facebook cá nhân (`fbchat-v2`) và các máy kết nối khác **tắt sẵn**; bật ở Cài đặt › Kết nối kênh.

## 5. Bốn bước — cùng nhãn, cùng thứ tự với chuẩn (R-S4-1, R-S4-5)

| Bước | Tự cài | BizCity Hub |
|---|---|---|
| **① Kết nối tài khoản** | khoá nối nội bộ — **Đạt sẵn**, chỉ hiện trạng thái; quản trị đổi khoá được | dán **Khoá 1API** `biz-…` ⇒ **Lưu & kiểm tra** ngay |
| **② Kết nối máy chủ Zalo** | máy kết nối trên máy chủ của bạn — **Đạt sẵn** khi đang chạy; "Dùng dịch vụ khác…" để chọn BizCity Hub | Zalo Hub của BizCity — tự kiểm |
| **③ Đăng nhập số Zalo** | số điện thoại ⇒ QR ⇒ quét bằng Zalo trên điện thoại; xong thì chọn **người phụ trách**. Facebook cá nhân: email / mật khẩu (+ mã xác minh nếu Facebook hỏi) thay cho QR | giống hệt |
| **④ Người trực & trợ lý** | chọn **nhân viên trực** hộp thư; dòng gợi ý "**Thêm trợ lý AI trả lời 24/7** — dùng BizCity Hub" | chọn **Agent Guru** (mặc định có sẵn), bật **tự trả lời** |
| **Thắng nhỏ** (R-S4-18) | **Nhắn thử**: gửi 1 tin + nhận lại 1 tin ⇒ "Đã kết nối · Đã thử hai chiều" chỉ khi có bằng chứng hai chiều | giống hệt + "trợ lý đã trả lời thử" |

**Trạng thái mỗi bước** (R-S4-2): Khoá · Đang kiểm tra · Đạt · Chưa đạt · Không có quyền. "Chưa đạt" luôn có câu **Cách sửa** bắt đầu bằng động từ. **Cổng** (R-S4-3): QR chỉ hiện khi ① ② Đạt; ④ mở sau khi đăng nhập QR thành công.

**Phân quyền** (R-S4-19…22): ① ② là cấu hình đơn vị — chỉ người có `settings:write` sửa; nhân viên thấy trạng thái chỉ-đọc. ③ ④ là kết nối của chính nhân viên (thêm số của mình, người phụ trách mặc định là người đang đăng nhập).

## 6. Màn Cài đặt › Kết nối kênh

Một màn, ba khối:

1. **Cách kết nối đang dùng** — hai thẻ chọn: *Tự cài (đang dùng)* · *BizCity Hub*. Đổi cách là một sheet có xác nhận (R-CAKE-UI-3), nói rõ "lịch sử giữ nguyên, các số phải quét QR lại".
2. **Máy kết nối** (Tự cài) — mỗi loại một dòng: Zalo cá nhân (`zca-js`) · Facebook cá nhân (`fbchat-v2`) · …: trạng thái thật (đang chạy / tắt / lỗi + giờ kiểm cuối), nút Bật / Tắt / Kiểm tra; khoá nối (che, **Đổi khoá**). Với Hub: Khoá 1API (che, **Đổi khoá**, **Kiểm tra**).
3. **Quyền lợi BizCity Hub** — thẻ gợi ý (xem §7).

## 7. Gợi ý BizCity Hub (không làm phiền)

| Mã | Luật |
|---|---|
| KN-UP-1 | Gợi ý chỉ ở 3 chỗ: dòng phụ trong bước ④, màn "đã sẵn sàng" sau thắng nhỏ, khối cuối Cài đặt › Kết nối kênh. Không bật cửa sổ, không chặn thao tác |
| KN-UP-2 | Nói **quyền lợi cụ thể**: trợ lý AI trả lời 24/7 (theo Agent Guru của bạn) · MCP — trợ lý tra đơn / tồn / công nợ và soạn nháp cho nhân viên duyệt · quản lý số từ xa + cảnh báo rớt phiên · BizCity tự cập nhật khi Zalo đổi |
| KN-UP-3 | "**Để sau**" ẩn gợi ý ở chỗ đó 30 ngày (theo người dùng) |
| KN-UP-4 | Không số giả, không "miễn phí" nếu gói không miễn phí; giá / gói lấy từ trang BizCity |
| KN-UP-5 | Tự cài không bị khoá tính năng CRM nào để "ép" sang Hub |

## 8. Ảnh hưởng tới luật, hợp đồng, mã (làm sau khi duyệt)

| # | Việc | Ở đâu |
|---|---|---|
| A1 | Sửa **R-CAKE-CELL-1**: "chỉ nhận `bizcity_touch@1` đã ký, chỉ gửi `bizcity_channel_command@1` **qua Hub hoặc máy kết nối tự cài của đơn vị** (cùng hợp đồng, cùng khuôn ký)" | `docs/00-CANON.md` |
| A2 | Hợp đồng touch §1 / command §1: thêm đường "Tự cài" (máy kết nối ký thay Hub) | `docs/contracts/` |
| A3 | Cấu hình kết nối theo đơn vị: `mode = self | hub`, URL đích lệnh, bí mật ký (mã hoá như khoá cửa hàng) — thay biến môi trường `CAKE_HUB_*` | `apps/api` + migration |
| A4 | Máy kết nối Tự cài: dùng lại Cell zalo-hub ở **chế độ độc lập** (gửi thẳng Open CRM, tự ký) — một mã cho cả hai luồng; chi tiết K1…K7 ở §3a | repo `zalo-hub` (PHASE-018 mở rộng) |
| A5 | `cake.channel.connect_start` / trạng thái 4 bước đọc từ máy chủ | `packages/contracts`, `apps/api` |
| A6 | Màn Cài đặt › Kết nối kênh + sheet 4 bước | `apps/web` (PHASE-007 S007-6) |

## 9. Quyết định (chủ chốt 2026-11-26)

| Mã | Câu hỏi | Chốt |
|---|---|---|
| D-KN-1 | Một đơn vị dùng **một** cách cho mọi số, hay mỗi số một cách? | ✅ một cách cho cả đơn vị; đổi được ở Cài đặt |
| D-KN-2 | Máy kết nối Tự cài là gì? | ✅ **chốt 2026-11-26:** cùng mã nguồn zalo-hub; Tự cài là bản gọn `zalo-hub-connector` chỉ có zca + fbchat-v2, **không** trợ lý / agent (§3a, K4) — không viết bộ kênh thứ hai |
| D-KN-3 | Danh sách máy kết nối Tự cài bản đầu | ✅ **chốt 2026-11-26:** Zalo cá nhân (`zca-js`) bật sẵn; Facebook cá nhân (`fbchat-v2`) có sẵn trong image, tắt sẵn; loại khác để sau |
| D-KN-4 | Ở Tự cài, bước ④ có cho chọn trợ lý không? | ✅ không — chỉ chọn người trực + dòng gợi ý Hub (KN-UP-1) |
| D-KN-5 | Nhãn bước ④ | ✅ "**Người trực & trợ lý**" cho cả hai luồng (chuẩn gốc R-S4-1 ghi "Chọn Agent Guru"; Open CRM Tự cài không có trợ lý) |
| D-KN-6 | Sửa R-CAKE-CELL-1 | ✅ đã sửa ở `00-CANON.md`: lệnh ra đi **qua Hub hoặc máy kết nối Tự cài của đơn vị**, cùng hợp đồng, cùng khuôn ký |
| D-KN-7 | Máy kết nối gọn có đủ năng lực kênh? | ✅ đủ — danh bạ, nhóm, tên, ảnh và mọi năng lực Zalo / FB ở §3b; chỉ bỏ trợ lý / agent |

## Changelog

- 2026-11-26: bản đầu (KN-1), kèm mockup kết nối ①–④ ở PHASE-007.
- 2026-11-26: KN-2 — §3a nối zalo-hub (zca + fbchat-v2) vào Open CRM: một image hai cách chạy, ánh xạ tin FB, việc K1…K7; chốt D-KN-2, D-KN-3.
- 2026-11-26: KN-3 — Tự cài là bản gọn `zalo-hub-connector` (chỉ zca + fbchat-v2), không có trợ lý / agent / MCP trong image.
- 2026-11-26: KN-4 — §3b năng lực đủ của máy kết nối (danh bạ, nhóm, tên, ảnh, trích dẫn, thu hồi, reaction…) + hợp đồng 0.2 cần nâng; chủ chốt D-KN-1, -4, -5, -6, -7; sửa R-CAKE-CELL-1.
