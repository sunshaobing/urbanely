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

- Page background `#f4f7f5`, white work surfaces, deep green primary actions.
- Content column centered with consistent `32rpx` side padding.
- Page titles and primary actions centered; long copy and form labels left aligned.
- Body text at least `30rpx`; secondary text at least `24rpx`.
- Inputs and primary actions at least `96rpx` high.
- Card radius `12rpx`, one-pixel neutral borders, no decorative gradients.
- One primary action per screen.
- Status uses text plus restrained red, amber, or green.

## Screen changes

- Login: centered brand, title, two fields, agreement, and one main button.
- Workbench: headline task count, current task card, uniform status tabs, simplified queue.
- Task detail: current action and progress first, supporting data below.
- Survey: six explicit steps: site information, inspection scope, risk points, photos, treatment plan, signatures.
- Sealing: six explicit steps: service information, materials and locations, before photos, after photos, service record, signatures.
- Reports and profile: lower density, centered hierarchy, larger tap targets.

## Verification

- Uni-app type check and WeChat Mini Program build.
- H5 visual run at 320px, 375px and 390px widths.
- Check login, workbench, task detail, survey steps, sealing steps, reports, profile, and signature-entry navigation.
- Confirm no API or workflow contract changes and no text clipping or horizontal overflow.
