# ADR-0001: Single Next.js app, modular by domain (not a split API/web pair)

- Status: Accepted
- Date: 2026-09-29

## Context

This site is a companion microsite for the Yazd Chamber of Commerce's Business
Development Center. It is independent from the "Roshd Afarinan" platform
(`F:/RoshdAfrinan Site`), which uses a two-app split (NestJS API + Next.js web)
justified by its much larger scope (27 EPICs, feasibility/financial-engine/AI/
blockchain interfaces, multi-year roadmap).

This project's scope is smaller: mostly institutional content (news, events,
service tiles, outbound links to the Chamber's own systems) plus two
transactional flows (training enrollment, consulting requests) and a generic
dynamic form builder. No mobile client or third-party API consumer is
anticipated in this phase.

## Decision

- **One Next.js (App Router) application**, serving both the public site and
  the admin/editor dashboard, with Route Handlers for mutations instead of a
  separate API service.
- **Modular monolith internally**: each domain (`content`, `services`,
  `training`, `consulting`, `forms`, `membership`, `contact`) owns its Prisma
  models and a service module (`src/modules/<domain>/service.ts`). Other
  domains call that service, never the domain's Prisma models directly — the
  same rule Roshd Afarinan's `apps/api` enforces, just inside one runtime
  instead of across two.
- **PostgreSQL + Prisma**, Zod validation shared between server actions and
  forms.
- Institutional copy lives in `src/content/*` (typed, reviewed text) until it
  moves into the `Page` CMS model — mirrors Roshd Afarinan's ADR-0005 pattern,
  which proved itself there.

## Consequences

- Faster to build and cheaper to run for this scope: one Docker image, one
  deploy, no cross-service contract to keep in sync.
- If this site later grows into something Roshd-Afarinan-sized (a real mobile
  app, external API consumers, a much larger team), the domain modules can be
  extracted into a separate API service with moderate effort, because the
  module boundary already exists — it just moves from an in-process call to
  an HTTP call.
- Until `OQ-BD-01` (membership-tier pricing) is answered, `membership`
  resolves and records a visitor's tier but never gates a price or payment.

<!-- Append future amendments as a dated "## Update (YYYY-MM-DD): ..." section below, not by editing the history above. -->
