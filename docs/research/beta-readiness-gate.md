# Beta Readiness Gate – FIND / CONNECT / ALIGN

**Stand:** 06.10.2026, Branch `chore/beta-readiness` von `main` @ `6de1c4fd` (12C.1C).

**Startzustand geprüft:**
- `main` = `origin/main` = `6de1c4fd`.
- Repo sauber.
- Alle Migrationen bis `20261123120000` remote angewendet.
- Produktion liefert 12C.1C aus: Eine unbekannte URL zeigt die neue deutsche 404, lesend geprüft.

**Status:** Drei Beta-Blocker gefunden und behoben, keine Migration. Kein Commit, kein Push, kein Deploy.

**Kennzeichnung:**
- **[B]** im Browser durchgespielt
- **[T]** automatisiert getestet
- **[C]** aus Code abgeleitet

---

## 1. Empfehlung

**GO für die geschlossene Beta – unter zwei Bedingungen:**

1. Die drei Blocker-Korrekturen dieses Branches werden released (Abschnitt 3).
   - Ohne sie kann niemand ein Vorhaben abgeben.
   - Ohne sie kann niemand eine CONNECT-Kontaktanfrage annehmen.
   - Ohne sie können sich eingeladene Co-Founder versehentlich aus ihrem Team aussperren.
2. Die manuellen Produktionsprüfungen aus Abschnitt 6 sind erledigt (Mailvorlagen, Resend, Redirect-Liste).

Alle übrigen Funde sind kosmetisch oder seltene Randfälle (Abschnitt 5).

---

## 2. Getestete Flows

**Testaufbau:**
- Lokal, eigener Dev-Server.
- Neue Testkonten (`beta-*`) über die echten Wege angelegt, danach gelöscht. Die DB ist wieder im Ausgangszustand.
- Mails über das lokale Postfach (Mailpit) abgerufen und angeklickt.
- Breiten: 1280 und 390.

| # | Flow | Ergebnis |
|---|---|---|
| 1 | Registrierung mit Beta-Code (`/start`), Magic-Link aus der Mail, Login | ✅ [B]: Mail kommt, Link führt über `/auth/callback` in den Einstieg; Code steht ebenfalls in der Mail |
| 2 | Persönliches Profil (Einstieg, `/profile` Identität) | ✅ [B]: Einstieg je nach Absicht (gründen bzw. nur CONNECT), Identität speicherbar |
| 3 | ALIGN Workstyle ausfüllen | ✅ [B]: 29 Situationen über die Oberfläche, Abschluss „Dein Arbeitsprofil ist bereit.“ |
| 4 | Einzelreport | ✅ [B]: `/me/profile/workstyle`, kompakt und ausführlich, Druckansicht |
| 5 | FIND-Profil | ✅ [B]: Entwurf, „Was noch fehlt“, Veröffentlichen |
| 6 | FIND-Suche und Intro | ✅ [B]: Profil gefunden, Intro angefragt, angenommen, Gespräch eröffnet, Nachrichten in beide Richtungen |
| 7 | CONNECT-Profil | ✅ [B]: verständlicher Hinweis bei fehlender Identität, danach veröffentlicht |
| 8 | CONNECT-Kontakt und Nachrichten | ❌→✅ [B]: **Annehmen war unmöglich** (Blocker 3); nach der Korrektur Anfrage, Annahme, Gespräch, Zähler für Ungelesenes |
| 9 | Co-Founder-Einladung | ✅ [B]: Einladung angelegt; ohne Mailversand zeigt die Seite den gültigen Link (Ziel geprüft) |
| 10 | Join-only | ✅ [B]: Link abgemeldet geöffnet, Konto per Magic-Link angelegt, Beitrittsdialog, „Erst beitreten“, Mitglied ohne Teamfreigabe |
| 11 | Join-and-share | ✅ [B]: dritte Person, „Team beitreten und teilen“, Mitglied mit Teamfreigabe |
| 12 | Teamübersicht | ✅ [B] |
| 13 | Team-Workstyle-Bericht | ✅ [B]: erst Bereitschaftshinweis, nach „Für dieses Team freigeben“ der gemeinsame Bericht für alle drei |
| 14 | Capability | ✅ [B]: Bereiche, Verantwortung, „Snapshot abschließen“; Rollenansicht im Team |
| 15 | Vorhaben / Venture | ❌→✅ [B]: **Abgabe war für die meisten unmöglich** (Blocker 1); nach der Korrektur abgegeben, Antwortseite erreicht |
| 16 | Founder Setup | ✅ [B]: Beitrag, Arbeitsnotiz, Vorschlag, Bestätigung durch zwei weitere Mitglieder, „gemeinsam bestätigt“, Vereinbarungsdokument |
| 17 | Logout, Login, Deep Links | ✅ [B]: Abmelden; Deep Link mit `?ansicht=` führt zum Login, Magic-Link führt exakt dorthin zurück |
| 18 | Mobile 390 | ✅ [B]: kein horizontaler Überlauf auf allen geprüften Seiten |
| 19 | Desktop 1280 | ✅ [B] |

**Crawls mit Linkprüfung** (jede Seite bei 1280 und 390, danach jeder gefundene interne Link per HTTP):

| Konto | Seiten | Links | Befund |
|---|---|---|---|
| Solo-Founder | 16 | 44 | alle 200 |
| Team-Mitglied (Team-, Setup-, Lab-, Vorhaben-, FIND-, CONNECT-Seiten) | 22 | 92 | alle 200, keine unerwartete Weiterleitung |
| Nur CONNECT | 12 | 34 | alle erreichbar; `/dashboard` und `/discovery` führen korrekt nach CONNECT |
| Abgemeldet | 9 | – | Marketing, Rechtliches, `/start`, `/login`; geschützte Seiten führen auf den Login mit `next`; unbekannte URL zeigt die eigene 404 |

Dabei gab es keine 500er, keine englischen Standardfehler und keine Konsolenfehler.

**Berechtigungen (Gegenprobe) [B]:**
- Nicht-Mitglieder bekommen auf fremden Teamseiten, fremdem Setup und Vereinbarungsdokument 404.
- Fremde Gespräche liefern 404.
- Ein fremder Vorhaben-Link zeigt nur die Auswahl der eigenen Vorhaben.

**E-Mail-Links:**
- **Magic-Link** [B]: führt über `/auth/callback?next=…` an das ursprüngliche Ziel, inklusive Query.
- **Einladung** [B][C]: Der Link `…/locale/continue?locale=de&next=/join?token=…` ist derselbe, den die Mail trägt. Er führt in den Beitrittsdialog.

---

## 3. Gefundene und behobene Blocker

### Blocker 1 – ALIGN: Vorhaben ließ sich nicht abgeben

**Wo:** Fragebogen „Was du aufbauen willst“ (`venture-alignment-v1`).

**Fehler:** Drei Stellen bewerteten Anschlussfragen (`showAfter`) unterschiedlich.

| Stelle | Regel vorher |
|---|---|
| Oberfläche (`Questionnaire.tsx`) | zeigte **jede** Anschlussfrage nur, wenn in L01 eine Grenze eingetragen war – auch R05, das an R04 hängt |
| Abgabe (`submitScope`) | verlangte eine Anschlussfrage, sobald für ihre Ausgangsfrage **irgendeine** Zeile existierte, auch eine Nicht-Antwort wie „möchte ich nicht angeben“ |
| Teambereitschaft (`teamReadiness.ts`) | wie die Abgabe |

**Folge:** Wer in L01 keine Grenze nannte (also fast alle), konnte nie abgeben.
- R05 war unsichtbar, wurde aber verlangt, weil R04 Pflicht ist.
- L02/L03 wurden nach einer Nicht-Antwort in L01 verlangt.
- Die Meldung „Es fehlen noch N Antworten“ zeigte auf Fragen, die nirgends zu sehen waren.
- Im Browser nachgestellt [B]: drei Personen, alle blockiert.

**Korrektur:** Neue gemeinsame Regel in `features/instruments/align/followUps.ts`.
- Eine Anschlussfrage gilt nur, wenn ihre **eigene** Ausgangsfrage inhaltlich beantwortet ist: kein Auslassungsgrund, ein Wert, bei Eintragslisten mindestens ein Eintrag mit Text.
- Oberfläche, Abgabe und Teambereitschaft nutzen dieselbe Funktion.
- **Nachher [B]:** Alle drei haben abgegeben, R05 erscheint nach R04, und L02/L03 fallen nach einer Nicht-Antwort weg.

**Tests [T]:** `align/__tests__/followUps.test.ts` (Regel, reale Items R05/L02/L03, alle drei Stellen).

### Blocker 2 – Einladung: eingeladene Co-Founder konnten sich aus ihrem Team aussperren

**Wo:** Einladungs-Einstieg `/join/welcome`.

**Fehler:** Der Einstieg nutzte denselben Assistenten wie die freie Registrierung und bot deshalb auch „Erstmal nur Leute kennenlernen“ und „Ich begleite …“ an.
- Wer das wählte, war Teammitglied ohne Founder-Rolle.
- Das Dashboard leitete nach CONNECT, aus der Navigation führte kein Weg mehr ins eigene Team, und der Einladungsweg (Teambericht) wurde übersprungen [B].

**Korrektur:** Der Assistent hat eine optionale Liste erlaubter Pläne (`plans`).
- `/join/welcome` bietet nur „Ich will gründen“ und „Beides“ an, beide mit Founder-Rolle.
- Die freie Registrierung bleibt unverändert.
- **Nachher [B]:** nur die zwei Optionen; danach Founder-Rolle und Weiterleitung in den Teambericht.

**Tests [T]:** `access/__tests__/betaReadinessGate.test.ts`.

### Blocker 3 – CONNECT: Kontaktanfragen ließen sich weder annehmen noch ablehnen

**Wo:** `/connect/contacts`, `ConnectContactActions`.

**Fehler:** „Annehmen“/„Ablehnen“ meldeten immer „Die Kontaktanfrage konnte nicht geändert werden.“.
- Auch mit echtem Mausklick [B].
- Ursache: Die Antwort hing als `name`/`value` am gedrückten Knopf und kam in der Server-Aktion leer an (`response: ''`). Im übertragenen Request fehlte das Feld.
- Ein nativer POST mit demselben Feld funktionierte.
- Warum React den Absenderknopf hier verwirft, beim CONNECT-Profil mit demselben Knopf aber nicht, ist nicht abschließend geklärt.

**Korrektur:** Je Antwort ein eigenes Formular mit verstecktem `response`-Feld. Server-Aktion, Prüfungen und Rechte sind unverändert.
- **Nachher [B]:** angenommen, Gespräch angelegt, Nachrichten in beide Richtungen.

**Tests [T]:** `betaReadinessGate.test.ts`; `connectSlice2.test.ts` an den neuen Aufbau angepasst.

---

## 4. Geänderte Dateien

| Datei | Änderung |
|---|---|
| `web/src/features/instruments/align/followUps.ts` | neu: gemeinsame Anschlussfragen-Regel |
| `web/src/features/instruments/align/Questionnaire.tsx` | Sichtbarkeit über `basisAnswered` |
| `web/src/features/instruments/align/answerActions.ts` | Abgabe liest `value`/`missing_code`, nutzt `followUpApplies` |
| `web/src/features/instruments/workstyle/teamReadiness.ts` | dieselbe Regel |
| `web/src/features/profile/ProfileBasicsForm.tsx` | optionale `plans` |
| `web/src/app/join/welcome/page.tsx` | nur Pläne mit Founder-Rolle |
| `web/src/features/connect/ConnectContactActions.tsx` | zwei Formulare mit verstecktem Feld |
| Tests | `followUps.test.ts`, `betaReadinessGate.test.ts` (neu), `connectSlice2.test.ts` (angepasst) |

Keine Migration, keine Rechteänderung, keine neuen Features.

---

## 5. Bekannte Non-Blocker

**Texte:**

| # | Fund | Wo |
|---|---|---|
| 1 | Die Einstiegsoption „Partner-Match – Passung und Unterschiede klären“ nutzt Passungssprache | `/welcome`, Schritt „Was möchtest du hier als Erstes tun?“ |
| 2 | Der manuelle Einladungslink spricht von „manuellem Rettungsweg, damit der Flow nicht blockiert“ – technisch. Erscheint nur, wenn der Mailversand scheitert | `/invite/new` |
| 3 | „Bevor ihr gründet … nur euch beide“ auch in Teams mit drei Personen | `/teams/[id]/setup` |
| 4 | „Es fehlen noch 1 Antworten“ (Singular). Fehlende Fragen sind nur auf ihrem Schritt markiert, es gibt keinen Sprung dorthin | Vorhaben |
| 5 | Das leere Postfach verspricht, ein zugesagtes FIND-Intro erscheine dort; das Gespräch entsteht aber erst mit „Nachricht schreiben“ | `/messages` |

**Bedienung:**

| # | Fund | Wo |
|---|---|---|
| 6 | „Ich orientiere mich noch“ bzw. „noch offen“ sind vorausgewählt, zum Veröffentlichen aber nicht zulässig. Die Meldung „Wähle ein Commitment-Level“ steht da, obwohl eines markiert ist | `/discovery/profile` |
| 7 | „Entwurf speichern“ wird von Pflichtfeldern blockiert (z. B. Bedingung bei „würde aufstocken“), obwohl ein Entwurf unvollständig sein darf (kein `formNoValidate`) | `/discovery/profile` |
| 8 | Eine eingeladene Person ohne Namen erscheint als „Founder 2“, bis sie ihren Einstieg abschließt | Team |

**Struktur und Altlasten:**

| # | Fund | Wo |
|---|---|---|
| 9 | Die Moderationsseite nutzt dasselbe Knopf-Muster wie Blocker 3 (`fieldName="status"`) und ist vermutlich betroffen; Admin, kein Beta-Blocker | `/admin/moderation` |
| 10 | „Starte euer Matching“ und der Zahlungshinweis (39 €) wirken wie Altbestand | `/invite/new` |

**Lokale Artefakte, keine Produktfehler:**
- Magic-Link über `127.0.0.1` endet bei „Link unvollständig“, weil der Dev-Server auf `localhost` umleitet und der Sitzungsspeicher an den Host gebunden ist. Über `localhost` funktioniert es, in Produktion ist der Host identisch.
- Lokal fehlt `RESEND_API_KEY`, App-eigene Mails werden nicht versendet.
- Lokal sind die Supabase-Standardvorlagen auf Englisch („Your Magic Link“).
- Der Dev-Server lief nach Stunden in einen Speicherüberlauf.

**Bewusst nicht im Gate:** Advisor, Notifications, Legacy.

---

## 6. Manuelle Prüfungen in Produktion vor der Beta

Nicht aus dem Repo prüfbar:

1. **Auth-Mailvorlagen** im Supabase-Dashboard (Authentication → Email Templates):
   - deutsche Fassung aus `supabase/templates/` übernommen,
   - `{{ .Token }}` enthalten (Code-Login auf iOS-Homescreen-App).
2. **`RESEND_API_KEY`** in der Produktion gesetzt: Einladungs-, Intro- und Kontaktmails.
3. **`NEXT_PUBLIC_SITE_URL`** gesetzt: sonst Fallback `https://cofoundery.de` in Mail-Links.
4. **Supabase Redirect-Liste** enthält `<Produktionsdomain>/auth/callback` (inklusive `?next=`).
5. **`BETA_ACCESS_CODES`** in der Produktion gesetzt.
6. Ein echter Magic-Link-Login auf iPhone (Safari und Homescreen-App mit Code).

---

## 7. Validierung

**`npm run ci:check`:**
- Exit 0.
- 2913/2913 Node-Tests.
- Build erfolgreich.
- 152 DB-Dateien „ok“ (2273 Prüfungen).

**`git diff --check`:** ohne Befund.

**Testdaten:** Alle `beta-*`-Konten, Teams, Gespräche und Mails sind gelöscht. Lokale DB wieder: 4 Nutzer, 1 Team, 1 Organisation, 2 Reviews, 0 Einladungen, 0 Gespräche.
