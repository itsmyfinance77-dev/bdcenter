# مرکز توسعه کسب‌وکار — bdcenter.yazdccima.com

Public microsite for the Business Development Center affiliated with the Yazd
Chamber of Commerce. Independent project from `F:/RoshdAfrinan Site`.

| | |
| --- | --- |
| Requirements | [docs/product/requirements.md](docs/product/requirements.md) |
| Open questions | [docs/product/open-questions.md](docs/product/open-questions.md) |
| Architecture decision | [docs/decisions/ADR-0001-architecture.md](docs/decisions/ADR-0001-architecture.md) |
| Engineering rules | [CLAUDE.md](CLAUDE.md) |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Prisma · Zod.
One app, modular by domain — see ADR-0001.

## Local development

Prerequisites: Node 22+, PostgreSQL (local or Docker).

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, SESSION_SECRET, FILE_URL_SECRET
npm run db:migrate:dev -- --name init
npm run db:seed
npm run dev                   # http://localhost:3000
```

## Quality gate

```bash
npm run verify   # lint + typecheck + build
```

---

© مرکز توسعه کسب‌وکار — اتاق بازرگانی، صنایع، معادن و کشاورزی یزد.
