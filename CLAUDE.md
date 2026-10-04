# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MADE2FOUND (repo and technical keys still say CoFoundery) — a Next.js web app that helps prospective and existing co-founders understand how they work, compare that descriptively within a team, and record explicit agreements. German is the default locale (`de`), English is also supported.

The actual application lives in `web/`. The repo root also contains a set of markdown "agent" prompt files (`0-Orchestrator.md` through `9-Documentation_Agent.md`, `PROJECT_CONFIG.md`, `QUICK_START.md`) describing a manual multi-agent SDLC workflow (Requirements → Architecture → UX → Frontend → Backend → QA → DevOps) intended for use by a human driving separate agent invocations. These are project scaffolding, not something Claude Code needs to roleplay — ignore them unless the user explicitly invokes that workflow.

**The current product reference is `docs/research/phase-9/`** (9.0 system audit, 9.1–9.3 implementation reports), plus `docs/research/phase-8/phase-8.5a-v3-product-reporting.md`. Much older code, instruments, reports and routes still exist for history, data compatibility, account lifecycle, advisor legacy access and stored URLs — their existence does not make them current. Check those docs before treating any module as the product reference.

Technical keys such as `cofoundery_locale` and other `cofoundery_*` names must not be renamed wholesale during the later rebrand; migrate them deliberately, if at all.

## Product rules (current)

- **No scores, no typology.** No overall alignment/compatibility/founder-fit score, success probability, founder types, traffic lights, hidden ranking, or radar charts. Similarities and differences are descriptive and conversation-oriented, never "compatible/incompatible".
- **Keep the levels separate.** Person (portable workstyle, capability, strengths, direction) ≠ Team (`founder_teams` + `founder_team_members`, 2–4 founders) ≠ Relationship (a concrete pair, not a team) ≠ Venture (`venture-alignment-v1`, `assessments.venture_id` = team id) ≠ Founder Setup (20 topics, the system of record for agreements). Commitment Lab, Read My Mind and Founder in the Wild are deliberately pair-scoped.
- **Consent/share contracts are separate and never implied by each other:** research consent, workstyle/alignment share, team membership, advisor grants (person, team review, setup), FIND/discovery opt-in, capability disclosure. Joining a team grants none of them. A historical agreement is never a current team confirmation — confirmations must match the current roster.
- **Research isolation.** Workstyle v0.4 has 29 product core answers (`alignment_answers`) and 23 private research/candidate answers (`workstyle_research_responses`). `research`, `core_research`, DEC and FS never reach product reports, FIND or normal advisor views. No silent fallback to older assessment versions.
- Capability: `application_level`, `ownership_wish` and `sourcing` are separate axes; only `own` counts as ownership.

## Commands

All app commands run from `web/` (or via the root `package.json` proxies, which just `--prefix web`). Node is pinned to `24.x` (`engines`).

```bash
cd web
npm run dev            # next dev
npm run build          # next build
npm run lint           # eslint
npm test               # every test file under src/
npm run db:test        # pgTAP suites via `npx supabase test db` (needs Docker + local Supabase)
npm run ci:check       # tsc --noEmit && npm test && next build && npm run db:test — run this before considering a change done
```

`db:test` (`scripts/db-test.mjs`) only runs when a `supabase_db_*` Docker container is up. Otherwise it prints a large "DATENBANKPRUEFUNGEN UEBERSPRUNGEN" banner and **exits 0**, so a green `ci:check` does not prove the DB suites ran. Before merging a migration, run `npx supabase start && npm run db:test` yourself.

### Local development helpers

Both of these are locked to a local Supabase URL (127.0.0.1/localhost, checked via `isLocalSupabaseUrl` in `src/features/auth/devLogin.ts`), not to `NODE_ENV`:

- `npm run dev:seed` — writes a local test profile using the service-role key (`scripts/dev-seed.ts`).
- `/dev-login` — signs in without going through email. Magic-link mails are not sent to real inboxes locally; they land in the local Supabase mail inbox at `http://localhost:54324`.

`npm run ai:worker` (`scripts/ai-worker.ts`) is a laptop-side process. It polls a DB job queue and sends a heartbeat that drives the "AI available" indicator. It logs in with its own account listed in `ai_workers` rather than the service-role key. It needs `AI_WORKER_EMAIL`/`AI_WORKER_PASSWORD` in `web/.env.local`, and optionally `AI_MODEL`/`OLLAMA_URL` (it runs against a local Ollama). `ai:eval`, `tts:build`, `item-analysis` and the `export:*` scripts are further one-off scripts under `web/scripts/`.

### Tests

There is no test runner config (no Vitest/Jest) despite `PROJECT_CONFIG.md` saying "Vitest + Playwright" — that doc is stale. Tests run on Node's built-in test runner (`node:test`) with a custom ESM loader (`web/scripts/register-ts-alias.mjs`) that resolves the `@/*` path alias and strips TypeScript types.

`npm test` matches `src/**/*.test.ts`, so a new test file is picked up by its name alone — do **not** register it anywhere. The pattern is deliberately not restricted to `__tests__/` directories: one suite lives outside one (`src/features/reporting/advisor-report/advisorReportExamples.test.ts`) and went unrun for a long time under a narrower pattern.

To run a single file while iterating:

```bash
cd web
node --import ./scripts/register-ts-alias.mjs --test --experimental-strip-types <path-to-test-file> [more files...]
```

**Many UI tests read page/component source as text** and assert with regexes, `indexOf` ordering and exact literals (e.g. dashboard section order, team homebase order, `ProductShell` menu structure). Restructuring a page usually breaks several suites across features (`grep -rl "<file name>" src --include=*.test.ts`). Update the positive structure assertions to the new layout, but keep the negative guarantees (no score/percentage, no workbook link, loaders stay read-only, etc.).

`npm run test:founder-compat` is a hardcoded fast subset for the legacy compatibility model — a convenience, not a gate. Nothing is gated: **there is no CI in this repo** (no GitHub Actions workflow), so no test, typecheck or lint runs automatically on push, and Vercel deploys `main` on a successful `next build` alone. `npm run ci:check` is the manual stand-in and has to actually be run. `web/vercel.json` exists and configures the daily CONNECT suggestion cron (`0 7 * * *`); it is not a CI test gate.

Supabase/DB logic is tested with pgTAP suites in `supabase/tests/*.sql` (run by `db:test`, see above). Many of them pin visibility/consent and RLS guarantees, so treat them as the spec for those rules.

## Architecture

### Monorepo layout

- `web/` — the Next.js 15 (App Router) + React 19 + TypeScript app. Everything below refers to paths inside `web/` unless stated otherwise.
- `supabase/` — Postgres schema via migrations (`supabase/migrations/`, 260+ files, append-only), Edge Functions (`supabase/functions/`: session create/get/save-progress/complete), and pgTAP DB tests (`supabase/tests/`).
- `docs/` — product/model specs (mostly German). `docs/research/phase-9/` and `docs/research/phase-8/` are current; many other files in `docs/` describe earlier instrument generations.

### Supabase is the source of truth for data model

Any change to tables/columns/policies must go through a **new** migration file in `supabase/migrations/` (never edit an applied migration in place) — this is enforced convention, not just style (see the (now-superseded but still-followed) rule in `SUPABASE_GUIDE.md`). Edge Functions and RLS policies must be kept consistent with the latest migration state. Row-level security is used heavily; much of the real access boundary lives in narrow `SECURITY DEFINER` RPCs (e.g. `get_workstyle_product_team`, `get_public_network_profile`) rather than in table policies, so RLS alone does not describe the contract.

### Feature-based source structure (`web/src/`)

- `src/features/<name>/` — one directory per product feature (co-located `__tests__/`, actions, types). There are 40+ of them (`ls src/features`). When working on a feature, look for the matching directory before introducing new top-level structure.
- `src/app/` — Next.js route segments. Route groups (`(product)`, `(marketing)`, `(public-connect)`) only organise folders; several product pages live outside `(product)` (`app/me/*`, `app/report/*`, `app/join/*`). `api/*` holds route handlers (image serving, the cron target `api/cron/connect-suggestions`, invitation flows).
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server components/actions), `middleware.ts` (session refresh, wired into `src/middleware.ts`).
- `src/i18n/` — `next-intl` setup; supported locales are defined in `src/i18n/config.ts` (`de` default, `en`), with per-locale message bundles under `web/messages/<locale>/*.json` split by domain. Keep both locale files in sync when adding copy (parity is tested).

### App chrome, roles and navigation

- There is no `(product)/layout.tsx`. The root `src/app/layout.tsx` wraps **every** page in `ProductShell` (`src/features/navigation/ProductShell.tsx`), and `isProductChromePath` (`productChromePath.ts`) decides whether the chrome renders for a path. Changes to `ProductShell` affect all pages, including Connect.
- Capabilities are combinations, not one role: `hasFounder`, `hasAdvisor`, `hasConnect`/`hasConnectAccount`. In the shell they come from `getDashboardRoleViews` (`features/dashboard/dashboardRoleData.ts`): `hasFounder` = `profiles.roles` contains founder; `hasAdvisor` = roles contains advisor **or** a row in the legacy `founder_alignment_workbook_advisors` **or** in `relationship_advisors` (advisor person grants/orgs/team reviews are not counted). Post-login routing (`features/auth/postAuthRedirect.ts` → `productEntry.ts` `resolveProductEntryPath`) uses `profiles.roles` only — the two definitions differ.
- `ProductShell` derives `activeView` (`"founder" | "advisor"`) from the path (`/advisor/*` → advisor) or a per-page `ProductNavigationOverride`; `DashboardViewSwitch` shows the founder/advisor toggle only for users with both roles. These flags shape the UI only — every advisor/founder page enforces access server-side (grants, RPCs, RLS); never derive permissions from navigation state.

### Instrument versioning and the current workstyle

Every stored answer belongs to a named questionnaire version (an "instrument"). `src/features/instruments/instruments.ts` lists them:

- `INSTRUMENT_IDS` is mirrored in the `instruments` table, where it is the foreign key for answers. A test keeps the two in sync, so a new ID needs both a migration and a code change.
- An ID never gets a new meaning, and a retired one is archived rather than deleted. DB `status` (`draft`/`archived`) is not a reliable signal of what the product offers.
- **`CURRENT_INSTRUMENT_ID` is legacy despite its name**: it is `founder-compatibility-v1`, the old base/values world that historical readers still need. Do not swap it.
- **The current journey is named in `instruments/workstyle/current.ts`**: `founder-workstyle-pretest-8-5a-v3` (item version `8.4-v0.4`, manifest `3.0.0`), survey at `/research/workstyle-pretest?version=8.5a-v3`, report at `/me/profile/workstyle`. Comparisons require identical instrument/manifest/item versions; `assertInstrument` throws on a mismatch instead of guessing.

Six product areas: EVI, EXP, EL, VOICE, AMB, ORG. DEC (candidate) and FS (research facet) are not product areas. Do not add constructs.

### Current vs historical surfaces

- **Current reporting** is `src/features/reporting/workstyle/` (`data.ts`, `model.ts`, `IndividualWorkstyle`, `TeamWorkstyleReport`, schema `workstyle-report/1.0.0`): deterministic, score-free, 2–4 members, report → Founder Setup handoff via `setupHandoff.ts`. Product snapshots (`workstyle_product_snapshots`) are only served while current permitted input still equals the stored input — revocation protection, not an archive.
- **Current routes:** `/me/profile`, `/me/profile/workstyle`, `/profile` (editor), `/discovery*`, `/connections`, `/teams/[teamId]` (+ `/workstyle`, `/setup`, `/roles`, pair labs), `/founder-alignment/vorhaben*` (venture alignment — current despite the old path prefix), `/advisor/*`, `/team-intake*`.
- **Historical / legacy** (kept readable for stored data and links; not part of the current journey, do not build on them): the v1 compatibility/scoring model in `src/features/scoring/`, `src/features/questionnaire/` and the old report engines in `src/features/reporting/` (`FounderMatchingView`, `SelfReportView`, hero/pattern/challenge text builders, workbook code) — note that `reporting/` also holds current code such as `profileReadModel.ts` and `workstyle/`; `/me/base`, `/me/values`, `/me/report`, `/report/[sessionId]`, `/matching/[id]/report`; `founder-profile-v1` (`/founder-alignment/profil`); v2/v2.1 pilots; the legacy workbook (`/founder-alignment/workbook*`, read-only since phase 9.3) and matching workspaces (`/workspaces/[id]`, read-only). Their tables, advisor bridge (`relationshipAdvisorAccess.ts`) and account-deletion/scrub functions are still load-bearing — do not remove them as part of UI work.
