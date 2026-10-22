# Web Settings And Data Center

## Reference

- Reference product: `https://pco.zhongchonglian.com/admin/index.html`
- Reference pages inspected after authenticated access:
  - Data center: `/dashboard`
  - Basic company settings: `/set/basic`
  - Service items: `/set/service`
  - Materials: `/set/material`
  - Quick phrases: `/set/shortcuts`
  - Qualification files: `/set/files`
  - Report seals: `/set/reportSeal`
  - Numbering settings: `/set/codeSetting`
- Reuse information architecture, interaction patterns and table/form hierarchy. Do not copy brand assets, logo files, customer data or proprietary graphics.

## Data Center

- Eight top metrics: annual work orders, today's work orders, unaccepted today, in progress today, new customers, today's receipts, contracts pending review, contracts nearing expiry.
- Company service summary: company, employees, service duration, management users and expiry date.
- Employee ranking with today/week/month switch.
- Work order trend with seven-day/month/year switch.
- Employee mobile entry panel.
- System messages list.

## System Settings

- Internal secondary navigation with eight sections: basic profile, service items, materials, quick phrases, qualification files, report seals, numbering rules and system dictionary.
- System dictionary is available only through System Settings, not as a primary sidebar item or command-palette page.
- Basic settings cover company profile, check-in rules, report email/privacy switches and report remarks. Logo, report seal and report section ordering remain available through the existing report-template editor.
- Service items support create, edit, delete, search and target associations.
- Materials use `/api/materials` CRUD with name, category, specification, unit, stock and warning threshold.
- Quick phrases use `/api/quick-phrases` CRUD with category, content and sort order.
- Qualification files support metadata, expiry date, customer visibility and uploaded file URL.
- Report seals expose logo/seal upload and current company branding.
- Numbering settings expose contract, customer and work-order number modes.
- The settings page returns from the dictionary subpage to System Settings without changing the dictionary API or edit permissions.

## Backend Strategy

- Existing normalized APIs are used where available: `/api/materials`, `/api/quick-phrases`, `/api/settings`, `/api/templates`, `/api/photos/upload`.
- Settings that do not yet have a dedicated backend table are persisted in the existing arbitrary `/api/settings` document under stable keys.
- Numbering rules are persisted and read back correctly, but this frontend change does not prove that every backend record-creation path already consumes those rules. That server-side generation check remains a separate release item.
- No secret, password or customer PII is stored in settings.
- Data-center financial or contract metrics display an explicit unavailable/zero state when the corresponding production data is absent.

## Verification

- TypeScript typecheck and production build.
- Desktop 1440px and mobile 390px layout checks.
- Settings secondary navigation; service-item and quick-phrase create/edit/delete; material CRUD; qualification upload and persisted readback; report-seal upload endpoints; numbering save and refresh readback; dictionary secondary-page return.
- Data center metric cards, chart tabs and responsive grid.
- Verified at 1440px and 390px without document-level horizontal overflow or browser console errors.
- Existing reports, field workflows and APIs must remain unchanged.
