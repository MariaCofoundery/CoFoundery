# Localization P0 implementation — 2026-10-11

## Decision and isolation

**NO-GO for the English beta:** six application-code causes are addressed; P0-07 (actual Auth email delivery) is still open. Auth/Supabase changes and deployment were expressly excluded. This is not a claim of complete end-to-end beta acceptance.

- Branch: `fix/localization-beta-blockers`
- Worktree: `/private/tmp/made2found-localization-fix`
- Clean base: `origin/main`, `701fab7519ad1c9db041826e2ad37c08b2fd95fc`.
- Binding audit read from the separate audit tree: `/private/tmp/made2found-localization-qa/docs/research/localization-beta-qa.md` (SHA256 `6c91f35c11dd7d5eb46b3ada6ff75ea439607a43879527437e97d4f3cb8936df`). Its uncommitted documents were not copied into main or changed.
- No commits, push, deployment, migrations, Auth/DB/Supabase changes or persisted test data.

## Seven-cause recheck

| Audit ID | Implementation | Acceptance evidence / remaining limit |
| --- | --- | --- |
| P0-01 | Individual renderer, glance/signature, six area narratives, questions/options, missing/exception states and appendix support EN. Request locale passed by individual, profile, print and advisor callers. | Real component SSR: full/short, all six areas and response branches. EN/DE narrative claim and pattern parity. Caller regression checks. Authenticated profile/advisor page QA remains pending. |
| P0-02 | Team report, discussion prompts, embedded venture readouts, skills matrix and confirmed Founder Setup titles/outcomes support EN. | Real SSR for 2/3/4 people, empty/missing states, divergent/similar answers and embedded sections. Raw alignment status comparisons remain German internally and unchanged; translation happens after grouping. Browser/PDF fixtures checked. |
| P0-03 | Current v3 ALIGN entry, context/consent, active assessment controls, questions/options, feedback/progress, research and finish copy support EN. | Live EN language-switch cookie and entry at both widths; rendered flow/field tests. All 55 current v3 items including revised research variants covered. Authenticated assessment submission not exercised. |
| P0-04 | Venture screen overlay, question/option/missing display, confirmation, answer readout, header/nav and route states support EN. | Founder/Venture real component SSR, every field format and missing reason. Partner-name interpolation and user-answer preservation tested. Browser fixtures at both widths; live protected route redirects to login. |
| P0-05 | Shared Capability matrix selects DE/EN bundle and localized explanation/chips, experience, responsibility and empty states. Roles caller passes locale. | Real populated and empty matrix/report SSR; real taxonomy identifiers; browser at both widths. Coverage/ownership calculations untouched. |
| P0-06 | Current/historical Founder answer readouts, comparisons, agenda, discussion cards, marks and expectation-gap frames support EN. | Central display overlays, current/historical card selection parity, registry options/missing coverage, raw answers unchanged. Removed-boundary system fallback regression. Historical page authorization not bypassed. |
| P0-07 | **OPEN.** Supabase template sources and Dashboard configuration unchanged. EN copy drafts prepared under this documentation only. | No delivered email or Dashboard verification. Existing repo templates remain German. Requires a separately authorized Auth/template task and real EN-recipient delivery acceptance. |

## Display architecture and invariants

Existing next-intl providers and request locale detection are reused. A `workstyleFlow` namespace holds assessment UI copy. Pure display overlays supply workstyle item/narrative copy and current/historical Founder/Venture registry labels. Server callers pass request locale to shared report renderers; client UI uses the existing locale provider. DE remains the default where a standalone renderer previously had no locale argument.

Instrument source JSON, item IDs/versions, answer option IDs/values/order, validation conditions, stored units, scores, calculations, dimensions, card-selection rules, matching and authorization remain unchanged. Card selection and comparison use original values; only resulting display fields are translated. User names, agreement notes and free-text answers are intentionally preserved, even when German. Number/date display uses locale formatting.

Unknown user text must never be translated by a general dictionary. Registry display translations cover the audited current and historical source. New platform-owned source strings require an EN catalog entry and regression coverage; the catalog does not provide machine translation for future additions. Workstyle v3 missing English item entries fail explicitly rather than silently using German.

## Terminology and examples

US English is used for new copy. Workstyle, skills, responsibilities, venture and discussion prompt follow the audit. Founder Setup, FIND, CONNECT and ALIGN retain their product names. Reports describe responses and questions rather than founder quality, compatibility or predicted success.

| Previous DE system copy | EN display |
| --- | --- |
| Deine Arbeitsweise auf einen Blick | Your workstyle at a glance |
| Bereich für Bereich | Each area in detail |
| Wie arbeitest du eigentlich? | How do you approach your work? |
| Anmelden und loslegen | Sign in and begin |
| Fähigkeiten & Verantwortung | Skills and responsibilities |
| darüber möchte ich sprechen | I would like to discuss this |
| zu einer Grenze, die es nicht mehr gibt | About a boundary that has been removed |
| oder / oder eines davon | OR / OR ONE OF THESE |

## Regression tests

`localizationBetaBlockers.test.ts` adds seven tests, including a real TSX/React server-render harness (`web/scripts/localization-p0-render.cjs`) with next-intl EN provider. It covers all seven application render paths grouped under P0-01 through P0-06, option/missing fields, current 55-item workstyle catalog, six narrative areas and edge branches, full/short report, 2/3/4-person teams, Capability/venture/setup sections, Founder/Venture field formats and discussion marks. It also renders historical registry readouts, all comparison status/why branches, empty discussion cards, expectation-gap branches and Venture confirmation. Known German P0 words and phrases are rejected in rendered system copy.

Additional tests preserve original input, user text, partner names, narrative claim/pattern classifications and current/historical discussion-card IDs/selection. Existing structural/privacy tests resolve localized UI literals or allow exact non-scoring disclaimers; original numerical and boundary tests remain in place.

## Browser and print QA

Own browser session `localization-fix`, isolated local dev server on port 3032. Actual public language switch used to set EN, then current ALIGN entry checked live. HTML and main are EN. Desktop 1280 and mobile 390 checked.

The Individual Report, Team Report (4 people), Capability, Venture entry, every Venture field format and Venture readout were rendered from the real components with synthetic in-memory data and the application's actual generated CSS. Fourteen viewport checks found matching document/viewport widths and no overflowing buttons/links/inputs/selects. Screenshots were visually inspected. Browser QA found a missed German `oder` in missing choices; this was fixed and added to the rendered-text guard, then visually rechecked at 390.

Browser-generated Individual/Team PDFs were extracted and rendered with native PDFKit. Whole-PDF text checks found no known German P0 phrases/umlauts in system-copy fixtures; contact sheets showed readable content without horizontal clipping. These are component fixtures, not authenticated full-page print acceptance. Production fonts/layout context and real stored team combinations still need signed-in acceptance.

Live `/me/profile/workstyle`, `/teams/qa-fixture/workstyle`, `/teams/qa-fixture/roles` and `/founder-alignment/vorhaben` redirect to login without a session. No Auth bypass, accounts, DB fixtures or email sends were added. Thus full authenticated E2E and real EN email delivery remain explicitly unverified.

Local QA outputs (temporary, not committed): `/tmp/localization-fix-browser-results.json`, `/tmp/localization-p0-render-final.log`, `/tmp/localization-fix-*-390.png`, `/tmp/localization-fix-*-1280.png`, `/tmp/localization-fix-{individual,team-4}-en.pdf` and extracted `*-pdf.txt`.

## Scope and remaining German

No known German platform-owned P0 copy remained in the tested EN component fixtures and live entry. This does **not** mean the entire application is translated. User-supplied German is retained. The audit's P1 share forms/setup handoff, broader copy-quality work and P3 archived v1/v2 assessments remain outside this pass; German can still appear in those surrounding surfaces. P0-07 repo email templates remain German and deployed email content is unknown.

## Release order / handoff

1. Review and accept this isolated application diff; do not combine with rebrand/homepage/audit worktrees.
2. Perform authenticated EN acceptance for individual/profile/advisor/print, 2/3/4-person teams, capability, Venture answers/confirmation and historical Founder comparisons. Include existing records, missing responses, revised research questions and long names/free text. Do not persist disposable QA data.
3. Resolve P0-07 in a separately authorized Auth/email task. Review documentation drafts, confirm actual token expiry, check deployed templates and subjects, and choose verified EN/bilingual delivery using the existing supported configuration. No speculative locale routing is implemented here. Test Magic Link and signup delivery for an EN recipient, including code use in the home-screen app. Placeholders remain exactly `{{ .TokenHash }}` (Magic Link, direct `/auth/confirm?token_hash=…&type=email` production workaround – never `.ConfirmationURL`) / `{{ .ConfirmationURL }}` (Confirm signup) and `{{ .Token }}`. The draft repeats the source's one-hour statement; this duration is not independently verified or changed.
4. Re-run P0 acceptance and CI after integration. Only then reassess English-beta GO. P1/P2/P3 stay in their own follow-up scope.

## Validation

- `npm run ci:check`: PASS, 2,920 tests passed / 0 failed; TypeScript and Next production build passed. Existing lint/module warnings remain.
- DB portion: the existing runner skipped all 88 pgTAP suites because Docker/Supabase was not running. No database stack was started and no migration ran.
- `git diff --check`: PASS. New files were separately checked for trailing whitespace/conflict markers.
- Protected rebrand/homepage/audit worktrees: HEAD, complete porcelain status and hashes of changed/untracked files match the before snapshot exactly.
- Final worktree has only unstaged P0 display/i18n/test/documentation changes; HEAD remains the clean main base. No commit, push or deploy.

## Changed files

- `docs/research/localization-p0-mail-drafts/confirm-signup.html`
- `docs/research/localization-p0-mail-drafts/magic-link.html`
- `web/messages/de/workstyleFlow.json`
- `web/messages/en/workstyleFlow.json`
- `web/scripts/localization-p0-render.cjs`
- `web/src/app/(product)/advisor/person/[userId]/page.tsx`
- `web/src/app/(product)/founder-alignment/pilot/compare/[partnerId]/page.tsx`
- `web/src/app/(product)/founder-alignment/pilot/report/page.tsx`
- `web/src/app/(product)/founder-alignment/profil/antworten/page.tsx`
- `web/src/app/(product)/founder-alignment/vergleich/[partnerId]/page.tsx`
- `web/src/app/(product)/founder-alignment/vorhaben/antworten/page.tsx`
- `web/src/app/(product)/founder-alignment/vorhaben/bestaetigen/page.tsx`
- `web/src/app/(product)/founder-alignment/vorhaben/page.tsx`
- `web/src/app/(product)/research/workstyle-pretest/page.tsx`
- `web/src/app/(product)/teams/[teamId]/roles/page.tsx`
- `web/src/app/(product)/teams/[teamId]/workstyle/page.tsx`
- `web/src/app/me/profile/page.tsx`
- `web/src/app/me/profile/print/page.tsx`
- `web/src/app/me/profile/workstyle/page.tsx`
- `web/src/features/capability/__tests__/capabilityTeamPage.test.ts`
- `web/src/features/instruments/align/AlignMaps.tsx`
- `web/src/features/instruments/align/AlignNav.tsx`
- `web/src/features/instruments/align/ConfirmClient.tsx`
- `web/src/features/instruments/align/ConfirmVentureAnswers.tsx`
- `web/src/features/instruments/align/DeepDiveCards.tsx`
- `web/src/features/instruments/align/Questionnaire.tsx`
- `web/src/features/instruments/align/VentureHeader.tsx`
- `web/src/features/instruments/align/__tests__/bildschirme.test.ts`
- `web/src/features/instruments/align/cards.en.json`
- `web/src/features/instruments/align/cardsLegacy.en.json`
- `web/src/features/instruments/align/comparisonData.ts`
- `web/src/features/instruments/align/conversationCards.ts`
- `web/src/features/instruments/align/display.en.json`
- `web/src/features/instruments/align/display.ts`
- `web/src/features/instruments/align/displayOptions.en.json`
- `web/src/features/instruments/align/screenDisplay.ts`
- `web/src/features/instruments/align/screens.profile.en.json`
- `web/src/features/instruments/align/screens.venture.en.json`
- `web/src/features/instruments/v21/AnswerFieldV21.tsx`
- `web/src/features/instruments/v21/ComparisonViewV21.tsx`
- `web/src/features/instruments/v21/ConversationCardsView.tsx`
- `web/src/features/instruments/v21/ExpectationGapsView.tsx`
- `web/src/features/instruments/v21/MarkV21.tsx`
- `web/src/features/instruments/v21/ReportViewV21.tsx`
- `web/src/features/instruments/v21/conversationCardsV21.ts`
- `web/src/features/instruments/workstyle/WorkstylePretest.tsx`
- `web/src/features/instruments/workstyle/WorkstylePretestV2.tsx`
- `web/src/features/instruments/workstyle/WorkstyleProfileFlow.tsx`
- `web/src/features/instruments/workstyle/__tests__/localizedSource.ts`
- `web/src/features/instruments/workstyle/__tests__/phase116.test.ts`
- `web/src/features/instruments/workstyle/__tests__/phase116c.test.ts`
- `web/src/features/instruments/workstyle/display.en.json`
- `web/src/features/instruments/workstyle/display.ts`
- `web/src/features/reporting/workstyle/ComponentMatrix.tsx`
- `web/src/features/reporting/workstyle/IndividualWorkstyle.tsx`
- `web/src/features/reporting/workstyle/TeamWorkstyleReport.tsx`
- `web/src/features/reporting/workstyle/WorkstyleGlance.tsx`
- `web/src/features/reporting/workstyle/WorkstyleSignature.tsx`
- `web/src/features/reporting/workstyle/__tests__/localizationBetaBlockers.test.ts`
- `web/src/features/reporting/workstyle/__tests__/phase10Narrative.test.ts`
- `web/src/features/reporting/workstyle/__tests__/phase10bClaimBoundaries.test.ts`
- `web/src/features/reporting/workstyle/__tests__/phase115.test.ts`
- `web/src/features/reporting/workstyle/alignmentModel.ts`
- `web/src/features/reporting/workstyle/display.ts`
- `web/src/features/reporting/workstyle/displayCopyEn.ts`
- `web/src/features/reporting/workstyle/narrative.ts`
- `web/src/i18n/messages.ts`
- `docs/research/localization-p0-implementation.md`
