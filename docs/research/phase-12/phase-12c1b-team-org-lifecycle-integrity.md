# Phase 12C.1B – Team, Org & Consent Lifecycle Integrity

**Branch:** `fix/team-org-lifecycle-12c1b`, von `main` @ `f994c399` (12C.1A).
- 12C.0/0b und 12C.1A sind in `main`.
- Migration `20261121120000` ist remote angewendet (nur lesend geprüft).
- Das Repo war sauber.

**Status:** Eine neue Migration, nur lokal angewendet. Kein Commit, kein Push, kein Deploy, kein Remote-Push.

**Kennzeichnung:**
- **[B]** im Browser beobachtet
- **[T]** automatisiert getestet
- **[C]** aus Code abgeleitet

---

## 1. Executive Summary

Alle drei festen Produktentscheidungen sind umgesetzt; dazu die übrigen Lifecycle-Punkte aus 12C.1A.

| Thema | Ergebnis |
|---|---|
| **A. Org-gerichtete Freigaben** | Wirken nur, solange der Org-Weg besteht, der schon beim Teilen galt. Ohne Wiederbelebung: Wiederaufnahme, ein neu genehmigter Org-Zugang oder ein neuer Beitritt machen eine alte Freigabe **nicht** wieder wirksam [T]. |
| **B. Review und Roster** | Ein Review wird bei der Aktivierung an das Team gebunden, dessen Roster exakt der zustimmenden Gruppe entspricht. Der erste Rosterwechsel beendet den Teamberichts-Zugriff endgültig; der Gruppenreview bleibt. Zurück zum alten Roster: kein Zugriff [T][B]. Ein neuer Review stellt ihn her [T][B]. |
| **C. Letzter Austritt** | Das Team wird archiviert statt gelöscht. Teamfreigaben, Einladungen, Setup-Zugang und Advisor-Teamzugriff enden; die Setup-Historie bleibt [T][B]. Bei Kontolöschung der letzten Person gilt weiter die Löschung. |
| **Organisation** | Löscht die letzte Inhaberin ihr Konto, wird die Organisation ausgesetzt; die Kontolöschung wird nicht blockiert [T]. `requested_by` besitzt keine Org-Einwilligung mehr [T]. Advisors können eine Organisation selbst verlassen, die letzte Inhaberin nicht [T][B]. |
| **Existenz-Orakel** | Fünf Hilfsfunktionen antworten angemeldeten Personen nur noch für sich selbst [T]. Interne Prüfungen mit fremden IDs laufen über einen nicht aufrufbaren Hilfsweg. |
| **Setup-Leser** | Zeigt nur Vereinbarungen, die jedes aktuelle Mitglied bestätigt hat, und nichts aus archivierten Teams [T]. |
| **Team-Einladung** | Der Seitenaufruf schreibt nichts mehr [B]. Der zweite ausdrückliche Slot-Klick finalisiert [B]. |
| **Blockierung** | Neue Review-Anfragen werden bei Blockierung abgewiesen, mit derselben Antwort wie „nicht begleitet“ [T]. |

**Zusätzlich bestätigt und behoben:**

1. **[B] Falsche Rolle in der Org-Oberfläche.** `getMyAdvisorOrgs` las ohne Personenfilter alle sichtbaren Mitgliedschaften und nahm die Rolle der ersten Zeile. Eine Advisorin sah dadurch die Knöpfe der Inhaberin (Einladen, Mitgliedschaft beenden). Kein Datenleck, weil die Datenbank ablehnte.
2. **[B] Der Advisor-Team-Weg konnte im aktuellen Schema nie abschließen.** Er las und schrieb die längst entfernten Spalten `relationships.status`/`revoked_at` und `invitations.relationship_id`, deshalb schlug jede neue Verbindung mit „relationship_create_failed“ bzw. `activation_failed` fehl. Sein letzter Schritt nahm die Founder-Einladung außerdem per Service Role selbst an, entgegen 12C.0.

**Unbegründet:**
- `claim_team_intake` und `claim_problem_workspace_invite` prüfen die bestätigte Adresse bereits (`email_confirmed_at is not null`).
- `expires_at` hat keine Oberfläche; es bleibt dokumentierte tote Semantik.

---

## 2. Produktentscheidungen

| Entscheidung | Umsetzung |
|---|---|
| **A** | **Org-Weg zählt nur, wenn zum Zeitpunkt des Teilens** (`share.created_at`) beides schon galt: der Org-Zugang (`approved_at`) und die Mitgliedschaft (`activated_at`). Beides wird bei jedem Neubeginn neu gestempelt. Persönliche Wege bleiben, wie sie waren. |
| **B** | **Review-Teambindung:** `team_id` und `team_bound_at`, gesetzt bei der Aktivierung. `team_access_ended_at` ist endgültig, gesetzt durch einen Trigger beim ersten Rosterwechsel. |
| **C** | **Archivierung:** `founder_teams.archived_at`. Leerer Roster nach Austritt führt zur Archivierung samt Aufräumen; Kontolöschung behält das bisherige Verhalten. |

**Ausnahme bei C, ausdrücklicher Vertrag aus 11.7B:**
- **„Wiederbeitritt“:** Nimmt dasselbe Paar wieder an, dessen Beziehung an das Team gebunden ist, wird die Archivierung aufgehoben.
- **Keine alte Zustimmung lebt dabei auf:** Teamfreigaben bleiben widerrufen, der Review-Teamzugriff bleibt beendet, der Setup-Zugang bleibt widerrufen [T].
- **Andere Wege** (Einladung in ein bestimmtes Team) lehnen archivierte Teams ab (`founder_team_archived`).
- Soll auch der Wiederbeitritt ein neues Team erzeugen, wäre das eine eigene Entscheidung (Abschnitt 18).

---

## 3. Review/Roster-Vertrag

**Erzeugungswege geprüft:**
- Reviews entstehen nur über `request_advisor_team_review` als **freie Personengruppe** (2–8 Personen, Auswahl auf `/advisor/group`). Keine UI und kein RPC kannte bisher ein Team.
- Der Teambezug entstand erst lesend über „aktueller Roster gleich Gruppe“.

**Vertrag:**
1. **Bei der Aktivierung** (letzte Zustimmung in `decide_advisor_team_review`) bindet `advisor_team_review_matching_team` den Review an **genau das eine** nicht archivierte Team, dessen Roster exakt der Gruppe entspricht.
   - Gibt es keins oder mehrere, bleibt der Review ein reiner Gruppenreview ohne Teambericht.
2. **Teambericht** (`can_read_workstyle_team`): nur `r.team_id = Team`, `team_access_ended_at is null`, Roster gleich Gruppe, plus die bisherigen eigenen Freigaben je Person.
3. **Trigger** `trg_end_advisor_team_review_access_after_roster_change`: Jedes INSERT oder DELETE eines Mitglieds setzt `team_access_ended_at` endgültig.
4. **Der Review bleibt** (Status `active`, Nebeneinander über die Personenzugänge). Nichts wird gelöscht.
5. **Bestand:** Aktive Reviews wurden in der Migration an das Team gebunden, dem sie heute exakt entsprechen. Der heutige Zugriff bleibt dadurch gleich; jeder spätere Wechsel beendet ihn.

**Getestet [T]:**
- 2→3, 3→4, 4→3, 3→2.
- Austritt und Wiedereintritt.
- Gleiche Personen in einem anderen Team.
- Neue Zustimmung stellt den Zugriff her.
- Unabhängige Personenzugänge bleiben.

**Browser [B]:**
- Team 2→3: Teambericht 404.
- Wieder 2: weiter 404.
- Neuer Review über `/advisor/group` plus zwei Zustimmungen in `/account`: Bericht wieder da.

---

## 4. Org-directed Shares

| Fall | Verhalten |
|---|---|
| Persönlicher Advisor aktiv | wirksam (unverändert) [T] |
| Org-Advisor aktiv (Weg galt beim Teilen) | wirksam [T] |
| Org-Mitglied entfernt | unwirksam [T] |
| Organisation ausgesetzt | unwirksam [T] |
| Org-Zugang widerrufen | unwirksam [T] |
| Persönlicher Zugang zusätzlich vorhanden | wirksam über den persönlichen Weg [T] |
| Org-Zugang später neu genehmigt | **nicht** wirksam (neues `approved_at`) [T] |
| Person tritt derselben Organisation erneut bei | **nicht** wirksam (neues `activated_at`); der Org-Zugang selbst funktioniert für sie wieder [T] |
| Freigabe außerhalb jedes Advisor-Kontexts, später entsteht ein Org-Verhältnis | bleibt wirksam [T] |

**Marker:**
- `advisor_org_members.activated_at`, gestempelt per Trigger bei jeder Wiederaufnahme. Bestand: `created_at`.
- `alignment_shares` bleibt unverändert; es wird nichts gelöscht.

**Grenze:** Hebt die Plattform eine **ausgesetzte** Organisation wieder auf (heute nur Service Role), werden alte Org-Freigaben wieder wirksam. Es gibt keinen Zeitstempel für das Aussetzen. Für einen künftigen Admin-Weg vorgemerkt (Abschnitt 18).

---

## 5. Organisations-Lebenszyklus

**Letzte Inhaberin löscht ihr Konto:**
- Trigger `trg_suspend_advisor_org_without_owner` setzt die Organisation auf `suspended`, wenn danach keine aktive Inhaberin bleibt [T].
- Die Kontolöschung läuft durch.
- Org-Zugänge enden zur Lesezeit; die Historie bleibt.

**Weitere Inhaberin vorhanden:** Die Organisation bleibt aktiv [T].

**Normale Wege:**
- Die letzte Inhaberin ist weder entfernbar noch kann sie selbst austreten (`advisor_org_needs_an_owner`) [T].

**Bestätigter UI-Fehler [B]** (behoben in `orgData.ts`):
- Advisors sahen die Knöpfe der Inhaberin.
- Jetzt zählt nur die eigene Mitgliedschaft.

---

## 6. requested_by-Lebenszyklus

- `advisor_person_grants.requested_by_user_id` und `advisor_team_reviews.requested_by_user_id` sind jetzt nullable, mit `on delete set null` statt `cascade`.
- Ein Org-Zugang überlebt die Kontolöschung der anfragenden Person, und die Organisation liest ihn weiter [T].
- Die Oberfläche zeigt dann „Unbekannt“; der Fallback existierte schon.
- Persönliche Zugänge enden weiter mit dem Advisor-Konto (über `advisor_user_id`).

---

## 7. Self-Leave

**`leave_advisor_org(org)`:**
- Nur die eigene aktive Mitgliedschaft.
- Eine Inhaberin nur, wenn eine andere aktive Inhaberin bleibt; sonst `advisor_org_needs_an_owner`.
- Kein Selbst-Wiederaufnehmen.
- Der Zugriff endet sofort [T].

**UI im Org-Abschnitt:**
- Knopf „Organisation verlassen“.
- Die letzte Inhaberin sieht stattdessen den Hinweis: „Du führst die Organisation als Einzige. Übertrage zuerst die Führung oder schließe die Organisation, bevor du gehst.“

**Browser [B]:**
- Advisorin verlässt die Organisation (390); ihre alte URL gibt 404.
- Die Inhaberin sieht den Hinweis und keinen Knopf.

---

## 8. Existenz-Orakel

Betroffen sind `has_advisor_person_access`, `has_advisor_team_review_access`, `was_ever_advisor_for_team_review`, `is_advisor_org_member` und `is_accompanied_by_advisor_org`.

**Warum `authenticated` sie ausführen darf:**
- **RLS-Policies:** `is_advisor_org_member` und `is_accompanied_by_advisor_org` in den Policies für Organisationen, Mitglieder und Zugänge.
- **Client-Aufruf:** `was_ever_advisor_for_team_review` (Notizen, nur für sich selbst).
- **Interne Aufrufe in SECURITY-DEFINER-Funktionen.**

**Lösung:**
- Die Signaturen bleiben.
- Ein fremder Nutzer-ID-Parameter gilt nur, wenn keine Person angemeldet ist (Service Role, Trigger). Für angemeldete Personen beantwortet jede Funktion nur noch die eigene Lage.

**Einziger legitimer Fremd-ID-Aufruf:** die Reviewer-Auswahl in `create_team_intake`. Sie läuft jetzt über `advisor_org_member_internal`, das für Clients nicht ausführbar ist.

**Tests [T]:**
- Als fremde Person liefern alle fünf `false`.
- Für sich selbst funktionieren sie.
- Die RLS-Leser bleiben grün: Org-Mitglied liest Zugänge der Organisation; begleitete Person sieht Organisation und Mitglieder; Außenstehende sehen nichts.
- Bestehende Suiten (`advisor_organisations`, `advisor_person_grants`) fragten als andere Person nach fremden Advisors. Sie wurden auf die Selbstabfrage umgestellt und um den Negativfall ergänzt.

---

## 9. Setup-Zugang

`get_advisor_confirmed_founder_setup` (auch für die Legacy-Seiten) liefert nur noch:
- Vereinbarungen, die **jedes aktuelle Mitglied** bestätigt hat (wie der Teambericht).
- Nichts aus archivierten Teams.

| Fall | Ergebnis |
|---|---|
| Neues Mitglied | Zugang `pending` (bestehender Trigger), Leser liefert nichts |
| Alle stimmen dem Zugang erneut zu, die Neue hat die alte Vereinbarung aber nicht bestätigt | weiter verborgen |
| Nach ihrer Bestätigung | sichtbar |

Alle drei Fälle sind [T]. Die bestehende Suite `founder_team_advisor_setup_access` setzte bestätigte Revisionen ohne Bestätigungen der Mitglieder (im echten Ablauf unmöglich); ihre Fixture bekam die Bestätigungen.

---

## 10. Team-Invite-Finalisierung

**Vorher:**
- `/team-invite/[token]` rief beim Seitenaufruf `finalizeAdvisorTeamInviteIfPossible` mit dem Service-Role-Client auf.
- Das war nur für noch nicht beanspruchte Tokens erreichbar, also ein „Vorbereiten beim Ansehen“.

**Jetzt:**
- **Kein Schreiben beim Aufruf** [B]: rohe HEAD- und GET-Requests sowie das Öffnen durch beide Founder ändern nichts.
- **Finalisieren nur im ausdrücklichen Slot-Klick** über `finalizeAdvisorTeamInviteCompletely`: höchstens drei idempotente Durchläufe, solange einer etwas repariert hat. Den zweiten Durchlauf hatte bisher der nächste Seitenaufruf übernommen.
- **Behoben (bestätigt [B]):**
  - Lesen und Schreiben nicht existierender Spalten (`relationships.status`/`revoked_at`, `invitations.relationship_id`).
  - Die erzwungene Annahme der Founder-Einladung per Service Role ist entfernt.
  - Teammitgliedschaft entsteht nur über die ausdrückliche Wahl im 12C.0-Dialog.

**Browser [B]:**

| Schritt | Ergebnis |
|---|---|
| Erster Founder klickt | Slot belegt, Founder-Einladung angelegt, nichts verknüpft |
| Zweiter Founder öffnet die Seite | keine Änderung |
| Zweiter Founder klickt | Status `activated`, Paar-Advisor `linked` (beide Zustimmungen); keine Mitgliedschaft, keine Teamfreigabe |
| Weiterleitung | in den Beitrittsdialog |
| Dialog: „Erst beitreten, später entscheiden“ | Team mit 2 Mitgliedern, **keine** Teamfreigabe, Advisor weiter verknüpft |

**Parallele Klicks:** Alle Schritte sind idempotent (Upserts, `on conflict do nothing`).

**Nicht im Browser:** Ein nachträglicher Abschluss, wenn der zweite Klick technisch scheitert. Nach einem Klick ist der Token verbraucht; einen Wiederholungsweg gibt es nicht (Abschnitt 18).

---

## 11. Blockierung

- `request_advisor_team_review` prüft je Person `is_network_interaction_blocked(advisor, person)`.
- Bei Blockierung antwortet die Funktion `team_review_subject_not_accompanied`, dieselbe Antwort wie bei fehlender Begleitung; der Grund bleibt verborgen [T].
- Bestehende aktive Reviews werden nicht automatisch beendet. Ihre Daten laufen ohnehin über Personenzugänge, die die Person widerrufen kann.

---

## 12. Teamarchivierung

**Vorher [T]:** Verließ die letzte Person ein Team ohne Einladungshistorie, wurde es physisch gelöscht, samt Setup, Verlauf und Paarbezug.

**Jetzt** (`delete_empty_founder_team_after_member_delete`, Trigger unverändert):

| Fall | Verhalten |
|---|---|
| Austritt der letzten Person | `archived_at` wird gesetzt. Offene Einladungen widerrufen, Teamfreigaben widerrufen, Setup-Advisor-Zugänge widerrufen, Review-Teamzugriff beendet (Rostertrigger). Setup-Revisionen bleiben [T]. |
| Kontolöschung der letzten Person | bisheriges Verhalten: ohne Einladungshistorie gelöscht, mit Historie archiviert [T]. |
| Neue Änderungen am archivierten Team | nicht möglich, weil es keine Mitglieder hat und Schreibwege eine Mitgliedschaft verlangen |

**Auswirkungen:**

| Bereich | Wirkung |
|---|---|
| Dashboard und Verbindungen | archivierte Teams erscheinen nicht, weil die Listen mitgliedschaftsbasiert sind [B] |
| Alte URLs (Team, Bericht) | 404 [B] |
| Snapshots | werden nicht mehr ausgeliefert (der Leser verlangt Mitgliedschaft) |
| Vorhaben | Zuordnung bleibt historisch |
| Paarbeziehung | bleibt (`founder_team_id` unveränderlich) |

**Browser [B]:** Mia und Maria verlassen das Team über „Team verlassen“. Ergebnis: Roster 0, `archived_at` gesetzt, Review-Teamzugriffe beendet, alte URLs für Founderin und Advisor 404.

---

## 13. Expiry

- `advisor_person_grants.expires_at` wird von allen Lesern geprüft, aber **kein RPC setzt es**, und keine Oberfläche bietet einen Ablauf an.
- Es bleibt als **tote Semantik** dokumentiert.
- Es wird kein Ablaufprodukt eingeführt.

---

## 14. Weitere Claims

| RPC | Befund | Änderung |
|---|---|---|
| `claim_team_intake` | prüft bereits `email_confirmed_at is not null` und die gebundene Adresse | keine (unbegründet) |
| `claim_problem_workspace_invite` | ebenso, dazu Blockierung | keine (unbegründet) |
| `claim_advisor_team_invite_founder` | seit 12C.1A mit bestätigter Adresse | Die App zeigt jetzt den Grund an („Bitte bestätige zuerst deine E-Mail-Adresse …“) statt eines stummen Fehlers |

---

## 15. Migrationen

**`20261122120000_team_org_lifecycle.sql`** (nur lokal; nach `20261121120000`):

| Bereich | Inhalt |
|---|---|
| **Neue Spalten** | `advisor_team_reviews.team_id`, `team_bound_at`, `team_access_ended_at`; `founder_teams.archived_at`; `advisor_org_members.activated_at` (Bestand = `created_at`) |
| **FKs** | `requested_by_user_id` an Zugängen und Reviews: nullable, `on delete set null` |
| **Neue Funktionen** | `advisor_team_review_matching_team`, `leave_advisor_org`, `advisor_org_member_internal` |
| **Neue Trigger** | `end_advisor_team_review_access_after_roster_change`, `stamp_advisor_org_member_activation`, `suspend_advisor_org_without_owner` |
| **Neu definiert** | `decide_advisor_team_review`, `can_read_workstyle_team`, `request_advisor_team_review`, `alignment_share_is_effective`, die fünf Orakel-Funktionen, `create_team_intake`, `get_advisor_confirmed_founder_setup`, `delete_empty_founder_team_after_member_delete`, `ensure_founder_team_for_relationship` |

**Datenänderung in der Migration (bewusst):** Aktive Reviews werden an ihr heute exakt passendes Team gebunden, damit der heutige Zugriff gleich bleibt. Mitgliedschaften bekommen `activated_at = created_at`. Nichts wird gelöscht.

---

## 16. Tests

**pgTAP `team_org_lifecycle.sql`:** echte RPCs als jeweilige Person.

| Fälle | Inhalt |
|---|---|
| A–C | Org-Freigaben, keine Wiederbelebung, persönlicher Weg, unabhängige Freigabe |
| D–G | Review-Bindung, 2→3→4→3→2, Wiedereintritt, anderes Team, neuer Review |
| R | Blockierung |
| H, K, L | letzte Inhaberin, Selbst-Austritt, kein Wiederaufnehmen |
| J | `requested_by` |
| I | Kontolöschung der letzten Inhaberin |
| M, N | Orakel und RLS |
| O | Setup-Leser |
| S, T | Archivierung, Wiederbeitritt ohne alte Zustimmungen, Kontolöschung |

Gegengeprüft: Drei absichtlich falsche Sicherheitserwartungen (Wiederaufleben über den Roster, Aufleben einer Freigabe, offenes Orakel) lassen die Suite fehlschlagen.

**An den neuen Vertrag angepasste bestehende Suiten:**

| Suite | Anpassung |
|---|---|
| `advisor_access_integrity` (12C.1A) | Fall F erwartet jetzt **kein** Wiederaufleben |
| `workstyle_pretest`, `_v2`, `_v3`, `workstyle_product_core_completion`, `workstyle_product_reporting` | Fixture-Reviews werden wie bei der Aktivierung gebunden |
| `advisor_organisations`, `advisor_person_grants` | Selbstabfrage plus Orakel-Negativfall |
| `founder_team_advisor_setup_access` | Fixture-Bestätigungen |
| `team_size_onboarding` | leeres Team archiviert; Einladung widerrufen statt `invitation_target_conflict` |

**Node `teamOrgLifecycle.test.ts`:**
- Team-Einladungsseite ohne Finalisierung.
- Mehrfach-Durchlauf.
- Keine Spalten, die es nicht gibt.
- Keine erzwungene Annahme.
- Self-Leave-UI und -Aktion, Texte de/en.
- Eigene Org-Rolle.
- Migrationsverträge.

**`npm run ci:check`:**
- Exit 0.
- 2888/2888 Node-Tests.
- Build erfolgreich.
- 151 DB-Dateien „Result: PASS“, inklusive Advisor, Team-Sharing, Team-Leave, Account-Deletion, Organisation, Setup-Access, Invitation Authorization, Reviews und `privileged_function_grants`.
- `git diff --check` ohne Befund.

---

## 17. Browser

Lokal, nur Testkonten, danach gelöscht; die DB ist wieder im Ausgangszustand. 1280, Teile bei 390.

| Schritt | Ergebnis |
|---|---|
| Advisor-Teambericht (gebundener Review) | sichtbar |
| Neo tritt bei (2→3) | Teamzugriff beendet, 404 |
| Neo tritt aus (3→2) | weiter 404 (kein Wiederaufleben) |
| Neuer Review über `/advisor/group`, Zustimmung beider in `/account` | gebunden, Teambericht wieder sichtbar (390) |
| Inhaberin entfernt Advisorin | Mitgliedschaft `revoked`, alte URL 404 |
| Advisorin verlässt die Organisation selbst (390) | `revoked`, alte URL 404 |
| Letzte Inhaberin | Hinweis statt Knopf |
| Team-Einladung öffnen (HEAD, GET, Seite) | keine Änderung |
| Erster Klick | Slot |
| Zweiter Klick | `activated`, Advisor verknüpft, keine Mitgliedschaft, keine Teamfreigabe |
| Weiter in den Dialog, „Erst beitreten“ | Team mit 2 Personen, keine Teamfreigabe |
| Mia und Maria verlassen das Team | archiviert; Verbindungen ohne Teamkarte; alte URLs 404 |

---

## 18. Verbleibende Risiken

1. **Reaktivierung einer ausgesetzten Organisation** (heute nur Service Role) lässt alte Org-Freigaben wieder wirken. Ein künftiger Admin-Weg sollte einen Zeitstempel setzen.
2. **Wiederbeitritt desselben Paars** hebt die Archivierung des gebundenen Teams auf (Vertrag 11.7B), ohne alte Zustimmungen. Wenn stattdessen ein neues Team entstehen soll, ist das eine Produktentscheidung; die Beziehung ist an ihr Team gebunden.
3. **Gruppenreview ohne passendes Team bei der Aktivierung** (oder mit zwei passenden Teams): kein Teambericht. Das ist gewollt, aber für Advisors nicht erklärt.
4. **Advisor-Team-Einladung:** Scheitert der zweite Klick technisch, gibt es keinen Wiederholungsweg (der Token ist verbraucht).
5. **Weitere Legacy-Wege** (`/advisor/report`, `/advisor/session`) lesen weiter per Service Role (aus 12C.1A); Cleanup in 12I.
6. **`expires_at`** bleibt tot.
7. **Bestand in Produktion:** Reviews, die heute keinem Team exakt entsprechen, verlieren den Teambericht (Absicht). Org-Freigaben, deren Org-Zugang nach dem Teilen neu genehmigt wurde, werden unwirksam (Absicht).

---

## 19. Restpunkte für 12C.1C

- **Erklärende Zustände statt 404 für:**
  - „Teamzusammensetzung verändert, neue Zustimmung nötig“
  - „Team archiviert“
  - „Mitgliedschaft in der Organisation beendet“
  - „Organisation ausgesetzt“
  - „Zugang beendet“
- **Advisor-Sicht für Reviews ohne Teambezug** („für den Teambericht neu anfragen“).
- **Namen in der Org-Mitgliederliste** (heute nur Rollen).
- **Rückmeldung bei Org-Aktionen:** `?error=` wird im Org-Abschnitt nicht angezeigt.
- **Wiederholungsweg** für gescheiterte Advisor-Team-Abschlüsse.
- **Aus 12C.1A offen:**
  - „Zum Fragebogen“ im Teambericht nicht für Advisors.
  - Die Review-Seite listet nur Teams des Reviews.
