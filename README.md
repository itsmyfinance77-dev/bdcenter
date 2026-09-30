# مرکز توسعه کسب‌وکار — bdcenter.yazdccima.com

Public microsite for the Business Development Center affiliated with the Yazd
Chamber of Commerce. Independent project from `F:/RoshdAfrinan Site`.

| | |
| --- | --- |
| Requirements | [docs/product/requirements.md](docs/product/requirements.md) |
| Open questions | [docs/product/open-questions.md](docs/product/open-questions.md) |
| Architecture decision | [docs/decisions/ADR-0001-architecture.md](docs/decisions/ADR-0001-architecture.md) |
| Engineering rules | [CLAUDE.md](CLAUDE.md) |
| Current state & next steps | [docs/HANDOFF.md](docs/HANDOFF.md) |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Prisma · Zod.
One app, modular by domain — see ADR-0001.

## Local development

Prerequisites: Node 22+, Docker (for the dev database).

```bash
npm install
docker compose up -d          # PostgreSQL 16 on 127.0.0.1:5434
cp .env.example .env          # fill SESSION_SECRET and FILE_URL_SECRET
npm run db:migrate:dev -- --name init
npm run db:seed
npm run dev                   # http://localhost:3000
```

## Admin panel

`/admin` — news & events, consulting requests, contact messages, form builder
with submissions (status, CSV export, attachment download), users and audit log.

- Create the first account (password is printed once unless `ADMIN_PASSWORD` is set):

  ```bash
  npm run admin:create -- --email you@example.com --name "Full Name"
  ```

- Roles: **ADMIN** manages everything; **EDITOR** handles content and incoming
  requests but not forms, users or the audit log.
- Sessions are signed with `SESSION_SECRET` (8 h). Deactivating a user takes
  effect on their next request. Login is throttled per email and per IP
  (in-memory — single instance only).
- Event dates are typed in the Solar Hijri calendar, Tehran time
  (`۱۴۰۵/۰۷/۱۵ ۱۸:۳۰`).

## Quality gate

```bash
npm run verify   # lint + typecheck + build
```

---

© مرکز توسعه کسب‌وکار — اتاق بازرگانی، صنایع، معادن و کشاورزی یزد.
