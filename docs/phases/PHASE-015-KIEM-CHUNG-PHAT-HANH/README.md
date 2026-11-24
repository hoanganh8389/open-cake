# PHASE-015 — Kiểm chứng golden case, phát hành, kế hoạch đóng băng bản WP
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W6 · **Áp dụng cho:** cả hai · **Trạng thái:** ☐ · **Phụ thuộc:** 008–014
> **Mục tiêu:** đổi nhãn CRM trên bizcity.vn từ "Sắp ra mắt" sang "Đang chạy" **có bằng chứng** (R-CANON-10).

## Đầu ra

| # | Việc |
|---|---|
| S015-1 | golden Facebook G1–G8 + Zalo cá nhân trên site do open-setup cấp; `evidence/golden-<ngày>.md` |
| S015-2 | DOD-SYS-1..7 từng dòng có bằng chứng |
| S015-3 | thử tải: 50 site, 200 tin / phút / site, p95 ingress < 300 ms, không mất / trùng |
| S015-4 | phát hành 0.1.0 (tag ký, SBOM, CHANGELOG ba phần) |
| S015-5 | kế hoạch chuyển dữ liệu WP → cake (`crm-ledger@1` → `bizcity_touch@1` backfill, chạy song song, dừng ở identity chưa giải — bài học #17) và mốc đóng băng tính năng bản WP |
| S015-6 | `70-REFLECT`: bài học mới thành luật (R-REV-10) |

## Xong khi

Chủ ký DOD-SYS; `open-hub` đổi nhãn kèm liên kết evidence.
