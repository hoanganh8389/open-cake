# PHASE-012 — Báo cáo (đọc sổ) và Công việc nội bộ
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W6 · **Áp dụng cho:** cake · **Trạng thái:** ☐ · **Phụ thuộc:** 005, 007
> **Trạng thái từng việc:** [CHECKLIST.md](CHECKLIST.md) (nguồn của bảng việc).
> **Mục tiêu:** [Báo cáo](../../ui/mockup-shots/reports.png) và [Công việc](../../ui/mockup-shots/tasks.png) như ảnh duyệt; số chỉ đếm từ `touch_ledger` + dẫn xuất.

## Đầu ra

| # | Việc |
|---|---|
| S012-1 | module `reports`: 8 KPI, gửi / nhận theo ngày, theo kênh, theo nhãn, thời gian phản hồi — chỉ đọc sổ |
| S012-2 | KPI chưa có nguồn hiện "—" + lý do (R-NO-FAKE) |
| S012-3 | module `tasks`: Kanban 5 cột, lịch, ghi chú, theo người, nguồn `manual · cell · automation`; việc gắn `contact_id` |

## Xong khi

Mọi số trên Báo cáo truy về một truy vấn sổ (test so số); việc tạo từ Twin Brain hiện nhãn "từ trợ lý".
