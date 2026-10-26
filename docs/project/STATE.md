# Project state

> A short map of the project for any new chat. The code is the source of truth.
> Keep this under ~150 lines. Edit in place; do not turn it into a changelog.
> Never put secrets, credentials, or server addresses here.

Last updated: 2026-10-26

## What this app is

This is app is intended to be an Agriculture packing Facility management application. responsible for handling pallets of fruit through 2 different sorting and packaging steps. this includes creation of pallets and dedicated sorting stages, production of reports and statistics on command and an api for performing all fo the actions that can be performed through the GUI.

## Stack

- Next.js (App Router), React, TypeScript, Tailwind CSS
- Better Auth (self-hosted, no external auth service)
- PostgreSQL with Drizzle ORM
- Fully self-hosted. Deployment target: <TODO, e.g. VPS with Docker Compose>



## Current status

- Project folder is empty. Nothing is built yet.
- Not started: scaffold, database, auth, security baseline, all app features.



## Architecture map

Planned layout (update as it becomes real):

- `app/` : routes, layouts, route handlers
- `components/ui/` : generic reusable primitives
- `components/` or `features/<name>/` : feature-specific components
- `db/index.ts` : the single shared database client (server-only)
- `db/schema/` : Drizzle table definitions, split by domain
- `lib/auth.ts` : Better Auth server instance
- `lib/auth-client.ts` : Better Auth client
- `docs/project/` : this file, plans, and task briefs



## Key decisions

- 2026-10-26 Fully self-hosted, no third-party backend services, because the owner wants to control all data and infrastructure.
- 2026-10-26 Better Auth over Auth.js/Clerk/Supabase Auth, because it runs inside the app, stores data in our own database, and Auth.js is in maintenance mode.
- 2026-10-26 PostgreSQL + Drizzle over Prisma, because the schema is plain TypeScript and it pairs well with Better Auth's Drizzle adapter.
- 2026-10-26 PostgreSQL is never exposed to the internet. Only the app server has public ports.
- 2026-10-26 Library docs are pulled from Context7 instead of relying on model memory.



## Conventions not obvious from the code

- Database code is server-only. Never import `db` into client components.
- Schemas for user-submitted data omit or allowlist server-controlled fields (id, timestamps, userId, role).
- Security audit procedure lives in `.cursor/rules/security-audit.mdc` (invoke with `@security-audit`).



## Known issues and risks

- None yet. The owner has not set up backups or the production server.



## Next up

1. Define what the app does (fill in "What this app is").
2. Scaffold the Next.js project and commit it.
3. Add PostgreSQL (Docker Compose, not publicly exposed) and Drizzle.
4. Add Better Auth with the Drizzle adapter.
5. Add the security baseline (headers, env validation, rate limiting).
6. Build features.



## Commands

- Not set up yet. Add dev, type check, lint, test, and migration commands once the scaffold exists.

