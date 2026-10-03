# Security review — 2026-10-03

Scope: the whole application at commit `c7adae0` plus the production setup
(`Dockerfile`, `docker-compose.prod.yml`, `deploy/`). Method: code reading with
scripted checks (every server action and route handler listed with its auth
guard), dependency audit, and the existing unit, DB and browser tests.

## Result

No exploitable vulnerability found. Two hardening changes and one documentation
change were made (below).

| Area              | Finding                                                                                                                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies      | `pnpm audit --prod`: no known vulnerabilities. One dev-only advisory (`braces`, via ESLint; no patched version; never shipped).                                                                                                                                                                           |
| Secrets           | None in tracked files or history; only `.env.example` (empty values). `.env` and `.env.production` are git-ignored.                                                                                                                                                                                       |
| Access control    | All 59 server actions / route handlers checked: every mutating admin action calls `requireAdmin` (ADMIN-only ones `requireAdmin('ADMIN')`); member actions call `requireMember`; the rest are public on purpose and only expose published data (covers, `.ics`, health). ADMIN-only pages refuse editors. |
| Object ownership  | Member bookings, enrollments and certificates are always filtered by the signed-in member's id (certificate case covered by the e2e suite).                                                                                                                                                               |
| Injection         | Raw SQL only with numbered parameters; table names from a fixed map. Markdown drops HTML and unsafe link schemes; the two `dangerouslySetInnerHTML` uses are static (JSON-LD with `<` escaped, intro script). CSV exports neutralize formulas.                                                            |
| Uploads           | Type allow-list plus content signatures, 10 MB cap, random names outside `public/`, traversal guard, downloads as attachments with `nosniff`, audited. Covers re-encoded (EXIF dropped).                                                                                                                  |
| Redirects         | Post-login targets restricted to same-site paths (`/admin…`, member sections).                                                                                                                                                                                                                            |
| Sessions          | HMAC-SHA256 tokens with audience and version (revocation on logout, password change/reset, deactivation); `httpOnly`, `SameSite=Lax`, `Secure` in production; admin cookie scoped to `/admin`, second-step cookie to `/admin/login` for 5 minutes.                                                        |
| Passwords / codes | argon2id; login throttled per email and per IP with a constant-time dummy hash for unknown emails. SMS codes: 6 digits, 2 minutes, stored as HMAC, atomic 5-attempts-per-15-minutes cap, single use. TOTP secrets AES-256-GCM encrypted, replay-protected, recovery codes hashed.                         |
| Required secrets  | `SESSION_SECRET`, `OTP_SECRET` (≥ 32 chars) and `DATA_ENCRYPTION_KEY` (32 bytes) are refused when missing or short.                                                                                                                                                                                       |
| Headers           | CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; HSTS behind HTTPS (verified through Caddy).                                                                                                                                                   |
| Logs              | SMS/email bodies and codes are printed only in development; production logs hold no codes.                                                                                                                                                                                                                |
| Infrastructure    | App runs as non-root; only Caddy is published (80/443); PostgreSQL has no host port; `X-Real-IP` is overwritten by Caddy, so rate limiting cannot be bypassed by a forged header.                                                                                                                         |

## Changes made

1. **Page-view counter:** only real site sections are counted, at most one
   level deep (`normalizeTrackedPath`). Before, any made-up address could add
   a row (stats noise, table growth). Certificate pages (they show a name) and
   single-slot booking pages are no longer counted.
2. **Production compose:** `INSECURE_HTTP_PREVIEW` is forced empty for the app,
   so a stray value in `.env.production` cannot drop `Secure` cookies and HSTS.
3. **Backup guide:** encrypt copies before they leave the server.

## Accepted risks (documented trade-offs)

- CSP allows `'unsafe-inline'` scripts (Next.js bootstrap, intro script); a
  nonce-based policy would make every page dynamic. All other sources are
  locked to the site's origin.
- Five wrong passwords lock an admin email for 15 minutes, which someone could
  use to annoy an admin. An ADMIN can lift it with «تعیین رمز تازه».
- Backups are stored unencrypted on the server itself (same trust as the
  database volume); off-site copies are OQ-BD-19.

## Before going live

- Generate every secret with `openssl` as in `deploy/env.production.example`;
  `chmod 600 .env.production`.
- Turn on two-step login for every panel account; remove test accounts.
- Server: allow only 80/443 (and SSH with keys only); keep the OS updated.
- Set `ERROR_ALERT_EMAIL`; check `/admin/system` weekly.
- Run `pnpm audit --prod` monthly and before each deploy.
