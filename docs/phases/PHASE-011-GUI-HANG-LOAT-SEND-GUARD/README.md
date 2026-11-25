# PHASE-011 — Gửi hàng loạt và Send Guard (module `broadcast`)
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W6 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 006, 007
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** màn Chiến dịch như [ảnh duyệt](../../ui/mockup-shots/campaigns.png): danh sách · chi tiết · tạo 3 bước; Send Guard ở kernel, không ai vượt được.

## Đầu ra

| # | Việc |
|---|---|
| S011-1 | module `modules/broadcast` (`mod_broadcast`: `broadcasts`, `broadcast_targets`); mỗi người nhận một touch `broadcast_target` |
| S011-2 | Send Guard trong care-kernel: trần theo tài khoản kênh / giờ, giờ gửi, danh sách không nhận, cửa sổ Page; đếm từ sổ; `/api/v1/m/broadcast/quota` |
| S011-3 | duyệt chiến dịch (`cake:broadcast-duyet`, R2) |
| S011-4 | trần qua `bizcity_settings@1` (`bizcity.cake.send_cap_per_hour`…) |

## Xong khi

Không đường nào (API, MCP, module) gửi vượt trần — có test; dừng / tiếp / huỷ giữa chừng không gửi trùng.
