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
- Use uni-app + Vue 3 + TypeScript as the primary field client and compile it to a native WeChat Mini Program. Keep the responsive Web app as the operations console; `miniprogram/` is only a reference implementation.
- Make `Finding` (隐患点) the core object. A finding owns location, pest evidence, severity, photos, treatment, sealing, acceptance, and recheck.
- Replace multi-select pseudo-text with master data, reusable templates, and free-text notes.
- Generate A4 reports from versioned snapshots; keep PDF, signature, and photo hashes.
- Prioritize a production-connected uni-app WeChat field experience and a responsive desktop operations console.
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
- Prototype covers dashboard, inspections, sealing, service orders, customers/sites and report center; field capture lives in the WeChat Mini Program.
- Inspection basic info includes the store contact phone; inspection photos are now `structure_risk` only, with batch upload and a hard 100-photo cap.
- Sealing before/after photos remain only in the sealing order, not in the inspection.
- Desktop photo grids use five columns with automatic row wrapping; the mobile layout keeps two columns for readability.
- Report headers center the logo and company name as one group, while the report number and page count remain top-right.
- Handwritten signatures are captured on a canvas: inspection uses `surveyor` + `customer`, sealing uses `responsible` + `customer`; signatures persist in localStorage for the prototype and render into the A4 reports.
- A4 report previews: survey 2 pages, sealing 4 pages.
- Verified with `pnpm typecheck`, `pnpm build`, Playwright interaction assertions, desktop/mobile overflow checks, and printed PDF inspection.
- Local dev server: `http://127.0.0.1:5173/`.
- Native Mini Program added under `miniprogram/`: login, field task list, inspection, sealing, reports, profile, custom bottom navigation, photo picker, and Canvas 2D signature pad.
- Inspection photos are limited to `structure_risk` with a hard 100-image cap. The sealing order remains the only place for before/after photos.
- Mini Program attachments are copied from temporary paths into `wx.env.USER_DATA_PATH` before entering the local queue; syncing or clearing cache removes managed files.
- Mini Program contract tests cover page registration, photo/signature requirements, durable files, and absence of hard-coded phone credentials or persisted passwords.
- The local WeChat DevTools CLI rejected `touristappid`. The Mini Program now uses the established production AppID `wx9469d5e631279f7b`; WeChat DevTools accepted the project and produced a 91.6 KB preview build.
- Login no longer redirects automatically when stale local session data exists. Login storage and page navigation are wrapped so a failed local write or `reLaunch` shows an error instead of closing the page.
- The Mini Program workbench now uses the production Tencent Cloud API at `https://sunrgw.cn`; login, dashboard summary, work-order filtering, report archive, and profile summary are server-driven.
- Workbench presentation uses 8px card radii, light gray shadows, 18/14/12 px type, soft red/orange/green status tags, and a dark bottom navigation with white selected icons.
- The API client is centralized in `miniprogram/utils/api.ts`; workbench status filters and aggregates come from server responses rather than local mock calculations.
- On 2026-10-18 the Tencent Cloud instance was reset and the system was redeployed fresh at `101.42.181.122` on Ubuntu 26.04. The old database and attachments were intentionally not restored.
- Production now runs FastAPI through `pco.service` on `127.0.0.1:8765` behind Caddy with a Let's Encrypt certificate for `https://sunrgw.cn`; both services are enabled at boot and the server timezone is `Asia/Shanghai`.
- Public DNS for `sunrgw.cn` resolves to `101.42.181.122`. The local development machine uses a fake-IP proxy (`198.18.0.27`); other machines must route `sunrgw.cn` directly or disable fake-IP. Use the apex domain, not `www.sunrgw.cn`, because the certificate covers only the apex.
- The fresh database contains three accounts (`admin`, `gongcheng`, `fw`), base settings and standard sealing materials, with zero customers, work orders and reports. Random initial passwords are stored only in root-only `/root/pco-initial-credentials.txt`.
- The deployed auth endpoint accepts either username or phone, so the Mini Program can sign in with the seeded field phone number.
- Mini Program login now preserves backend 401 errors on the login page instead of treating invalid credentials as an expired session; production domain and API connectivity were verified from WeChat DevTools.
- The uni-app field client was redesigned as a green-led field console with login, workbench, task detail, risk survey, sealing report, document archive, profile and change-password pages.
- The field-first bottom navigation is now `任务 / 勘测 / 封堵 / 报告 / 我的`; the workbench page accepts `kind=risk|sealing` and changes its title, default status and task action wording so technicians can enter survey or sealing work directly.
- The Web management console no longer contains the `FieldMode` page, sidebar entry, mobile-nav entry, command-palette entry or `field` page key. Field capture is now exclusively implemented in the uni-app WeChat Mini Program.
- Role isolation is implemented in `utils/roles.ts`: engineer/service_engineer roles are survey-only, sealing_engineer is sealing-only, and admin/supervisor roles can access both. Survey work uses the server `engineer_id` filter plus a client-side ownership check; sealing ownership matches supervisor/assignee/operator fields or the linked service report's `service_person`.
- Survey users see only `勘测 / 我的`; sealing users see only `封堵 / 我的`. Workbench lists are split into 未完成 / 已完成, task-detail workflow steps are filtered by role, and direct access to the other role's pages or another person's task redirects to the user's own workbench.
- A dedicated role E2E check passed: the survey account saw only `勘测 / 我的`, one own open task and one own completed task; the sealing account saw only `封堵 / 我的`, one own open task and one own completed task. Survey details showed only the 3 survey stages, sealing details showed only the 7 sealing stages, cross-role pages and another person's task redirected to the correct workbench, and the browser console stayed clean.
- The workbench and archive use server summary, work-order status filters, `risk-surveys` and `service-reports`; the field forms use the production draft, upload, signature, submit and PDF endpoints. No local task fixtures are used.
- Risk survey photos use a five-column wrapping grid with a hard 100-image cap. Survey and sealing flows each capture two handwritten signatures: surveyor/customer and responsible/customer.
- uni-app type-check, `build:mp-weixin` and H5 build pass. The H5 build was exercised with Playwright against mocked API responses at 390px: login, workbench, task detail, survey first step, risk-photo grid, sealing report, archive and profile had no horizontal overflow or runtime errors.
- The final `mp-weixin` build contains 76 files and is about 313.9 KB; production builds contain the `https://sunrgw.cn` fallback and no local mock endpoint or test token.
- Enterprise branding now resolves from `GET /api/templates` (`logo_url` / company name) with the backend shield as fallback. Personnel identity uses a portable hash-based cartoon avatar that mirrors the production Web avatar rules.
- Task detail now renders the ordered 11-stage workflow: survey, survey dual sign, survey approval, sealing dispatch, sealing acceptance, check-in, before photos, after photos, sealing dual sign, sealing approval, report generation.
- Workflow actions call existing production endpoints for risk-survey approval, service-report creation/status updates, check-in, work-order review and PDF generation. Related survey/sealing records are resolved by work-order id/report number first, then a unique customer match.
- Service-report and risk-survey forms can reopen existing server records by id, allowing signature/photo completion without creating duplicate documents.
- Two virtual work orders (`VT-2026-001`, `VT-2026-002`) were run end-to-end through the H5 UI against a stateful mock backend: survey, dual signature, survey approval, dispatch, sealing acceptance, check-in, before/after photos, sealing dual signature, sealing approval and PDF generation.
- Both virtual flows ended with approved work orders and completed sealing reports, two signatures per document, before/after evidence and check-in timestamps. The run produced 122 recorded backend operations and zero browser console errors.
- The E2E run found and fixed two real UI bugs: uni-app H5 wraps `<canvas>` in a host node, so signature rendering now resolves the inner native canvas; workflow progress now counts completed steps so a finished process shows 100% instead of 91%.
- The root `project.config.json` now points `miniprogramRoot` at `uniapp/dist/build/mp-weixin/`; the old native Mini Program remains reference-only.
- The production web root was replaced with the new `app/dist` build. The recovered legacy `static_web` was removed from the server, and Caddy now sends `Cache-Control: no-store` for the entry page.
- On 2026-10-19 the live Web root `/home/ubuntu/pco/static_web` was updated to `index-DZzSCM7e.js` / `index-BFdKJ9XM.css`; the previous root was backed up as `static_web.bak-20261019-1000`. `https://sunrgw.cn` now serves the new build.
- WeChat DevTools was reopened against the repository root so `miniprogramRoot: uniapp/dist/build/mp-weixin/` is used. A real `cli preview` compile succeeded with AppID `wx9469d5e631279f7b` at 510.5 KB.
- The Mini Program base library was reduced from `3.7.0` to `2.21.2` to avoid rejecting older WeChat clients that do not need the newest runtime. The rebuilt preview compiled successfully at 527.3 KB with the lower base library.
- The account-level `基础库最低可用版本` must also stay at `2.21.2`; it was found set to `3.17.0`, which produces the "当前微信版本较低" error on older clients. Changing that account setting requires an admin or operator QR verification.
- The Mini Program release identity was bumped from `1.0.0/100` to `1.1.0/110` so the new role-isolated workflow can be distinguished from the older online release in WeChat version management.
- The workbench brand lockup now renders the company name at `15px` and the `封堵勘测系统` subtitle at `24rpx`, with the 320px and 375px layouts checked for truncation, overlap and horizontal overflow. This UI change ships as `3.0.1/301`.
- On 2026-10-19 the online release was still `2.0.5`, built from code submitted on 2026-10-09, so it predates the new field console. The `3.0.0` review was withdrawn and replaced by `3.0.1` (527.3 KB), which was submitted for WeChat review at 11:23.
- WeChat development settings list `https://sunrgw.cn` as the `request`, `uploadFile` and `downloadFile` legal domain. The privacy guide declares location and selected photo/video processing for internal enterprise management.
- A live production smoke test of the uni-app client passed with a temporary review account: login, workbench (`STFD-2026-001`), the 11-stage task detail and risk-survey prefill all loaded from the production API with no browser console errors.
- A review-only customer, site, work order and temporary personnel account were created for the WeChat reviewer. Their password is not stored in the repository; remove the records after review if they are no longer needed.
- Web login now stores the production API token and resolves the real user from `/api/auth/login`.
- The Web personnel page now uses `/api/personnel` for list/create/update, supports adding personnel, editing accounts, enabling/disabling accounts, and changing user passwords. The signed-in user can also change their own password through `/api/auth/change-password`.
- The Web operations console now uses a shared `LiveDataProvider` that polls the production APIs every 12 seconds, refreshes on window focus/visibility, and refreshes immediately after writes. Dashboard, customers, inspections, sealing, reports and service orders now consume the shared backend snapshot instead of local fixtures.
- Inspection and sealing detail pages write updates back through `PUT /api/risk-surveys/{id}` and `PUT /api/service-reports/{id}`; report buttons request backend PDFs with the current bearer token.
- Web live E2E passed against a stateful mock backend: the workbench showed 2 work orders initially, changed to 3 immediately on window focus after an external write, and changed to 4 through the 12-second poll. Saving an inspection and a sealing order produced real PUT requests and refreshed the UI; all listed management pages loaded live data, the 1440px layout had no horizontal overflow, and the browser console stayed clean.
- The legacy `app/src/data.ts` fixture module was removed after all management pages moved to the live snapshot; no local sample-data imports remain in the Web app.

## Remaining Gaps

- Web live integration has been exercised against a stateful mock backend; it still needs a production-account pass because no valid admin credentials were available in the workspace.
- COS attachment IDs, retry/backoff, idempotent batch sync and optimistic-conflict handling still need to replace the current direct upload URL flow.
- The new uni-app capture forms have not yet been exercised against the production account or real device camera/signature hardware; only type, build and mocked visual flows are verified.
- The backend OpenAPI does not expose a dedicated risk-survey review or sealing-dispatch endpoint, so the client maps those transitions to `status=approved`, `status=assigned` and `status=accepted` on the existing documents. Production role/status validation still needs an end-to-end account test.
- The work-order list API only exposes an `engineer_id` filter, so survey scoping is sent to the server but sealing ownership is completed client-side from supervisor/assignee/operator and linked service-report `service_person`. The backend must enforce the same role/ownership scope for true security, not rely on hidden navigation.
- The two virtual flows use a stateful mock backend that follows the documented contract; the same flow still needs one production-account run and real-device camera/signature validation.
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
- Personnel avatars use deterministic local cartoon SVG illustrations instead of initials or remote image services.
- Login gate added with phone/password UI, remember-me session, logout, and session restoration. The prototype validates input format only and never stores the password; production must replace it with server-side authentication and rate limiting.

