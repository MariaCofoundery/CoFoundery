# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CoFoundery Align — a Next.js web app that produces reflection/comparison reports for prospective co-founders (work styles, decision patterns, values) to enable structured conversations before co-founding. German is the default locale (`de`), English is also supported.

The actual application lives in `web/`. The repo root also contains a set of markdown "agent" prompt files (`0-Orchestrator.md` through `9-Documentation_Agent.md`, `PROJECT_CONFIG.md`, `QUICK_START.md`) describing a manual multi-agent SDLC workflow (Requirements → Architecture → UX → Frontend → Backend → QA → DevOps) intended for use by a human driving separate agent invocations. These are project scaffolding, not something Claude Code needs to roleplay — ignore them unless the user explicitly invokes that workflow.

## Commands

All app commands run from `web/` (or via the root `package.json` proxies: `npm run dev|build|start|lint`, which just `--prefix web`).

```bash
cd web
npm run dev            # next dev
npm run build           # next build
npm run lint            # eslint
npm run ci:check        # tsc --noEmit && next build — run this before considering a change done
```

### Tests

There is no test runner config (no Vitest/Jest) despite `PROJECT_CONFIG.md` saying "Vitest + Playwright" — that doc is stale. Tests actually run on Node's built-in test runner (`node:test`) with a custom ESM loader (`web/scripts/register-ts-alias.mjs`) that resolves the `@/*` path alias and strips TypeScript types:

```bash
node --import ./scripts/register-ts-alias.mjs --test --experimental-strip-types <path-to-test-file> [more files...]
```

The only predefined script is `npm run test:founder-compat`, which hardcodes an explicit list of test files (scoring/reporting/questionnaire suites) in `web/package.json`. Many other `__tests__/` directories exist across the codebase (network, auth, teams, discovery, dashboard, etc.) but are **not** wired into any npm script — run them directly with the command above, and if you add a new test file that should run in CI, add it to the `test:founder-compat` file list (or ask whether a new script is warranted) rather than assuming it runs automatically.

Supabase/DB logic is tested separately with pgTAP suites in `supabase/tests/*.sql` (see below).

## Architecture

### Monorepo layout

- `web/` — the Next.js 15 (App Router) + React 19 + TypeScript app. Everything below refers to paths inside `web/` unless stated otherwise.
- `supabase/` — Postgres schema via migrations (`supabase/migrations/`, 100+ files, append-only), Edge Functions (`supabase/functions/`), and pgTAP DB tests (`supabase/tests/`).
- `docs/` — product/model specs, notably the founder-compatibility scoring model design docs and the `values-instrument-v1.json` assessment definition.

### Supabase is the source of truth for data model

Any change to tables/columns/policies must go through a **new** migration file in `supabase/migrations/` (never edit an applied migration in place) — this is enforced convention, not just style (see the (now-superseded but still-followed) rule in `SUPABASE_GUIDE.md`). Edge Functions and RLS policies must be kept consistent with the latest migration state. Row-level security is used heavily; public-facing data access goes through narrow `SECURITY DEFINER` RPCs (e.g. `get_public_network_profile`, `get_public_network_listing`) rather than opening table policies to `anon`, so that anonymous/public routes can't over-fetch.

### Feature-based source structure (`web/src/`)

- `src/features/<name>/` — one directory per product feature (co-located `__tests__/`, actions, types). Current features include `auth`, `scoring`, `questionnaire`, `reporting`, `matchingCore`, `discovery`, `network`, `teams`, `dashboard`, `founderLibrary`, `founderInTheWild`, `collaborationLab`, `commitmentLab`, `events`, `connections`, `account`, `email`, `security`, `navigation`, `i18n`, and others. When working on a feature, look for the matching directory before introducing new top-level structure.
- `src/app/` — Next.js route segments, grouped by route-group folders that gate which chrome/auth rules apply:
  - `(product)/*` — authenticated app surfaces (dashboard, network, teams, discovery, etc.)
  - `(marketing)/*` — public marketing pages
  - `(public-network)/network/{p,l}/*` — unauthenticated public profile/listing pages served via slugs, backed by the narrow RPCs above
  - `api/*` — route handlers, including `api/network/public-photos/[entityType]` for public asset serving
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server components/actions), `middleware.ts` (session refresh, wired into `src/middleware.ts`).
- `src/i18n/` — `next-intl` setup; supported locales are defined in `src/i18n/config.ts` (`de` default, `en`), with per-locale message bundles under `web/messages/<locale>/*.json` split by domain (e.g. `network.json`, `dashboard.json`, `auth.json`). Keep both locale files in sync when adding copy.

### Access/role routing

Users can hold combinations of capabilities (`hasFounder`, `hasAdvisor`, `hasNetwork`/`hasNetworkAccount`) rather than a single role. Two files encode the resulting routing logic and are worth reading before touching auth/navigation flows:

- `src/features/auth/productEntry.ts` (`resolveProductEntryPath`) — decides where a user lands post-auth based on their capability combination and profile completeness (e.g. a network-only user without a founder/advisor profile is routed into `/network` or forced through `/network/profile` first).
- `src/features/navigation/productChromePath.ts` (`isProductChromePath`) — decides which routes get the authenticated app chrome vs. render standalone (public network profile/listing pages explicitly opt out).

Both are pure functions with dedicated unit tests — when changing routing behavior, update the tests alongside the logic.

### Scoring/reporting domain

`src/features/scoring/`, `src/features/questionnaire/`, and `src/features/reporting/` implement the founder-compatibility assessment model: question registries, per-answer scoring runtime, matching/complement logic, and generated report text (hero/pattern/challenge/complement text builders). This is the most heavily test-covered area (`npm run test:founder-compat`) and has extensive design docs in `docs/` (`founder-compatibility-*.md`, `founder-matching-logic.md`, `self-report-model-*.md`) — check those before changing scoring semantics, since the model encodes specific psychometric/product decisions.
