# Made2Found – Integrations-Review Rebrand / Localization / Homepage

Stand: 12.10.2026. Review-Durchlauf, keine Produktphase. Kein Commit, Push, Deploy, keine Migration, kein Supabase-/Vercel-Remote-Zugriff. Keine Branches oder Worktrees angelegt oder gelöscht.

## 1. Geprüfte Worktrees / Branches / HEADs

| Worktree | Branch | HEAD | Zustand vor Review |
| --- | --- | --- | --- |
| `~/Desktop/cofoundery-app` (Haupt-Checkout) | `chore/made2found-domain-rebrand` | `b846ff20` | sauber; **Rebrand liegt als lokaler Commit vor** (nicht gepusht) |
| `/private/tmp/made2found-homepage` | `feat/made2found-homepage` | `701fab75` | 2 geänderte + 4 neue Pfade (inkl. `docs/marketing/`), uncommittet |
| `/private/tmp/made2found-localization-qa` | `audit/localization-qa` | `701fab75` | 4 neue Doku-/Diagnosedateien, uncommittet |
| `/private/tmp/made2found-localization-fix` | `fix/localization-beta-blockers` | `701fab75` | 48 geänderte + 19 neue Pfade, uncommittet |
| – | `main` / `origin/main` | `701fab75` | = 12C.1C + Beta-Readiness-Fixes |

Befunde zur Isolation:

- **Abweichung von der Projektbeschreibung:** Der Rebrand ist nicht „uncommittet“, sondern als `b846ff20` committet (09.10., 23:29, Autor `Maria <hello@cofoundery.de>`), mit der **falschen Message „feat: build Made2Found public homepage“**. Inhaltlich ist es ausschließlich der Rebrand (71 Dateien, identisch mit der Dateiliste im Rebrand-Handoff); kein Homepage-Code. Der Localization-Audit hatte das bereits notiert. Nicht gepusht (`origin` kennt den Branch nicht).
- Alle anderen Branches stehen exakt auf `701fab75` = `origin/main`. Kein unerwarteter HEAD.
- Keine Datei taucht in zwei uncommitteten Diffs auf; kein geteilter Diff. Datei-Überschneidungen nur gegenüber dem Rebrand-Commit (siehe Konfliktmatrix).
- Keine bereits erledigten Änderungen überschrieben: Rebrand-Commit setzt direkt auf `701fab75` auf; die Beta-Blocker-Fixes sind enthalten.

## 2. Rebrand-Review (`b846ff20`)

**Ergebnis: sauber, ein echter Textfehler (behoben).**

A. Domain
- `DEFAULT_PUBLIC_APP_ORIGIN = https://made2found.de`; Priorität Env → lokale Origin → Default unverändert. Preview-Origins fallen bewusst auf `.de` (wie vorher auf `.de` der alten Domain).
- Alle 8 Mail-Logo-Hosts und der Datenschutz-Link laufen jetzt über `toPublicAppUrl` (`getEmailLogoUrl`/`getEmailPrivacyUrl`). Kein `cofoundery.de`-Host mehr in `web/src`, `web/public`, `web/messages` außer den bewusst behaltenen `hello@cofoundery.de` (Impressum, Datenschutz ×2, Dashboard-Support, Beta-Fallback).
- `emailMessages.ts` importiert jetzt `publicAppOrigin.ts`; geprüft: kein Client-Component importiert `emailMessages`, `publicAppOrigin` ist ohnehin isomorph.

B. Auth
- Keine Änderung an `/auth/callback`, `/auth/confirm`, `/auth/callback/client`, `/auth/landing`, `next`-Normalisierung.
- `supabase/templates/magic-link.html` nutzt jetzt den produktiven Direktlink `https://made2found.de/auth/confirm?token_hash={{ .TokenHash }}&type=email` (mit Warnkommentar). Geprüft: `supabase/config.toml` verdrahtet die Templates **nicht** (lokal kommentiert), der hart kodierte Prod-Host betrifft also keine lokale Entwicklung. `confirm-signup.html` behält korrekt `.ConfirmationURL`.

C. E-Mails
- From-Name-Fallback = `PRODUCT_NAME` (Made2Found); `RESEND_FROM_NAME` hat weiter Vorrang, Reply-To unverändert aus Env. Reale Env-Werte nicht gelesen.
- **Fehler (behoben, siehe 6):** DE-Betreff der Co-Founder-Einladung lautete „Mara lädt dich zu **eurem** Made2Found ein“ / „Einladung zu **eurem** Made2Found“ – mechanische Ersetzung von „eurem Cofoundery Align“.
- Logo bleibt die alte Wortmarke unter neuem Host, `alt="Made2Found"` – bekannter Branding-Rest, kein Codefehler.

D. AI Worker
- `AI_WORKER_EMAIL=ai-worker@cofoundery.de` nur in der gitignorten Beispieldatei. Der Worker meldet sich per `signInWithPassword` als echtes Supabase-Auth-Konto an; `ai_workers.user_id → auth.users.id`, `is_ai_worker()` prüft `auth.uid()`. Die Mail-Domain ist ein Login-Name, keine Zustelladresse und keine App-Domain-Abhängigkeit.
- Risiko bei blinder Änderung: Login bricht sofort; ein neues Konto hätte eine neue UUID ohne Workerrechte. **Empfehlung: behalten.** Spätere Umstellung nur als geplante E-Mail-Änderung desselben Auth-Kontos (UUID bleibt) + Env-Update + Smoke-Test (Login, Claim, Heartbeat). Kein Beta-Thema.

E. Branding
- Sichtbare Texte in 17 DE/EN-Bundle-Paaren, Marketing, Events, Datenschutz, Push-Fallback-Titel, Mails umgestellt. Keine internen Keys (`cofoundery_locale`, Cookies, Storage-Keys, Glossar-Key `cofoundery_check`, DB) umbenannt – korrekt.
- `brand.ts` reduziert auf `PRODUCT_NAME = PRODUCT_FULL_NAME = BRAND_NAME`; die lange Übergangsbegründung entfällt sinnvoll. `BRAND_SLUG` unverändert (Dateinamen bleiben `made2found-…`).
- Kosmetik ohne Wirkung: neue Imports teils vor `import "server-only"` bzw. vor dem Dateikommentar; doppelte Imports aus `emailMessages`. Nicht geändert.

F. Tests
- Neuer Test deckt Default-`.de`, Preview-Fallback, lokale Origin, konfigurierte Origin sowie tatsächlich erzeugte Invite-/Privacy-/Logo-URLs ab – echte Absicherung der Domainlogik, nicht nur Strings. Branding-Erwartungen in 3 Testdateien angepasst. Nicht abgedeckt (vertretbar): Supabase-Templates (manuell im Dashboard).

## 3. Localization-Review (`fix/localization-beta-blockers`)

**Ergebnis: Architektur tragfähig, DE-Reports nachweislich unverändert, Produktlogik unverändert. Drei DE-Verschlechterungen außerhalb der Reports und ein deutscher Rest auf der Advisor-Seite gefunden und behoben.**

Prüfmethoden: vollständiges Lesen der Docs; zwei unabhängige Code-Reviews (Report-Kern/Capability; ALIGN/Venture/v21); eigene empirische Differenzmessung.

Empirische Nachweise:
- **DE-Byte-Identität:** 90 Server-Renders (Individual voll/kurz, self/other, 8 Antwortmuster inkl. missing/partial/mixed; Team 2/3/4 Personen mit/ohne Capability/Venture/Setup, `canDiscuss`; Capability-Matrix voll/leer) auf `701fab75` vs. Fix: **0 Unterschiede**. Unabhängige zweite Messung mit 96 anderen Fixtures (alle `ownership_wish`, Sourcing-Varianten, R02 ab 3 Personen, EUR-Beträge): ebenfalls 0.
- **Logik-Parität DE↔EN:** Tag-Skelett und `data-claim`-Folge in allen Fixtures identisch → gleiche Claims, Muster, Karten, Bereiche, Status. EN-Ausgabe enthält 0 Umlaute.

A. Locale-Weitergabe: alle 6 Aufrufer (`/me/profile`, `/me/profile/workstyle`, `/me/profile/print`, `/teams/[id]/workstyle`, `/teams/[id]/roles`, Advisor-Person) übergeben die Request-Locale (`getRequestLocale` = derselbe Resolver wie next-intl). Kein `lang="de"` mehr in Report-Komponenten; Datum/Geld EN `en-US`, DE `de-DE`.

B. Registries: zentral über Display-Overlays (`align/display.ts`, `workstyle/display.ts`, `reporting/workstyle/display.ts`), nicht routenweise. Gespeicherte Werte, Option-IDs, Reihenfolge, Validierung, Units bleiben unangetastet; Vergleiche und Kartenauswahl laufen auf den deutschen Rohwerten **vor** der Übersetzung (die Audit-Falle `"Ähnliche Erwartungen"`/`"Noch offen"` ist korrekt umgangen).
- Architekturrisiko (Non-Blocker): Der ALIGN-Katalog ist **nach deutschem Quelltext geschlüsselt** und fällt bei fehlendem Schlüssel **still auf Deutsch** zurück (Workstyle-v3 wirft dagegen explizit). Jede spätere DE-Textänderung kann EN unbemerkt auf Deutsch zurückstellen. Das ist im Integrationsschritt unmittelbar relevant (VentureHeader, siehe 7).

C./D. Individual/Team: siehe Nachweise; historische Reports (v1 `SelfReportView`) nicht berührt. `germanOnly`-Hinweis nur dort entfernt, wo der Report jetzt EN ist.

E. Print/Profil/Advisor: Locale korrekt weitergegeben. **Rest gefunden:** Advisor-Seite hatte über dem EN-Report die hart kodierte Überschrift „Wie du arbeitest“ (behoben).

F. Capability: nur Darstellung; nur `own` bekommt den Akzent, Sourcing/Coverage/`openResponsibilityRows` unverändert.

G. Venture: nur Labels; gespeicherte Werte unverändert, Freitext/Namen bleiben im Original; Partnername-Interpolation erhalten.

H. ALIGN: EN vollständig für alle 55 v3-Items, beide v2.2-Registries, v2.1-Registry und alle Karten-IDs (skriptgeprüft). Keine Score-/Kompatibilitäts-/Diagnosesprache; Negationen („no overall score or ranking“) analog DE.

I. Regressionstests: testen echte Ursachen (echte Komponenten unter EN gerendert, 2/3/4 Personen, Claim-/Pattern-Parität DE/EN, Rohwerte unverändert). Schwächen: kein DE-Identitätstest; Locale-Threading nur per Regex auf Seitenquelltext; Deutscherkennung per Wortliste; das Harness schreibt bei jedem `npm test` HTML-Dateien nach `/tmp`; `phase115.test.ts:90` wurde von exaktem Literal auf eine sehr lose Regex gelockert. Negative Garantien (kein Score/Prozent/Ranking) bleiben erhalten; die Ausnahmen entfernen nur exakte Negationsphrasen.

J. DE-Version – **gefundene Verschlechterungen (alle behoben, siehe 6):**
1. `WorkstyleProfileFlow`: sechs spezifische Server-Fehlermeldungen (u. a. „Bitte lade deinen Stand neu …“, „Diese Fassung wird nicht mehr neu begonnen …“) wurden durch einen generischen Satz ersetzt.
2. `WorkstylePretest`: „1 – sehr unverständlich“ wurde zu „1– sehr unverständlich“ (Leerzeichen verloren).
3. `Questionnaire.errorText`: fehlender Fehlercode erschien in DE als „(unknown)“ statt „(unbekannt)“.

Weitere Befunde (nicht behoben, Non-Blocker, s. 11): EN-Labelabweichung in Maps/Karten (I01–I03 „mittel“ → „Moderately important“ vs. „Moderately“ im Readout; K04); EN-Leerzeichen vor Punkt an zwei Stellen; Research-Seiten-`metadata.title` noch deutsch; „teils/teils“ → „Sometimes yes, sometimes no“; Pilot-Compare verliert „nicht erzeugt“; ~110 KB EN-JSON landen in Client-Bundles auch für DE; deformatierte JSX-Zeilen (`{t(…)} </a>`) und Code-Fragmente in Doku-Kommentaren.

**Governance-Punkt (Entscheidung nötig, nicht Code):** Der Research-Consent-Text wird jetzt aus `messages/*/workstyleFlow.json` gerendert statt aus dem versionierten Consent-Dokument (`founder-workstyle-research-consent-v3.json`, `language: "de"`), dessen Version weiter gespeichert wird. DE ist heute wortgleich (geprüft), aber nicht per Test gekoppelt; EN-Einwilligungen sind nicht als EN-Fassung versioniert. Die EN-Fassung hält alle Zusagen (Pseudonymisierung, keine Weitergabe an Founder/Advisor/Orgs, Widerruf/Löschung). Empfehlung: vor EN-Beta Paritätstest DE-Message ↔ Consent-Dokument und Entscheidung, ob eine EN-Consent-Fassung eigens versioniert wird.

## 4. Homepage-Kompatibilität (read-only)

- Nutzt `BRAND_NAME`, `getRequestLocale`, eigene DE/EN-Inhalte (`data/homepage.ts`), `<html lang>` über Layout, OG-Locale `de_DE`/`en_US`. Keine alten Domains, kein „CoFoundery“, keine `hello@`-Adresse.
- Inhaltlich kompatibel mit den Produktprinzipien: „Keine Typologie und kein Kompatibilitätsscore“, „Keine Erfolgsprognose“. Ersetzt die alte Startseite mit „Founder-Kompatibilität prüfen“ (Audit P1-08); `data/marketing.ts` bleibt für `/informierte-entscheidungen` u. a. bestehen.
- Merge-Konflikt nur `web/src/app/(marketing)/page.tsx` (Rebrand ändert dort eine Footer-Zeile, Homepage ersetzt die Datei) → Homepage-Fassung vollständig übernehmen. `PublicLanguageSwitcher` (+`role="group"`) konfliktfrei.
- Keine Design-/Inhaltsänderungen vorgenommen.

## 5. Gefundene echte Fehler

| # | Branch | Fehler | Schwere |
| --- | --- | --- | --- |
| F1 | Rebrand | DE-Betreff „lädt dich zu eurem Made2Found ein“ / „Einladung zu eurem Made2Found“ | DE-Qualität, sichtbar in jeder Co-Founder-Einladung |
| F2 | Localization | EN-Magic-Link-Entwurf + Umsetzungsbericht verwenden `{{ .ConfirmationURL }}` und hätten bei Übernahme den produktiven Direktlink-Workaround ersetzt | Auth-Risiko bei P0-07-Umsetzung |
| F3 | Localization | DE-Fehlermeldungen in `WorkstyleProfileFlow` generisch statt spezifisch | DE-Regression |
| F4 | Localization | DE „1– sehr unverständlich“ | DE-Regression (klein) |
| F5 | Localization | DE „(unknown)“ statt „(unbekannt)“ | DE-Regression (klein) |
| F6 | Localization | Advisor-Seite: deutsche Überschrift über EN-Report | EN-P0-Rest |
| F7 | Rebrand-Commit | Commit-Message beschreibt Homepage statt Rebrand | Historie/Nachvollziehbarkeit – **nicht geändert**, Entscheidung bei Maria |
| F8 | Integration | VentureHeader-Konflikt: Auflösung muss EN-Katalogschlüssel mitziehen, sonst EN still deutsch; **kein Test fängt das** | Merge-Anweisung, s. 8 |

## 6. Durchgeführte Review-Fixes

Rebrand (Haupt-Checkout, uncommittet auf `b846ff20`):
1. `web/src/features/email/emailMessages.ts` – F1: „`${inviterName} lädt dich zu Made2Found ein`“ / „Einladung zu Made2Found“. Grund: grammatisch falsch nach mechanischer Ersetzung.
2. `web/src/features/email/__tests__/emailTemplates.test.ts` – Erwartung an F1 angepasst.

Localization (`/private/tmp/made2found-localization-fix`, uncommittet):
3. `docs/research/localization-p0-mail-drafts/magic-link.html` – F2: Link auf `https://made2found.de/auth/confirm?token_hash={{ .TokenHash }}&type=email` + Warnkommentar. Grund: Workaround darf nicht ersetzt werden.
4. `docs/research/localization-p0-implementation.md` (Release-Schritt 3) – F2: Platzhalter-Anweisung korrigiert (Magic Link `.TokenHash`, Confirm signup `.ConfirmationURL`).
5. `web/src/features/instruments/workstyle/WorkstyleProfileFlow.tsx` – F3: `serverError()` gibt in DE die Server-Meldung unverändert aus, in EN den generischen EN-Satz (Server-Actions antworten nur deutsch). DE-Verhalten exakt wie vor dem Fix.
6. `web/messages/de/workstyleFlow.json` – F4: führendes Leerzeichen in `very_unclear`/`very_clear` (wie EN und wie das alte Literal).
7. `web/src/features/instruments/align/Questionnaire.tsx` – F5: fehlender Code → „unbekannt“ (DE) bzw. „unknown“ (EN).
8. `web/src/app/(product)/advisor/person/[userId]/page.tsx` – F6: Überschrift aus bestehendem Key `report.workstyle.individualTitle` (DE „Wie du arbeitest“ unverändert, EN „How you work“).

Homepage, Localization-QA: keine Änderungen. Keine Datei außerhalb dieser Liste und dieses Berichts verändert. Simulationen ausschließlich in einem Wegwerf-Klon im Claude-Scratchpad (außerhalb des Repos).

## 7. Konfliktmatrix

| | Rebrand (`b846ff20`) | Localization-Fix | Homepage | Localization-QA |
| --- | --- | --- | --- | --- |
| **Rebrand** | – | 1 Datei: `align/VentureHeader.tsx` (Textkonflikt) + semantisch `align/display.en.json` | 1 Datei: `(marketing)/page.tsx` (Textkonflikt) | keine |
| **Localization-Fix** | s. links | – | keine | keine (nur Doku-Referenz) |
| **Homepage** | s. oben | keine | – | keine |

Details:
- **VentureHeader (Text + Semantik):** Rebrand ändert den Platzhalter auf „z. B. Made2Found oder Projekt X“; Localization ersetzt dieselbe Zeile durch `t("z. B. CoFoundery oder Projekt X")` mit EN-Katalogschlüssel `"z. B. CoFoundery oder Projekt X"`. Korrekte Auflösung: Localization-Fassung der Datei mit `t("z. B. Made2Found oder Projekt X")` **und** Schlüssel in `display.en.json:516` auf `"z. B. Made2Found oder Projekt X"` umbenennen. Wer nur die Rebrand-Zeile übernimmt, verliert die EN-Übersetzung; wer nur die Datei auflöst, erhält stilles DE in EN.
- **page.tsx:** Homepage-Fassung vollständig übernehmen (Rebrand-Footerzeile entfällt mit der alten Seite).
- Message-Bundles: Rebrand ändert 17 Bundle-Paare, Localization fügt nur `workstyleFlow.json` hinzu → keine Überschneidung.
- Mail-/Branding-Dateien: Localization fasst `lib/email`, `emailMessages`, `brand.ts` nicht an; keine Überschneidung.
- Weitere Rebrand-Texte, die die Localization als Schlüssel nutzt: keine (geprüft gegen alle geänderten Rebrand-Literale).

**Integrationssimulation** (Wegwerf-Klon: `b846ff20` → Localization-Patch → Homepage-Patch, Konflikte wie oben aufgelöst): genau die zwei erwarteten Konflikte, sonst sauber; `git diff --check` sauber; `ci:check` siehe 12.

## 8. Sichere Integrationsreihenfolge

Die bevorzugte Reihenfolge ist technisch sinnvoll und wird bestätigt, mit einer Präzisierung zu Schritt 4/5:

1. **Rebrand abschließen:** Review-Fix F1 übernehmen; Commit-Message von `b846ff20` korrigieren (Commit ist unveröffentlicht, Amend gefahrlos), z. B. `chore: rebrand visible product to Made2Found and default origin made2found.de`. `ci:check` mit Node 24 und – falls verfügbar – `db:test`.
2. **Rebrand → main** (ff-only durch Maria), Deploy, Produktions-Smoke-Tests aus dem Rebrand-Handoff (Magic Link Direktlink, Invites DE/EN, CTA-/Privacy-/Logo-Links auf `.de`, From-Name/Reply-To).
3. **Homepage** auf den neuen main rebasen/übertragen (nur Konflikt `page.tsx` → Homepage-Fassung). Begründung für die Vorziehung vor Localization: null Dateiüberschneidung mit Localization, klein, und für die **deutsche** Beta (öffentliche Startseite ohne „Founder-Kompatibilität prüfen“) relevant, während Localization nur die englische Beta betrifft. Wenn die Homepage bewusst zuletzt kommen soll, ist das technisch ebenso sicher – die Reihenfolge 3/4 ist austauschbar.
4. **Localization** committen (inkl. Review-Fixes 3–8) und auf den aktualisierten main rebasen: VentureHeader exakt wie in 7 auflösen und `display.en.json` mitziehen; danach `ci:check`, authentifizierte EN-Abnahme (Profil/Print/Advisor, Team 2/3/4, Roles, Venture-Antworten/-Bestätigung, historische Vergleiche).
5. **Localization-QA-Dokumente** als reiner Doku-Commit jederzeit (keine Konflikte).
6. **P0-07** als eigene, freigegebene Auth-Mail-Aufgabe (Abschnitt 9) – Voraussetzung für EN-Beta, nicht für DE-Beta.

Kein Branch ist nicht integrierbar; kein STOPP nötig.

## 9. P0-07 – Auth-Mails nicht sprachabhängig

Ist-Zustand: `signInWithOtp` (Start-Seite, `MagicLinkForm`) übergibt keine Locale in `user_metadata`; Supabase-Templates kennen die Sprache der empfangenden Person also nicht. Templates liegen im Dashboard, Repo-Dateien sind Kopien.

| | Option A: bilingualer Auth-Mailtext | Option B: Send Email Hook + Resend + Locale-Templates |
| --- | --- | --- |
| Aufwand | ~1–2 h: DE-Block + EN-Block in Magic Link und Confirm signup (Dashboard), Betreff zweisprachig, Testversand | ~2–4 Tage: Hook-Endpunkt (Edge Function/Route) mit Signaturprüfung, alle Mail-Typen (signup, magiclink, recovery, email_change mit zwei Tokens, invite, reauth), URL-Bau aus `token_hash`, Locale-Quelle (fehlt bei Neukonten → zusätzlich `options.data.locale` beim OTP), Fehlerpfade, Tests |
| Risiko | gering: kein Code, keine Auth-Logik; einziges Risiko sind Platzhalter (`{{ .TokenHash }}`-Direktlink, `{{ .Token }}`) – vor Speichern gegen Repo-Kopie prüfen, dann Testversand | hoch für Beta: jeder Fehler im Hook = niemand kann sich anmelden; Workaround-Link muss nachgebaut werden; neue Secret-/Zustellabhängigkeit |
| Beta-Relevanz | löst den Blocker für eine geschlossene EN-Beta vollständig (verständliche Mail + Code) | über das Nötige hinaus |
| Langfristig | Übergangslösung, Mails werden länger | richtige Zielarchitektur (eine Mailinfrastruktur, Branding/Logo konsistent mit App-Mails, echte Locale) |

**Empfehlung: Option A für die geschlossene Beta**, Option B als eigene Nach-Beta-Aufgabe. Für A die Repo-Templates (`supabase/templates/*.html`) zuerst bilingual anpassen und reviewen, dann wortgleich ins Dashboard übernehmen; der EN-Entwurf im Localization-Branch ist nach Fix F2 eine brauchbare Vorlage. Ablaufdauer („eine Stunde“) vorher gegen die Dashboard-Einstellung prüfen. Nicht implementiert.

## 10. Verbleibende Beta-Blocker

Deutsche geschlossene Beta:
- Keine Code-Blocker. Vor Einladungen zwingend: Produktions-Smoke-Tests nach Rebrand-Deploy (Handoff-Liste), insbesondere Magic Link aus echter Mail und eine Einladungsmail mit `.de`-Links.
- Extern zu verifizieren (nicht im Repo prüfbar): Ist `hello@cofoundery.de` weiterhin empfangsbereit (steht in Impressum/Datenschutz/Support)? Passt `RESEND_FROM_EMAIL`-Domain zur in Resend verifizierten Domain? Supabase-SMTP-Absender?

Englische geschlossene Beta:
- Localization noch nicht auf main; authentifizierte EN-Abnahme ausstehend.
- P0-07 offen (Option A umsetzen und mit EN-Empfänger testen).
- Consent-Governance (Abschnitt 3) entscheiden.
- Audit-P1-04 (Setup-Handoff deutsch) und P1-06 (Share-Formulare deutsch) liegen im aktiven Report-Umfeld; als Beta-relevant einstufen oder bewusst akzeptieren. P1-09 (Datenschutz/Impressum nur DE) für EN-Teilnehmende klären.

## 11. Verbleibende Non-Blocker

- Alte Logo-Wortmarke (UI, Mails, PWA-Icons) – Branding-Rest, bis freigegebenes Made2Found-Logo vorliegt.
- `hello@cofoundery.de` an 5 Stellen bis zur Inbox-Einrichtung.
- ALIGN-Katalog: DE-Text-Schlüssel + stiller DE-Fallback; mittelfristig stabile Keys oder ein Test „jeder Plattform-String hat EN“ auch für VentureHeader/AlignMaps.
- EN-Feinschliff aus Abschnitt 3 (Labelabweichung I01–I03/K04, Leerzeichen vor Punkt, `metadata.title`, „Sometimes yes, sometimes no“, „not generated“), Client-Bundle-Größe, Formatierung.
- Regressionstest: DE-Identitätstest ergänzen; `/tmp`-Schreiben aus `npm test` entfernen; `phase115.test.ts:90` wieder schärfen.
- Kosmetik im Rebrand (Importreihenfolge, doppelte Imports).
- `AI_WORKER_EMAIL` bleibt `@cofoundery.de` (s. 2D).
- Rebrand-Commit-Message (F7).

## 12. Tests

Umgebung: Node **25.6.0** (Projektziel 24.x; kein Node 24 installiert). **Docker nicht erreichbar → alle pgTAP-Suiten vom Skript übersprungen; nicht simuliert, kein Nachweis.** Keine Änderung betrifft DB, Migrationen, RLS oder Auth-Logik.

| Lauf | Ergebnis |
| --- | --- |
| Integrationssimulation vor Review-Fixes (Rebrand + Localization + Homepage) `ci:check` | Exit 0; tsc ok; **2.921/2.921** Tests; Build ok (102 Seiten); DB übersprungen |
| E-Mail-Suite nach F1 | 8/8 |
| Localization nach Fixes: `tsc --noEmit` | ok |
| Localization nach Fixes: reporting/workstyle, instruments/workstyle, instruments/align, i18n | 298/298 |
| DE-Differenzrender 701fab75 vs. Fix (2 unabhängige Harnesses) | 90/90 und 96/96 byte-identisch |
| DE↔EN Struktur-/Claim-Parität | 0 Abweichungen |
| `git diff --check` (Integrationsstand) | sauber |
| `ci:check` Rebrand-Checkout nach Fix | Exit 0; tsc ok; **2.914/2.914**; Build ok; DB übersprungen |
| `ci:check` Localization-Worktree nach Fixes | Exit 0; tsc ok; **2.920/2.920**; Build ok; DB übersprungen |
| `ci:check` Integrationssimulation nach allen Fixes | Exit 0; tsc ok; **2.921/2.921**; Build ok; DB übersprungen |

## 13. GO / NO-GO

- **Deutsche geschlossene Beta: GO** – unter der Bedingung, dass der Rebrand (mit F1) gemerged, deployt und die Produktions-Smoke-Tests (Magic Link, Einladungsmail, Links auf `.de`) bestanden sind und `hello@cofoundery.de` empfangsbereit ist. Localization und P0-07 sind dafür nicht erforderlich.
- **Englische geschlossene Beta: NO-GO** – bis Localization integriert und authentifiziert EN-abgenommen ist, P0-07 per Option A gelöst und mit EN-Empfänger getestet ist und die Consent-Frage entschieden ist. Danach erneut bewerten.

## 14. Exakte nächste Schritte

1. Maria: diesen Bericht und die Review-Fixes sichten; Freigabe für Commits erteilen.
2. Haupt-Checkout: F1 committen, Commit-Message von `b846ff20` korrigieren; `npm run ci:check` (idealerweise Node 24, mit `npx supabase start && npm run db:test`).
3. Maria: `chore/made2found-domain-rebrand` ff-only nach `main`, Deploy, Smoke-Tests laut Rebrand-Handoff; `hello@cofoundery.de`, Resend-Absender und Supabase-SMTP extern prüfen → DE-Beta-Start möglich.
4. Homepage-Worktree: committen, auf `main` rebasen, `page.tsx` → Homepage-Fassung, `ci:check`, ff-only nach main.
5. Localization-Worktree: committen (inkl. Fixes 3–8), auf `main` rebasen, VentureHeader + `display.en.json:516` wie in 7 auflösen, `ci:check`, authentifizierte EN-Abnahme, ff-only nach main.
6. QA-Dokumente als Doku-Commit.
7. P0-07 Option A als separat freigegebene Aufgabe (Repo-Templates → Review → Dashboard → EN-Testversand inkl. Code in Homescreen-App).
8. Consent-Governance entscheiden; EN-Beta neu bewerten.
