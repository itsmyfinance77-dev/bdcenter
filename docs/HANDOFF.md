# Handoff — state of the project and how to continue

Last updated: 2026-10-02 (third session). Read this first in a new session,
then `CLAUDE.md`, `docs/product/requirements.md` (including its dated update),
`docs/product/open-questions.md` and the ADRs in `docs/decisions/`.

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
npm run dev                   # http://localhost:3010 (127.0.0.1 only; port 3000 is left for another project), admin at /admin
npm run verify                # lint + typecheck + unit tests + build
npm run test:db               # integration tests against the dev DB (they clean up)
npm run test:e2e              # browser tests (Playwright + the installed Chrome), ~2 min with the build
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

Third session (2026-09-30 → 2026-10-01), all on `main`:

1. `723156c` **Editable pages and links** — `src/modules/pages` (about,
   privacy, terms, custom `/pages/<slug>`; the privacy/terms drafts list only
   what the code collects, gaps in `[…]`), `src/modules/links`
   (chamber-services, useful-links, social; a data migration inserts the nine
   Chamber links).
2. `d043227` **Consulting in the member account** — `ConsultingRequest.memberId`,
   listed on `/account`, form prefilled from the profile.
3. `c00d285` **SMS adapters, email, notifications** — `src/modules/messaging`
   (Kavenegar and SMS.ir, tested with mocked HTTP only; SMTP via nodemailer),
   `src/modules/notifications` (applicant SMS/email on accepted/rejected/done,
   opt-out checkbox, every attempt logged and shown in the panel).
4. `7ebfb88` **Search** — `/search` with Persian-normalized matching
   (`src/lib/search-text.ts`).
5. `a6fc9b5` **Events calendar** — `/events/calendar` (Jalali month grid),
   `.ics` per event/course and the `/calendar.ics` feed.
6. `f4d30f9` **Appointment booking** (ADR-0003) — staff profiles, slots
   (single or weekly pattern), `/appointments/<consulting|service-desk>`; one
   live booking per slot, enforced by a unique column and a row lock.
7. `8db2495` + the two-step commit — **Admin two-step login**: TOTP + recovery
   codes (`src/modules/auth/two-factor.ts`), second step at
   `/admin/login/2fa`, setup on `/admin/account`, ADMIN reset on
   `/admin/users`. Needs `DATA_ENCRYPTION_KEY`.
8. `8dc9a48` **BDC Yazd design** — tokens, fonts (Vazirmatn + Anjoman; the
   owner holds the license, document to follow), header/footer, home page
   (intro, hero networks, about reveal, news carousel, bento), restyled inner
   pages and form controls. The mockup's sample data is never shown.

9. `abde3ef` **Plain-HTTP LAN preview** (`npm run preview`, see gotchas).
10. `508235d` **Stats dashboard** — `/admin/stats`: anonymous per-day page-view
    counts (`/api/pv` beacon, no IP/cookie/visitor id, private areas and bots
    excluded) and daily activity charts over 7/30/90 days.
11. **Error reporting, backups, deployment** (ADR-0004) —
    `src/instrumentation.ts` → `src/modules/errors` (grouped `ErrorGroup` rows,
    alert email to `ERROR_ALERT_EMAIL`, Persian error pages with the digest);
    `deploy/backup/*.sh` (pg_dump + storage tar, rotation, restore);
    `/admin/system` (ADMIN) shows errors and backup freshness; `Dockerfile`
    (targets `runner`, `tools`), `docker-compose.prod.yml` (caddy, app,
    migrate, db, backup), `deploy/Caddyfile`, `/api/health`. How-tos:
    `docs/operations/deploy.md`, `docs/operations/backup.md`. Tested: image
    build, migrations on an empty DB, admin creation, pages/argon2/sharp in the
    image, error grouping in the container, HTTPS via Caddy (internal CA),
    backup/rotation/restore/failure runs.
12. **Course-completion certificates** (item 9) — per-course switch (off by
    default) with optional signatory; a `Certificate` row (snapshot + public
    code `BDC-XXXX-XXXX`) is issued when an enrollment becomes DONE and
    revoked if it leaves DONE. PDF (A4 landscape, Vazirmatn, logo, QR) from
    `/account/certificates/<enrollmentId>` and the admin course page; public
    check at `/certificates/<code>` (noindex). Wording is a draft in
    `src/content/certificate.ts` (OQ-BD-16). Persian PDF text goes through
    `src/lib/rtl-text.ts` (see gotchas).
13. **Browser tests** — `npm run test:e2e` (Playwright, `e2e/`): every public
    page, member sign-up by SMS code (fake Kavenegar API), wrong code,
    enrollment capacity, booking without double-booking, admin review with
    SMS notice and certificate, course creation, admin pages.
    `scripts/e2e-server.mjs` prepares the separate `bdcenter_e2e` database,
    a per-run admin and secrets, builds into `.next-e2e` and serves on 3030.
    `E2E_REUSE_BUILD=1` skips the build when the code has not changed.

The checkout moved from the C: desktop to `F:\SITE SEARCH` (drive C was full),
and the dev server now runs on port **3010** (3000 belongs to another project).

## Known limitations (deliberate, documented)

- SMS: set `SMS_PROVIDER` and that provider's keys (`.env.example`); without
  one, production sign-in shows "SMS unavailable" (OQ-BD-11).
- Admin logout signs that admin out on **every** device (it bumps
  `sessionVersion`). Member logout is per device.
- CSP allows `'unsafe-inline'` scripts (Next.js bootstrap and the home intro's
  pre-paint script).
- Public cover responses are cached for one day (`max-age=86400`).
- No price/payment (OQ-BD-01, OQ-BD-15); no membership roster import (OQ-BD-01).
- Booking limits are safe defaults (OQ-BD-14): 3 upcoming per service, no overlaps.
- Production mode sends `Secure` cookies, HSTS and `upgrade-insecure-requests`,
  so it must be served over HTTPS; plain-HTTP access by IP will not keep sessions.
- Public form DATE fields use the browser's Gregorian date input.

## Remaining work (owner asked for all of it on 2026-10-01)

1. Blocked on the employer: online payment (OQ-BD-15), roster import (OQ-BD-01).
2. Hosting and DNS (OQ-BD-08), then the first real deploy per
   `docs/operations/deploy.md`; off-site backup copies (OQ-BD-19).
3. Certificate wording, signatory and which courses issue them (OQ-BD-16),
   then turn certificates on per course.

On 2026-10-02 the owner dropped the plain-HTTP public-IP preview; do not spend
more time on it (the `npm run preview` scripts stay for LAN viewing).

## Gotchas learned in this repo

- **The e2e database is never reset.** `prisma migrate reset` refuses to run
  under an AI agent without the owner's explicit consent, and wiping is not
  needed: every e2e run uses its own names (`runId`) and its own rate-limit
  key (`x-e2e-client` header via `CLIENT_IP_HEADER`). Drop `bdcenter_e2e`
  by hand if it ever grows too big; the next run recreates it.
- Playwright loads test files before `webServer` starts, so anything read
  from `.tmp-build/e2e-state.json` must be read lazily (in hooks/tests).

- **Persian text in PDFs:** PDFKit shapes through fontkit, which reverses
  Arabic-script runs (including Persian digits) and lays words out left to
  right. Never pass a Persian line to `doc.text()` directly; use
  `layoutLine()` from `src/lib/rtl-text.ts` and draw piece by piece (see
  `certificate-pdf.ts`). PDF embedding needs the static TTFs in `src/fonts`
  (the variable woff2 crashes subsetting). To look at a PDF:
  `pdftoppm -png -r 90 file.pdf out` (installed); for pages while the app
  window is minimized: headless Chrome
  (`chrome.exe --headless=new --no-proxy-server --screenshot=... URL`).

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
- Nested `Prisma.sql` fragments are not recognized inside the Next.js bundle
  (they are sent as JSON values). Build dynamic SQL as text with numbered
  parameters (`SqlParams` in `src/lib/search-text.ts`).
- This machine runs a system proxy (Clash/NekoBox, `HTTP_PROXY=127.0.0.1:12334`)
  whose `NO_PROXY` does not cover `192.168.*`; use `curl --noproxy '*'` for LAN tests.
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
- The Prisma client is generated to its default place (`@prisma/client`);
  run `npm run db:generate` after a fresh clone. It used to live in
  `prisma/generated`, but inside the project Next.js's file tracer analysed it
  and, via the bundled dotenv's `~` handling, crawled the whole home folder
  (`C:\Users\Mohammad/**`), which fails on Docker Desktop's unreadable socket.
- **LAN / public-IP preview:** `npm run preview:build` then `npm run preview`
  serves a production build over plain HTTP on `0.0.0.0:3020`
  (`INSECURE_HTTP_PREVIEW=1`, built into `.next-preview`; see `src/lib/https.ts`).
  The existing Windows rule for Node.js already allows the port; from outside,
  forward a router port to `192.168.100.100:3020`. Never use this mode for the
  real deployment.
- Drive C is nearly full: point `TEMP`/`TMP` at `F:\SITE SEARCH\.tmp-build`
  (git-ignored) for long builds.
- A layout's metadata title template does not apply to the page in the same
  segment (see the dashboard page).
- Next.js only fills `X-Forwarded-For` when a request has none, so a visitor
  can send any value; rate limiting reads `CLIENT_IP_HEADER` or the last entry.
