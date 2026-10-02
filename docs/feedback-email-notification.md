# E-Mail bei neuem Nutzerfeedback

Stand: 02.10.2026. Audit gegen den aktuellen Code (Basis `dbc93a8`, einschließlich Phase 6.1 und CONNECT-v2-Dokumentation) und die laufende lokale Supabase-DB, vor der Implementierung.

## 1. Bestehender Feedback-Flow

- Formular: `web/src/features/feedback/ProductFeedbackEntry.tsx`, eingebunden in `ProductShell.tsx` (Desktop-/Mobilnavigation) und `FounderAlignmentWorkbookClient.tsx` (Workbook).
- Server Action: `submitProductFeedbackAction()` in `web/src/features/feedback/actions.ts`; keine separate API-Route.
- Tabelle: `public.product_feedback`. Die Action schreibt `user_id`, `invitation_id`, `source`, `q1_value`, `q2_value`, `q3_value`, `q4_choice`, `q4_other_text`, `q5_text`. Die DB ergänzt `id` und `created_at`.
- `source` ist `nav` oder `workbook`; eine konkrete Route/URL wird nicht erhoben. `invitation_id` ist optionaler Workbook-Kontext.
- Drei Pflichtantworten, eine optionale Auswahl zur gewünschten Unterstützung (Matching, Unterschiede, Entscheidungen, Zusammenarbeit, Konflikte, anderes), optionaler Freitext zu „anderes“ und eine abschließende optionale Freitextantwort. Keine separate Feedback-Typ-Spalte.
- Nur eingeloggte Personen können absenden: Action prüft `auth.getUser()`, RLS erlaubt ausschließlich `INSERT` mit `user_id = auth.uid()`. Obwohl die Spalte nullable ist, existiert heute kein anonymer Eingabeweg. Keine Erweiterung dieses Verhaltens. Der Mail-Builder bezeichnet eine fehlende User-ID als `anonym`.
- Das lokale Schema samt Constraints und RLS wurde mit `psql \d+ public.product_feedback` geprüft und entspricht `20260403103000_create_product_feedback.sql`.

## 2. Bestehende Mail-Infrastruktur

Das Projekt nutzt Resend per serverseitigem `fetch("https://api.resend.com/emails")`. Spezialisierte Helfer liegen in `web/src/lib/email/send*Email.ts` (Advisor-/Co-Founder-Einladungen, Network, Saved Search, Read My Mind, Founder in the Wild). `features/email/emailLocale.ts` und `emailMessages.ts` enthalten gemeinsame Sprach-/Textbausteine, aber keinen zentralen Transport-Sender.

`web/src/lib/email/sendFeedbackNotification.ts` folgt diesem bestehenden REST-/Konfigurationsmuster. Keine zweite Bibliothek, kein neuer Provider, keine Umstellung anderer Mailfunktionen. Absender: `RESEND_FROM_EMAIL`, optional `RESEND_FROM_NAME` (bestehender Fallback `Cofoundery`). Reply-To: optional `RESEND_REPLY_TO_EMAIL`. Bisherige Empfänger werden als Parameter an die jeweiligen Helfer übergeben; eine passende interne Feedback-Empfänger-Konfiguration existierte nicht.

## 3. Zeitpunkt und Ergebnis

Validieren → Authentifizierung → vorhandener Supabase-Insert → nur bei Erfolg `sendFeedbackNotification()` versuchen → `{ ok: true }`.

DB-Fehler behalten `insert_failed`; es wird keine Mail versucht. Die Benachrichtigung wird innerhalb der Action abgewartet, mit fünf Sekunden HTTP-Timeout. Keine Queue, Wiederholung oder Zustellgarantie: ein fehlgeschlagener Versuch bleibt ein serverseitiger Hinweis. Der Datenbankeintrag bleibt die verlässliche Quelle.

## 4. Mailinhalt und Datenschutz

Betreff: `Neues Feedback zu ${PRODUCT_NAME}` aus `features/brand.ts`. Interne Mail auf Deutsch, unabhängig von der unveränderten DE/EN-Oberfläche. Fragetexte werden aus dem bestehenden deutschen Feedback-Sprachbundle wiederverwendet; Antworten werden nicht übersetzt.

Enthalten sind ausschließlich die bereits bereinigten und gespeicherten Antworten, die optionale Unterstützungs-Auswahl, `source`, gegebenenfalls `invitation_id` und die bereits gespeicherte User-ID. Keine zusätzliche E-Mail-/Profilabfrage. Keine IP, User-Agent, neue Route, Tokens, Trackingbilder oder Adminlinks. Reine Textmail: Nutzereingaben werden nicht als HTML interpretiert.

Der DB-Zeitstempel `created_at` wird nicht in die Mail aufgenommen: Der bestehende Insert gibt ihn nicht zurück, und die Tabelle besitzt bewusst keine SELECT-Policy. Für die Benachrichtigung werden weder Leserechte noch ein privilegierter DB-Client hinzugefügt; auch kein vermeintlicher DB-Zeitstempel wird erfunden.

## 5. Fehlerverhalten

Fehlende Empfänger-/Resend-Konfiguration, Provider-Fehler, Netzwerkfehler und Timeouts ändern das erfolgreiche Feedback-Ergebnis nicht. Zusätzlich fängt die Action unerwartete Mail-Ausnahmen ab. Es gibt keinen Rollback und keinen Löschversuch.

Serverlog: `[feedback] notification_not_sent` plus fester technischer Code, zum Beispiel `missing_feedback_notification_email`, `resend_request_failed` oder `resend_unavailable`. Keine Feedbacktexte, User-IDs, Empfängeradressen, rohen Exceptions oder Provider-Antworten im Log.

## 6. Konfiguration und Deployment

- Neu: `FEEDBACK_NOTIFICATION_EMAIL` — internes Empfängerpostfach, nur serverseitig, ohne `NEXT_PUBLIC_`-Präfix. Kein realer Adresswert im Repository.
- Bestehend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; optional `RESEND_FROM_NAME`, `RESEND_REPLY_TO_EMAIL`.
- In Vercel die neue Variable im gewünschten Environment setzen (mindestens Production, Preview nur bei gewünschtem Testversand) und neu deployen. Bestehende Resend-Konfiguration weiterverwenden. Ohne Empfänger bleibt Feedback funktionsfähig und der Versand wird mit technischem Hinweis übersprungen.
- Lokal wurde keine dauerhafte Env-Datei verändert. Browserprüfungen liefen mit einem temporären Node-Preload außerhalb des Repositorys, Dummy-Konfiguration und abgefangenem Resend-HTTP-Aufruf.
- Kein Deployment im Rahmen dieses Tasks.

Der im Repository dokumentierte Deployment-Weg ist die Vercel-Git-Integration für `main`. Nach Setzen der Env-Variable und Freigabe des Changes, vom Repository-Root aus:

```sh
git switch main
git merge --ff-only feat/feedback-email
git push origin main
```

Der Push ist der Deploy-Auslöser. Diese Befehle wurden nicht ausgeführt. Es gibt lokal keine `.vercel/project.json`; ein CLI-Deploy wäre erst nach Verknüpfung mit dem bestehenden Projekt eindeutig zuordenbar.

## 7. Datenbank

Keine Migration, keine Schema-/RLS-Änderung, kein `supabase db push` erforderlich. Der bestehende Insert bleibt unverändert.

## 8. Verifikation

Automatisierte Tests in `feedbackNotification.test.ts` führen die echte Action und den echten Mail-Helfer aus. Der Supabase-Client wird über das vorhandene Node-Loader-Muster ersetzt, HTTP mit `node:test` gemockt. Kein externer Resend-Aufruf.

Geprüft: Insert vor genau einem Mailversuch; DB-Fehler ohne Mail; HTTP-/Netzwerk-/Timeoutfehler trotz erfolgreichem Insert; fehlende/leere Empfängervariable; bestehende Konfiguration für From/Reply-To; bereinigte Texte samt Zeilenumbrüchen und Kontext; keine Übernahme der Auth-E-Mail; anonymer Builder ohne erfundene Identität; unveränderte Ablehnung unauthentifizierter/ungültiger Eingaben.

Lokaler Browsercheck über `/dev-login` und den bestehenden Feedback-Button am 02.10.2026:

| Fall | Ergebnis |
| --- | --- |
| DE, Resend-Erfolg simuliert | Bestehende Meldung „Danke - das hilft mir wirklich weiter.“; ein Mailaufruf mit Feedbacktext, Kontext und User-ID bestätigt. |
| EN, Resend HTTP 503 simuliert | Bestehende Meldung „Thank you - this genuinely helps.“; Mailaufruf bestätigt; Serverlog ausschließlich `notification_not_sent resend_request_failed`. |
| DB-Nachprüfung | Beide Einträge dauerhaft vorhanden: `d97b70cc-b38a-4ffc-86eb-2d716bc1a822` und `12b80f3c-cabe-473e-81e0-7c440ea598de`, erkennbar an `FB-BROWSER-20261002-…` in der ersten Antwort. |
| Browser | Keine gemeldeten JavaScript-Fehler und kein Next.js-Fehleroverlay; beide Erfolgsmeldungen per Screenshot visuell geprüft. |

Die zwei ausdrücklich markierten Testfeedbacks bleiben in der lokalen DB nachvollziehbar. Keine echte Testmail versendet. Formular, Sprachdateien und andere Produktbereiche wurden nicht geändert.

Abschließende Prüfungen: `npm run ci:check` erfolgreich (Exit 0), einschließlich TypeScript, **2.621 bestandener Node-Tests ohne Fehler oder übersprungene Tests**, Next.js-Produktionsbuild und DB-Tests. Der darin enthaltene Aufruf `npm run db:test` hat tatsächlich `npx supabase test db` gegen den laufenden lokalen Stack ausgeführt: **126 SQL-Dateien, 1.319 Prüfungen, PASS**, nicht übersprungen. Bestehende Build-/Lint-Warnungen außerhalb der geänderten Dateien bleiben bestehen. `git diff --check` ebenfalls erfolgreich.
