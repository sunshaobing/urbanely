# 申汰 PCO 现场服务系统

## Project

- Name: 申汰 PCO 现场服务系统
- Started: 2026-10-18
- Owner: Eric
- Purpose: Replace the current Feishu Base workflow with a structured PCO field-service system covering customer/site management, pest surveys, structural sealing, service orders, rechecks, reports, signatures, and material records.

## Stack

- Prototype: Vite + React + TypeScript
- Package manager: pnpm
- Production recommendation: Next.js/React + TypeScript, PostgreSQL, Prisma, S3-compatible object storage, PostgreSQL-backed job queue
- Styling: plain CSS with design tokens; no UI framework required for the prototype
- Icons: lucide-react

## Directories

- `app/`: interactive product prototype
- `docs/`: reverse-engineering evidence, data model, API contract, migration notes
- `tmp/`: local extraction and investigation outputs; never ship customer PII

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

## Architecture Rules

- Model findings, evidence, treatments, materials, and rechecks as structured entities.
- Never store a long report section as a multi-select option list.
- Reports are immutable snapshots generated from structured data, not the source of truth.
- Keep the field-survey and sealing state machines separate, linked by a source inspection and site.
- Use customer/site IDs as the stable join keys; Feishu record IDs are migration metadata only.
- Generated PDFs, signatures, and photos must retain their source hashes and audit metadata.

## Security And Privacy

- Do not commit real phone numbers, ID numbers, bank accounts, or customer contact details.
- Use masked or fictional contact data in fixtures and screenshots.
- Validate uploads, strip unnecessary EXIF data, and serve attachments through signed URLs.
- Never log tokens, credentials, signatures, or full PII.
- Keep secrets in environment variables or the deployment secret store.

## Verification

- Run `pnpm typecheck` and `pnpm build` before reporting completion.
- Run the prototype and verify desktop and mobile layouts with Playwright.
- Check text overflow, overlap, navigation, print preview, and primary workflow actions.
- Keep changes scoped to the request and preserve unrelated user changes.

