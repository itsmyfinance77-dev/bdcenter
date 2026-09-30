# Handoff — state of the project and how to continue

Last updated: 2026-09-30 (second session). Read this first in a new session,
then `CLAUDE.md`, `docs/product/requirements.md` (including its dated update),
`docs/product/open-questions.md` and both ADRs in `docs/decisions/`.

The owner communicates in Persian and prefers short, concrete Persian
explanations; code, commits and technical docs stay in English (see `CLAUDE.md`).

## Where things live

| What                            | Where                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository (private, canonical) | https://github.com/itsmyfinance77-dev/bdcenter — `origin`, branch `main`                                                                                 |
| Local checkout                  | `F:\SITE SEARCH` (Windows 11, Node 24, pnpm 12). Moved from `C:\Users\Mohammad\Desktop` on 2026-09-30: drive C is full, keep builds and caches off it    |
| Dev database                    | Docker container `bdcenter-postgres`, PostgreSQL 16 on `127.0.0.1:5434` (`docker-compose.yml`)                                                           |
| Secrets                         | `.env` (git-ignored): `DATABASE_URL`, `SESSION_SECRET`, `OTP_SECRET`, `SMS_PROVIDER`, plus a local test admin (`DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD`) |
| Uploads                         | `storage/` (git-ignored, `STORAGE_DIR`): `forms/…` attachments, `covers/…` WebP cover images                                                             |

GitHub CLI has three accounts logged in; the active one must be
`itsmyfinance77-dev` for pushes (`gh auth switch --user itsmyfinance77-dev`).

## Run it

```bash
docker compose up -d          # start PostgreSQL (Docker Desktop must be running)
npm run dev                   # http://localhost:3000 (127.0.0.1 only), admin at /admin
npm run verify                # lint + typecheck + unit tests + build
npm run test:db               # integration tests against the dev DB (they clean up)
```

Member sign-in in development: enter any `09…` number on `/account/login`; the
6-digit code is printed in the dev server log as `[sms:console] …`.

## Done so far

First session (4 commits): scaffold, public site, dev DB, admin panel — see git
history (`930e35c` and earlier).

Second session (2026-09-30), all on `main`:

1. `2ff7019` **Cover images + Markdown** — upload/replace/remove a cover per
   article (re-encoded by sharp to WebP 1600/640 px, EXIF stripped, real
   JPEG/PNG/WebP only); `/media/<id>/<lg|sm>` serves covers of published
   articles only, `/admin/media/…` previews drafts. Bodies render through
   react-markdown (no raw HTML, no images, safe link protocols).
2. `ff80167` **Rate limiting** — `src/modules/ratelimit` (one atomic upsert in
   `rate_limit_buckets`); public forms 20/h per IP; admin login throttling moved
   from memory to the DB; `src/lib/client-ip.ts` no longer trusts the first
   `X-Forwarded-For` entry (`CLIENT_IP_HEADER`).
3. `4206b4c` **Member accounts + training** (ADR-0002) — phone + SMS code
   sign-up (`src/modules/members`), `/account`, admin "اعضای سایت"; courses
   (`src/modules/training`) with admin CRUD, enrollment review + CSV, public
   `/courses`, capacity-safe enrollment. Session tokens now carry `aud` and
   `ver` (revocation on logout/password change/deactivation).
4. `53af791` **Audit fixes** — security headers + CSP, `poweredByHeader: false`,
   pnpm overrides (0 known vulnerabilities), upload content signatures, global
   SMS cap, `/account` in robots, removed the unused `FILE_URL_SECRET`.
5. `cfb98a6` **Tests** — Vitest unit tests (36) in `npm run verify`, DB tests (5)
   in `npm run test:db`.

Verified: lint, typecheck, unit + DB tests, production build (in a copy with
standalone off, see gotchas), and browser tests of every new flow in dev and
production mode (sign-up, wrong/expired/replaced codes, rate limits, profile,
enroll/full/duplicate, withdraw, admin course/enrollment/CSV/members,
deactivation revoking sessions, covers, Markdown sanitizing, CSP). Test data was
removed afterwards; the DB has no articles, courses or members.

## Known limitations (deliberate, documented)

- SMS: only the dev `console` provider exists and it is refused in production,
  so member sign-in does not work in production until OQ-BD-11 is answered and
  an adapter is added to `src/modules/members/sms.ts`.
- Admin logout signs that admin out on **every** device (it bumps
  `sessionVersion`). Member logout is per device; "خروج از همه دستگاه‌ها" is
  explicit.
- CSP allows `'unsafe-inline'` scripts (Next.js inline bootstrap). A nonce-based
  CSP would need every page rendered dynamically.
- Public cover responses are cached for one day (`max-age=86400`); an
  unpublished article's cover can stay in a proxy/browser cache that long.
- No price/payment for courses or consulting (OQ-BD-01); enrollment results are
  only shown on `/account`, no SMS/email notification (OQ-BD-13).
- No privacy notice page yet (OQ-BD-12).
- Public form DATE fields use the browser's Gregorian date input; only admin
  dates use Solar Hijri text input (`src/lib/jalali.ts`).
- Contact/consulting forms show the "phone or email required" error only once
  the other fields are valid (Zod refine ordering).
- Consulting requests are not linked to member accounts yet.

## Suggested next steps (owner has not chosen yet)

1. SMS provider adapter once OQ-BD-11 is answered (then real sign-in works).
2. Deployment: Dockerfile for `output: 'standalone'`, `prisma migrate deploy`,
   persistent volume for `storage/`, HTTPS reverse proxy that sets
   `CLIENT_IP_HEADER` — blocked on OQ-BD-08.
3. Privacy notice page + retention rules (OQ-BD-12).
4. Link consulting requests to members and show them on `/account`.
5. Notifications on enrollment/request status changes (OQ-BD-13).
6. Membership roster import (CSV/Excel) — needs OQ-BD-01.
7. Admin-editable institutional pages (the `Page` model is still unused) and
   the Chamber-links / footer lists (`ExternalLink` model unused).
8. Backups for the database and `storage/`; error monitoring.

## Gotchas learned in this repo

- **`next build` on this Windows machine fails at the very end** with
  `EPERM ... symlink` while copying `.next/standalone` (Windows needs Developer
  Mode or admin rights for symlinks). Compilation, typecheck and page
  generation have already succeeded by then. To run a real production server
  locally: copy the project (without `node_modules`, `.next`, `.git`,
  `storage`) to a scratch folder, add a `node_modules` junction
  (PowerShell `New-Item -ItemType Junction`), comment out `output: 'standalone'`
  in the copy's `next.config.ts`, `next build`, then
  `next start <copy> -p 3100 -H 127.0.0.1`. Remove the junction first with
  `(Get-Item <copy>\node_modules).Delete()` so the real `node_modules` survives.
- Don't run `next build` in the project folder while a dev server runs there —
  it overwrites the dev server's `.next`.
- `prisma migrate dev` refuses to run non-interactively when it has a warning
  to confirm (e.g. a new unique constraint). Then write the migration with
  `prisma migrate diff --from-schema-datasource prisma/schema.prisma
--to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql`
  and apply it with `prisma migrate deploy`.
- After a schema change, restart the dev server: the cached Prisma client in
  `globalThis` does not know new models.
- Scripts run with `tsx` cannot import modules that use `next/navigation` /
  `next/headers` or `server-only`; keep pure logic in its own file (e.g.
  `src/modules/members/next-path.ts`). Vitest aliases `server-only` to a stub.
- React does not update a `<select>`'s `defaultValue` after mount, and React 19
  resets forms after an action: `SelectField` and `StatusForm` remount the
  select via `key`.
- Non-ASCII route params (Persian slugs) arrive percent-encoded — use
  `decodeParam()` from `src/lib/params.ts`. Download file names must go through
  `attachmentDisposition()` (`src/lib/csv.ts`); header values must be ASCII.
- The editing tools in this environment normalize `\u200c` escapes into the
  literal ZWNJ character; `slugify` uses `String.fromCharCode(0x200c)`.
- `prisma` client output is `prisma/generated/client` (git-ignored); run
  `npm run db:generate` after a fresh clone.
- A layout's metadata title template does not apply to the page in the same
  segment (see the dashboard page).
- Next.js only fills `X-Forwarded-For` when a request has none, so a visitor
  can send any value; rate limiting reads `CLIENT_IP_HEADER` or the last entry.
