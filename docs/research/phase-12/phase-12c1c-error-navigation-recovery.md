# Phase 12C.1C – Error States, Navigation & Recovery UX

**Branch:** `fix/error-states-recovery-12c1c`, von `main` @ `4474c2c2` (12C.1B).
- 12C.0/0b, 12C.1A und 12C.1B sind in `main`.
- Migration `20261122120000` ist remote angewendet (nur lesend geprüft).
- Das Repo war sauber.

**Status:** Eine additive Migration, nur lokal angewendet. Kein Commit, kein Push, kein Deploy, kein Remote-Push.

**Kennzeichnung:**
- **[B]** im Browser beobachtet
- **[T]** automatisiert getestet
- **[C]** aus Code abgeleitet

---

## 1. Executive Summary

| Thema | Ergebnis |
|---|---|
| **Globale Seiten** | Eigene, übersetzte `not-found` (Status 404) und `error`-Seite statt der englischen Next-Standard-404 [B][T]. |
| **Teamseiten** | Alle 16 Seiten unter `/teams/[id]/**` erklären verlorene Zugänge: verlassen, archiviert, Rosterwechsel, Review beendet, Org-Mitgliedschaft beendet, Organisation ausgesetzt, Paar-Advisor beendet [B][T]. |
| **Advisor-Seiten** | Personenseite und Review-Seite erklären beendete, offene und Org-bedingte Zustände – ohne Inhalte und ohne zu sagen, wer widerrufen hat [B][T]. |
| **Review ohne Teambezug** | Die Review-Seite erklärt das und bietet den bestehenden Anfrageweg für dieselbe Gruppe an [B][T]. |
| **Invite Recovery** | Nach einem gescheiterten Abschluss gibt es einen ausdrücklichen Wiederholungsweg, nur für die Person, die den Slot beansprucht hat. Der Seitenaufruf bleibt schreibfrei [B][T]. |
| **Organisation** | Namen in der Mitgliederliste, sichtbare Fehlermeldungen, Hinweis „ausgesetzt“ [B][T]. |
| **Login** | `next` behält `venture`, `snapshot`, `ansicht`, `invitationId`, `p` und weitere Parameter. Externe Ziele sind weiterhin ausgeschlossen [B][T]. |
| **Hinweise** | Team-Hinweise werden beim Austritt erledigt; ihr Ziel erklärt sich ohnehin [T]. |
| **Leere Zustände und Links** | Fünf leere Zustände bekommen einen nächsten Schritt; acht falsche Ziele oder Rückwege sind korrigiert [B][T]. |

**Zusätzlich gefunden und behoben [B]:**
- Bei **ausgesetzter Organisation** zeigte die Personenseite eine leere Hülle („Diese Person“ ohne Abschnitte).
- Die Ursache: Die Seite las die Freigabezeilen, nicht den wirksamen Zugang. Daten gab die Datenbank dabei keine heraus.
- Jetzt entscheidet der wirksame Zugang, und die Seite erklärt „Die Organisation ist ausgesetzt“.

---

## 2. Error-State-Modell

**Grundsatz:** Statusinformation ist kein Datenzugriff.
- Die Zustände kommen aus der Datenbank, über drei neue `SECURITY DEFINER`-Funktionen (Abschnitt 15).
- Sie nennen nur Gründe, die die Person ohnehin kennen darf.
- Keine der Funktionen gibt Inhalte heraus.

| Fall | Wer sieht ihn | Zustand |
|---|---|---|
| **A** Seite existiert nicht | alle | globale Nicht-verfügbar-Seite (404) |
| **B** nie Zugang | alle Außenstehenden | **dieselbe** Seite wie A – absichtlich, sonst wäre jede Seite ein Existenz-Orakel |
| **C** Zugang beendet | ehemalige Advisors | „Dieser Zugang ist nicht mehr aktiv.“ |
| **D** Team verlassen | ehemalige Mitglieder | „Du gehörst diesem Team nicht mehr an.“ |
| **E** Team archiviert | ehemalige Mitglieder; ehemalige Advisors | „Dieses Team ist nicht mehr aktiv.“ |
| **F** Teamzusammensetzung verändert | Advisor des gebundenen Reviews | „Die Teamzusammensetzung hat sich verändert. Für diesen Teambericht ist eine neue Freigabe nötig.“ |
| **G** Review nicht mehr gültig | Advisor des Reviews | „Der gemeinsame Bericht ist aktuell nicht verfügbar.“ bzw. „Diese gemeinsame Auswertung ist nicht mehr aktiv.“ |
| **H** Zustimmung fehlt | Advisor | „Die Auswertung wartet noch auf Antworten.“ / „Die Anfrage ist noch offen.“ |
| **I** Organisation ausgesetzt | Org-Mitglieder | „Die Organisation ist ausgesetzt.“ |
| **J** Org-Mitgliedschaft beendet | ehemalige Org-Mitglieder | „Deine Mitgliedschaft in der Organisation ist beendet.“ |
| **K** Einladung abgelaufen, widerrufen, genutzt | eingeladene Person | konkrete Meldung auf dem Dashboard statt „bitte erneut versuchen“ |
| **L** Ressource existiert, nicht mehr für diese Person | wie D–J | je nach Grund |

**Nicht unterschieden wird:**
- **Wer widerrufen hat.** Ein beendeter Review heißt „beendet“, nicht „abgelehnt von …“.
- **Ob es gerade ein passendes Team gibt.** Das wäre eine Auskunft über Teammitgliedschaften.

---

## 3. Globale Fehlerseiten

| Datei | Inhalt |
|---|---|
| `app/not-found.tsx` | „Diese Seite ist nicht mehr verfügbar.“, „Zur Startseite“, „Zu Teams & Verbindungen“; EN entsprechend. `noindex`. |
| `app/error.tsx` | Client-Komponente: „Diese Seite konnte gerade nicht geladen werden.“, „Erneut versuchen“ (`reset()`), „Zur Startseite“. Keine technischen Details auf der Seite. |
| `features/access/AccessStatePanel.tsx` | Gemeinsamer, schlanker Zustandsbaustein: Titel, Text, Wege. |

Beide Seiten laufen innerhalb der Produktleiste.

**Browser [B]:**
- Abgemeldet und angemeldet, DE und EN, 1280 und 390.
- Statuscode 404.
- Kein Überlauf.

---

## 4. Founder-Team-Zustände

**`TeamUnavailable`** (`features/access/TeamUnavailable.tsx`) ersetzt `notFound()` an genau der Stelle, an der eine Teamseite das Team nicht lesen kann.
- **Ist die Person weiter Mitglied** (z. B. ungültiger Setup-Schlüssel): echte 404.
- **Hatte sie nie Zugang:** echte 404.

**Abgedeckt (16 Seiten):**
- Übersicht, Bericht, Rollen, Setup, Setup-Thema, Setup-Dokument, Library.
- Commitment Lab.
- Read My Mind (4 Seiten), Founder in the Wild (4 Seiten).

**Außerdem:**
- `/invite/new?team=`.
- `/founder-alignment/vorhaben?venture=` – statt der falschen Behauptung „Du bist in mehreren“.

| Fall | Ergebnis |
|---|---|
| Team verlassen | „Du gehörst diesem Team nicht mehr an.“ + „Zu Teams & Verbindungen“ [B] |
| Team archiviert | „Dieses Team ist nicht mehr aktiv.“ [B] |
| Vorhaben-Link nach Austritt | derselbe Zustand statt der Vorhaben-Auswahl [B] |
| Nie Mitglied | globale 404 [B] |

**Archivierte Teams bleiben unlesbar:** Die Teamzeile, der Bericht und das Setup sind weiter nicht lesbar [T]. Der Zustand ist nur die Statusauskunft.

**Austritts-Historie:**
- Damit „verlassen“ nur ehemalige Mitglieder erreicht, merkt sich `founder_team_member_exits` den Austritt (Trigger auf `founder_team_members`).
- Bei Kontolöschung entsteht kein Eintrag.
- **Bestand:** belegbare Austritte (widerrufene Teamfreigabe ohne Mitgliedschaft; Paar-Beziehung am Team ohne Mitgliedschaft).

---

## 5. Advisor-Zustände

| Seite | Zustände | Rückwege |
|---|---|---|
| `/teams/[id]/workstyle` als Advisor | Rosterwechsel, Review beendet, Org-Mitgliedschaft beendet, Organisation ausgesetzt, Team nicht mehr aktiv, Paar-Advisor beendet | Personen & Gruppen, Advisor-Übersicht |
| `/advisor/person/[userId]` | beendet, Anfrage offen, Org-Mitgliedschaft beendet, Organisation ausgesetzt | Personen & Gruppen, Advisor-Übersicht |
| `/advisor/review/[reviewId]` | beendet (ohne Grund und Person), wartet, Org-Mitgliedschaft beendet, Organisation ausgesetzt | Personen & Gruppen, Advisor-Übersicht |

**Personenseite:**
- Sie entscheidet jetzt über den **wirksamen** Zugang (`get_advisor_person_access_state`), nicht über die Freigabezeilen.
- Vorher blieb bei ausgesetzter Organisation oder beendeter Mitgliedschaft eine leere Seite stehen [B].
- Der Rückweg führt zu „Personen & Gruppen“ statt zum Org-Anker.

**Datenschutz:** Ein Advisor erfährt aus keinem Text, welche Person eine Freigabe widerrufen hat. Die Texte haben keinen Namensplatzhalter [T].

---

## 6. Review ohne Teambezug

Die Review-Seite zeigt den Abschnitt **„Teambericht“** mit dem Zustand des Reviews.

| Zustand | Text | Aktion |
|---|---|---|
| aktiv, gebunden, lesbar | „Diese Auswertung ist mit einem aktuellen Teambericht verbunden.“ | Link auf **genau dieses** Team |
| aktiv, ohne Teambezug | Gruppenreview aktiv, kein Teambericht verbunden, Erklärung der Bindungsregel, neue teambezogene Freigabe nötig | „Neue Auswertung anfragen“ |
| aktiv, Roster verändert | Review bleibt, Teambericht nicht mehr verbunden | „Neue Auswertung anfragen“ |
| aktiv, Team archiviert | Review bleibt, Team nicht mehr aktiv | – |

**„Neue Auswertung anfragen“:**
- Öffnet `/advisor/group?p=…&p=…` mit der Gruppe, die der Advisor selbst zusammengestellt hat.
- Das ist der bestehende Anfrageweg; alle müssen erneut zustimmen.
- Keine automatische Zustimmung.
- Ob gerade ein passendes Team existiert, sagt die Seite nicht.

**Browser [B]:** ohne Team (1280, 390); nach Rosterwechsel (390).

---

## 7. Invite Recovery

**Sackgasse bisher:**
- Scheiterte der Abschluss nach einem Slot-Klick, blieb die Einladung offen (`pending`/`activating`).
- Ein zweiter Klick ging nicht mehr (`already_claimed`).
- War die Founder-Einladung schon angelegt, leitete die Seite **sofort** nach `/join/start` weiter. Der Abschluss lief nie wieder.

**Jetzt:**
1. **`needsAdvisorTeamInviteRecovery`** (rein, getestet). Wiederholung nur, wenn alle drei Bedingungen gelten:
   - die Einladung ist offen,
   - der Betrachter hat den Slot selbst beansprucht (gleiche Kennung **und** gleiche Adresse),
   - entweder fehlt die Founder-Einladung, oder beide Slots sind vergeben, ohne dass aktiviert wurde.
2. Die Seite prüft das **vor** der Weiterleitung und zeigt „Der Abschluss ist noch nicht durchgelaufen.“ mit „Abschluss erneut anstoßen“.
3. **Klick:** Er ist ein POST über eine Server-Aktion und ruft `recoverAdvisorTeamInviteFounder` auf.
   - Die Funktion prüft erneut serverseitig und führt denselben idempotenten Abschluss aus wie der Slot-Klick.
   - Sie verlangt keine neue Zustimmung, nimmt keine Founder-Einladung an und legt keine Mitgliedschaft an.
4. Der Token allein genügt nicht: Eine andere Person mit dem Link sieht keinen Wiederholungsweg.

**Browser [B]** (Fehler simuliert, beide Slots beansprucht, ohne Abschluss):

| Schritt | DB |
|---|---|
| HEAD, GET, Seitenaufruf bei 1280 und 390 | unverändert |
| Klick „Abschluss erneut anstoßen“ | `activated`, Founder-Einladung `sent`, Paar-Advisor `linked`, keine Mitgliedschaft |
| erneuter Aufruf | „Einladung nicht gefunden“ + „Zum Dashboard“; kein zweiter Abschluss |

**Weiteres:** „Zur Anmeldung“ zeigen Team-Einladung und Advisor-Einladung nur noch Abgemeldeten. Angemeldete bekommen „Zum Dashboard“ bzw. „Zur Startseite“.

---

## 8. Org-Mitgliederliste

**`get_advisor_org_member_list(org)`:**
- Antwortet nur aktiven Mitgliedern.
- Gibt nur den Anzeigenamen heraus, keine Mailadresse und kein Profil.
- Beendete Mitgliedschaften sehen nur Inhaberinnen.

**Anzeige je Mitglied:** Name, „(Du)“, Rolle, ggf. „beendet“.
- Sich selbst entfernt man über „Organisation verlassen“, nicht per Knopf in der Liste.

| Fall | Ergebnis |
|---|---|
| Inhaberin | alle, inkl. beendeter Mitgliedschaften mit Namen [T][B] |
| Advisor | nur aktive Mitglieder [T] |
| ehemaliges Mitglied, Außenstehende | niemand [T] |
| mehrere Inhaberinnen | Rollen korrekt; Austritt möglich, solange eine bleibt (aus 12C.1B) |

**Unverändert:** Die Liste der begleiteten Personen lädt weiter keine Namen aus dem Profil, nur aus der Freigabe.

---

## 9. Org-Aktionsfehler

**Ablauf:**
- Org-Aktionen leiten mit `?orgError=<code>` zurück. Das ist ein eigener Parameter, damit Fehler der Personeneinladung nicht im Org-Abschnitt landen.
- Der Abschnitt zeigt die Meldung über `role="alert"`.
- Datenbanktexte erscheinen nie: `orgErrorCode` bildet sie ab, Unbekanntes wird zu `org_failed`.

| Code | DE |
|---|---|
| `org_last_owner` | „Du führst die Organisation als Einzige. Übertrage zuerst die Führung, bevor du gehst.“ |
| `org_not_member` | „Diese Mitgliedschaft ist bereits beendet.“ |
| `org_forbidden` | „Das kann nur eine Inhaberin der Organisation.“ |
| `org_suspended` | „Die Organisation ist ausgesetzt. Diese Aktion ist gerade nicht möglich.“ |
| `org_name`, `email` | Eingabehinweise |
| `org_failed` | „Das hat gerade nicht geklappt. Bitte versuche es noch einmal.“ |

**Ausgesetzte Organisation:**
- Hinweis im Abschnitt.
- Profil- und Einladungsformular sowie Entfernen-Knöpfe sind ausgeblendet.
- Die Aktionen lehnen vorab ab (`org_suspended`).
- Austreten bleibt möglich.

**Browser [B]:**
- Austritt auf einer bereits beendeten Mitgliedschaft → „bereits beendet“ (390).
- Austritt der letzten Inhaberin → Meldung über die echte Datenbankantwort; dazu Hinweis statt Knopf (390).
- Hinweis „ausgesetzt“ ohne Einladungsformular.

---

## 10. Advisor-Linkkorrekturen

| Fund | Korrektur |
|---|---|
| **A.** „Zum Fragebogen“ im Teambericht auch für Advisors | Nur noch mit `canDiscuss` (Mitglieder) [T] |
| **B.** Review-Seite listete alle für den Advisor lesbaren Teams („Freigegebene Founder-Teams“, hart auf Deutsch) | Nur das Team, an das genau dieser Review gebunden ist (Abschnitt 6) [T][B] |
| **C.** Toter Rücklink `/advisor` (12C.1A) | Regressionstest beibehalten und erweitert [T] |
| Personenseite → `#advisor-org` | → „Personen & Gruppen“ [T][B] |

---

## 11. Deep Links / Login

**`buildLoginRedirectPath(path, query)`** (`features/auth/loginRedirect.ts`):
- Übergibt nur die ausdrücklich genannten Parameter, auch Mehrfachwerte.
- Prüft Pfad und Ergebnis mit `normalizeSafeInternalPath`.
- Externe oder doppeldeutige Ziele fallen auf einen internen Pfad zurück.

| Einstieg (abgemeldet) | `next` [B] |
|---|---|
| `/founder-alignment/vorhaben?venture=…` (+ `antworten`, `bestaetigen`) | inkl. `venture` |
| `/teams/[id]/workstyle?snapshot=…&ansicht=…` | inkl. beider |
| `/dashboard?invitationId=…` | inkl. Query (vorher `/login` ohne `next`) |
| `/advisor/dashboard` | `next=/advisor/dashboard` (vorher ohne `next`) |
| `/me/profile/print?mode=full` | `/me/profile/print?mode=full` (vorher `/me/profile`) |
| `/advisor/group?p=…&p=…` | beide `p` |
| Schnappschuss-Aktion, `/advisor/snapshot` | Zielpfad statt `/login` |

**Rückweg mit Sitzung [B]:** `/login?next=…` führt exakt zurück, inklusive Query.

**Keine Open Redirects [T][B]:** `//evil.example/x`, `https://evil.example` und `/\evil.example` landen auf `/dashboard`.

---

## 12. Bestehende Hinweise

**Kein neues Hinweissystem** (12D), nur die kleinste saubere Korrektur.

**Beim Austritt erledigt:**
- Offene `in_app_notices` der austretenden Person, deren Pfad in dieses Team führt, werden beim Austritt erledigt (`read_at`), im selben Trigger wie die Austritts-Historie [T].
- Andere Hinweise bleiben [T].
- **Bestand:** Die Migration erledigt offene Team-Hinweise an Personen, die dem Team nicht mehr angehören.

**Ziele erklären sich selbst:** Ein noch angeklickter alter Team-Hinweis endet nicht mehr in der 404, sondern im Zustand „verlassen/archiviert“.

**FIND-Intro-Hinweise:** Sie führten schon vorher in einen erklärenden Zustand (`UnavailableState`).

**Nicht gelöst** (12D): Hinweise an andere Mitglieder über eine Runde der ausgetretenen Person; CONNECT-Hinweise nach Rückzug (siehe Abschnitt 17).

---

## 13. Empty States

| Ort | Neu |
|---|---|
| `/messages` „Noch keine Gespräche.“ | „Menschen finden“ (nur mit Founder-Rolle), „CONNECT öffnen“ (nur mit CONNECT-Zugang) |
| `/connections` Gemeinsame Bereiche leer | „Co-Founder einladen“ → `/invite/new` |
| `/connections` Kennenlernen leer | „Co-Founder finden“ → `/discovery` |
| `/discovery` Profil nicht aktiv | „FIND-Profil bearbeiten“ → `/discovery/profile` |
| `/discovery/intros` empfangen / gesendet leer | „FIND-Profil bearbeiten“ / „Menschen finden“ |
| `/advisor/group` „Du begleitest noch niemanden.“ | „Person einladen“ → `/advisor/dashboard#person-invites` |

Alle im Browser geprüft (1280 bzw. 390), ohne Überlauf [B].

---

## 14. CTA-/Navigation-Fixes

| Fund (CTA-Matrix 12A/B) | Ergebnis |
|---|---|
| Verbindungen-Karte → `/teams/[id]/workstyle` | → `/teams/[id]` wie auf dem Dashboard [B] |
| FIND „Zu eurer Verbindung“ → `/connections` | **unbegründet:** Gibt es ein aktuelles Team, leitet die Seite schon direkt dorthin; der Link greift nur ohne aktuelles Team [C] |
| Vorhaben „← Übersicht“ → Dashboard | Mit bekanntem Vorhaben „← Zum Team“ → `/teams/[id]` [T] |
| Profil-Vorhaben-Chip ohne `venture` | mit `?venture=` [T] |
| `/invite/new?team=` → Dashboard | → zurück ins Team [T] |
| CONNECT Profil und Gespeicherte Suchen → `/connect` | → „Mein CONNECT“ (`/connect/my`) [T] |
| Founder in the Wild → Anker `#collaboration-lab` (Read-My-Mind-Karte) | → eigener Anker `#founder-in-the-wild` [T] |
| `/team-intake` zeigt Foundern „Team zum Intake einladen“ | nur mit Advisor-Rolle (reine Anzeige, Rechte unverändert) [T] |
| `/join/start` → Dashboard „bitte erneut versuchen“ | konkrete Texte für abgelaufen, zurückgezogen, nicht mehr verfügbar [T] |
| `/discovery/searches` → `?mode=search` | **belassen:** Gemerkte Suchen entstehen dort; kein eindeutig falsches Ziel |
| `/connect/ventures/mine` → Connect-Profil | **belassen:** Beschriftung und Einstieg passen |
| `/advisor/group` → Org-Anker | **belassen:** Die Liste der begleiteten Personen steht dort |
| `/advisor/intake/new` → `/team-intake` | **belassen:** Das ist die Intake-Übersicht der Advisor-Leiste |

**Legacy-Historienlinks** bleiben unverändert erreichbar [T]: Teamseite (frühere Reports), Advisor-Brücken `/advisor/report` und `/advisor/snapshot`.

---

## 15. Tests

### Migration `20261123120000_access_state_recovery.sql`

Additiv und nur lokal; nach `20261122120000`.

| Teil | Inhalt |
|---|---|
| **Neue Tabelle** | `founder_team_member_exits` (RLS an, keine Rechte für Clients) |
| **Neuer Trigger** | `trg_founder_team_members_record_exit`: Austritt merken und Team-Hinweise der Person erledigen; nichts bei Kontolöschung |
| **Neue Funktionen** (nur `authenticated`) | `get_team_access_state`, `get_advisor_team_review_state`, `get_advisor_person_access_state`, `get_advisor_org_member_list` |
| **Unverändert** | keine bestehende Zugriffsregel; keine Löschung |
| **Bestand** | belegbare Austritte nachgetragen; offene Team-Hinweise an Nicht-Mitglieder erledigt |

### pgTAP `access_state_recovery.sql`

| Bereich | Inhalt |
|---|---|
| **Rechte** | nur `authenticated`; Austritte nicht lesbar |
| **Kein Orakel** | Fremde und unbekannte Kennungen → `none` |
| **Team** | Mitglied, gebundener Review, Rosterwechsel, Gruppenreview ohne Team, angefragter Review |
| **Organisation** | Mitgliedschaft beendet, ausgesetzt, Review beendet ohne Personenangabe |
| **Advisor-Zugänge** | Paar-Advisor beendet; Personenzugang aktiv, beendet, offen, Org-Fälle; Fremde und die eigene Person `none` |
| **Org-Liste** | Inhaberin, Advisor, ehemalige Mitglieder, Außenstehende |
| **Austritt und Archiv** | Austritt (Hinweise erledigt, andere bleiben), Archiv für Mitglied und Advisor, archiviertes Team bleibt unlesbar |
| **Kontolöschung** | ohne Austrittseintrag |

**Gegengeprüft:** Zwei absichtlich falsche Fassungen lassen die Suite fehlschlagen (Org-Liste ohne Mitgliederprüfung; Teamzustand ohne Austritt).

### Node `features/access/__tests__/errorNavigationRecovery.test.ts`

19 Tests zu den Fällen A–S:

| Fälle | Inhalt |
|---|---|
| A | globale Seiten |
| B–G | Zustandsmodell, alle 16 Teamseiten, Texte ohne Personen und Technik |
| E/F, H/J | Personen- und Review-Seite |
| I | kein Fragebogen-CTA für Advisors |
| K–M | Login-Kontext, kein Open Redirect |
| N/O | Org-Liste und Org-Fehler |
| P/Q | Wiederholungsweg nur für die Slot-Inhaberin; Seitenaufruf ohne Schreiben |
| R | leere Zustände |
| S | Navigation, Legacy, DE/EN-Schlüssel, Migrationsvertrag |

### Angepasste bestehende Tests

Nur die Strukturerwartungen; keine Negativgarantie gelockert.

| Test | Anpassung |
|---|---|
| `personAccess` | begleitete Personen weiter ohne Profilnamen; Personenseite ohne Inhalte im Zustandszweig |
| `capabilityTeamPage`, `founderLibrary`, `founderSetup`, `founderTeamHomebase` | `TeamUnavailable` statt `notFound()` |
| `connectSlice1` | Rückweg „Mein CONNECT“ |
| `wegeInDerNeuenFassung` | Rückweg ins Team |
| `areaSubNavigation` | einzige Ausnahme für den Profil-Link: der leere Zustand |
| `phase116c` | Migrationsliste |

### `npm run ci:check`

- Exit 0.
- 2907/2907 Node-Tests.
- Build erfolgreich.
- **152 DB-Dateien** „ok“ (2273 Prüfungen), darunter `privileged_function_grants`, `team_org_lifecycle`, `advisor_access_integrity`, Einladungen und RLS-Suiten – unverändert grün.
- `git diff --check` ohne Befund.

---

## 16. Browser

Lokal, eigener Dev-Server, nur Testkonten (`p12k-`), danach gelöscht.
- Die DB ist wieder im Ausgangszustand: 4 Nutzer, 1 Team, 1 Organisation, 2 Reviews.
- 1280 und 390, kein horizontaler Überlauf auf allen geprüften Seiten.

| Schritt | Ergebnis |
|---|---|
| Unbekannte URL (abgemeldet, angemeldet, EN) | eigene Seite, 404 |
| Advisor-Bericht, Review mit Team | Link nur auf das gebundene Team |
| Review ohne Teambezug | Erklärung + „Neue Auswertung anfragen“ (1280, 390) |
| Neo tritt bei (2→3) | Advisor: „Die Teamzusammensetzung hat sich verändert.“ (1280, 390); Review: Teambericht nicht mehr verbunden |
| Außenstehender Advisor auf demselben Bericht | globale 404 |
| Jo verlässt Team | Übersicht, Setup, Vorhaben-Link: „Du gehörst diesem Team nicht mehr an.“ (1280, 390) |
| Alex verlässt Team (archiviert) | Bericht und Übersicht: „Dieses Team ist nicht mehr aktiv.“ für beide |
| Personenzugang widerrufen | „Dieser Zugang ist nicht mehr aktiv.“ (1280, 390); Fremde: 404 |
| Org-Liste | „Ada Advisor (Du) · Führt die Organisation“, „Ben Berater · Advisor“ …; nach Entfernen „· beendet“ |
| Org-Advisor entfernt | Personenseite: „Deine Mitgliedschaft in der Organisation ist beendet.“ (1280, 390) |
| Austritt nach beendeter Mitgliedschaft | „Diese Mitgliedschaft ist bereits beendet.“ (390) |
| Letzte Inhaberin | Hinweis statt Knopf; Meldung (390) |
| Organisation ausgesetzt (Service Role) | Personenseite: „Die Organisation ist ausgesetzt.“ (1280, 390); Org-Abschnitt mit Hinweis, ohne Einladungsformular |
| Deep Links abgemeldet | alle Parameter in `next`; Rückweg mit Sitzung exakt; drei externe Ziele → `/dashboard` |
| Leere Zustände | alle CTAs vorhanden |
| Team-Invite Recovery | GET/HEAD schreibfrei; Klick schließt ab; erneuter Aufruf ohne zweiten Abschluss |
| Legacy | `/me/report` (Weiterleitung wie bisher), Advisor-Dashboard laden |

**Artefakt (bekannt, nicht neu):** Route Handler leiten lokal auf `localhost` statt `127.0.0.1` um (CORS-Meldung beim Beitritt). Das stammt aus 11.7B/12C.0; Produktion ist nicht betroffen.

**Testwerkzeug:** Zwei Tabs teilen im Headless-Chrome einen Cookie-Speicher. Der erste Versuch zum Fall „bereits beendet“ lief deshalb als Inhaberin und lieferte die echte Meldung „letzte Inhaberin“. Danach wurde der Fall sauber nacheinander wiederholt.

---

## 17. Verbleibende Risiken

1. **B = A:** Wer nie Zugang hatte, sieht bewusst dieselbe Seite wie bei einer unbekannten URL – sonst ein Existenz-Orakel.
2. **Austritte vor dieser Migration:**
   - Nachgetragen ist nur, was sich belegen lässt (widerrufene Teamfreigabe, Paar-Beziehung).
   - Ehemalige Mitglieder ohne solchen Beleg sehen die globale Seite statt „verlassen“.
3. **Hinweise an andere Mitglieder** (z. B. „du bist dran“ in einer Runde der ausgetretenen Person) bleiben stehen. Das Ziel ist erreichbar, die Runde gilt als abgebrochen.
4. **CONNECT-Hinweise** nach Rückzug einer Anfrage: Nicht geändert; das Ziel ist das Postfach bzw. die Anfrage.
5. **Team-Invite-Abschluss:**
   - Ein zweiter, gleichzeitiger Wiederholungsklick läuft durch denselben idempotenten Abschluss.
   - Geprüft wurde das über die bestehenden `on conflict`-Wege, nicht mit echten Parallel-Requests im Browser.
6. **Reaktivierte Organisation** (nur Service Role) lässt alte Org-Freigaben wieder wirken (aus 12C.1B, unverändert).
7. **Statusmeldungen** in EN sind übersetzt. Die Vorhaben-Auswahl (`AlignNav`, Vorhaben-Seite) ist weiterhin nur deutsch, wie bisher.

---

## 18. Restpunkte für 12D

- **Notification Foundation:**
  - Eventmodell mit Idempotenz, das Hinweise beim Ende eines Vorgangs zuverlässig zurückzieht (alle Arten, alle Empfänger).
  - Action Required, Digest, Push, E-Mail-Kategorien.
- **Deep-Link-Vertrag** für E-Mail- und Push-Ziele: vollständige Query; feste Hosts (`DEFAULT_PUBLIC_APP_ORIGIN`).
- **Org:** Führung übertragen, Organisation schließen, Admin-Weg zum Aussetzen und Reaktivieren (mit Zeitstempel).
- **Hydration-Warnung** auf `/discovery/profile` (P3 aus 12A/B).
- **Ausstehende Legacy-Bereinigung:** 12I.
