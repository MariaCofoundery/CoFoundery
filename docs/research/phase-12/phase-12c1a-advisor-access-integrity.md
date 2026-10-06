# Phase 12C.1A – Advisor Access, Revocation & Authorization Integrity

**Branch:** `fix/advisor-access-integrity-12c1a`, von `main` @ `55d7b226`.
- 12C.0/0b sind enthalten.
- Alle Migrationen bis `20261120130000` sind lokal **und remote** angewendet (nur lesend geprüft per `supabase migration list --linked`).
- Das Repo war sauber.

**Status:** Eine neue Migration, nur lokal angewendet. Kein Commit, kein Push, kein Deploy, kein Remote-Push.

**Kennzeichnung:**

| Marke | Bedeutung |
|---|---|
| **[B]** | im Browser reproduziert |
| **[C]** | aus Code abgeleitet |
| **[T]** | automatisiert getestet bzw. per SQL-Probe gegen die lokale DB nachgestellt |

**Klassen:** BESTÄTIGTER FEHLER · RISIKO (aus Code) · PRODUKTVERHALTEN (bewusst) · OFFENE ENTSCHEIDUNG.

---

## 1. Executive Summary

**Die zentralen Advisor-Lesewege sind konsistent.** Jeder Leser prüft seine Zustimmung **zur Lesezeit**:
- Personenzugang je Bereich.
- Gerichtete Freigabe.
- Exakte Review-Gruppe.
- Aktive Org-Mitgliedschaft in einer aktiven Organisation.

**Die P0-Vermutung aus dem Audit ist unbegründet**, was ein Datenleck angeht („Teamreview bleibt nach Personen-Widerruf aktiv“) [T][B].
- Der Review bleibt zwar aktiv. Das ist so gebaut: Er ist eine eigene, zweite Einwilligung („ihr dürft uns nebeneinander sehen“).
- Er gibt aber selbst keine Daten frei. Nach dem Widerruf sind Einzelprofil, Fähigkeiten, Arbeitsprofil und Teambericht dieser Person für den Advisor sofort weg.

**Gefunden und behoben:** zwei echte Berechtigungsfehler und zwei Verschärfungen.

| # | Klasse | Befund | Status |
|---|---|---|---|
| 1 | BESTÄTIGTER FEHLER [T] | **Legacy-Advisor-Bindung** (`founder_alignment_workbook_advisors`): Ein Advisor konnte beide Founder-Zustimmungen **selbst** setzen. Eine Founderin konnte die Zustimmung der anderen setzen oder eine fertig genehmigte Bindung für einen beliebigen Advisor anlegen. Damit wurden `/advisor/snapshot` frei und, über die Synchronisation nach `relationship_advisors`, auch `/advisor/report` (v1-Antworten per Service Role) und die Paar-Advisor-Wege. | behoben |
| 2 | BESTÄTIGTER FEHLER [C][T] | **Widerruf von Org-Zugängen:** `decide_advisor_person_access` verglich `v_user <> advisor_user_id` mit NULL. Einen Zugang, den eine Organisation hält, konnte so **jede** angemeldete Person widerrufen. | behoben |
| 3 | Verschärfung [T] | `get_advisor_team_reviews` listete einer **ausgesetzten** Organisation ihre Reviews weiter (die Zugriffsprüfung selbst war schon korrekt). | behoben |
| 4 | Restpunkt 12C.0b [T] | `claim_advisor_team_invite_founder` verlangte keine bestätigte E-Mail-Adresse. | behoben |
| – | UI | Toter Rücklink `/advisor` im Teambericht für Advisors (Audit P0-2) zeigt jetzt auf `/advisor/dashboard`. | behoben |

**Bewusst nicht entschieden:** die Kopplung gerichteter Freigaben an Org-Beziehungen und die Wiederverwendung eines Reviews bei einem Roster, der wieder genau der Review-Gruppe entspricht (Abschnitte 4, 5, 16).

---

## 2. Berechtigungsmatrix

**Statuswerte (tatsächlich, keine neuen eingeführt):**

| Objekt | Werte |
|---|---|
| Personenzugang | `requested` / `active` / `declined` / `revoked` (+ `expires_at`, das kein RPC setzt) |
| Review | `requested` / `active` / `declined` / `revoked` |
| Review-Mitglied | `pending` / `approved` / `declined` / `revoked` |
| Setup-Zugang | `pending` / `active` / `revoked` |
| Org-Mitglied | `active` / `revoked` |
| Organisation | `active` / `suspended` |
| Paar-Advisor | `pending` / `approved` / `linked` / `revoked` |

| Zugriffsart | Erteilt | Zustimmung | Gelesen werden darf | Endet durch | Prüfender RPC | UI |
|---|---|---|---|---|---|---|
| **A1 Personenzugang (persönlich)** | Advisor fragt an (`request_advisor_person_access`) oder Einladung (`claim_advisor_person_invite`) | nur die Person, je Bereich | `base` (Name, Kurzprofil), `capability` (Bereiche, mit `capability_depth` zusätzlich Tiefe), `strengths`, `direction`, `alignment_report` (v1-Selbstbericht) | Widerruf durch Person oder Advisor; Konto-Löschung (Kaskade) | `has_advisor_person_access` → `get_advisor_person_base/capability/strengths/direction/alignment` (lehnen mit `advisor_scope_not_granted` ab) | `/advisor/person/[id]`, Review-Seite |
| **A2 Personenzugang (Organisation)** | Einladung im Namen der Organisation | nur die Person | wie A1, für **jedes aktive Mitglied einer aktiven Organisation** | Widerruf; Mitgliedschaft beendet; Organisation ausgesetzt (jeweils zur Lesezeit geprüft) | dieselbe Hilfsfunktion | dieselben |
| **A3 Gerichtete Freigabe** | Person (`share_workstyle_product`); Empfänger aus `get_workstyle_share_recipients` | nur die Person | Arbeitsprofil v0.4 (29 Kernantworten, ohne ausgeblendete Blöcke); geteilte Vorhaben-Antworten | Rücknahme der Freigabe. Für **persönliche** Advisors zusätzlich, sobald Advisor-Zugänge existieren, aber keiner aktiv ist | `alignment_share_is_effective` → `get_workstyle_product_profile`, `get_workstyle_product_team` | Personenseite, Teambericht |
| **B Teamreview** | Advisor oder Org (`request_advisor_team_review`, verlangt bei der Anfrage einen aktiven `base`-Zugang je Person) | **alle** Personen; ein Nein beendet ihn | **nur das Nebeneinander**; jedes Datum kommt weiter aus A1/A2. Zusätzlich öffnet er `can_read_workstyle_team` für ein Team, dessen Roster **exakt** der zustimmenden Gruppe entspricht (Teambericht; Daten darin wieder nur über A1/A3/C) | Widerruf durch eine Person oder den Halter; Ablehnung; Org-Mitgliedschaft oder Organisation endet; **Konto-Löschung einer Person löscht den Review samt Notizen** (bestehender Trigger) | `has_advisor_team_review_access`, `get_advisor_team_reviews`, `can_read_workstyle_team` | `/advisor/review/[id]`, `/teams/[id]/workstyle` |
| **C Founder-Setup-Zugang** | Founder schlägt vor oder Advisor fragt an; Quelle ist eine verknüpfte Paar-Advisor-Beziehung | **jedes aktuelle Mitglied** | nur bestätigte Setup-Punkte | Widerruf durch ein Mitglied; **neues Mitglied → `pending`** (Trigger); Austritt → Neubewertung; Paar-Advisor widerrufen | `get_advisor_confirmed_founder_setup` | `/advisor/report`, `/advisor/session`, Teambericht |
| **D Organisation** | Inhaberin legt an und lädt ein | – (eigene Entscheidung der Eingeladenen) | hält A2 und B | Inhaberin beendet die Mitgliedschaft (`set_advisor_org_membership`, Schutz der letzten Inhaberin); Aussetzen nur per Service Role | `is_advisor_org_member`, Lesezeit-Prüfungen in A2/B | `/advisor/dashboard#advisor-org` |
| **E Legacy-Paar-Advisor** | Founder (`propose_`/`approve_relationship_advisor`) bzw. alte Workbook-Bindung | beide Founder des Paars | v1-Antworten und Workbook (Service Role, Legacy-Seiten); Paar-Regel im Teamleser (nur Zweierteam mit beiden Personen) | `revoke_relationship_advisor`; Beziehung gelöscht | App-seitig `hasAdvisorAccessToRelationship`; `can_read_workstyle_team` | `/advisor/report`, `/advisor/session`, `/advisor/snapshot` |
| **F Konto/Rolle** | – | – | Die Advisor-Rolle (`profiles.roles`) wird von **keinem** Leser geprüft; Zugriff folgt nur Zustimmungen | Konto-Löschung kaskadiert Zugänge und persönliche Reviews | – | – |

---

## 3. Reproduzierte Sicherheitsfehler

**1. Legacy-Advisor-Bindung [T]**
- **Ursache:**
  - `authenticated` hat volle Tabellenrechte.
  - Die UPDATE-Policy erlaubt Advisor und beide Founder.
  - Der bestehende Trigger blockierte nur einen Wechsel von `advisor_user_id`.
  - INSERT hatte gar keinen Inhaltsschutz.
- **SQL-Probe:**
  - Der Advisor setzt `founder_a_approved = founder_b_approved = true`. Ergebnis: `t|t`.
  - Founderin A legt eine Bindung mit beiden Zustimmungen für einen beliebigen Advisor an. Ergebnis: angelegt.
- **Folgen:**
  - `hasActiveAdvisorAccess` (`founderAlignmentWorkbookData.ts`) gibt `/advisor/snapshot` frei.
  - `syncRelationshipAdvisorFromLegacyInvitation` überträgt die Flags per Service Role nach `relationship_advisors`.
  - Damit öffnen sich `/advisor/report` (v1-Antworten), die Paar-Regel im Teamleser und die Quelle für Setup-Zugänge.
- **Alle legitimen Schreibwege der App** laufen über den Service-Role-Client (`founderAlignmentWorkbookActions.ts`).

**2. Widerruf von Org-Zugängen [T]**
- **Ursache:** `if v_user <> subject and v_user <> advisor_user_id then raise`. Bei `advisor_user_id = NULL` ist die Bedingung NULL, es wird keine Ausnahme ausgelöst, und der Widerruf greift.
- **Folge:** Jede angemeldete Person mit der Grant-ID konnte die Zustimmung einer Founderin gegenüber einer Organisation beenden. Kein Datenleck, aber eine Manipulation fremder Einwilligungen.

---

## 4. Personenzugänge und Teamreviews

**Abhängigkeiten je Datenbereich** [T]: Was legitimiert den Zugriff des Review-Advisors?

| Datenbereich | Legitimation | Nach Widerruf des Personenzugangs |
|---|---|---|
| Name, Kurzprofil | `base` | weg (Leser lehnt ab) |
| Fähigkeiten | `capability` / `capability_depth` | weg |
| Arbeitsweise-Sätze | `strengths` | weg |
| v1-Selbstbericht | `alignment_report` | weg |
| Arbeitsprofil v0.4 | gerichtete Freigabe; bei persönlichen Advisors an aktive Advisor-Zugänge gekoppelt | weg, sobald kein Zugang mehr aktiv ist |
| Teambericht | exakte Review-Gruppe **und** alle Arbeitsprofile über eigene Freigaben **und** Teamfreigaben aller | „noch nicht verfügbar“ |
| Nebeneinander (Review-Seite) | Review | Seite bleibt erreichbar, zeigt von dieser Person nichts mehr (Titel wird „Gemeinsame Auswertung“ statt der Namen) |

**Antwort auf die Kernfrage:** Personenzugang und Teamreview **sind zwei unabhängig erteilte Einwilligungen**.
- Das steht ausdrücklich im Code (`teamReviewDetailData.ts`, „Zwei Einwilligungen, nicht eine“).
- Der Review gibt keine Daten frei, für die keine eigene Zustimmung vorliegt.
- Ein Widerruf des Personenzugangs beendet den Review deshalb nicht, und das ist richtig: Es würde sonst eine unabhängig erteilte Einwilligung der anderen Personen mitvernichten.
- Eine erneute Freigabe nur eines Bereichs reaktiviert keinen anderen [T].

**Asymmetrie (OFFENE ENTSCHEIDUNG, [T]):** Gerichtete Freigaben an ein **Org-Mitglied** bleiben wirksam, auch nachdem dessen Mitgliedschaft endet oder der Org-Zugang widerrufen ist.
- Bei persönlichen Advisors endet die Freigabe in diesem Fall.
- Die Freigabe ging an eine bestimmte Person, also ist sie eine eigene Einwilligung.
- Angeboten wurde diese Person als Empfänger aber gerade **wegen** des Org-Zugangs (`get_workstyle_share_recipients`).
- **Empfehlung:** Org-Freigaben wie persönliche behandeln. Die Freigabe wirkt nur, solange ein Advisor-Weg zur Person besteht (persönlich oder über eine aktive Org-Mitgliedschaft mit aktivem Org-Zugang).
- Nicht umgesetzt, weil das die Bedeutung einer bestehenden Einwilligung ändert.

---

## 5. Rosterwechsel

Der Review ist an eine **Personengruppe** gebunden, nicht an ein Team (keine `team_id`). Für den Teambericht muss der aktuelle Roster **exakt** der zustimmenden Gruppe entsprechen.

| Fall | Ergebnis | Nachweis |
|---|---|---|
| 2 → 3 (neue Person) | kein Teambericht für den Advisor (404); die neue Person ist nicht Teil der Freigabe; ihre Daten sind ohne eigene Zustimmung unsichtbar | [T] [B] (Neo tritt über den Dialog bei, Advisor-Teambericht 404) |
| 3 → 4 | ebenso | [T] |
| Person der Gruppe verlässt (z. B. {1,3}) | kein Zugriff | [T] |
| Roster wieder **genau** {1,2} | Teambericht wieder lesbar (wenn alle eigenen Freigaben bestehen) | [T] [B] |
| Teamfreigabe zurückgenommen | Bericht für alle „nicht verfügbar“, auch für den Advisor | [T] |
| Advisor-Zustimmung zurückgenommen | Daten dieser Person weg, Bericht „nicht verfügbar“ | [T] [B] |
| Advisor verliert Org-Zugehörigkeit | Org-Zugänge und Org-Reviews enden sofort | [T] [B] |
| Konto einer beteiligten Person gelöscht | Review wird **gelöscht** (samt Notizen) | [T] |
| Setup-Zugang bei neuem Mitglied | wird `pending`, braucht die Zustimmung aller | bestehende Suite `founder_team_advisor_setup_access` |

**OFFENE ENTSCHEIDUNG:** Wird der Roster wieder exakt zur zustimmenden Gruppe, ist der Teambericht ohne neue Zustimmung wieder lesbar.
- **Dafür:**
  - Die Zustimmung galt genau dieser Gruppe und wurde nie zurückgenommen.
  - Es werden nur deren Daten gezeigt.
  - Der Review ist bewusst teamunabhängig.
- **Dagegen:** die Vorgabe „keine automatische Wiederaktivierung durch spätere Teamänderungen“.
- **Eine Umsetzung bräuchte:**
  - eine `team_id` am Review, oder
  - das Beenden aller Reviews, deren Gruppe einen Rosterwechsel erlebt.
  - Letzteres würde unabhängig erteilte Gruppen-Einwilligungen still vernichten, etwa wenn dieselben Personen in einem zweiten Team sind.
- **Empfehlung:** Review optional an ein Team binden (`team_id`, nullable). Bei einem gebundenen Review endet die Teamberichts-Freigabe beim ersten Rosterwechsel endgültig; das Nebeneinander der Personen bleibt.
- Nicht umgesetzt.

---

## 6. Widerrufe

| Zustand | DB | RPC | RLS | UI | Alternativer Weg? |
|---|---|---|---|---|---|
| angefragt → angenommen | `active` | Leser liefern [T] | Person/Advisor/Org-Mitglied sehen die Zeile | Zustimmung in `/account` [B] | – |
| abgelehnt | `declined` | nichts | – | – | – |
| widerrufen (Person) | `revoked` | Leser lehnen ab [T] | – | alte URL `/advisor/person/[id]` → 404 [B] | Arbeitsprofil über gerichtete Freigabe endet mit (persönlich) [T]; Legacy-Bindung nicht mehr selbst freischaltbar [T] |
| widerrufen (Org-Zugang) | `revoked` | nur Person oder aktives Org-Mitglied darf [T] | – | – | gerichtete Freigabe an Org-Mitglieder bleibt (Abschnitt 4) |
| abgelaufen | `expires_at` wird geprüft | – | – | – | **kein RPC setzt `expires_at`** (totes Feld, Abschnitt 16) |
| Advisor entfernt (Org) | Mitglied `revoked` | Org-Zugänge enden [T] | – | alte URL → 404 [B] | – |
| Founder entfernt / Konto gelöscht | Kaskade | – | – | – | Review samt Notizen gelöscht [T] |
| Organisation ausgesetzt | `suspended` | Zugänge enden [T], Review-Liste leer [T] (neu) | – | – | – |

**Schutz vor Wiederbelebung:**
- Eine neue Einladung macht einen geltenden Zugang nicht zur Anfrage (12C.0b, [T]).
- Ein neuer Bereich reaktiviert keinen anderen [T].
- Eine erneute Anfrage nach einem Widerruf setzt auf `requested`, nicht auf `active`.

---

## 7. Organisationsrechte

| Fall | Verhalten | Klasse |
|---|---|---|
| Herabstufen durch Einladung | ausgeschlossen (12C.0b) [T] | ok |
| Rollenwechsel | **es gibt keine Funktion**; eine erneute Einladung kann höher-, nie herabstufen | PRODUKTVERHALTEN |
| Advisor entfernen | nur Inhaberin; Zugriff endet sofort [T][B] | ok |
| Entfernte Person nimmt sich selbst wieder auf | abgewiesen [T] | ok |
| Letzte Inhaberin entfernen | abgewiesen (`advisor_org_needs_an_owner`) [T] | ok |
| Letzte Inhaberin löscht ihr **Konto** | Mitgliedszeile kaskadiert, die Organisation bleibt ohne Inhaberin | RISIKO [C], 12C.1B |
| Advisor verlässt Organisation selbst | **nicht möglich** (nur Inhaberin kann beenden) | PRODUKTVERHALTEN / Lücke |
| Org-Zugang nach Widerruf oder Ablauf über anderen Leser | nein. Alle Leser nutzen dieselbe Hilfsfunktion mit Lesezeit-Prüfung [T] | ok |
| Persönliche vs. Org-Zugänge | getrennt; die Datenbank erzwingt genau einen Halter [T] | ok |
| Anfragende Person löscht ihr Konto | Org-Zugänge und Org-Reviews, die sie angefragt hat, verschwinden (`requested_by … on delete cascade`), entgegen dem Org-Grundsatz „bleibt, wenn die Person geht“ | RISIKO [C] (Zugriff fällt weg, kein Leck), 12C.1B |
| Mitgliederliste im Dashboard | zeigt nur Rollen („Führt die Organisation“, „Advisor“), keine Namen: Die Inhaberin sieht nicht, wen sie entfernt [B] | UX, 12C.1C |

---

## 8. Verwaiste Reviews

**Die Audit-Vermutung ist unbegründet [T].**
- Die beiden lokalen Reviews mit `advisor_user_id = null` sind **Org-Reviews** (`org_id` gesetzt).
- Eine Check-Bedingung erzwingt genau einen Halter: `num_nonnulls(advisor_user_id, org_id) = 1`.

**Was bei Löschungen passiert:**

| Löschung | Folge |
|---|---|
| Persönlicher Advisor | Review kaskadiert weg |
| Organisation | Review kaskadiert weg |
| Beteiligte Person | Review wird per bestehendem Trigger gelöscht |

**Zugriff:**
- Ein Org-Review gibt nur aktiven Mitgliedern einer aktiven Organisation etwas frei.
- Eine Zuordnung zu einem anderen Advisor ist nicht möglich; es gibt keine Funktion dafür.

Es wurden keine Daten verändert.

---

## 9. Claim-RPCs

| RPC | Identität | Bestätigte Adresse | Entsteht | Bewertung |
|---|---|---|---|---|
| `claim_advisor_team_invite_founder` | JWT-Adresse = Slot-Adresse | **jetzt ja** (`current_user_email_verified`, 12C.0b) [T] | Founder-Slot; nach beiden Slots Teammitgliedschaft und Paar-Advisor-Zugang | behoben |
| `claim_advisor_person_invite`, `claim_advisor_org_invite`, Founder-Annahme | ja (12C.0b) | ja | – | ok |
| `claim_team_intake`, `claim_problem_workspace_invite` | Adresse | nein | Intake-Teilnahme, Workspace-Mitgliedschaft | nur dokumentiert (Auftrag) |

**Beobachtung [C]:** Die Seite `/team-invite/[token]` ruft beim Aufruf (GET) `finalizeAdvisorTeamInviteIfPossible` mit dem Service-Role-Client auf.
- Sie schreibt nur, wenn **beide** Founder ihren Slot schon ausdrücklich beansprucht haben. Dann setzt sie die Einladung auf „angenommen“ und verknüpft den Paar-Advisor mit beiden Zustimmungen.
- Kein Consent-Bypass, weil beide geklickt haben. Aber ein GET mit Wirkung, und die Teilen-Wahl aus dem Beitrittsdialog fällt weg (es wird nichts geteilt).
- Für 12C.1B vorgemerkt.

---

## 10. Direkte RPC- und RLS-Zugriffe

**Geprüft als fremder Advisor per direktem RPC [T]:**
- Alle `get_advisor_person_*` lehnen ab.
- `get_workstyle_product_profile` und `get_workstyle_product_team` liefern nichts.
- `get_advisor_team_reviews` ist leer; `has_advisor_team_review_access` ergibt `false`.

**Ausgeblendete Knöpfe sind nirgends die Zugriffskontrolle.** Alte URLs nach Widerruf bzw. Entfernung führen in 404 [B].

**RLS:**
- Reviews, Review-Mitglieder und Setup-Zugänge sind für Clients gesperrt (nur RPCs).
- `advisor_person_grants` ist für Person, Advisor und Org-Mitglieder lesbar. Org-Status wird dabei nicht geprüft; es ist nur Metadaten-Sicht.
- Die Legacy-Bindung ist für Advisor und Founder lesbar und jetzt gegen Zustimmungsänderungen geschützt.

**RISIKO [C], Existenz-Orakel:** `has_advisor_person_access`, `has_advisor_team_review_access`, `was_ever_advisor_for_team_review`, `is_advisor_org_member` und `is_accompanied_by_advisor_org` nehmen eine beliebige Nutzer-ID an und sind für angemeldete Personen ausführbar.
- Damit lässt sich erfragen, ob Advisor X Zugang zu Person Y hat.
- Einige stecken in RLS-Policies und brauchen das Ausführungsrecht. Eine Korrektur, die den ID-Parameter für Clients ignoriert, braucht eigene Tests.
- 12C.1B.

---

## 11. Historische Daten

| Datenart | Verhalten |
|---|---|
| **Snapshots** (`workstyle_product_snapshots`) | gehören der erstellenden Person und werden nur ausgeliefert, solange der aktuelle, erlaubte Input gleich ist. Nach Widerruf: nicht ausgeliefert, aber gespeichert (Audit Abschnitt 19). |
| **Legacy-Leser** (`/advisor/report`, `/advisor/session`, `/advisor/snapshot`) | lesen per Service Role; geprüft wird app-seitig über `relationship_advisors` bzw. die Legacy-Bindung. Mit Fix 1 lässt sich diese Prüfung nicht mehr selbst erfüllen. Die v1-Antworten werden nicht beziehungsbezogen gelesen (neueste Basis-Antwort je Founder). Legacy, Cleanup in 12I. |
| **Setup-Leser für Legacy-Seiten** | `get_advisor_confirmed_founder_setup` filtert nicht nach Bestätigungen des **aktuellen** Rosters (der Teambericht tut es). Praktisch abgefedert, weil ein neues Mitglied den Setup-Zugang auf `pending` setzt. RISIKO [C], 12C.1B (Setup-Umbau). |

---

## 12. Geänderte Dateien

- **Neu:**
  - `supabase/migrations/20261121120000_advisor_access_integrity.sql`
  - `supabase/tests/advisor_access_integrity.sql`
  - `web/src/features/advisor/__tests__/advisorAccessIntegrity.test.ts`
  - dieses Dokument
- **Geändert:**
  - `web/src/app/(product)/teams/[teamId]/workstyle/page.tsx` (Rücklink)
  - `web/src/features/instruments/workstyle/__tests__/phase116c.test.ts` (Migrationsreihenfolge)

---

## 13. Neue Migration

`20261121120000_advisor_access_integrity.sql` ist rein additiv (neue Funktionsversionen und ein neuer Trigger) und ändert keine Daten.

1. **`guard_legacy_workbook_advisor_consent`**
   - Trigger `before insert or update` auf `founder_alignment_workbook_advisors`.
   - Clients dürfen Zustimmungen, Zeitstempel, Token, Anfragende und Einladung nicht setzen oder ändern.
   - Erlaubt bleiben eine leere Anfrage und der Anzeigename.
   - Ausgenommen sind `postgres`, `supabase_admin` und `service_role`.
2. **`decide_advisor_person_access`**
   - Null-sichere Widerrufsprüfung.
   - Erlaubt sind die Person, der persönliche Advisor oder ein aktives Mitglied der haltenden aktiven Organisation.
   - Zustimmen und Ablehnen bleiben unverändert nur bei der Person.
3. **`get_advisor_team_reviews`** prüft zusätzlich den Org-Status.
4. **`claim_advisor_team_invite_founder`** verlangt eine bestätigte Adresse.

**Reihenfolge:** nach `20261120130000` (nutzt `current_user_email_verified`).

---

## 14. Tests

**pgTAP `advisor_access_integrity.sql`:** echte RPCs, als jeweilige Person. Gegengeprüft: zwei absichtlich falsche Erwartungen („Daten nach Widerruf sichtbar“, „gewachsenes Team lesbar“) lassen die Suite fehlschlagen.

| Fall | Inhalt |
|---|---|
| A / M | fremder Advisor: nichts, auch nicht per direktem RPC |
| B | nur freigegebene Bereiche; Außenstehende unsichtbar |
| C / D | Widerruf: Bereiche, Arbeitsprofil und Teambericht weg; die andere Person behält ihre Zustimmung; Review bleibt, gibt nichts frei; neuer Bereich reaktiviert keinen anderen |
| G | Teamfreigabe zurück: Bericht für Advisor und Team weg |
| E / F | 2→3, 3→4, Gruppe zerbricht, Gruppe wieder exakt |
| I / J / K | Org-Advisor entfernt; Inhaberin behält den Zugang; letzte Inhaberin nicht entfernbar; Selbst-Wiederaufnahme abgewiesen; ausgesetzte Organisation gibt nichts frei; persönliche und Org-Zugänge getrennt |
| Gap 1 | fremde Person kann einen Org-Zugang nicht widerrufen; entferntes Mitglied auch nicht; aktives Mitglied und die Person können es |
| Gap 5 | ausgesetzte Organisation: Review-Liste leer |
| Gap 7 | Legacy-Bindung: Advisor und Founderin können Zustimmungen weder setzen noch fertig genehmigt anlegen; Anzeigename bleibt pflegbar |
| N | Paar-Advisor: ohne eigene Freigaben keine Berichtsdaten; widerrufen ergibt keinen Teamleser |
| O | Advisor-Team-Slot nur mit bestätigter Adresse |
| Gap 4 / L | Konto-Löschung einer Person löscht den Review; gelöschter Advisor hinterlässt keinen Review und keinen Zugang ohne Halter |
| H | Setup-Zugang: durch die bestehenden Suiten `founder_team_advisor_setup_access` und `advisor_requests_setup_access` abgedeckt (grün) |

**Node `advisorAccessIntegrity.test.ts`:**
- Vertrag des Legacy-Triggers; alle App-Schreibwege auf die Legacy-Bindung sind `privileged`.
- Null-sicherer Widerruf.
- Org-Status in der Review-Liste.
- Claim-Bestätigung.
- Migration ohne Datenänderung.
- Rücklink.

**`npm run ci:check`:**
- Exit 0.
- 2883/2883 Node-Tests.
- Build erfolgreich.
- 150 DB-Dateien „Result: PASS“, inklusive aller Advisor-, Team-Sharing-, Account-Deletion-, Invitation- und Revocation-Suiten.
- `git diff --check` ohne Befund.

---

## 15. Browserprüfung

Lokal, nur Testkonten, danach gelöscht; die DB ist wieder im Ausgangszustand. Geprüft bei 1280, Advisor-Personenseite und Konto zusätzlich bei 390 (kein Überlauf).

| Schritt | Ergebnis | DB |
|---|---|---|
| Advisor öffnet Personenseite vor Zustimmung | 404 [B] | Zugänge `requested` |
| Founderin stimmt in `/account` dreimal zu | – | `base`, `capability`, `strengths` jeweils `active` |
| Advisor: Personenseite, Review, Teambericht | Daten sichtbar; Review „FotoMia, Maria“; Bericht bereit [B] | – |
| Founderin nimmt in `/account` (390) dreimal zurück | – | alle `revoked` |
| Advisor öffnet **alte URL** der Personenseite | 404 [B] | – |
| Advisor: Review | erreichbar, „Gemeinsame Auswertung“ ohne Marias Daten [B] | – |
| Advisor: Teambericht | „Der gemeinsame Bericht ist noch nicht verfügbar“ [B] | – |
| Neo tritt über den Dialog bei (Team 2 → 3) | Advisor-Teambericht 404 [B] | Roster 3 |
| Neo verlässt das Team (3 → 2) | Advisor-Teambericht wieder erreichbar, „noch nicht verfügbar“ (Marias Freigabe fehlt) [B] | Roster 2 |
| Org-Advisor liest Org-Zugang | Seite sichtbar [B] | – |
| Inhaberin beendet die Mitgliedschaft im Dashboard | – | Mitglied `revoked` |
| Org-Advisor öffnet **alte URL** (390) | 404 [B] | Org-Zugang selbst bleibt (gehört der Organisation) |
| Setup-Zugang | nicht im Browser; [T] über bestehende Suiten | – |

Der Rücklink im Teambericht zeigt jetzt auf den Advisor-Start (vorher toter Link).

---

## 16. Verbleibende Risiken

1. **Gerichtete Freigaben an Org-Mitglieder überdauern das Org-Verhältnis** (Abschnitt 4). Offene Entscheidung mit Empfehlung.
2. **Review-Wiederverwendung bei exakt gleichem Roster** (Abschnitt 5). Offene Entscheidung mit Empfehlung (`team_id`).
3. **`expires_at` ist tot.** Kein RPC setzt es; die Gate-Liste der Personenseite liest `status='active'` ohne Ablauf- oder Org-Status-Prüfung (nur die Sichtbarkeit der Abschnitte, die Leser prüfen selbst).
4. **Existenz-Orakel** der Hilfsfunktionen (Abschnitt 10).
5. **Organisation ohne Inhaberin nach Konto-Löschung**; Org-Zugänge verschwinden, wenn die anfragende Person ihr Konto löscht (Abschnitt 7).
6. **Legacy-Leser per Service Role**, nicht beziehungsbezogen (Abschnitt 11); Cleanup in 12I.
7. **Kein Block-Check:** `request_advisor_team_review` prüft keine Blockierung (anders als die Personenanfrage).
8. **GET mit Wirkung** auf `/team-invite/[token]` (Abschnitt 9).
9. **Produktions-Altbestand:** Ob in Produktion Legacy-Bindungen existieren, deren Zustimmungen ein Advisor oder eine Founderin selbst gesetzt hat, lässt sich aus dem Repo nicht prüfen. Grobe Abfrage: Zeilen mit beiden Zustimmungen, bei denen `updated_at` nach `claimed_at` liegt und kein Service-Schreibweg passt. Kein automatischer Eingriff.

---

## 17. Release-Abhängigkeiten

- **Migration:** `20261121120000` nach `20261120130000` (remote angewendet). Die Migration ist eigenständig.
- **App:** Die App-Änderung (Rücklink) funktioniert ohne Migration. Die Tests erwarten die Migration.
- **Keine Datenmigration**, keine geänderten Statuswerte, keine neuen Tabellen.
- **Supabase-Einstellung** „Confirm email“ bzw. abgeschaltete Passwort-Registrierung in Produktion prüfen. Gilt weiter aus 12C.0b; die neue Claim-Prüfung beruht darauf.

---

## 18. Restpunkte für 12C.1B und 12C.1C

**12C.1B (Berechtigungen und Team):**
- Entscheidungen aus 16.1 und 16.2 umsetzen.
- Existenz-Orakel schließen.
- Inhaberinnen-Schutz bei Konto-Löschung.
- `requested_by`-Kaskade an Org-Zugängen.
- Selbst-Austritt aus Organisationen.
- Block-Check im Review.
- Setup-Leser nach aktuellem Roster filtern.
- `finalizeAdvisorTeamInviteIfPossible` aus dem GET nehmen.
- Teamarchivierung und letzter Austritt (Audit P0-9).

**12C.1C (Fehler- und Statusseiten):**
- Erklärende Zustände statt 404 für „Zugang beendet“, „Teamzusammensetzung verändert“, „Review beendet“, „Zustimmung fehlt“, „Team verlassen“, „Advisor entfernt“.
- Namen in der Org-Mitgliederliste.
- „Zum Fragebogen“ im Teambericht nicht für Advisors.
- Review-Seite listet nur Teams des Reviews.
