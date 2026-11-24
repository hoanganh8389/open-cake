# Open CRM · 90 — Lộ trình và checklist

<!-- [2026-11-17 11:43 PM Johnny Chu - Chu Hoàng Anh] OPEN-CRM INIT — P0–P5, khởi tạo repo, câu hỏi cho chủ. Trạng thái: ☐ chưa · ◐ đang · ☑ xong · ⏸ chờ chủ. -->

Mỗi giai đoạn ≤ 4 bước và ship được một mình (R-LEAN-4).

## P0 — Chốt thiết kế (tài liệu, không mã)
| # | Việc | TT |
|---|---|---|
| OC-0.1 | Chủ duyệt 00–50 + mockup; trả lời Q-OC-1…6 | ⏸ |
| OC-0.2 | Công cụ census twin-crm (route, hook, nơi gọi, dữ liệu thật trên site) → sửa 40-REDUCTION | ☐ |
| OC-0.3 | Hợp đồng `crm-ledger@1` chốt cùng Zalo Brain PHASE-0.156 W2 (một DDL) | ☐ |
| OC-0.4 | Khuôn sự việc v0.1 (`contracts/events/*.schema.json`) + mã lỗi OC-* | ☐ |

## P1 — Khởi tạo repo + kernel
| # | Việc | TT |
|---|---|---|
| OC-1.1 | Repo mới (Q-OC-1), commit đầu chỉ có: header plugin, `docs/` (chuyển từ thư mục này), `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, CI (php 7.4 lint, validator) | ☐ |
| OC-1.2 | Kernel: `submit()`, sổ, dẫn xuất, outbox; test conformance 3 đẳng thức (20 §4) | ☐ |
| OC-1.3 | Platform: install theo 30 §2, migrator, REST khung, phát hiện Zalo Brain | ☐ |
| OC-1.4 | Bốn ca kích hoạt (30 §3) chạy trên site thử | ☐ |

## P2 — Hộp thư (chat)
| # | Việc | TT |
|---|---|---|
| OC-2.1 | Connector `twin-brain` (nghe hook lõi, gửi qua lõi) | ☐ |
| OC-2.2 | Module `inbox` + màn Hộp thư theo mockup; self-check trình duyệt `docs/tools/inbox-selfcheck.js` | ☐ |
| OC-2.3 | Connector `zalo-hub` (chạy một mình) — cần route Hub có tài liệu trước (R-GW: tài nguyên từ API) | ☐ |

## P3 — Gửi hàng loạt + danh bạ
| # | Việc | TT |
|---|---|---|
| OC-3.1 | Send Guard (trần, giờ, danh sách không nhận) + test | ☐ |
| OC-3.2 | Module `broadcast` + sheet 3 bước | ☐ |
| OC-3.3 | Module `contacts` + nhập nhãn cũ (`labels` → sổ) | ☐ |

## P4 — Zalo Brain + hệ sinh thái
| # | Việc | TT |
|---|---|---|
| OC-4.1 | `mcp/manifest.json` 9 tool (10 §5), `validate-zalo-brain-extension.mjs` PASS | ☐ |
| OC-4.2 | Outbox → Open Kế Toán / Open Kiot (sự việc 10 §6), tuỳ chọn | ☐ |
| OC-4.3 | Migrator từ twin-crm: nhập lượt gửi đang chờ, nhãn; site cũ chuyển plugin không mất hội thoại | ☐ |
| OC-4.4 | Đổi slug / phát hành bản 1.0; repo cũ đóng băng | ☐ |

## P5 — Add-on cho phần đã cắt (khi có người cần)
"Đội & quy trình" · marketing / lead · email — mỗi cái một plugin nhỏ dùng MCP / REST của Open CRM, không bảng trong lõi.

## Câu hỏi cho chủ

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| Q-OC-1 | Tên repo / slug: `bizcity-open-crm` (giống `bizcity-open-kiot`) hay `open-crm`? | **`bizcity-open-crm`**, thư mục plugin `bizcity-open-crm`; tới P4 thư mục `bizcity-twin-crm` vẫn chạy để site không mất trạng thái kích hoạt |
| Q-OC-2 | Repo mới sạch hay giữ lịch sử `open-crm`? | **sạch** — lịch sử cũ có 43 bảng và mã đã cắt; repo cũ giữ thẻ `final-twin-crm` |
| Q-OC-3 | Outbox bảng riêng hay cột trên `ocrm_events`? | **cột** (5 bảng); tách khi đồng bộ ba dự án cần |
| Q-OC-4 | Bỏ `teams` — đội nhỏ chỉ cần người phụ trách + `inbox_members`? | **bỏ** |
| Q-OC-5 | Giấy phép: Premium như twin-crm hay mã mở như Open Kiot? | theo Open Kiot (mã mở, thương hiệu giữ — `TRADEMARK.md`) — chủ quyết |
| Q-OC-6 | Chạy một mình có cần nhận tin Zalo không (connector `zalo-hub`), hay bắt buộc có Zalo Brain để có tin? | **có** — đúng yêu cầu "chủ động"; nhưng làm sau P2.1 vì cần route Hub mới |
