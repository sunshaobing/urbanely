# Mobile UI Redesign

## Scope

- Approved direction: task-first, simple, professional, green business theme.
- Mobile field experience for uni-app, WeChat Mini Program, Android, iOS, and HarmonyOS builds.
- This is a presentation-layer redesign only.

## Must remain unchanged

- API paths, request payloads, response mappings, role permissions, workflow states, draft storage, upload behaviour, location behaviour, PDF generation, and report data.
- The dedicated landscape signature page, signature theme colours, PNG export, and upload callback.
- Existing page destinations and role-based navigation visibility.

## Visual rules

- Page background `#f3f6f4`, white work surfaces, deep green primary actions.
- Content column centered with consistent `32rpx` side padding.
- Page titles and primary actions centered; long copy and form labels left aligned.
- Body text uses `28rpx` with a `13.5px` floor; secondary text uses `20–22rpx` with a `12px` floor.
- Font stack: PingFang SC on Apple devices, Microsoft YaHei on Windows, then Noto Sans CJK SC / Source Han Sans SC on systems without either font.
- Inputs and primary actions use a `48px` minimum hit height.
- The soft-business style uses capsule buttons (`999px`), `20–24rpx` cards/sections, `16rpx` form controls, one-pixel neutral borders and rounded lower page headers. No decorative gradients.
- One primary action per screen.
- Status uses text plus restrained red, amber, or green.

## Screen changes

- Login: centered brand, title, two fields, agreement, and one main button.
- Workbench: headline task count, current task card, uniform status tabs, simplified queue.
- Task detail: current action and progress first, supporting data below.
- Survey: six explicit steps: site information, inspection scope, risk points, photos, treatment plan, signatures.
- Sealing: seven explicit steps: service information, materials and locations, before photos, after photos, service record, signatures, and checkout confirmation.
- The final checkout step requires a camera photo and a fresh precise location, then writes the existing checkout data before submission.
- Reports and profile: lower density, centered hierarchy, larger tap targets.
- Survey and sealing forms save locally on every field/photo/signature change, debounce server draft sync by 800ms, force a save on step navigation, and show a persistent save state plus explicit manual-save and final-submit success feedback.

## Verification

- Uni-app type check and WeChat Mini Program build.
- H5 visual run at 320px, 375px and 390px widths.
- Check login, workbench, task detail, survey steps, sealing steps, reports, profile, and signature-entry navigation.
- Confirm no API or workflow contract changes and no text clipping or horizontal overflow.
