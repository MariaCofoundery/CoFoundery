# Phase 12C.0 – Einladungsannahme absichern

**Grundlage:** [phase-12ab-platform-integrity-notification-audit.md](phase-12ab-platform-integrity-notification-audit.md), P0-1

**Branch:** `fix/invite-resume-consent-12c0` (von `main` @ `48de04ba`)

**Status:** Migration nur lokal angewendet. Kein Commit, kein Push, kein Deploy.

## 1. Root Cause

**Auslöser:** Der Link „Fortsetzen“ bzw. „Einladung ansehen“ zeigt an drei Stellen auf `GET /invite/[id]/resume`:
- Dashboard-Aufgabe `incoming_invitation` (`founderDashboardTasks.ts:240`)
- Einladungskarte auf dem Dashboard (`dashboard/page.tsx:962`)
- „Öffnen“ bei eingehenden Einladungen auf `/connections` (`founderConnectionsModel.ts:164`)

**Was der Route Handler tat:** Er prüfte nur, ob die angemeldete Person die eingeladene ist. Dann schrieb er mit dem **Service-Role-Key**:
- `relationships` wurde per upsert angelegt.
- `invitations` wurde auf `status='accepted'` und `invitee_user_id` gesetzt.

**Folge:** Der Trigger `ensure_founder_team_after_invitation_acceptance` machte die Person daraufhin zum Teammitglied.
- Ohne Beitrittsdialog.
- Ohne Teilen-Entscheidung.
- Ohne die Prüfungen von `accept_invitation`, etwa die Sperre gegen parallele Annahme.
- Ausgelöst durch jeden GET: Klick, Prefetch, Link-Vorschau, Crawler, HEAD. Im Audit-Crawl ist genau das einer Testperson passiert.

**Warum es so gebaut war:** Das Dashboard kennt den Einladungs-Token nicht; gespeichert ist nur sein Hash. Die Annahme-RPCs (`accept_invitation`, `accept_invitation_with_team_share`) verlangen aber den Token. Ohne die Schreibaktion hätte `/join/start` eine offene Einladung als „not_accepted“ ins Dashboard zurückgeworfen.

**Zweiter GET-Weg gleicher Art:** `GET /join/welcome?token=…` rief beim Rendern `accept_invitation(token)` auf, ebenfalls ohne Wahl. Die App selbst erzeugt diesen Link nicht mehr; er war über alte oder handgebaute Adressen erreichbar.

**Nicht betroffen:** `/join?token` (Dialog aus 11.7B), `/join/prepare`, `/join/continue` (nur Cookie) und `/join/start` (nur lesen).

## 2. Sicherheitskorrektur

**Regel:** Kein GET nimmt eine Einladung an, erzeugt eine Beziehung oder Mitgliedschaft, setzt eine Teamfreigabe oder verändert eine Einwilligung. Angenommen wird nur nach einem Klick auf eine der beiden Optionen im Beitrittsdialog.

### Datenbank (`20261120120000_invitation_acceptance_by_decision.sql`)

| Funktion | Zweck | Rechte |
|---|---|---|
| `accept_invitation_core(id)` | Interner Kern mit **genau** den bisherigen Prüfungen von `accept_invitation`: Login, Adresse = eingeladene Adresse, widerrufen, abgelaufen, Status, schon angenommen, `for update` gegen parallele Annahme, idempotent für dieselbe Person | niemand (nur intern) |
| `accept_invitation(token)` | Unverändertes Verhalten; sucht die Einladung per Hash und ruft den Kern | `authenticated` |
| `accept_invitation_by_id_with_team_share(id, share)` | Annahme aus dem Konto heraus, ohne Token. `share` ist Pflicht (`share_choice_required`); `true` setzt die Teamfreigabe genau für das Team der Einladung, wie die Token-Variante | `authenticated` |
| `get_invitation_decision_state(id)` | Reine Lesefunktion (`stable`): `pending`, `accepted`, `expired`, `revoked` oder `unavailable`. Unbekannte und fremde Einladungen ergeben beide `unavailable`, es wird also nichts preisgegeben | `authenticated` |

**Berechtigung:** Sie bleibt gleich wie beim Token-Weg. Der Token hat die Einladung bisher nur *gefunden*; autorisiert hat schon immer die Übereinstimmung der angemeldeten Adresse. Es wird kein Token offengelegt oder neu erzeugt. Der Service-Role-Key wird für die Annahme nicht mehr verwendet.

### App

| Datei | Änderung |
|---|---|
| `invite/[sessionId]/resume/route.ts` | Nur noch Weiterleitung nach `/join/start?invitationId=…`. Kein Datenbankzugriff, kein Service-Role-Client. Bleibt für gespeicherte Links. |
| `join/start/route.ts` | Liest vor allem anderen `get_invitation_decision_state`, auch vor der Profilabfrage. Bei `pending` geht es zu `/join?invitationId=…`. Angenommene Einladungen laufen wie bisher in den aktuellen Weg. |
| `join/JoinClient.tsx` | Derselbe Beitrittsdialog aus 11.7B, jetzt auch ohne Token (`token: null`). Ohne Token wird beim Öffnen nur der Zustand gelesen. `acceptWithChoice` ist die einzige Stelle, an der angenommen wird, und läuft nur über die zwei Knöpfe: Token-Variante oder ID-Variante. Abgelaufene, widerrufene oder nicht verfügbare Einladungen zeigen ihre Erklärung direkt im Dialog. |
| `join/welcome/page.tsx` | Nimmt nichts mehr an. Ein `token` in der Adresse führt nach `/join?token=…`. Der ungenutzte Fehler-Mapper ist entfernt. |

Es gibt keinen zweiten Dialog und keine neuen Texte; die 11.7B-Texte werden wiederverwendet.

## 3. Geänderte Dateien

- **Neu:**
  - `supabase/migrations/20261120120000_invitation_acceptance_by_decision.sql`
  - `supabase/tests/invitation_acceptance_by_decision.sql`
  - `web/src/features/onboarding/__tests__/invitationAcceptanceConsent.test.ts`
  - dieses Dokument
- **Geändert:**
  - `web/src/app/(product)/invite/[sessionId]/resume/route.ts`
  - `web/src/app/join/start/route.ts`
  - `web/src/app/join/JoinClient.tsx`
  - `web/src/app/join/welcome/page.tsx`
  - `web/src/features/instruments/workstyle/__tests__/phase116c.test.ts` (Migrationsreihenfolge)
- **Unverändert:** Links auf Dashboard und Verbindungen (sie zeigen weiter auf `/resume`, das jetzt harmlos ist), `accept_invitation_with_team_share`, FIND-Teambildung, Teamfreigaben.

## 4. Tests

**pgTAP `invitation_acceptance_by_decision.sql`** (gegengeprüft: eine absichtlich falsche Erwartung lässt die Suite fehlschlagen)

| Fall | Erwartung |
|---|---|
| A | Zustand lesen (auch zweimal) verändert weder Mitglieder, Beziehungen, Freigaben noch Einladungen; die Funktion ist `stable` |
| D | Ohne Wahl gibt es `share_choice_required` und keine Mitgliedschaft |
| E | „Erst beitreten“ macht zum Mitglied, ohne Teamfreigabe; die Freigabe der Einladenden ist nicht impliziert |
| F | „Beitreten und teilen“ macht zum Mitglied mit genau einer Teamfreigabe für dieses Team |
| G | Abgelaufen, widerrufen und unbekannt: richtiger Zustand, Annahme scheitert, keine Mitgliedschaft |
| H | Eine fremde Person sieht `unavailable` und kann weder offene noch angenommene Einladungen einlösen |
| I/J | Angenommen zeigt `accepted`; eine zweite Annahme ist idempotent, ohne Dubletten und ohne Änderung |
| K | Team mit vier Mitgliedern; eine fünfte Einladung scheitert (`founder_team_member_limit_reached`) |
| Regression | Token-Weg (`accept_invitation_with_team_share`, `accept_invitation`) unverändert und idempotent |
| Rechte | Kern ist intern; Annahme und Zustand nur für angemeldete Personen |

**Bestehende Suiten:** Alle bleiben grün, auch der Token-Beitritt in `team_shares_and_leave` J sowie `invite_authorization_security`, `founder_team_foundation` und `team_size_onboarding`.

**Node `invitationAcceptanceConsent.test.ts`:**
- `/resume` ohne Datenbankzugriff und ohne Service Role.
- Kein Route Handler und keine Seite unter `src/app` ruft eine Annahme-RPC auf (nur der Dialog).
- `/join/welcome` leitet einen Token in den Dialog.
- `/join/start` prüft vor dem Profil.
- Beide Annahme-RPCs stehen nur in `acceptWithChoice`, und das wird nur aus den zwei Knöpfen mit fester Wahl aufgerufen.
- Zustände G werden erklärt.
- Die Migration hält die Regeln ein.

**Parallele Annahme:** In pgTAP nicht echt nebenläufig testbar. Abgesichert ist sie durch `select … for update` im Kern; nachfolgende Aufrufe derselben Person sind idempotent (getestet), andere Personen scheitern an der Adressprüfung.

**`npm run ci:check`:**
- Exit 0.
- 2875/2875 Node-Tests.
- Build erfolgreich.
- 148 DB-Dateien, „Result: PASS“.
- `git diff --check` ohne Befund.

## 5. Browserergebnisse

Lokal, eigener Dev-Server, nur lokale Testkonten (danach gelöscht). Datenbankzustand vor und nach jedem Schritt über den Admin-Client geprüft.

| Schritt | 1280 | 390 | Datenbank danach |
|---|---|---|---|
| Rohe Requests `HEAD` und `GET` auf `/resume`, `GET /join/start` (wie Prefetch/Crawler) | 307 → `/join/start` → `/join?invitationId` | – | unverändert |
| Dashboard „Einladung ansehen“ | Dialog „Team beitreten“ mit beiden Optionen, keine Vorauswahl | identisch, kein Überlauf | unverändert |
| Verbindungen „Öffnen“ | derselbe Dialog | – | unverändert |
| Fremde Person öffnet die Einladung | „Einladung nicht gefunden“ | – | unverändert |
| Alter Weg `/join/welcome?token=` | Weiterleitung in den Dialog | – | unverändert |
| „Erst beitreten, später entscheiden“ (aus dem Dashboard) | weiter zu „Willkommen“ (Profil-Basics) | – | Mitglied, **keine** Teamfreigabe, Einladung `accepted` |
| Erneut öffnen | kein Dialog mehr, normaler Weg | – | unverändert |
| E-Mail-Link `/join?token=`, „Team beitreten und teilen“ (4. Person) | – | Dialog, danach „Willkommen“ | Mitglied **mit** Teamfreigabe; Team hat 4 Mitglieder |
| Abgelaufene Einladung | „Link abgelaufen“ | identisch | unverändert, keine Mitgliedschaft |
| Bereits angenommene Einladung | normaler Weg (kein Dialog) | – | unverändert |

**Lokales Artefakt:** Route Handler leiten lokal auf `localhost` statt `127.0.0.1` weiter (bekannt seit 11.7B). Für den Review wurde das Sitzungs-Cookie für beide Hosts gesetzt. Produktiv ist das ohne Belang.

## 6. Migrationsabhängigkeiten

- **Die App braucht die Migration.** `/join/start` und der Dialog rufen `get_invitation_decision_state` bzw. `accept_invitation_by_id_with_team_share` auf.
- **Ohne Migration bleibt nichts unsicher, aber der Dashboard-Weg bricht:**
  - `/join/start` bekommt einen RPC-Fehler, ignoriert ihn und fällt in den alten Weg zurück; das Ergebnis ist „not_accepted“ und eine Dashboard-Fehlermeldung.
  - Eine Annahme aus dem Dashboard ist dann nicht möglich, nur noch über den E-Mail-Link.
  - Deshalb muss die Migration **vor oder mit** dem App-Deploy laufen, wie bisher in Marias Release-Prozess.
- **Reihenfolge:** Die Migration folgt auf `20261119120000` und `20261119130000` (11.7B), die ebenfalls noch remote ausstehen. `accept_invitation_by_id_with_team_share` nutzt `set_team_share` und `is_current_user_founder_team_member` aus `20261119120000`.
- **`accept_invitation(token)` wird ersetzt**, mit identischem Verhalten und identischen Fehlertexten. Es bleibt `authenticated`-only.

## 7. Release-Risiken

- **Nur lokal geprüft:** Ersatz von `accept_invitation` durch Delegation an den Kern. Abgedeckt durch die bestehenden Suiten (Token-Beitritt, Autorisierung, Teamgröße) und den Regressionsfall.
- **Kurz offene Einladungskarten:** Wer einen alten `/resume`-Link in der Hand hat, landet jetzt im Dialog statt im Team. Das ist gewollt.
- **Bisher still angenommene Einladungen** (Produktionsdaten) bleiben angenommen. Sie lassen sich nicht von bewusst angenommenen unterscheiden, weil kein Merkmal gespeichert ist. Die Betroffenen können das Team über „Team verlassen“ verlassen. Prüfen lässt sich das nur grob, z. B. `accepted_at` ohne anschließende Aktivität. Kein automatischer Eingriff.
- **E-Mail-Bestätigung:** Siehe 12C.0b, Abschnitt 9.4. Die Annahme verlangt jetzt serverseitig eine bestätigte Adresse.

## 8. Nicht Teil dieser Phase (Restpunkte aus dem Audit)

- **`/invite/person-access/[token]` und `/invite/advisor-org/[token]`:** erledigt in 12C.0b (Abschnitt 9).
- **Nach der Annahme landen Testkonten mit unvollständigem Profil auf „Willkommen“:** Das ist der bestehende Weg und unverändert.
- **Englische Standard-404 und weitere P0-Punkte aus dem Audit:** 12C.

---

## 9. Ergänzung 12C.0b – Advisor-Einladungen

Gleicher Branch. Zweite Migration `20261120130000_advisor_invite_consent.sql`, nur lokal angewendet.

### 9.1 Bestätigte Fehler (mit lokalen Testkonten nachgestellt)

Die Seiten aus `HEAD` wurden kurz wiederhergestellt; die Datenbank wurde über den Admin-Client vor und nach jedem Request gelesen.

| Route | Auslöser | Wirkung vorher |
|---|---|---|
| `/invite/person-access/[token]` | **ein einzelner HEAD-Request** | zwei Zugriffsanfragen (`base:requested`, `strengths:requested`) angelegt, Einladung `claimed`, Weiterleitung nach `/account` |
| `/invite/advisor-org/[token]` | ein einzelner GET-Request | aktive Org-Mitgliedschaft (`advisor:active`), Einladung `claimed` |

Beide Seiten riefen `claim_advisor_*_invite` beim Rendern auf. Damit galt das auch für:
- **Prefetch, Link-Vorschau, Crawler:** wirkten genauso wie ein Klick.
- **Erneutes Öffnen:** danach `invite_not_open` und die Seite „geht nicht auf“; die Daten blieben von der ersten Einlösung bestehen.
- **Abgelaufen oder widerrufen:** Die RPC wies ab, es wurde nichts geschrieben, aber ohne Begründung.

**Zusätzlich gefunden:**
- **Keine bestätigte Adresse gefordert:** Keine der Einladungsannahmen verlangte eine bestätigte E-Mail-Adresse, auch nicht die Founder-Annahme aus 12C.0. Die Claims lasen die Adresse aus `auth.users`, die Founder-Annahme aus dem JWT.
- **Org-Einlösung konnte herabstufen:** Sie setzte immer die Rolle der Einladung, auch für aktive Mitglieder. Eine Inhaberin, die eine Advisor-Einladung einlöst, wurde still zur Advisorin. Bei der letzten Inhaberin hätte die Organisation niemanden mehr, der sie führt.

### 9.2 Korrekturen

**Datenbank:**

| Funktion | Änderung |
|---|---|
| `get_advisor_person_invite_preview(hash)` | neu, `stable`. Zustand `open`, `claimed`, `expired`, `revoked`, `self`, `unverified` oder `unavailable`. Details (wer fragt, für welche Organisation, Bereiche, Nachricht) nur für die eingeladene Adresse. |
| `get_advisor_org_invite_preview(hash)` | neu, `stable`. Organisation, Rolle, einladende Person, bestehende Mitgliedschaft; gleiche Zustände. |
| `current_user_email_verified()` | neu, intern. `auth.users.email_confirmed_at` ist gesetzt. |
| `claim_advisor_person_invite` | zusätzlich bestätigte Adresse; sonst unverändert (nur Anfragen, geltende Zugänge bleiben, `for update`). |
| `claim_advisor_org_invite` | zusätzlich bestätigte Adresse; eine aktive Inhaberin bleibt Inhaberin. |
| `accept_invitation_core`, `get_invitation_decision_state` (12C.0) | zusätzlich bestätigte Adresse bzw. Zustand `unverified`. |

**App:**
- **Beide Seiten lesen beim Aufruf nur die Vorschau.** Eingelöst wird ausschließlich in einer Server Action, also per POST aus genau einem Formular-Knopf.
  - Person-Access: „Anfrage annehmen“ oder „Nicht jetzt“.
  - Organisation: „Organisation beitreten“ oder „Nicht beitreten“.
  - Keine Vorauswahl, kein automatisches Abschicken.
- **Die Seite erklärt vorher die Folgen:**
  - Person-Access: Es entstehen nur Anfragen je Bereich; die Zustimmung fällt danach einzeln im Konto. Dazu der bestehende Hinweis „Nie dabei …“.
  - Organisation: Die Bedeutung der Mitgliedschaft wird mit dem bestehenden Text `membershipMeaning` gezeigt.
- **Doppelt abgeschickt:** Hat die erste Einlösung gegriffen, gilt das als Erfolg. Erneutes Öffnen einer eingelösten Einladung führt zum Ziel.
- **Ablehnungsgründe:** Abgelaufen, widerrufen, unbestätigt und „eigene Einladung“ bekommen einen eigenen Satz. Fremde sehen den allgemeinen Text ohne Details.
- **`JoinClient`:** erklärt den neuen Zustand `unverified` bzw. den Fehler `email_not_verified` der Founder-Einladung.
- Keine zweite Consent-Architektur: Bestehende Claim-RPCs, Grants, die Zustimmung im Konto und der Widerruf bleiben, wie sie sind.

### 9.3 Weitere Einladungswege geprüft

| Route | GET schreibt? | Bewertung |
|---|---|---|
| `/team-invite/[token]` | nein. Liest; ist der Slot schon verknüpft, folgt eine Weiterleitung nach `/join/start` (dort seit 12C.0 der Beitrittsdialog). Verknüpfen nur per Server Action. | ok |
| `/team-intake/invite/[token]` | nein, nur per Server Action | ok |
| `/connect/workspaces/invite/[token]` | nein, nur per Server Action | ok |
| `/advisor/invite/[token]` (Legacy-Workbook) | nein, nur per Server Action | ok |
| `/event/[slug]` | nein, Teilnahme nur per Server Action | ok |
| `/join*`, `/invite/[id]/resume` | nein (12C.0) | ok |

Die übrigen Claim-RPCs (Advisor-Team, Intake, Workspace) prüfen keine bestätigte Adresse. Das wurde bewusst nicht geändert; siehe 9.7.

### 9.4 Bestätigte E-Mail-Adresse: was der Server jetzt garantiert

- **Vorher:** Die Sicherheit hing allein an den Supabase-Einstellungen.
- **Jetzt:** Jede Annahme verlangt serverseitig `email_confirmed_at`. Das hilft, wenn im Projekt „Confirm email“ aktiv ist: Unbestätigte Konten können nichts mehr annehmen.
- **Grenze:** Ist „Confirm email“ **aus** (lokal: `enable_confirmations = false`), bestätigt Supabase jede Registrierung sofort. `email_confirmed_at` beweist dann keinen Besitz der Adresse.
  - Wer per Passwort-Registrierung ein Konto mit einer fremden Adresse anlegen kann, könnte deren Einladungen annehmen.
  - Die App nutzt selbst nur Magic Link (Besitz bewiesen), aber der Supabase-Endpunkt für Passwort-Registrierung ist offen, wenn er im Projekt aktiviert ist.
- **Release-Prüfung:** In Produktion „Confirm email“ aktiv oder Passwort-Registrierung deaktiviert. Das steht nicht im Repo.

### 9.5 Tests

**pgTAP `advisor_invite_consent.sql`** (gegengeprüft: eine verdrehte Erwartung lässt die Suite fehlschlagen)

| Fall | Erwartung |
|---|---|
| Ansehen (GET/HEAD) | Vorschauen, auch wiederholt und durch Fremde, schreiben nichts; beide sind `stable` |
| Fremde Person | Vorschau ohne Details; Einlösung `invite_email_mismatch` |
| Unbestätigt | Person, Organisation **und** Founder-Einladung (Token und ID): Zustand `unverified`, Annahme `email_not_verified`, nichts geschrieben |
| Abgelaufen, widerrufen | richtiger Zustand, Einlösung abgewiesen, nichts geschrieben |
| Ausdrückliche Annahme Person | genau eine Anfrage je Bereich, nichts aktiv, Einladung `claimed` |
| Doppelte Annahme | `invite_not_open`, keine Änderung (die Seite wertet das als Erfolg) |
| Rechte nach Zustimmung | Zustimmen aktiviert genau den Bereich; Widerruf funktioniert; eine geltende Zustimmung wird durch eine neue Einladung nicht zur Anfrage |
| Einladung zurückziehen | wie bisher; danach nicht mehr einlösbar |
| Organisation | ausdrücklicher Beitritt mit eingeladener Rolle; doppelt abgewiesen ohne Änderung; Inhaberin wird nicht herabgestuft |
| Rechte | Vorschauen nur für angemeldete Personen, Hilfsfunktion intern |

**Bestehende Suiten:** `advisor_person_invites`, `advisor_org_invites`, `invite_authorization_security`, `invitation_acceptance_by_decision`, `team_shares_and_leave`, `team_size_onboarding` und `founder_team_foundation` bleiben grün.

**Node `invitationAcceptanceConsent.test.ts`** (erweitert):
- Claim-RPCs stehen nur in der Server Action mit `"use server"`; der Seitenaufruf liest nur die Vorschau.
- Genau ein Formular, kein automatisches Abschicken.
- Doppel-Klick gilt als Erfolg.
- Texte de/en vorhanden.
- Die Migration prüft die Adresse und stuft nicht herab.

**`npm run ci:check`:**
- Exit 0.
- 2879/2879 Node-Tests.
- Build erfolgreich.
- 149 DB-Dateien, „Result: PASS“.
- `git diff --check` ohne Befund.

### 9.6 Browserprüfung (1280 und 390)

| Schritt | Ergebnis | Datenbank danach |
|---|---|---|
| Rohe HEAD- und GET-Requests auf beide Seiten | 200, nur Anzeige | unverändert |
| Person-Access öffnen (1280, 390) | „Eine Anfrage nach Zugang“: Ada Advisor im Namen von „Beispiel Accelerator“, Bereiche mit Erklärung, Nachricht, Folgen; Knopf „Anfrage annehmen“ und Link „Nicht jetzt“; kein Überlauf | unverändert |
| Abgelaufen / widerrufen | „Diese Einladung ist abgelaufen …“ bzw. „… wurde zurückgenommen.“ | unverändert |
| Fremde Person (beide Seiten) | allgemeiner Text ohne Details | unverändert |
| Klick „Anfrage annehmen“ | weiter zu `/account` mit Hinweis | `base:requested`, `strengths:requested`; Einladung `claimed`; nichts aktiv |
| Erneut öffnen | direkt zu `/account#person-access` | unverändert |
| Organisation öffnen (1280, 390) | Organisation, Rolle „Advisor“, Bedeutung der Mitgliedschaft; Knopf „Organisation beitreten“ und Link „Nicht beitreten“ | unverändert |
| Organisation abgelaufen / widerrufen | jeweils eigener Satz | unverändert |
| Klick „Organisation beitreten“ | weiter zu `/advisor/dashboard` | `advisor:active`, Einladung `claimed` |
| Erneut öffnen | direkt zu `/advisor/dashboard#advisor-org` | unverändert |

Testkonten und Test-Organisation sind danach gelöscht.

### 9.7 Verbleibende Risiken

- **E-Mail-Besitz:** hängt bei abgeschalteter Bestätigung weiter an den Supabase-Einstellungen (9.4); die Produktionseinstellung muss geprüft werden.
- **Andere Claim-RPCs ohne Adressbestätigung:** `claim_advisor_team_invite_founder`, `claim_team_intake` und `claim_problem_workspace_invite` laufen zwar nur per POST, prüfen aber keine bestätigte Adresse. Kein GET-Risiko; bei Bedarf in 12C mit derselben Hilfsfunktion nachziehen.
- **Migrationsreihenfolge:** `20261120130000` ersetzt Funktionen aus `20261120120000` und muss danach laufen. Beide hängen an den noch ausstehenden 11.7B-Migrationen.
- **Ersetzte Funktionen:** `claim_advisor_person_invite` und `claim_advisor_org_invite` werden neu definiert. Die bestehenden Suiten bestätigen das unveränderte Verhalten bis auf die zwei gewollten Verschärfungen.
- **Altbestand in Produktion:** Bereits per Seitenaufruf eingelöste Advisor-Einladungen bleiben eingelöst. Personenanfragen sind unkritisch (Zustimmung fehlt ohnehin). Org-Mitgliedschaften, die so entstanden sind, lassen sich von bewusst angenommenen nicht unterscheiden; Inhaberinnen können sie entfernen.
- **Ohne Produktleiste:** Die Einladungsseiten haben keine Produktleiste (`/invite/*` liegt außerhalb von `productChromePath`, wie bisher).
