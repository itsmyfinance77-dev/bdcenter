# Handoff — state of the project and how to continue

Last updated: 2026-10-04 (end of the fifth session; next steps in «START HERE»). Read this first in a new session,
then `CLAUDE.md`, `docs/product/requirements.md` (including its dated update),
`docs/product/open-questions.md` and the ADRs in `docs/decisions/`.

The owner communicates in Persian and prefers short, concrete Persian
explanations; code, commits and technical docs stay in English (see `CLAUDE.md`).

## START HERE — sixth session (written 2026-10-04 before a context clear)

### 1. New way of working (owner's decision, 2026-10-04)

From now on **every task goes in its own branch and PR, reviewed before it is
merged** — following the owner's merge policy at
`D:\SKILLS\Merge policy Skill\Merge policy Skill.md` (read it). In short:

- One branch per task (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`), never
  commit to `main`. Bring `main` in with `git merge origin/main`, never
  rebase/force-push a shared branch.
- Open a PR on `itsmyfinance77-dev/bdcenter` (push needs
  `gh auth switch --user itsmyfinance77-dev`, then switch back to the
  previously active account, `itsmyfinance99-eng`).
- **Independent review on the exact head before merging**: a reviewer that is
  not the author (e.g. a read-only review subagent of another model, or
  `/code-review`). Findings as
  `severity · confidence · file:line · trigger → wrong outcome · fix`;
  fix every Critical/High, one push per round, the reviewer checks the delta.
- **Checks**: the repo has **no GitHub Actions CI** yet. Until there is one,
  the gate is the local run on the PR head — `npm run verify` (lint, types,
  unit, build), `npm run test:db`, `npm run test:e2e` — with the results
  written in the PR. Adding a CI workflow (PostgreSQL service) is a good
  first task, see the list below.
- Merge **squash, head-pinned**: `gh pr merge N --squash --match-head-commit <sha>`,
  one PR at a time; afterwards check `main` again.
- The staff-guide rule still applies to every PR (see `CLAUDE.md`).

### 2. State of git right now

- Local `main` = `origin/main` = `e6a32f7` (end of the fourth session).
- **All fifth-session work (22 commits, `3cc26c9`…the handoff commit) is on
  branch `session5/panel-and-member-features`, not pushed yet.** First job:
  push it, open one PR for it ("Fifth session: SMS sandbox, member identity,
  rich editor, calendar links, 12-item panel list"), get it reviewed under
  the policy above, fix findings, squash-merge. It was fully tested locally
  (119 unit, 56 DB, 27 browser tests, all green on 2026-10-04).
- The «BDC site» preview (port 3020, `http://10.20.30.6:3020` for the owner)
  runs a build of this branch.

### 3. Tasks the owner asked for (2026-10-04), each its own branch + PR

Order: 0 (optional, helps every later PR), then 1–5, then 6–7, then 8 (audit/QA/security — run it after the features so it covers them), and 9 (the research) last.

0. **CI workflow** (`ci/github-actions`): GitHub Actions on PRs and `main`:
   pnpm install, `prisma migrate deploy` against a PostgreSQL 16 service,
   lint, typecheck, unit, DB tests, build (e2e optional/nightly). Then the
   "every check green" gate becomes real.
1. **Automatic SMS reminders** (`feat/sms-reminders`): e.g. the day before a
   booked appointment and before a course starts (and before each session
   once item 4 exists). Needs a scheduler: there is none yet. Idea: a
   protected endpoint (`/api/cron/reminders` with a secret header) that sends
   due reminders once (store `remindedAt`/a `Reminder` row to avoid repeats),
   called every 15 min by cron — in production a small service in
   `docker-compose.prod.yml` (the `backup` container already runs cron), in
   dev/preview a script or Windows Task Scheduler. Reminder timing as an
   ADMIN setting (e.g. 24 h before; quiet hours, no SMS at night). Log every
   send in `notifications`; respect the SMS sandbox. Guide section.
2. **Announcement bar** (`feat/announcement-bar`): a site-wide notice at the
   top of every public page («مرکز تا ۱۵ فروردین تعطیل است»), set in
   «تنظیمات سایت»: on/off, text, optional link, optional start/end date,
   tone (info/warning). New setting key in `src/modules/settings`, rendered
   in `src/app/(site)/layout.tsx` above `SiteHeader`; visitors may close it
   (remember per text in localStorage). Guide section.
3. **Satisfaction survey** (`feat/satisfaction-survey`): after a consulting
   request/booking is DONE and after a course enrollment is DONE, SMS a link
   to a short survey (score 1–5 + comment; one answer per link, token in the
   URL, no login). Admin: results per service/course/consultant, average,
   CSV. Decide whether it reuses the form builder (`src/modules/forms`) or a
   small `surveys` module (likely simpler and safer). Opt-in per send like
   the status notices. Guide section.
4. **Multi-session courses** (`feat/course-sessions`): a course gets a list
   of sessions (date, start/end time, place, optional topic) instead of only
   start/end. Course page and calendar (`src/modules/calendar`, .ics, member
   feed) show every session; course start/end derived from the sessions;
   admin editor for the list (add/remove/reorder). Migration must keep
   existing courses (one session from their start/end). Reminders (item 1)
   per session. Guide section.
5. **Editable home-page texts** (`feat/home-texts`): the hero title and the
   lead sentence (and possibly the about kicker/title) editable in
   «تنظیمات سایت», with the current `homeCopy` in `src/content/site.ts` as
   the fallback. Keep the design's line lengths in mind (warn on long text).
   Guide section.
6. **Advanced form builder** (`feat/form-builder-v2`, owner 2026-10-04: «فرم‌ساز
   پیشرفته با قابلیت‌های بیشتر»). Today (`src/modules/forms`, admin
   «فرم‌ها و درخواست‌ها»): field types TEXT, TEXTAREA, NUMBER, EMAIL, PHONE,
   DATE (Gregorian browser input), SELECT, FILE, CHECKBOX; required flag;
   order; one status per submission; CSV export. Candidates, to confirm with
   the owner before building (split into several PRs):
   - more field types: radio buttons, multi-select checkboxes, Jalali date
     picker, time, national code / legal id / postal code / mobile with the
     same validators as the member profile, rating/scale, section headings
     and help text, rich description at the top (ADR-0005 editor);
   - per-field settings: placeholder, hint, min/max length or value, allowed
     file types and size, default value;
   - conditional logic (show a field only when another has a value);
   - multi-step forms (pages) with a progress bar;
   - form settings: open/close dates, maximum number of submissions,
     members-only (prefill from the profile), one submission per member,
     custom thank-you text, SMS/email confirmation to the applicant, staff
     alert recipients per form (reuse `alertStaff`), duplicate a form;
   - submissions: notes and assignee per submission, status change with SMS
     to the applicant (like consulting), filters/search, attachment preview,
     Excel export per filter, simple charts for choice fields.
     Keep stored submissions readable when a form changes (versioned field
     definitions or a snapshot of labels in each submission).
7. **Backlog with epics and stories** (`docs/backlog`; owner 2026-10-04:
   «سیستم backlog و epic و story» — **answered: it means the development
   backlog of this site, i.e. project planning**, not a panel feature).
   Build it as Markdown in the repo: `docs/product/backlog/README.md` (how it
   works: IDs, statuses, priority scale, definition of done that includes the
   PR/review gate and the staff-guide rule) plus one file per epic
   (`EP-BD-01-….md`, …) holding its stories `ST-BD-*`. Each story: user-story
   text in Persian («به‌عنوان … می‌خواهم … تا …»), acceptance criteria,
   priority, status (برنامه‌ریزی‌شده / در حال انجام / بازبینی / انجام‌شده /
   منتظر مرکز), links to its PR(s), commits and open questions (`OQ-BD-*`).
   Fill it with everything already built (sessions 1–5, as done stories with
   their commits) and everything planned here (tasks 0–9) and waiting on the
   center (`open-questions.md`). Optionally mirror epics/stories as GitHub
   Issues with labels and milestones later. From then on every new PR names
   its story id. Product/backlog docs may be in Persian (`CLAUDE.md`).
8. **Full audit, QA and security hardening** (owner 2026-10-04: «audit و QA
   سراسری، رفع باگ‌ها، تست امنیت و بالا بردن امنیت سایت در مقابل انواع حملات
   سایبری»). Start from `docs/security-review-2026-10.md` (2026-10-03, commit
   `c7adae0`); everything since then is unreviewed: member identity uploads
   and approval, rich HTML (sanitizer), page images, staff photos, course
   covers, settings, group SMS, exports, preview routes, password reset by
   email, page history, calendar feeds, SMS sandbox. Plan (findings and fixes
   as separate PRs, reviewed like any other):
   - **QA**: every flow per role (visitor, member individual/legal, editor,
     ADMIN) with `npm run sandbox:users`, on desktop and phone sizes; forms
     with wrong/empty/huge/Persian-digit input; double submits; back button;
     accessibility (axe/Lighthouse); fix every bug found and add a test for it.
   - **Security review** (OWASP Top 10 / ASVS level 2 as checklist): access
     control on every new action/route (list them all again with their
     guard), IDOR on member files, certificates, calendar feed tokens,
     preview and revision ids; XSS through rich HTML, SVG/polyglot uploads,
     CSV injection; CSRF/origin checks for server actions and the image
     upload route; SSRF (none expected); open redirects; enumeration (login,
     password reset, OTP); brute force and SMS pumping limits; token entropy
     and expiry; session fixation/revocation; secrets in logs; error pages
     leaking details; dependency audit (`pnpm audit`), licence check.
   - **Hardening ideas** to evaluate: nonce-based CSP without
     `'unsafe-inline'` scripts, mandatory 2FA for ADMIN, account lockout
     notices by email, stricter rate limits on uploads, size/count limits on
     JSON settings, database role with least privilege, encrypted off-site
     backups, Docker image scan, Caddy security headers, fail2ban-like limits
     at the proxy, security.txt.
   - **Automated scanning only against our own local/preview instance**
     (never a third-party site): OWASP ZAP baseline/active scan, a SAST pass
     (e.g. Semgrep rules for TS/React), `npm audit`, header check.
   - Deliver `docs/security-review-<date>.md` (updated) and a QA report in
     Persian for the owner, then fixes in PRs.
9. **Research report** (no code, last): a thorough research of features not yet
   built **and not yet proposed to the owner** that would help visitors,
   members or staff (look at comparable Iranian chamber/incubator/accelerator
   sites and good CMS/booking practice). Already proposed earlier, so leave
   out or only mention: consultant panel, mandatory 2FA for ADMIN, course
   waiting list, member account deletion, payment, roster import. Deliver as
   a Persian report (artifact or doc) with priority, effort and why for each.

The owner also still has to: get a Linux **VPS** instead of the shared
cPanel host (see "Hosting" below), and provide SMS/SMTP accounts.

### 4. Lessons from the fifth session (also in "Gotchas")

- After every `prisma migrate dev`, **restart the dev server**, or pages fail
  with "Unknown field/argument" from the stale Prisma client (seen 3 times).
- Write TS/py files with the Write tool; Python strings in Bash heredocs lose
  or mangle backslashes (`\1` became `\x01`), and a Bash heredoc with
  backticks/`${}` once failed to parse.
- Backticks inside `src/content/admin-guide.ts` template literals must be
  escaped (`\``).
- React 19 resets forms after an action; radios need `actionResultKey()`.
- DB tests delete members by phone prefix (0993–0999 etc.); sandbox test
  members use 0990.

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
6-digit code is printed in the dev server log as `[sms:console] …`, or, with
`SMS_PROVIDER="sandbox"` (set in the owner's `.env` since 2026-10-03), listed in
the admin panel under «صندوق پیامک آزمایشی» (`/admin/sms-sandbox`).

**Manual testing (SMS sandbox + test accounts):** `npm run sandbox:users`
creates/resets one test account per kind of user (ADMIN, EDITOR, EDITOR with a
temporary password, inactive EDITOR; members `09990000001`–`3`: complete,
nameless, inactive) on the local DB only, with new random passwords, and writes
`sandbox/test-users.html` (git-ignored, Persian): user types and their access,
passwords, URLs, how to read codes, test scenarios. `-- --limits-only` lifts the
sign-in rate limits without changing passwords. The sandbox provider
(`src/modules/messaging/sandbox.ts`, table `sandbox_sms`, newest 300 kept) works
in development and the `INSECURE_HTTP_PREVIEW` build only — never on the real
deployment. Admin login is not by SMS (email + password + optional TOTP).

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
13. **Staff guide** — `/admin/help` («راهنما» in the panel menu): every
    panel section in plain Persian, in the panel's own button names, from
    `src/content/admin-guide.ts`; ADMIN-only sections are hidden from editors.
    Update it whenever a panel screen changes.
14. **Browser tests** — `npm run test:e2e` (Playwright, `e2e/`): every public
    page, member sign-up by SMS code (fake Kavenegar API), wrong code,
    enrollment capacity, booking without double-booking, admin review with
    SMS notice and certificate, course creation, admin pages.
    `scripts/e2e-server.mjs` prepares the separate `bdcenter_e2e` database,
    a per-run admin and secrets, builds into `.next-e2e` and serves on 3030.
    `E2E_REUSE_BUILD=1` skips the build when the code has not changed.
15. `b43689c` **Mobile and speed audit** — phone-size checks of every public
    page and Lighthouse (mobile): about-card overlap, touch hint, tap
    targets, 12px minimum text, Vazirmatn subset (111 → 81 KB), empty meta
    description. Lighthouse after: home 85, about 89, courses 89, contact 91;
    accessibility and SEO 100. Remaining speed levers need the owner: Anjoman
    TTF → WOFF2 (license) and the ~3.5 s home intro (design).
16. `c7adae0` **Password reset by an ADMIN** — «تعیین رمز تازه» on
    `/admin/users` (typed or generated one-time password, signs the user out,
    lifts the login lockout, audited); `AdminUser.mustChangePassword` shows a
    notice in the panel until the user picks their own.
17. `7738f4f` **Final security review** — `docs/security-review-2026-10.md`:
    nothing exploitable; page views only for real sections; production
    compose forces `INSECURE_HTTP_PREVIEW` off; encrypt off-site backups.
18. `2dae70c` `npm run preview:build` restores `next-env.d.ts`/`tsconfig.json`.

Test counts at the end of the session: 97 unit, 41 DB, 25 browser — all pass.

Fifth session (2026-10-03), all on `main`:

1. `3cc26c9` **SMS sandbox and test accounts** for the owner's manual testing
   (see "Run it").
2. `20e9348` **Consultant mobile, photo, booking SMS** — `StaffProfile.mobile`
   (required in the form) gets an SMS with date/time for each new booking and
   each cancellation by the member; optional photo (`photoKey`, WebP, public
   at `/staff-photo/<uuid>/<lg|sm>` for active staff only).
3. `f1a8406` **Member identity** — profile needs person type
   (`INDIVIDUAL`/`LEGAL`), name, checked کد ملی, postal code; representatives
   of a legal entity add company name, checked شناسه ملی and an introduction
   letter, and wait for ADMIN approval (`Member.approval`, several people per
   company). National card image optional unless an ADMIN switches it on
   (`site_settings`, `src/modules/settings`). The rule lives in
   `src/modules/members/access.ts`; enroll/book refuse with
   `profile`/`pending`/`rejected`. Admin: `/admin/members` (pending tab, card
   switch), `/admin/members/<id>` (files, colleagues, approve/reject → SMS).
   Open: OQ-BD-20/21/22.
4. `b7c914b` **Rich page editor** (ADR-0005) — TipTap in the page form; HTML
   sanitized on save and render (`src/lib/rich-html.ts`); page images via
   `POST /admin/pages/images` → `/page-images/<id>/<lg|sm>`. Old Markdown
   pages still render and open converted.
5. `3793320` **Calendar links** — Google Calendar link next to every .ics
   download; the events calendar offers live subscriptions (Google, Apple
   webcal, Outlook); each member has a personal feed of bookings and courses at
   `/calendar/member/<id>/<hmac>.ics` (rotatable, `Member.calendarVersion`).
6. `51b7006` **Browser tests** for the new flows, and two form fixes found by
   them (radios cleared by React's form reset → `actionResultKey`).

Then the owner's 12-item list (asked "what essential panel features are
missing?"), in three stages, all on `main`:

- `4316592` rich editor also for news/events, course descriptions and staff
  bios (`*Html` columns; plain text kept in the old column for search).
- `b8610fd` «تنظیمات سایت» (ADMIN): editable contact details (setting
  `site.contact`, footer/contact/about/JSON-LD) and staff alerts per kind of
  new request (`alerts.recipients`; `alertStaff` in notifications).
- `82c7393` «خدمات مرکز» admin: tiles' title, short line, live/«به‌زودی» and
  a rich page per service (`services` rows; slugs/icons/links/layout in code).
- `1aad23e`, `86ba93a` course covers (`course-covers/`, public only when
  published).
- `ec937a1` «پیامک گروهی» (ADMIN): members / individuals / approved legal /
  a course's enrollees; `sms_broadcasts` history.
- `be63bbc` CSV exports of members and consulting requests (audited).
- `788041d` draft preview: `/admin/preview/articles/<id>`,
  `/admin/preview/pages/<slug>` (site chrome, staff only).
- `e92a724` «مرکز در یک نگاه» figures (`home.stats`, band hidden while empty).
- `fe44b54` editable site menu (`site.menu`, header reads it).
- `07e7965` «رمز را فراموش کرده‌ام» by email (`admin_password_resets`).
- `81b75f2` page history with preview and restore (`page_revisions`).

Owner's rule (2026-10-03, also in `CLAUDE.md`): every panel change updates the
staff guide `src/content/admin-guide.ts` in the same commit.

Test counts: 119 unit, 56 DB, 27 browser — all pass.

**Hosting (2026-10-03):** the owner bought «هاست لینوکس» at 130.185.76.122.
It is a shared cPanel host (LiteSpeed, cPanel on 2082/2083, FTP, server name
`s372.roodaki.com`, SSH closed). It cannot run this app (Node.js process,
PostgreSQL, sharp/argon2 native modules, Docker per ADR-0004). Recommended to
the owner: a Linux VPS (Ubuntu 24.04, 2 vCPU, 4 GB RAM, 40+ GB disk) with root
SSH by key, and DNS for `bdcenter.yazdccima.com` pointing at it. Not deployed.

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

## Remaining work

Every item of the owner's list that does not need the center is done. Waiting
on the center (see `docs/product/open-questions.md`):

1. Hosting and DNS (OQ-BD-08), then the first real deploy per
   `docs/operations/deploy.md` and the go-live list in
   `docs/security-review-2026-10.md`.
2. SMS provider and keys (OQ-BD-11) — without them nobody can sign up on a
   production build. SMTP account for notices and error alerts.
3. Certificate wording and signatory (OQ-BD-16); certificates stay off.
4. Content: the four «به‌زودی» service tiles (OQ-BD-06), postal code / email /
   extension (OQ-BD-02/03), service-desk form fields (OQ-BD-09), «در یک نگاه»
   figures (OQ-BD-18), final privacy/terms text (OQ-BD-12).
5. Payment gateway and prices (OQ-BD-15, OQ-BD-01); roster import (OQ-BD-01).
6. Off-site backup location (OQ-BD-19); the Anjoman license document (OQ-BD-17).

Decisions for the owner: convert Anjoman to WOFF2 (needs license OK); keep,
shorten or skip-on-mobile the home intro.

Proposed next (no center needed; the owner had not answered yet):

- A Persian letter to the center listing the open questions above.
- Cleanup: dev-DB test data (one course, article, member, staff profile and
  two test admins), and mark OQ-BD-10/12/13 as built (links and privacy page
  are admin-editable; status notifications exist).
- A plain-language go-live checklist for the owner.

## Public-IP preview (running on the owner's PC)

On 2026-10-03 the owner asked again to see the site on the LAN and their static
public IP. It runs from `.next-preview` (`npm run preview:build`, then
`npm run preview`, plain HTTP on `0.0.0.0:3020`) in its **own minimized window
titled «BDC site»**, started with PowerShell
`Start-Process cmd.exe -ArgumentList '/k','title BDC site (close this window to stop) && npm run preview' -WorkingDirectory 'F:\SITE SEARCH' -WindowStyle Minimized`
so it survives the Claude app being closed. LAN: `http://192.168.100.100:3020`.
Outside: `http://<static IP>:3020` once the owner's MikroTik forwards it
(`/ip firewall nat add chain=dstnat dst-address=<static IP> protocol=tcp dst-port=3020 action=dst-nat to-addresses=192.168.100.100 to-ports=3020`);
not verified from outside yet. The Windows firewall already allows Node.js.
Outbound requests show changing ISP addresses (31.171.100.x), so the static IP
cannot be read from here — ask the owner. Limits told to the owner: no HTTPS
(passwords travel in clear — demo only), member sign-up does not work (no SMS
provider), it shows the dev database, and it stops when the window closes or
the PC restarts. After a reboot: start Docker Desktop, `docker start
bdcenter-postgres`, then the window again (rebuild only if the code changed).

## Gotchas learned in this repo

- **Windows memory (commit limit) runs out on this PC**, not disk: many apps
  stay open for days (Claude, Codex, php ×63, SQL Server, MySQL, Chrome, the
  Docker VM) and the page file on C grows until C is full. Builds and Docker
  builds then fail with `VirtualAlloc failed` / "Zone Allocation failed", and
  a crashing Docker VM stops `bdcenter-postgres` (no restart policy:
  `docker start bdcenter-postgres`). Check headroom with
  `(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory`; run lint, tsc
  and tests one at a time when it is low. The owner rebooted on 2026-10-03
  (41 GB free afterwards); the page file is still system-managed on C (moving
  it to F was recommended). C: and F: are partitions of the same NVMe SSD.
- **Escapes get rewritten by the editing tools.** `\u` escapes written with
  Write/Edit become literal (often invisible) characters, and backslashes in
  Python heredocs run through Bash get altered. Build such characters from
  code points (`String.fromCharCode`, see `src/lib/rtl-text.ts`), put scripts
  in files with the Write tool, and use `chr(92)`/`chr(96)` in Python for
  backslashes/backticks. Backticks inside template-literal content
  (`src/content/admin-guide.ts`) must be escaped.

- **Middleware redirects show `http://localhost:<port>` locally.** Next.js
  relativizes same-origin middleware redirects against the address it listens
  on, but rewrites `127.0.0.1` to `localhost` in `request.url`, so with
  `-H 127.0.0.1` (dev, e2e) the two differ and the redirect stays absolute
  (and Lighthouse reports a CSP error for the prefetch). In Docker
  (`HOSTNAME=0.0.0.0`) they match and the Location is relative. Not a bug on
  the real site; checked in `next/dist/server/lib/router-utils/resolve-routes.js`.

- **The e2e database is never reset.** `prisma migrate reset` refuses to run
  under an AI agent without the owner's explicit consent, and wiping is not
  needed: every e2e run uses its own names (`runId`) and its own rate-limit
  key (`x-e2e-client` header via `CLIENT_IP_HEADER`). Drop `bdcenter_e2e`
  by hand if it ever grows too big; the next run recreates it.
- **DB tests delete members by phone prefix** (0993–0999, see `tests/db/*`);
  the sandbox test members use **0990** so `npm run test:db` leaves them alone.
- While the «BDC site» preview (or a dev server) runs, `prisma migrate dev`
  applies the migration but fails at the end renaming the query-engine DLL
  (EPERM). The generated JS/types are already written, so the code works;
  restart the dev server afterwards, and rebuild the preview.
- React 19 resets a form after its action; radio buttons then lose their
  choice. Key them with `actionResultKey(state)` from `src/lib/form-state.ts`
  and use `defaultChecked` (see the profile and review forms).
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
