# مرکز توسعه کسب‌وکار — bdcenter.yazdccima.com

Public microsite for the Business Development Center affiliated with the Yazd
Chamber of Commerce. Independent project from `F:/RoshdAfrinan Site`.

|                            |                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Requirements               | [docs/product/requirements.md](docs/product/requirements.md)                         |
| Open questions             | [docs/product/open-questions.md](docs/product/open-questions.md)                     |
| Architecture decisions     | [docs/decisions/](docs/decisions/) (ADR-0001 architecture, ADR-0002 member accounts) |
| Engineering rules          | [CLAUDE.md](CLAUDE.md)                                                               |
| Current state & next steps | [docs/HANDOFF.md](docs/HANDOFF.md)                                                   |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Prisma · Zod.
One app, modular by domain — see ADR-0001.

## Local development

Prerequisites: Node 22+, Docker (for the dev database).

```bash
npm install
docker compose up -d          # PostgreSQL 16 on 127.0.0.1:5434
cp .env.example .env          # fill SESSION_SECRET and OTP_SECRET
npm run db:generate           # Prisma client (node_modules/.prisma/client)
npm run db:migrate:deploy     # apply prisma/migrations
npm run db:seed
npm run dev                   # http://localhost:3010 (bound to 127.0.0.1)
```

## Public site

Home, about, contact, news & events (cover images, Markdown bodies), service
tiles, consulting request form, dynamic forms with uploads, and training
courses at `/courses`.

**Member accounts** (`/account`, ADR-0002): visitors sign up / sign in with a
mobile number and a 6-digit SMS code, keep a profile and enroll in courses.
In development the code is printed in the server log (`SMS_PROVIDER=console`);
production needs a real SMS provider (OQ-BD-11).

## Admin panel

`/admin` — news & events (with cover image), training courses and their
enrollments (status, CSV export), consulting requests, contact messages, form
builder with submissions (status, CSV export, attachment download), site
members, panel users and audit log.

- Create the first account (password is printed once unless `ADMIN_PASSWORD` is set):

  ```bash
  npm run admin:create -- --email you@example.com --name "Full Name"
  ```

- Roles: **ADMIN** manages everything; **EDITOR** handles content, courses and
  incoming requests but not forms, members, users or the audit log.
- Sessions are signed with `SESSION_SECRET` (8 h). Logout, a password change
  or deactivation revokes every copy of the session at once.
- Login, public forms and SMS codes are rate limited in the database
  (`rate_limit_buckets`), so limits hold across restarts and instances.
- Event dates are typed in the Solar Hijri calendar, Tehran time
  (`۱۴۰۵/۰۷/۱۵ ۱۸:۳۰`).

## Quality gate

```bash
npm run verify    # lint + typecheck + unit tests + build
npm run test:db   # integration tests against the dev database
npm run test:e2e  # browser tests (production build, own database, installed Chrome)
```

**CI:** `.github/workflows/ci.yml` runs on every pull request and every push to
`main`: install, `prisma migrate deploy` on an empty PostgreSQL 16, lint,
`format:check`, typecheck, unit tests, DB tests and the production build (job
«Lint, types, tests, build»), and the browser tests (job «Browser tests»).
`scripts/ci-env.sh` writes a `.env` with throwaway secrets. A PR is merged only
when both jobs are green on its reviewed head.

The `standalone` output is only built in Docker (`NEXT_STANDALONE=1`); on
Windows without Developer Mode it fails with `EPERM ... symlink`.

---

© مرکز توسعه کسب‌وکار — اتاق بازرگانی، صنایع، معادن و کشاورزی یزد.
