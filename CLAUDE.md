# Project rules — Business Development Center microsite

Standalone project for `ccinno.center`, independent of `F:/RoshdAfrinan Site`.
Start every new session with `docs/HANDOFF.md` (current state, how to run,
next steps, gotchas). Read `docs/product/requirements.md` and
`docs/decisions/ADR-0001-architecture.md` before large changes. Keep
`docs/HANDOFF.md` up to date when a chunk of work lands.

## Language

Product language is Persian (fa-IR), UI is RTL. Source code identifiers, commit
messages and technical docs stay in English; product/backlog docs may be Persian.
Show numbers with Persian digits (`Intl.NumberFormat('fa-IR')`).

## Architecture

One Next.js app (see ADR-0001). Organize domain logic under
`src/modules/<domain>/` with an exported service; components and route
handlers call the service, never Prisma models directly across domain lines.
Do not introduce a second app/service without a new ADR.

## Frontend

TypeScript, App Router, Tailwind v4. Colors/spacing come from tokens in
`src/app/globals.css` — never hard-coded. Institutional copy stays in
`src/content/*`, not inline in components.

## Backend

Validate every mutation with Zod. Business logic lives in `src/modules/*/service.ts`,
not in route handlers or server actions — those only map input/output.

## Database

Schema changes go through a Prisma migration (`npm run db:migrate:dev -- --name <change>`).
Never hand-edit the production schema. Seed data is for development only.

## Security

Admin routes require a session; default deny. Hash passwords with argon2id.
Never commit secrets — use `.env` (git-ignored), document every variable in
`.env.example`.

## Business rules

Do not invent pricing, membership rules, certifications or contact details.
Record every unknown in `docs/product/open-questions.md` with an `OQ-BD-*` id.

## Documentation

Before a large architectural change, add or amend an ADR in `docs/decisions`.

Every PR names its backlog story (`ST-BD-*`, `docs/product/backlog/`) and
updates that story's status, PR and commit; new work gets a story first.

Every change to the admin panel, or any related site change staff would notice,
must update the staff guide (`src/content/admin-guide.ts`, shown at `/admin/help`)
in the same commit: plain Persian, the panel's own button and menu names,
`adminOnly` for ADMIN-only screens (owner's rule, 2026-10-03).
