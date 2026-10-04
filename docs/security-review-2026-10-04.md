# Security review and QA — 2026-10-04

Follow-up to [`security-review-2026-10.md`](security-review-2026-10.md)
(2026-10-03, commit `c7adae0`). Scope: everything merged since then — the
fifth session (PR #1: member identity uploads and approval, rich HTML editor
and page images, staff photos, course covers, settings, group SMS, exports,
draft preview, password reset by email, page history, calendar feeds, SMS
sandbox) and the sixth session (PRs #2–#13: CI, reminders and the scheduler,
announcement bar, surveys, course sessions, home texts, the advanced form
builder) — re-checked against OWASP Top 10 / ASVS level 2 as a checklist.
Fixes are in PR #14 (`fix/audit-hardening`, story ST-BD-08-05). The owner's
Persian summary is [`qa-report-2026-10-04.fa.md`](qa-report-2026-10-04.fa.md).

## Method

- Scripted inventory of every exported server action and route handler (89)
  with the guard its body calls, and of every admin page's own check.
- Code reading of each new feature against the checklist below.
- Probes of the HTML sanitizer with hostile input (`javascript:`/`data:` and
  backslash or protocol-relative links, event handlers, foreign images,
  unlisted styles).
- A browser sweep (Playwright, production build) of 23 public and 33 admin
  pages at 375 px and 1280 px: HTTP status, console errors, horizontal
  overflow, one `h1`, image `alt`, form labels, duplicate ids, nameless
  links/buttons.
- `pnpm audit --prod`; response headers of the production build.
- The existing suites (195 unit, 88 DB, 36 browser tests after the fixes),
  which already cover sign-up by code, capacity and double booking, members-
  only forms, concurrency limits and staff flows.

Not done, because they need tools downloaded from outside the project (the
owner's approval first): OWASP ZAP baseline/active scan, Semgrep, a Docker
image scan. They are listed under "Next" and must only ever target our own
local or preview instance.

## Findings and fixes

| #   | Severity | Area            | Finding                                                                                                                                                                                                                                                                                                                                                            | Status                                                                                                                                                                                 |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Medium   | Access control  | 23 admin pages (incl. the dashboard and both draft previews) relied on the layout's `requireAdmin()`. On client-side navigation Next.js renders only the new segment, and middleware checks only the token signature, not revocation (logout-everywhere, password change, deactivation). A revoked admin holding an unexpired cookie could load those pages' data. | Fixed in PR #14; `tests/admin-guards.test.ts` fails for any admin page without the call.                                                                                               |
| 2   | Medium   | QA / mobile     | The whole panel was ~1500 px wide on a phone: the side menu's grid column had no `min-w-0`, so its horizontal scroller stretched the page.                                                                                                                                                                                                                         | Fixed in PR #14; `e2e/admin-mobile.spec.ts`.                                                                                                                                           |
| 3   | Low      | Enumeration     | «رمز را فراموش کرده‌ام» created the reset token and sent the email before answering for a real account but answered at once for an unknown address — a timing oracle for panel accounts.                                                                                                                                                                           | Fixed in PR #14: token and email run in `after()`.                                                                                                                                     |
| 4   | Low      | Secrets in logs | With the SMS sandbox on in production, every message text (sign-in codes included) was written to the server log.                                                                                                                                                                                                                                                  | Fixed in PR #14: production logs only the recipient.                                                                                                                                   |
| 5   | Low      | Audit trail     | Saving a course could drop a legacy end date (from before sessions) without a trace (PR #7 follow-up).                                                                                                                                                                                                                                                             | Fixed in PR #14: `droppedEnd` in the audit entry.                                                                                                                                      |
| 6   | Low      | Input limits    | Stored home-page texts were not length-checked when read back (PR #8 follow-up).                                                                                                                                                                                                                                                                                   | Fixed in PR #14: per-field `max`, overlong values fall back to the built-in text.                                                                                                      |
| 7   | Medium   | Infrastructure  | The app connects to PostgreSQL as `POSTGRES_USER`, which the official image creates as a **superuser**. All SQL is parameterized (no injection found), but if one ever appeared, a superuser can read files or run programs in the database container (`COPY … PROGRAM`).                                                                                          | Fixed in this PR: the site connects as `bdcenter_app` (rows only), created by `migrate`; the app container no longer receives the owner's password. CI runs the DB tests as that role. |
| 8   | Low      | Abuse / cost    | «پیامک گروهی» (ADMIN only) has no per-day cap; a mistaken or hijacked ADMIN account could send many paid messages. The recipient count is shown before sending.                                                                                                                                                                                                    | Open — accepted for now; mandatory two-step login for ADMIN (owner decision) lowers the risk.                                                                                          |
| 9   | Info     | Test artifact   | The browser sweep logged a CSP error on public pages: Next.js turns `127.0.0.1` into `localhost` when it builds the `/account` → `/account/login` redirect for a prefetch. With a real host name the redirect is relative (checked on the preview build), so visitors are not affected.                                                                            | No change.                                                                                                                                                                             |

## Checked and found sound

| Area                  | Result                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actions and routes    | All 89 listed with their guard. Mutating admin actions call `requireAdmin`, ADMIN-only ones `requireAdmin('ADMIN')`; the ADMIN-only file routes (member files, member export) check the role. Public handlers are public on purpose: login steps, published media/covers/photos, `.ics` feeds, health, page-view beacon (rate limited), cron (secret). |
| Object ownership      | Member files ADMIN-only; certificates and bookings filtered by the signed-in member; page revisions restored only within their own page; form submissions reached only through their own form (PR #11); the members-only form rules re-checked server-side under a row lock.                                                                           |
| Tokens                | Password-reset and survey tokens: 32 random bytes, only a SHA-256 stored, single use, expiring (30 min / 30 days). Member calendar feed: HMAC with a rotatable version, timing-safe compare, nothing for deactivated members. Certificate codes are public by design.                                                                                  |
| XSS                   | Rich HTML sanitized on save and render (allow-listed tags, attributes, styles and colours; `http(s)`/`mailto`/`tel` links only, no protocol-relative or backslash tricks; images only from `/page-images/<id>/<lg\|sm>`). Probed with hostile input. Plain-text fields are rendered by React (escaped).                                                |
| Uploads               | Type allow-list + content signatures + 10 MB cap; random names outside `public/`; downloads as attachments with `nosniff`; the new inline preview is limited to checked JPEG/PNG/WebP with `CSP: default-src 'none'; sandbox`; public images (covers, page images, staff photos) are re-encoded with EXIF removed.                                     |
| CSV injection         | Every export goes through `toCsv` (formula neutralizing, leading spaces included).                                                                                                                                                                                                                                                                     |
| CSRF / origin         | Server actions are origin-checked by Next.js; the page-image upload route refuses a foreign `Origin`, and the admin cookie is `SameSite=Lax`, so a cross-site form post carries no session.                                                                                                                                                            |
| Open redirects        | Post-login targets restricted to same-site paths; announcement and menu links pass `isSafeHref` (no `//`, `/\`, `javascript:`).                                                                                                                                                                                                                        |
| Brute force / pumping | SMS codes per phone, per IP and site-wide; wrong codes per phone; admin login and the second step per account and IP; reset requests per email and IP; public forms per IP; «answer arrived» emails per address per day (PR #10).                                                                                                                      |
| Sessions              | Signed tokens with audience and version; revocation honoured by every page and action (after fix 1).                                                                                                                                                                                                                                                   |
| Error pages           | Persian pages with a digest only; details stay in `/admin/system`.                                                                                                                                                                                                                                                                                     |
| Dependencies          | `pnpm audit --prod`: no known vulnerabilities. One dev-only advisory (`braces` via ESLint; no patched version; never shipped).                                                                                                                                                                                                                         |
| Headers               | CSP (with the accepted `'unsafe-inline'` scripts), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; HSTS when served over HTTPS.                                                                                                                                                                                           |
| Accessibility sweep   | Every page has one `h1`; no image without `alt`; no unlabeled form control (the editor's hidden file input is not focusable); no duplicate ids; no nameless links or buttons.                                                                                                                                                                          |

## Hardening ideas evaluated

| Idea                                      | Verdict                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Least-privilege database role             | **Done** (finding 7): `bdcenter_app` with only `SELECT/INSERT/UPDATE/DELETE`; checked to be refused `CREATE TABLE`, `DROP`, the migration table and `COPY … PROGRAM`. |
| Mandatory two-step login for ADMIN        | **Recommended** (owner decision): the code exists; enforce it by refusing ADMIN pages until set up.                                                                   |
| Nonce-based CSP without `'unsafe-inline'` | Not now: it makes every page dynamic (no static caching) and needs the intro script reworked. Revisit after go-live.                                                  |
| Account lockout notice by email           | Useful once SMTP exists (OQ-BD-23).                                                                                                                                   |
| Stricter limits on admin uploads          | Not needed: ADMIN/EDITOR only, re-encoded, 10 MB cap.                                                                                                                 |
| `security.txt`                            | Needs a real contact address (OQ-BD-03); add with it.                                                                                                                 |
| Encrypted off-site backups                | Already in the backup guide; destination is OQ-BD-19.                                                                                                                 |
| Proxy-level limits (fail2ban-like)        | Optional: the app limits per IP in the database; Caddy's rate-limit plugin would need a custom build.                                                                 |
| Image scan, ZAP, Semgrep                  | Run once the owner approves downloading the tools; only against our own instance.                                                                                     |

## Next

1. Owner decisions: mandatory two-step login for ADMIN; a daily cap for
   group SMS (finding 8).
2. With the owner's OK: ZAP baseline + Semgrep + image scan against the
   local production build; add any findings here.
3. Before go-live: the list at the end of the previous review still applies.
