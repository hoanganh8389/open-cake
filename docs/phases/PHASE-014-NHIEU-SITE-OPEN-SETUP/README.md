# PHASE-014 — Nhiều site: một bản mã, mỗi site một database; open-setup cấp site Cake
<!-- [2026-11-24 02:40 PM Johnny Chu - Chu Hoàng Anh] ROADMAP — mở phase theo lộ trình open-cake. -->

> **Việc lộ trình:** W5 · **Áp dụng cho:** cake + open-setup + llm-router · **Trạng thái:** ☐ · **Phụ thuộc:** 002 (ngữ cảnh site), 006
> **Mục tiêu:** chép PHASE-039 của open-ketoan (B2–B7): registry `cake_control`, router theo Host, provisioner `CREATE DATABASE … TEMPLATE cake_template`, migration từng site, sao lưu từng site, `/_sites/v1`.

## Đầu ra

| # | Repo | Việc |
|---|---|---|
| S014-1 | cake | registry + router + pool theo site + JWT `sid` + `SITE_CONTEXT_MISSING` + cổng `schema_version` |
| S014-2 | cake | provisioner + vai `cake_<slug>_app` + CLI `site create`, `site migrate --all`, `site backup` |
| S014-3 | cake | `/_sites/v1` (`bizcity_site_provisioning@1` + `product: "cake"`) |
| S014-4 | cake | tiến trình nền `forEachSite` (outbox, đồng hồ, Send Guard) |
| S014-5 | open-setup | trường `product` + URL provisioning theo sản phẩm (Q-2) |
| S014-6 | llm-router | `site_domains.channel_ingress` cho Hub (Q-3) |

## Xong khi

DOD-SYS-4: open-setup tạo hai site Cake; vé site A gửi tới site B ⇒ 401; Host lạ ⇒ 404; nâng cấp với một site lỗi migration ⇒ chỉ site đó 503.
