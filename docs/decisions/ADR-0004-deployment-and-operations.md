# ADR-0004: Deployment, error reporting and backups

- Status: Accepted
- Date: 2026-10-02

## Context

The owner asked (2026-10-01) for a server deployment with HTTPS and a domain,
automatic backups of the database and uploaded files, and automatic error
reporting. The hosting box and DNS are still open (OQ-BD-08), so the setup
must run on any Linux server with Docker, and must not depend on a paid or
foreign SaaS: error trackers such as Sentry may be unreachable from Iran or
need an account and a data-processing agreement nobody has made.

## Decision

- **One Docker Compose stack** (`docker-compose.prod.yml`), the app still a
  single Next.js service (ADR-0001):
  - `caddy` — the only public service (80/443). It gets and renews the TLS
    certificate itself and overwrites `X-Real-IP`, which the app reads as
    `CLIENT_IP_HEADER` for rate limiting.
  - `app` — image target `runner`: Next.js `output: 'standalone'`, non-root,
    with a health check on `/api/health` (database reachable).
  - `migrate` — image target `tools` (full dependencies + Prisma CLI). It runs
    `prisma migrate deploy` and exits; `app` starts only after it succeeds. The
    same image runs one-off commands such as `pnpm admin:create`.
  - `db` — PostgreSQL 16, never published to the host.
  - `backup` — a `postgres:16-alpine` container that runs
    `deploy/backup/backup.sh` daily.
- **Error reporting inside the app.** `src/instrumentation.ts`
  (`onRequestError`) passes every server error to the `errors` module, which
  keeps one `ErrorGroup` row per fingerprint (error name + message with
  ids/numbers masked + route pattern) with a count. Query strings are never
  stored. A new or reopened error emails `ERROR_ALERT_EMAIL` (capped at 10 per
  hour). ADMINs see and resolve errors on `/admin/system`. Middleware (edge
  runtime) errors only reach the container log.
- **Backups as files in a volume.** `pg_dump --format=custom` (checked with
  `pg_restore --list`) and a `tar.gz` of the storage volume, written under a
  temporary name and renamed when complete; the newest `BACKUP_KEEP` of each
  are kept (by count, never by age). A failed run writes `last-failure.txt`.
  The app mounts the backups volume read-only and `/admin/system` warns when
  the newest database backup is older than 36 hours or the last run failed.

## Consequences

- Backups live on the same server as the data. They protect against mistakes
  and corruption, not against losing the server: copying them off the box
  (another server, the Chamber's NAS) is a hosting decision, recorded as
  OQ-BD-19.
- Errors are stored in the same database they may be about: if the database
  is down, errors only reach the log (and the health check fails).
- Client-side (browser) errors are not collected; the public error page shows
  the server digest so staff can match a visitor's report to a row.
