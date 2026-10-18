# Project Memory

## Context

- Owner: Eric, enterprise process architect and PCO project lead.
- The source artifacts are two print outputs from a Feishu Base called `申汰PCO管理系统`.
- The live Base is publicly readable as a guest but write actions require login.
- The two source PDFs are:
  - `深圳.趣坊勘测报告10.11.pdf`: 现场勘测报告, report `KC-2026-BG-128`, status `待整改`, risk `高风险`.
  - `23.pdf`: 结构(鼠患)封堵服务单, report `STFD-2026-116`, acceptance `已采纳`.

## Reverse-Engineering Facts

- Base token: `V8T7bfxUxayawmsL8bicZVeAnZg`.
- Main tables:
  - `客户项目管理表`: `tblUjERiARgOMvmR`, 186 records, customer project/contract fields.
  - `防治方案库`: `tblXugk7TfwBFvVr`, 7 records.
  - `工程师员工表`: `tblvh7gqJMWogSjG`, 14 records.
  - `服务单`: `tblrQWuEdjVrarLU`, 195 records.
  - `鼠洞封堵报告`: `tblT6csxWufRBW2e`, linked from the customer table but not guest-readable.
- The Base also contains business groups `封堵部分` and `收支对帐`, plus more than 50 blocks/tables.
- Service-order field-option explosion:
  - `服务内容与简介`: 208 options.
  - `建议解决方案`: 130 options.
  - `风险点描述`: 111 options.
  - `处理方法`: 66 options.
- Data-quality gaps:
  - 0/186 customer records have contract attachments.
  - Only 54/186 customers link to service orders.
  - Only 56/186 customers link to sealing reports.
  - 89/195 service orders are high or extreme risk.
  - Several service orders are missing signatures, photos, materials, or treatment methods.
- REA browser scenario evidence: `ev_cdaf6d72427474475f884d9cfe1823dadce674535879237fdf783e2b2e712fbc`.
- REA `open_binary` rejects PDF with `unsupported_target`; use PDF parsing for document artifacts and browser/runtime evidence for the Base.

## Design Decisions

- Position the product as a chain-supermarket PCO field-service and structural-sealing system, not a generic inspection app.
- Make `Finding` (隐患点) the core object. A finding owns location, pest evidence, severity, photos, treatment, sealing, acceptance, and recheck.
- Replace multi-select pseudo-text with master data, reusable templates, and free-text notes.
- Generate A4 reports from versioned snapshots; keep PDF, signature, and photo hashes.
- Prioritize a responsive web/PWA field experience and a desktop operations console.
- Keep finance/reconciliation in phase 2; the MVP must close the survey-to-sealing-to-recheck loop first.

## Pitfalls

- Feishu Bitable renders grid content on canvas; DOM and accessibility snapshots do not expose cell values.
- Direct API requests without the guest browser session return `Login Required`; use the loaded browser context for read-only discovery.
- The sealing table is not publicly readable, so its schema must be reconstructed from the PDF until a logged-in export is supplied.
- Do not copy customer phone numbers, contact names, or addresses into fixtures or screenshots.

## Implementation Status

- Design documents are complete:
  - `PRD.md`
  - `Tech-Spec.md`
  - `docs/01-reverse-engineering.md`
  - `docs/02-data-model.md`
  - `docs/03-api-contract.md`
  - `docs/04-ui-spec.md`
  - `docs/05-feishu-field-map.csv`
- Interactive prototype is in `app/` with Vite + React + TypeScript.
- Prototype covers dashboard, inspections, sealing, service orders, customers/sites, report center, and mobile field mode.
- Inspection basic info includes the store contact phone; inspection photos are now `structure_risk` only, with batch upload and a hard 100-photo cap.
- Sealing before/after photos remain only in the sealing order, not in the inspection.
- Desktop photo grids use five columns with automatic row wrapping; the mobile layout keeps two columns for readability.
- Report headers center the logo and company name as one group, while the report number and page count remain top-right.
- Handwritten signatures are captured on a canvas: inspection uses `surveyor` + `customer`, sealing uses `responsible` + `customer`; signatures persist in localStorage for the prototype and render into the A4 reports.
- A4 report previews: survey 2 pages, sealing 4 pages.
- Verified with `pnpm typecheck`, `pnpm build`, Playwright interaction assertions, desktop/mobile overflow checks, and printed PDF inspection.
- Local dev server: `http://127.0.0.1:5173/`.

## Remaining Gaps

- No production backend, database, authentication, or file storage yet; the prototype uses local sample data.
- Offline sync in the prototype is a visual simulation; production needs IndexedDB, idempotent sync, and conflict handling.
- The sealing table schema is inferred from the PDF; a logged-in Feishu export is still needed for a complete migration.
- Customer contract attachment coverage is 0/186; backfill tasks are required.
- Real customer data must not be used in UI fixtures without a privacy review.

## Repository

- Local Git repository initialized on branch `main`.
- Initial project commit: `a7bd71d`.
- Remote `origin`: `https://github.com/sunshaobing/urbanely.git`; upstream initial commit `a23942c`.
- Local commit author: `Eric <urbanely@163.com>`.
- `tmp/`, `node_modules/`, `dist/`, logs, and local env files are ignored.
- `AGENTS.md` now requires one Git commit per completed change and relevant tests/validation before delivery.
- Integrated UI pass: grouped sidebar, workspace context, command palette, dashboard flow map, shared page headers, workflow rails, and responsive table handling.
- Personnel and access-control module added: staff, seven roles, module/action matrix, sensitive permissions, and audit records.

