# Handoff — state of the project and how to continue

Last updated: 2026-09-30. Read this first in a new session, then `CLAUDE.md`,
`docs/product/requirements.md` and `docs/product/open-questions.md`.

The owner communicates in Persian and prefers short, concrete Persian
explanations; code, commits and technical docs stay in English (see `CLAUDE.md`).

## Where things live

| What                            | Where                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository (private, canonical) | https://github.com/itsmyfinance77-dev/bdcenter — `origin`, branch `main`                                                                                              |
| Old copy (do not use)           | `itsmyfinance99-eng/bdcenter` — superseded; the owner has not yet decided whether to delete it. A collaborator invite to `itsmyfinance77-dev` is still pending there. |
| Local checkout                  | `C:\Users\Mohammad\Desktop\SITE SEARCH` (Windows 11, Node 24, pnpm 12)                                                                                                |
| Dev database                    | Docker container `bdcenter-postgres`, PostgreSQL 16 on `127.0.0.1:5434` (`docker-compose.yml`)                                                                        |
| Secrets                         | `.env` (git-ignored): `DATABASE_URL`, `SESSION_SECRET`, `FILE_URL_SECRET`, plus a local test admin (`DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD`)                         |
| Uploads                         | `storage/` (git-ignored, `STORAGE_DIR`)                                                                                                                               |

GitHub CLI has three accounts logged in; the active one must be
`itsmyfinance77-dev` for pushes (`gh auth switch --user itsmyfinance77-dev`).

## Run it

```bash
docker compose up -d          # start PostgreSQL (Docker Desktop must be running)
npm run dev                   # http://localhost:3000, admin at /admin
npm run verify                # lint + typecheck + build
```

The owner already created their own ADMIN account with `npm run admin:create`.
A local test admin `dev-admin@bdcenter.test` also exists (password in `.env`).

## Done so far (4 commits on `main`)

1. **Scaffold** — Next.js 15 App Router, Tailwind v4, Prisma schema, ADR-0001, requirements, open questions.
2. **Public site** — home (banner, hover "about" photo placeholder, latest news/events, 7 service tiles, 9 Chamber links), `/about`, `/contact` (form), `/services/[slug]` (consulting request form; training links out; 4 placeholder tiles), `/news`, `/events` (+ detail pages), `/forms`, `/forms/[slug]` (dynamic form with file upload), sitemap, robots, JSON-LD, Persian 404, mobile menu.
3. **Dev DB** — `docker-compose.yml`, first migration `prisma/migrations/*_init`, seed.
4. **Admin panel** `/admin` — argon2id login, HMAC-signed session cookie (8 h), middleware + `requireAdmin()` in every page/action (default deny), login throttling, roles ADMIN/EDITOR, news & events CRUD (Persian slugs, Solar Hijri date input), consulting requests (filter, status), contact messages, form builder, submissions (status, CSV export, attachment download), users, own password change, audit log.

All verified: lint, typecheck, production build, plus browser tests of every
flow above (login, role gating, forged cookie, CRUD, form builder, upload,
CSV, download). Test data was removed afterwards.

## Known limitations (deliberate, documented)

- Sessions are stateless: logout/password change do not revoke other copies of a cookie until it expires (8 h). Deactivating a user is immediate.
- Login throttling is in-memory — fine for one instance only.
- Article bodies render as plain paragraphs (no Markdown renderer yet, never raw HTML).
- Articles have no cover image upload yet (`Article.coverImageId` / `MediaAsset` exist in the schema, unused).
- Public form DATE fields use the browser's Gregorian date input; only admin event dates use Solar Hijri text input (`src/lib/jalali.ts`).
- Contact/consulting forms show the "phone or email required" error only once the other fields are valid (Zod refine ordering).
- `Course` / `Enrollment` models exist but have no UI (training currently links out to the Chamber).
- Membership tier is looked up and stored on consulting requests, but no price/gate is computed — blocked on OQ-BD-01.

## Suggested next steps (owner has not chosen yet)

1. Cover images for news/events (reuse `src/modules/files`, add a public, resized image route).
2. Markdown rendering for article bodies with a sanitizing renderer.
3. Training enrollment (`Course`, `Enrollment`) if the employer wants it on this site.
4. Membership roster import (CSV/Excel) — needs the format from OQ-BD-01.
5. Deployment: Dockerfile for `output: 'standalone'`, `prisma migrate deploy`, a persistent volume for `storage/`, HTTPS — blocked on OQ-BD-08 (who hosts, DNS).
6. Optional hardening: session revocation (`sessionVersion` on `AdminUser`), DB-backed throttling, rate limits on public forms.

## Gotchas learned in this repo

- **Another chat's `npm run dev` may be running on port 3000 in this folder.** Running `next build` here would overwrite its `.next`. To verify a production build, copy the project (without `node_modules`, `.next`, `.git`) to a scratch folder, junction-link `node_modules`, build and `next start -p 3100` there. When removing the copy, remove the junction first with `cmd //c rmdir <path>\node_modules` so the real `node_modules` is not deleted.
- That port-3000 dev server was seen listening on `0.0.0.0` with connections from public IPs — the owner was told to close port 3000 on the router/firewall.
- React does not update a `<select>`'s `defaultValue` after mount; `SelectField` remounts via `key={defaultValue}` so a failed server action does not reset it.
- Non-ASCII route params (Persian slugs) arrive percent-encoded — use `decodeParam()` from `src/lib/params.ts`.
- The editing tools in this environment normalize `\u200c` escapes into the literal ZWNJ character; `slugify` uses `String.fromCharCode(0x200c)` for that reason.
- `prisma` client output is `prisma/generated/client` (git-ignored); run `npm run db:generate` after a fresh clone.
- A layout's metadata title template does not apply to the page in the same segment (see the dashboard page).
