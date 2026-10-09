# Made2Found – Domain-/Branding-Handoff

Stand: 09.10.2026. Kontrollierter Branding-/Domain-Pass, keine Produktphase.

## Ausgangszustand und Grenzen

- Sauberes Repo auf `main`, HEAD `701fab7519ad1c9db041826e2ad37c08b2fd95fc`.
- Arbeitsbranch: `chore/made2found-domain-rebrand`; HEAD unverändert.
- Kein Commit, Push, Deploy, Remote-DB-Zugriff oder Anlegen/Ausführen einer Migration. Keine Secretwerte angezeigt oder verändert.
- Next.js/React-Anwendung in `web/`; Root-Scripts delegieren dorthin. Brand zentral in `web/src/features/brand.ts`, öffentliche URL-Auflösung in `web/src/lib/publicAppOrigin.ts`. Mailtexte zentral in `features/email/emailMessages.ts`, Versandhelfer unter `lib/email/`; Versandkonfiguration kommt aus `RESEND_*`, es gibt keine separate zentrale Mail-Konfigurationsdatei.
- Einzige gefundene `.env.example`-Variante: die ignorierte `web/.env.ai-worker.example`, nur gelesen und unverändert. Tatsächliche Environment-/Secret-Dateien wurden nicht geöffnet.

## Extern bereits manuell erledigt (Angaben des Auftraggebers)

- Vercel: `made2found.de` Production-Domain mit „Valid Configuration“; `.com` und `.eu` permanente Redirects auf `.de`; `NEXT_PUBLIC_SITE_URL=https://made2found.de`.
- Supabase Auth: Site URL auf `.de`; zusätzlich freigegeben: `/auth/callback`, `/auth/confirm`, `/auth/callback/client`, `/auth/landing` auf `https://made2found.de`. Alte Redirects bleiben bestehen. Mailtemplates manuell auf Made2Found umgestellt.
- Magic Link absichtlich direkt: `https://made2found.de/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
- Resend: Domain hinzugefügt; DKIM/SPF/MX/DMARC in Vercel DNS eingetragen. Verifizierung kann noch laufen. Neue Inboxen/Aliase fehlen.
- Diese externen Einstellungen wurden in diesem Pass weder verändert noch live verifiziert.

## Durch diesen Pass geändert

- `DEFAULT_PUBLIC_APP_ORIGIN`: `https://cofoundery.de` → `https://made2found.de`. Bestehende Environment-Priorität, lokale Entwicklungs-Origin und URL-Helper bleiben erhalten.
- `PRODUCT_NAME` und `PRODUCT_FULL_NAME` beziehen sich auf `BRAND_NAME` (`Made2Found`, ohne zusätzliches „Align“). Damit folgen Metadaten, Manifest, zentrale Alt-Texte und öffentliche Seitentitel der Marke.
- Sichtbare Texte in beiden Sprachbundles, Marketing, Datenschutz, Events, Report-Labels und Venture-Placeholder auf Made2Found umgestellt. CONNECT-Website-Beispiele jetzt `made2found.de`. Keine internen Schlüssel oder bestehenden Dateinamen umbenannt.
- Alle acht Mail-Logo-Hosts und der Datenschutz-Link verwenden jetzt den bestehenden Origin-Helper über `getEmailLogoUrl()` / `getEmailPrivacyUrl()`. Produktionsfallback: `https://made2found.de/datenschutz` und `https://made2found.de/cofoundery-align-logo.svg`.
- Zehn bisherige Resend-Absendernamen-Fallbacks auf die zentrale Marke umgestellt; echte Absender-/Reply-To-Adressen und sämtliche Environment-Werte bleiben unangetastet. Ein gesetztes `RESEND_FROM_NAME` hat weiterhin Vorrang und muss extern geprüft werden.
- Supabase-Templatekopien lokal mit Made2Found beschriftet. Die Magic-Link-Kopie enthielt noch `.ConfirmationURL`; sie entspricht jetzt exakt dem oben bereits produktiv verwendeten Direktlink. Keine Änderung am produktiven Template und kein Umbau der Auth-Logik. Confirm-signup behält `.ConfirmationURL`.
- Drei bestehende Testdateien an tatsächlich geänderte Branding-Erwartungen angepasst; zusätzliche Prüfung in der bestehenden Mail-Suite für Domainfallback, Preview-Fallback, lokale Origin, konfigurierte Origin sowie erzeugte Invite-/Privacy-/Logo-URLs. Unabhängige Test-URLs behalten ihre alten Hosts.

## Auth-/DB-Prüfung (nur lesend)

- `/auth/callback` und `/auth/confirm` teilen `completeAuthRedirectSession`: PKCE-Code, `token_hash`/`type` und Browser-Bridge bleiben erhalten. Der direkte Magic Link wird weiterhin mit `verifyOtp` verarbeitet.
- `/auth/callback/client` verarbeitet Code, Token-Hash oder Hash-/SessionStorage-Tokens und führt relativ zu `/auth/landing`; dort werden User, Signup-Intent und Ziel geprüft. Alle vier Routen unverändert.
- `next` wird weiter durch `normalizeSafeInternalPath` abgesichert (absolute/scheme-relative Ziele, Backslashes und kodierte Umgehungen werden verworfen). Rückleitungen bleiben auf der aufgerufenen Origin; kein zusätzlicher Hostwechsel im Callback.
- Magic-Link-Erzeugung, Account-E-Mail-Änderung, Founder-/Advisor-/Org-/Team-Intake-/Workspace-Invites, Collaboration-/FIND-/CONNECT-Mails, Canonicals, Sitemap und Robots verwenden bereits die zentralen Origin-/URL-Helper und folgen jetzt deren neuem Fallback.
- Migrations-/Schema-/Seed-/Edge-Function-/DB-Test-Suche ergab keine fest codierten alten Produktionshosts oder alten Kontakt-/Worker-Adressen in ausführbarer SQL-/DB-Logik. Verbleibende Markennamen in Migrationen sind Kommentare bzw. `COMMENT ON`, keine Routingwerte.
- Gezielt gelesen: Auth-/Invite-Härtungen `20260823120000`, `20260823200000`, Worker-Definitionen in `20261014120000_ai_jobs.sql`, neue Invite-Consent-/Access-/Lifecycle-Verträge sowie die lexikografisch letzten Migrationen `20261122120000` und `20261123120000`. Migrationsnamen sind Repo-Versionen, keine Aussage über den heutigen Deploymentstand.
- Keine Migration, Tabelle, RPC, Policy, Seed- oder Schema-Datei verändert. Kein vollständiger DB-Audit; gespeicherte Produktionswerte und tatsächlich vorhandene Auth-Konten sind nicht verifiziert.

## Erneute Suche: verbleibende Referenzen nach Kategorie

Gezählt vor Erstellung dieses Handoffs: **233 Trefferzeilen in 128 getrackten Textdateien**. Basis: case-insensitive `cofoundery` plus die angeforderten Hosts/Adressen, ohne Lockfiles, Secrets, Build-/Dependency-Ausgaben und diesen Handoff. Die ignorierte Worker-Beispieldatei wurde zusätzlich explizit gelesen. Gruppen können dieselbe Datei enthalten.

| Kategorie | Verbleibender Bestand / Entscheidung |
| --- | --- |
| Vor geschlossener Beta noch klären (A/B) | Alte **grafische Wortmarke** in `assets/Logo.PNG` und `web/public/cofoundery-align-logo.svg`; kein Made2Found-Logo vorhanden. Die 7 produktiven Pfadreferenzen bleiben gültig: `LandingTopNav.tsx:72`, `ProductShell.tsx:614`, `PublicConnectShell.tsx:11`, Marketing `informierte-entscheidungen/page.tsx:26`, `FounderAlignmentWorkbookClient.tsx:3310`, `DebugConversationGuidePreview.tsx:43`, `emailMessages.ts:37`. Alle Mailrenderer verwenden den gemeinsamen Helper. Kein erfundener neuer Asset-Pfad. |
| Bewusst vorerst behalten (B) | 5 Kontakt-Trefferzeilen in 4 produktiven Dateien, siehe Mailbox-Tabelle. Worker-Adresse zusätzlich bewusst unverändert. Keine weiteren alten produktiven App-/Privacy-/Logo-**Hosts** gefunden. |
| Interner technischer Name (C) | `package.json` / Supabase `project_id`: `cofoundery-app`; Locale-Cookie `cofoundery_locale`; Pending-Email-Cookie `cofoundery_pending_email`; Callback-SessionStorage `cofoundery.auth.callback.tokens` (Server-Bridge und Client); Event-Cookie `cofoundery_event_participant_`; Interview-Draft-Key `cofoundery.interview.*`; Glossar-Key `cofoundery_check`; Account-Export-Dateipräfix `cofoundery-export-*`. Unverändert, keine kosmetischen Umbenennungen. |
| Interne Parser/Entwicklung (C) | `cofoundery.local` in `betaAccess`, `postAuthRedirect`, `inviteFlowDebug`, Dev-Login und Dev-Seed; `internal.cofoundery.invalid` in `safeInternalPath`. Synthetische Parser-Origin bzw. lokale Konten, keine produktiven Rückfallhosts. Dev-Seed ist zusätzlich Legacy-/Entwicklungswerkzeug. |
| Kommentare/DB-Historie (C) | 7 Trefferzeilen in 6 Migrationen: `20260618120000`, `20260619133000`, `20260907200000`, `20260916140000`, `20260927120000`, `20261042120000`. Weitere rein erklärende Kommentare in Auth/Layout, Notifications, Advisor-/Profil-/Connect-Komponenten und `CLAUDE.md`. Zusammen mit internen Namen: 34 Trefferzeilen in 30 Dateien. |
| Test/Fixture (D) | 35 Trefferzeilen in 21 Dateien: Mail-/Collaboration-/Founder-in-the-Wild-URLs (`cofoundery.de`, `app.cofoundery.de`), VAPID-Fixture `hallo@cofoundery.de`, `cofoundery.test` QR-Fixture, lokale Auth-/Beta-Fixtures, Profil-Fixture, alte Dokumentpfade der Instrumenttests und historische Kommentare. Neue Mail-Tests prüfen zusätzlich den absichtlich bestehenden Logo-Dateinamen auf der neuen Domain. Diese Werte erzeugen keine Produktionslinks. |
| Späterer Legacy-Cleanup (E) | 152 Trefferzeilen in 68 Dateien: `docs/**`, `web/docs/**`, Export-/Registry-/Build-/Seed-Skripte unter `web/scripts/**`, `PROJECT_CONFIG.md`, `web/README.md` und `dev3.log`. Fachliche Quellen, gespeicherte Dateipfade und historische Arbeitsstände nicht pauschal umschreiben. |

Alte Hosts in Dokumenten stehen insbesondere in `docs/profile-phase-6-final-polish.md:391–393`, `docs/research/beta-readiness-gate.md:207` und `docs/research/phase-12/phase-12ab-platform-integrity-notification-audit.md:294,556`. Deren alte Fallback-/Mailaussagen sind durch diesen Handoff überholt und später gezielt zu aktualisieren. `docs/legacy/Index.html` ist eine historische Seite. Keine Treffer für `www.cofoundery.de` oder `cofoundery.vercel.app`; `app.cofoundery.de` verbleibt nur als Test-Fixture.

## Mailbox-Aufgabe / vollständige hello-Liste

**Zuerst echte Inboxen oder funktionierende Aliase für `maria@made2found.de` und `hello@made2found.de` einrichten und Zustellung prüfen. Erst danach Kontaktadressen umstellen.**

| Stelle mit `hello@cofoundery.de` | Zweck / späterer Schritt |
| --- | --- |
| `web/src/app/impressum/page.tsx:29` | Kontakt im Impressum |
| `web/src/app/datenschutz/page.tsx:70,423` | Verantwortlichenkontakt / Betroffenenanfragen |
| `web/src/app/(product)/dashboard/page.tsx:309` | Support-Mailto |
| `web/src/features/auth/betaAccess.ts:8` | Beta-Kontaktfallback, wenn `RESEND_REPLY_TO_EMAIL` fehlt |
| `docs/legacy/Index.html:538` | Historischer Footer; Legacy-Cleanup |
| `docs/profile-phase-6-final-polish.md:383,392` | Historische Branding-/Kontaktliste |
| `docs/research/phase-12/phase-12ab-platform-integrity-notification-audit.md:297` | Historischer Auditstand |

Zusätzlich später **extern** `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `RESEND_FROM_NAME`, ggf. Feedback-Empfänger und Supabase-Absender-/Reply-To-Konfiguration prüfen. Ihre realen Werte wurden nicht gelesen. Die meisten Versandhelfer haben keinen eigenen Reply-To-Fallback, sondern verwenden optional `RESEND_REPLY_TO_EMAIL`; der oben genannte Beta-Kontaktfallback ist separat. `hallo@cofoundery.de` kommt nur in der Push-Testfixture vor.

## AI_WORKER_EMAIL

- `web/.env.ai-worker.example:8`: `AI_WORKER_EMAIL=ai-worker@cofoundery.de`, unverändert; Datei ist gitignored.
- `web/scripts/ai-worker.ts:77–93` meldet sich mit Anon-Key und `signInWithPassword` als dediziertes Supabase-Auth-Konto an, **nicht** mit einem Service-Role-Key. Die tatsächliche Existenz dieses Produktionskontos wurde nicht remote geprüft.
- `public.ai_workers.user_id` referenziert `auth.users.id`; `is_ai_worker()` prüft `auth.uid()`. Queue-RPCs/Heartbeat hängen an dieser Identität, nicht am Maildomain-String.
- Der Wechsel der App-Domain verlangt keinen Worker-Mailwechsel. Ein bloßes Ändern von `AI_WORKER_EMAIL` würde den Login unterbrechen, solange das Auth-Konto nicht dieselbe Änderung erhält. Ein neues Konto hätte eine neue UUID und verlöre ohne gesonderte Freigabe die Workerrechte.
- Empfehlung: behalten. Eine spätere geplante Änderung am bestehenden Konto mit erhaltener UUID, abgestimmter Konfiguration und Login-/Claim-/Heartbeat-Smoke-Test wäre möglich; keine solche Änderung in diesem Pass.

## Logo-/Asset-Themen

- Vorhanden: alte Wortmarke als PNG/SVG, daraus abgeleitete App-/PWA-Icons. Kein freigegebenes Made2Found-Logo gefunden. PNG visuell geprüft; keine Assets generiert oder verändert.
- Das existierende SVG liegt in `web/public/` und wird bei einer späteren Veröffentlichung unter dem neuen Domainhost ausgeliefert. Seine aktuelle Live-Erreichbarkeit wurde hier nicht getestet. `assets/Logo.PNG` wird nicht automatisch öffentlich ausgeliefert.
- Vor Beta: neue Wortmarke und ggf. Icons liefern/freigeben; konsistent in UI und Mails einsetzen. Mailkompatibles PNG erwägen und in relevanten Clients prüfen (das bisherige SVG enthält eingebettete Rasterdaten). Bis dahin bleibt das sichtbare alte Bild ein bekannter Branding-Rest.
- Alten Asset-Pfad für bereits versendete Mails weiter erreichbar halten; keine leeren/neuen Pfade erfinden.

## Produktions-Smoke-Tests nach separat freigegebener Veröffentlichung

1. `.de` HTTPS und `.com`/`.eu`-Redirects einschließlich Pfad/Query prüfen; Weiterleitung der **alten** CoFoundery-Domain separat klären, da deren Status nicht angegeben ist. Bestehende Einladungslinks müssen weiter funktionieren.
2. Magic Link aus echter Mail: direkter `/auth/confirm?token_hash=…&type=email`, Session-Cookies, Zielroute; frischer, abgelaufener und bereits benutzter Link. Tokenwerte nicht protokollieren.
3. `/auth/callback` (Code), Browser-Bridge `/auth/callback/client` (Hash-Tokens), `/auth/landing`, erlaubtes internes `next` und abgewiesenes externes `next`; Founder-/Advisor-/Connect-Einstieg sowie Signup-Intent prüfen. Der direkte Magic Link enthält absichtlich kein `next`; diesen Vertrag nicht nebenbei erweitern.
4. iOS-Home-Screen-App: Code-Login in der App, Magic Link im Browser; neue Domain benötigt eigene Session/Installation und ggf. neue Push-Einwilligung. Alte Domain-Cookies/Push-Abos wandern nicht automatisch mit.
5. Founder-, Advisor-, Advisor-Org-, Team-Intake- und CONNECT-Workspace-Invite jeweils in DE/EN; Locale-Continuation, neues Konto, bestehendes Konto, falsche Empfängeradresse sowie ungültiger/abgelaufener Token.
6. App-Mails (Invites, Notifications, Saved Searches, Collaboration-Handoffs, Feedback): tatsächlicher From-Name, funktionierende Reply-To-Adresse, CTAs auf `.de`, Datenschutz `/datenschutz`, Logo erreichbar; keine privaten Inhalte zusätzlich offenlegen. Resend-DNS-Verifizierung und Zustellung prüfen.
7. Sichtbare Texte, Titel, Manifest, öffentliche CONNECT-Seiten und Website-Placeholder prüfen; Logo-/Icon-Freigabe nachhalten. Impressum/Datenschutz/Support dürfen bis zur Mailboxeinrichtung die alte erreichbare Adresse behalten.

## Claude am Sonntag, 11.10.2026

- Diff auf Domain-/Brandingumfang, unveränderte Auth-/DB-Verträge und intakte Direktlink-Vorlage reviewen.
- Mailboxen und Logo zuerst klären; externen From-Namen/Reply-To, Resend-Verifizierung und alte Domain-Weiterleitung prüfen, ohne Annahmen über deren aktuellen Stand.
- Danach separate Veröffentlichungsentscheidung und obige Produktions-Smoke-Tests. Alte Redirects erst nach erfolgreicher Übergangsphase entfernen, nicht im Review automatisch bereinigen.
- Bei Bedarf Prüfungen mit Node 24 und verfügbarem lokalen DB-Stack wiederholen; keine Migration ist Teil dieses Passes.

## Testergebnisse

- `npm run ci:check`: **Exit 0**; TypeScript erfolgreich, **2.914/2.914 Tests bestanden**, Next-Produktionsbuild erfolgreich. Bestehende Build-/ESLint-Warnungen bleiben; keine Warnungsbereinigung in diesem Pass.
- **DB-Prüfungen wurden vom bestehenden Skript übersprungen** (lokaler Docker-/Supabase-Stack für das Skript nicht erreichbar). Kein Nachweis für grüne pgTAP-Suiten; keine DB gestartet oder Migration ausgeführt.
- Zusätzliche gezielte Suite: **118/118 Tests bestanden**, Exit 0 (alle Auth-Tests, Mailtemplates, Account-Redirect, Collaboration-/Founder-in-the-Wild-/FIND-/CONNECT-/Feedback-Mails und i18n).
- Neue Mail-Domain-Prüfung bestätigt Default `.de`, unveränderte lokale Entwicklung, Vorrang konfigurierter Origin und tatsächlich erzeugte CTA-/Privacy-/Logo-Links.
- `git diff --check`: erfolgreich. TSX-Review nach `vercel:react-best-practices`: Änderungen betreffen Texte/Labels; keine neuen Hooks, Zustände, Effekte, Datenabfragen oder Eventverträge.
- Ausführung lokal mit Node **25.6.0**; Projektziel ist **24.x**. Keine Laufzeit-/Dependency-Umstellung vorgenommen.
- Keine Produktions-Anmeldung, Mailzustellung oder Live-Redirects getestet.

**Empfehlung:** bereit für Review durch Claude. Keine pauschale Beta-/Deploy-Freigabe: Mailboxen, Logo und Produktions-Smoke-Tests bleiben offen.

## Geänderte Dateien

70 bestehende Dateien plus dieser neue Handoff; keine Umbenennungen.

<details>
<summary>Vollständige Dateiliste</summary>

- `supabase/templates/confirm-signup.html`
- `supabase/templates/magic-link.html`
- `web/messages/de/advisor.json`
- `web/messages/de/auth.json`
- `web/messages/de/capability.json`
- `web/messages/de/collaborationLab.json`
- `web/messages/de/connect.json`
- `web/messages/de/dashboard.json`
- `web/messages/de/discovery.json`
- `web/messages/de/feedback.json`
- `web/messages/de/founderLibrary.json`
- `web/messages/de/invite.json`
- `web/messages/de/profile.json`
- `web/messages/de/report.json`
- `web/messages/de/researchConsent.json`
- `web/messages/de/teams.json`
- `web/messages/de/workbook.json`
- `web/messages/en/advisor.json`
- `web/messages/en/auth.json`
- `web/messages/en/capability.json`
- `web/messages/en/collaborationLab.json`
- `web/messages/en/connect.json`
- `web/messages/en/dashboard.json`
- `web/messages/en/discovery.json`
- `web/messages/en/feedback.json`
- `web/messages/en/founderLibrary.json`
- `web/messages/en/invite.json`
- `web/messages/en/profile.json`
- `web/messages/en/report.json`
- `web/messages/en/researchConsent.json`
- `web/messages/en/teams.json`
- `web/messages/en/workbook.json`
- `web/public/sw.js`
- `web/src/app/(marketing)/informierte-entscheidungen/page.tsx`
- `web/src/app/(marketing)/page.tsx`
- `web/src/app/datenschutz/page.tsx`
- `web/src/app/event/[eventSlug]/check/page.tsx`
- `web/src/app/event/[eventSlug]/compare/[participantToken]/page.tsx`
- `web/src/app/event/[eventSlug]/me/page.tsx`
- `web/src/app/event/[eventSlug]/page.tsx`
- `web/src/app/event/[eventSlug]/scan/page.tsx`
- `web/src/data/marketing.ts`
- `web/src/features/auth/betaAccess.ts`
- `web/src/features/brand.ts`
- `web/src/features/discovery/__tests__/discoveryIntroNotifications.test.ts`
- `web/src/features/email/__tests__/emailTemplates.test.ts`
- `web/src/features/email/emailMessages.ts`
- `web/src/features/events/EventCheckForm.tsx`
- `web/src/features/events/EventCompareView.tsx`
- `web/src/features/events/EventLandingForm.tsx`
- `web/src/features/events/EventParticipantCard.tsx`
- `web/src/features/events/EventQrScanner.tsx`
- `web/src/features/events/EventScanView.tsx`
- `web/src/features/instruments/align/VentureHeader.tsx`
- `web/src/features/reporting/DebugConversationGuidePreview.tsx`
- `web/src/features/reporting/FounderAlignmentWorkbookClient.tsx`
- `web/src/features/reporting/content/reportGlossary.ts`
- `web/src/features/reporting/content/reportToneGuidelines.ts`
- `web/src/i18n/__tests__/i18nConfig.test.ts`
- `web/src/lib/email/sendAdvisorInviteEmail.ts`
- `web/src/lib/email/sendAdvisorPersonInviteEmail.ts`
- `web/src/lib/email/sendAdvisorTeamFounderInviteEmail.ts`
- `web/src/lib/email/sendCoFounderInviteEmail.ts`
- `web/src/lib/email/sendDiscoverySavedSearchEmail.ts`
- `web/src/lib/email/sendFeedbackNotification.ts`
- `web/src/lib/email/sendFounderInTheWildHandoffEmail.ts`
- `web/src/lib/email/sendNetworkNotificationEmail.ts`
- `web/src/lib/email/sendReadMyMindStartedEmail.ts`
- `web/src/lib/email/sendSavedSearchEmail.ts`
- `web/src/lib/publicAppOrigin.ts`
- `docs/research/made2found-domain-rebrand-handoff.md`

</details>
