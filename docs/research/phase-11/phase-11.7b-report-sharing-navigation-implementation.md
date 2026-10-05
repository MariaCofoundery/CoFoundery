# Phase 11.7B – Teamfreigabe, Berichte und Navigation: Umsetzung

Stand: 05.10.2026, Branch `feat/team-sharing-report-nav-11-7b` (von `main` bei `2f3c0568`). Grundlage: [Phase 11.7A](phase-11.7a-report-sharing-ux-audit.md), Option C (Hybrid). **Nicht committet, nicht gepusht, kein Deploy, kein Remote-Supabase-Push.** Die Migration ist nur lokal angewendet.

---

## 1. Sharing-Zielmodell

| Kontext | Was | Wie |
|---|---|---|
| Privat | alles ohne gewählten Kontext; Forschung immer | Standard |
| **Dieses Team** | Arbeitsprofil (29 Core-Antworten) + Fähigkeiten (Erfahrungsstufe, Verantwortungswunsch) | **eine** Teamfreigabe je Person und Team (`team_shares`) |
| Vorhaben | Antworten zu `venture-alignment-v1` | keine eigene Freigabe: abgegeben = für die aktuellen Mitglieder desselben Teams sichtbar |
| Advisor / Einzelkontakt | Arbeitsprofil | weiterhin gerichtet (`alignment_shares`), einzelne Fragen ausblendbar |
| FIND / CONNECT | Bereichsbänder bzw. Fähigkeiten nach `capability_disclosure` | unverändert |

Die Teamfreigabe gilt für aktuelle **und später hinzukommende** Mitglieder, bis sie zurückgenommen wird oder die Person das Team verlässt. Advisors, FIND und Forschung sind nie betroffen. Bestehende gerichtete Freigaben bleiben gültig.

## 2. DB-Migration

`supabase/migrations/20261119120000_team_shares_and_leave.sql`:

- **Tabelle `team_shares`:** `team_id`, `owner_user_id`, `scope`, `granted_at`, `revoked_at`, `created_at`, `updated_at`; eindeutig je (Team, Person, Scope).
  - Genau ein Scope: `workstyle_capability` (Paket aus Arbeitsprofil und Fähigkeiten).
  - RLS: Lesen für die Eigentümerin und aktuelle Teammitglieder.
  - Kein direkter Schreibzugriff für Clients; geschrieben wird nur über RPCs.
- **Interne Hilfsfunktionen** (nicht für Clients aufrufbar):
  - `team_share_active(team, owner)`: aktive Teamfreigabe für genau dieses Team, solange die Person Mitglied ist.
  - `team_share_visible(owner, viewer)`: beide aktuell in einem Team, für das owner geteilt hat.
  - `workstyle_current_core_assessment(owner)`: aktuelles v0.4-Arbeitsprofil (8.5a-v3, Manifest 3.0.0).
  - `alignment_share_is_complete(assessment, viewer)`: wirksame gerichtete Freigabe ohne ausgeblendete Blöcke.
  - `team_member_shares_with_team(team, member)`: Teamfreigabe für dieses Team **oder** (Bestand) vollständige gerichtete Freigaben an alle anderen aktuellen Mitglieder, jeweils mit aktuellem Arbeitsprofil.
  - `are_founder_peers(a, b)`: Paarbeziehung oder gemeinsames aktuelles Team.
- **Zentrale Sichtbarkeit:** `workstyle_core_visible_to` = eigene Person **oder** Teamfreigabe bei gemeinsamer Mitgliedschaft **oder** vollständige gerichtete Freigabe.
- **Angepasste Leser:**
  - `get_workstyle_product_profile`: Teamfreigabe zählt; im Teamkontext keine Ausblendungen.
  - `get_workstyle_product_team`: Bereitschaft je Mitglied über `team_member_shares_with_team`; Vorhaben über `venture_visible_in_team`; Advisor-Weg unverändert über eigene Freigaben.
  - `get_workstyle_team_share_readiness`: je Person `has_current_workstyle`, `team_share_active`, `shared_with_team` (Alias `shared_with_all_members`), plus `viewer_team_share`.
  - `get_disclosed_capability(…, 'team')`: mit Teamfreigabe Bereich, Stufe und Wunsch unabhängig von `capability_disclosure`; sonst unverändert.
  - `get_workstyle_team_inputs` (historischer Adapter): gleiche Teamregel; die Teamfreigabe gilt nur für 8.5a-v3.
  - `can_read_workstyle_team`: Der Paar-Advisor-Weg verlangt jetzt, dass **beide** Personen der Paarbeziehung noch Mitglied sind (siehe 4).
- **Vorhaben:**
  - `venture_visible_in_team(assessment, viewer)`: abgegeben, `venture_id` = Team, Antwortende und Lesende aktuell Mitglied.
  - Neue Lesepolicies `assessments_select_venture_team` und `alignment_answers_select_venture_team`.
- **Neue RPCs:**
  - `set_team_share(team_id, enabled)`;
  - `leave_founder_team(team_id)`;
  - `accept_invitation_with_team_share(token, share)`.
- **Geändert:**
  - `alignment_share_is_effective` (Advisor-Fehler, siehe 8);
  - `ensure_founder_team_for_relationship` (Wiederbeitritt, siehe 4).
- **Unverändert:**
  - keine Datenübernahme, keine Löschung historischer Inhalte;
  - FIND, Forschung, Advisor-Grants und Snapshots;
  - `get_workstyle_product_snapshot` vergleicht weiter mit dem aktuellen Ergebnis und folgt damit automatisch.

## 3. Team Join

- Der Beitrittsdialog (`/join?token=…`, `JoinClient.tsx`) erscheint jetzt **vor** der Annahme. Er bietet zwei gleichwertige Karten:
  - **„Team beitreten und teilen“**
  - **„Erst beitreten, später entscheiden“**
- Es gibt keine Vorauswahl, kein Häkchen und keinen Autofokus.
- Der Freigabetext nennt ausdrücklich „aktuelle und später hinzukommende Mitglieder dieses Teams, bis du die Freigabe zurücknimmst“. Ein Zusatz sagt, dass Forschung, FIND und Advisors nicht betroffen sind.
- **Serverseitig:** `accept_invitation_with_team_share(token, share)` ruft das bestehende `accept_invitation` auf. Nur bei `share = true` setzt es im selben Schritt die Teamfreigabe für das Team der Einladung. Ohne Wahl (`null`) wird der Aufruf abgewiesen.
- **Beitritt allein teilt weiterhin nichts:** pgTAP prüft, dass `share = false` keine Freigabe erzeugt und die einladende Person nichts mitgeteilt bekommt.
- Teams, die über einen FIND-Start entstehen (`open_discovery_workstyle_team`), haben keinen Dialog. Dort teilt man auf der Teamseite.

## 4. Team Leave

- `leave_founder_team(team_id)`: nur die eigene Person. Ein Entfernen anderer Mitglieder gibt es nicht.
- **Ablauf:**
  1. Teamzeile sperren und Mitgliedschaft prüfen.
  2. Teamfreigabe für dieses Team zurücknehmen; die Zeile bleibt als Historie.
  3. Mitgliedschaft löschen.
  4. Offene Einladungen dieser Person in dieses Team widerrufen.
  5. Setup-Advisor-Freigaben neu bewerten: einstimmig unter den verbleibenden Mitgliedern, bei weniger als 2 Mitgliedern pausiert.
  6. Rückgabe: Anzahl der verbleibenden Mitglieder.
- **Folgen:**
  - Teamzugriff, Teamfreigabe, Fähigkeiten-Teamkontext und Vorhaben-Sichtbarkeit enden in beide Richtungen.
  - Aktuelle Teamberichte sind für die anderen gegebenenfalls nicht mehr verfügbar.
  - Snapshots werden nicht mehr ausgeliefert.
  - Setup-Revisionen und -Bestätigungen bleiben unverändert. Sie gelten nur, wenn alle **aktuellen** Mitglieder bestätigt haben (bestehende Regel).
- **2er-Team:** Die verbleibende Person bleibt in einem Solo-Team. Das ist ein bekannter, konsistenter Zustand: Sie kann neu einladen, das Team bleibt bestehen, nichts wird gelöscht.
- **Paarbeziehungen:** `relationships.founder_team_id` ist laut Trigger unveränderlich und bleibt deshalb stehen. Zwei Folgen sind abgesichert:
  - **Paar-Advisor:** `can_read_workstyle_team` verlangt jetzt beide Personen als Mitglied. Ohne diese Prüfung hätte nach einem Austritt aus einem 3er-Team der Advisor eines früheren Paares das neue 2er-Team lesen können.
  - **Wiederbeitritt:** `ensure_founder_team_for_relationship` fügt bei bereits gebundener Paarbeziehung die beiden wieder als Mitglieder hinzu (neue Einladungsannahme oder neuer FIND-Start). Vorher wäre das still ohne Wirkung geblieben. Die Teamfreigabe ist danach weiterhin zurückgenommen und muss neu erteilt werden.
- **UI:** `LeaveTeamSection` ganz unten auf der Teamübersicht, eingeklappt.
  - Fünf Folgen werden aufgezählt, beim 2er-Team eine sechste.
  - Der Austritt braucht einen zweiten, ausdrücklichen Klick („Team endgültig verlassen“).
  - Danach geht es zu `/connections?team=verlassen` mit Bestätigungshinweis.

## 5. Readiness

- **Teambericht bereit:** Jedes aktuelle Mitglied hat ein aktuelles vollständiges Arbeitsprofil und hat für **dieses** Team geteilt. Gilt für 2, 3 und 4 Personen; Advisors sehen den Bericht nicht früher.
- **Bestand:** Vollständige gerichtete Freigaben an alle anderen aktuellen Mitglieder zählen weiter als „geteilt“. Bestehende Teams verlieren also ihren Bericht nicht. Kommt ein neues Mitglied hinzu, reicht der Bestand nicht mehr; dann braucht es die Teamfreigabe.
- **Status-UI** (`TeamReadinessPanel`): eine Zeile je Person.
  - Zustände: „✓ geteilt“, „○ noch nicht geteilt“ oder „geteilt, Arbeitsprofil fehlt noch“.
  - Es gibt keine Paarmatrix.
  - Darunter steht nur der eigene Knopf („Für dieses Team freigeben“, über `TeamShareCard`), kein Knopf für fremde Freigaben.
- Teilen geht auch vor dem fertigen Arbeitsprofil; die Anzeige wertet dafür `team_share_active` mit aus.

## 6. Venture

- Die `ShareForm` auf `/founder-alignment/vorhaben/antworten` ist entfernt. An ihrer Stelle steht „Wer das sieht“:
  - nach der Abgabe: aktuelle und spätere Mitglieder dieses Teams, nicht Advisors, nicht FIND;
  - Austritt beendet die Sichtbarkeit.
- **Vor dem Absenden** steht unter dem Abgabeknopf: „Deine Antworten werden nach dem Absenden für die Mitglieder dieses Teams sichtbar.“ (`docs/align-screens-venture-v0-1.json`, `closing.subline`)
- Sichtbar ist nur für aktuelle Mitglieder desselben Teams (pgTAP: anderes Team, nicht abgegeben, Außenstehende und Advisor sehen nichts).
- Teammitgliedschaft macht für Advisors nichts sichtbar. Bestehende gerichtete Vorhaben-Freigaben an Advisors bleiben gültig.
- Neue gerichtete Vorhaben-Freigaben gibt es in der Oberfläche nicht mehr (Restpunkt).

## 7. Capability

- **Daten:** Mit aktiver Teamfreigabe sieht das Team Bereich, Erfahrungsstufe und Verantwortungswunsch, auch bei `capability_disclosure = private` (pgTAP). FIND und CONNECT folgen weiter der Profilstufe.
- **Darstellung im Teambericht** (`ComponentMatrix.tsx`, neu):
  - **A) Wo Verantwortung noch offen ist:** kompakte Zeilen, etwa „Fundraising – bisher möchte es niemand verantworten · extern denkbar“, oder „mehrere möchten es verantworten: …“.
  - **B) Wer was mitbringt:** prominent nur Bereiche mit offener Verantwortung, einem Verantwortungswunsch oder viel Erfahrung.
    - Je Person mit Angabe Textchips, etwa [viel Erfahrung] [möchte verantworten].
    - Personen ohne Angabe nur als grauer Einzeiler „Keine Angabe: …“.
  - **Weitere Bereiche mit Angaben (n):** eingeklappt.
  - **Zusammenfassung:** „Zu 46 weiteren Bereichen hat niemand etwas angegeben – das heißt nicht, dass etwas fehlt.“
- Die Symbollegende (★ ◆ ＋ ↗ ↪ ◇ ?) und das Mosaik sind entfernt.
- **Chips:**
  - Erfahrung: viel Erfahrung (Stufe 4–5), etwas Erfahrung (2–3), noch keine Praxis (1).
  - Wunsch: möchte verantworten (nur `own`), möchte beitragen, möchte hineinwachsen, lieber jemand anderes, lieber extern, noch offen.

## 8. Advisor-Bug

- **Fehler:** `alignment_share_is_effective` (20261060120000) erklärte jede gerichtete Freigabe für unwirksam, sobald zwischen den beiden Personen ein nicht aktiver `advisor_person_grants`-Eintrag existierte (angefragt, abgelehnt, widerrufen). Das traf auch Founder untereinander.
- **Korrektur:** Sind die beiden Founder-Peers (Paarbeziehung oder gemeinsames aktuelles Team), spielt der Advisor-Status keine Rolle. Für alle anderen gilt die bisherige Regel unverändert: Besteht eine Advisor-Beziehung, muss sie aktiv sein. Wer eine Advisor-Zusammenarbeit beendet, beendet damit auch die Antwort-Freigabe.
- Org-Grants werden weiterhin nicht geprüft (P2, bewusst nicht ausgeweitet).
- **Regressionstests (pgTAP, Abschnitt I):**
  - Founder → Founder: ohne Grant, requested, declined, revoked, active – jeweils wirksam;
  - Founder → Advisor: ohne Grant wirksam, active wirksam, revoked unwirksam;
  - die tatsächliche Advisor-Freigabe liefert das Profil;
  - Advisors bekommen keinen Teambericht über Teamfreigaben.

## 9. Individualreport

- **Vorher:**
  1. Einstieg
  2. „Workstyle Signature – Dein Antwortmuster auf einen Blick“ (lange, negativ formulierte Pole, Skalenenden in Testsprache)
  3. „Wo deine Antworten in eine Richtung gehen“
  4. Bereiche mit „In den beschriebenen Situationen …“ und „beantwortest du mit ‚teils/teils‘“
  5. So liest du das
  6. Anhang
- **Nachher** (`IndividualWorkstyle.tsx`):
  1. Zwei Sätze Einführung („So gehst du in typischen Situationen des Gründeralltags vor – nach deinen eigenen Antworten. Kein Test mit richtig oder falsch …“)
  2. **„Deine Arbeitsweise auf einen Blick“:** 6 Bereichskarten (`WorkstyleGlance`)
  3. **„Was bei dir besonders auffällt“:** höchstens drei getragene Richtungen; entfällt sonst
  4. **„Bereich für Bereich“:** Kernsatz, Ausnahme, Empfindens-Hinweis bei AMB; „Die Situationen im Einzelnen“ eingeklappt
  5. **„Eine Frage für dich“:** genau eine, aus dem ersten Bereich mit durchgehender Richtung, sonst überwiegender, sonst gemischter
  6. **„So liest du das“**
  7. Anhang „Alle Antworten im Detail“, eingeklappt; im Druck nur in der ausführlichen Fassung
- **Pole:**
  - EVI erste Einschätzung stehen lassen ↔ noch einmal genauer hinschauen
  - EXP eher frisch einschätzen ↔ auf Erfahrung bauen
  - EL erst klären ↔ erst ausprobieren
  - VOICE eher abwarten ↔ gleich ansprechen
  - AMB offen ist okay ↔ offen ist unbequem
  - ORG einfach anfangen ↔ erst Schritte klären
- **Darstellung:**
  - Punkt (Violett) bei klarer Richtung;
  - weicher Balken bei „je nach Situation“;
  - leere Linie bei zu wenigen Antworten;
  - dazu ein kurzer Satz je Karte (etwa „Du schaust lieber noch einmal genauer hin.“).
  - Kein Score, kein Prozent, kein Radar.
- **Sprache** (`narrative.ts`):
  - Alltagssätze wie „Wenn eine Entscheidung ansteht, schaust du lieber noch einmal genauer hin …“, „Bei dir hängt es von der Situation ab: Manches lässt du stehen, anderes prüfst du noch einmal genauer.“ oder „Bei größeren Aufgaben …“.
  - Weiterhin nur aus den Items abgeleitet; Claim-IDs unverändert.
  - Die Claim-Boundary-Tests der Phase 10B laufen unverändert gegen die neuen Texte, etwa: AMB ohne „gelassen“ und „tolerant“, kein „wirkst“, keine Konfliktprognose.

## 10. Teamreport

- **Vorher:**
  1. „Auf einen Blick“ (gemeinsame Linie mit MA/FO-Markern bei 2 Personen, Fähigkeiten-Zusammenfassung)
  2. „Worüber ihr früh sprechen solltet“ (nummerierte Liste)
  3. „Wie ihr arbeitet“
  4. Fähigkeiten-Mosaik mit Symbolen
  5. Vorhaben
  6. Vereinbarungen
- **Nachher** (`TeamWorkstyleReport.tsx`):
  1. **„Euer Zusammenspiel auf einen Blick“:** eine Karte je Bereich, je Person eine eigene Spur mit Namen (auch bei 2 Personen), kurzer Teamsatz
  2. **„Was bei euch ähnlich ist“:** nur gemeinsame klare Richtungen; „nah beieinander“ nur als Nebensatz
  3. **„Wo ihr unterschiedlich an Dinge herangeht“:** nur Gegenpole; Nuancen nicht prominent
  4. **„Hier lohnt sich ein Gespräch“** (siehe 11)
  5. **„Bereich für Bereich“:** je Bereich eingeklappt mit Satz, Situationen, Arbeitshypothese, Frage und „Im Founder Setup festhalten“; dazu Anhang
  6. **Fähigkeiten & Verantwortung** (siehe 7)
  7. **Was ihr aufbauen wollt**
  8. **Was ihr bereits vereinbart habt**
  9. **„So lest ihr das“**
- **Teamtexte je Bereich**, etwa EVI: „Bei manchen Situationen liegt ihr nah beieinander, bei anderen würdet ihr eher unterschiedlich reagieren. Besonders sichtbar wird das bei der Frage, wann eine Entscheidung noch einmal geöffnet werden sollte.“
- Gemeinsame Richtung, etwa: „Ihr sprecht beide an, was euch auffällt – auch kurz vor dem Abschluss.“
- Entfernt sind „Teils antwortet ihr ähnlich, teils unterschiedlich.“ und „In mindestens einer Situation liegen eure Antworten auf entgegengesetzten Seiten.“
- Keine Kompatibilitätsdeutung; Arbeitshypothesen bleiben im Möglichkeitsmodus.

## 11. Gesprächskarten

- Sie ersetzen die nummerierte Agenda.
- **Form:** 3–6 Karten, nicht nummeriert, feste Reihenfolge, keine Rangliste. Je Karte:
  - Etikett;
  - Frage;
  - optional „Etwa: …“ mit der ersten unterschiedlich beantworteten Situation;
  - „Im Founder Setup festhalten“.
- **Quellen:**
  - Gegenpole je Bereich, mit festen Fragen aus 11.7A:
    - Entscheidungen
    - Erfahrung
    - Ausprobieren
    - Einwände
    - Offene Fragen
    - Arbeit steuern
  - **Verantwortung:**
    - „Für [Bereich] möchte bisher niemand Verantwortung übernehmen. Wer kümmert sich – oder lösen wir es extern?“
    - bei mehreren Verantwortungswünschen: „Wer verantwortet es, und wer unterstützt?“
  - **Vorhaben:** „Ihr erwartet bei „[Thema]“ Unterschiedliches. Was soll für euer Vorhaben gelten?“
- **Auswahlregeln:**
  - Verantwortung und Vorhaben behalten bis zu zwei Plätze, auch wenn sich alle sechs Arbeitsweisen unterscheiden.
  - Bei weniger als drei Befunden ergänzen gemeinsame Richtungen, dann die übrigen Bereiche – als Einladung, nicht als Befund.

## 12. Navigation

- **Vorher:**
  - Hauptleiste, die bei 1280 px in eine Utility-Reihe umbrach;
  - zweite Reihe;
  - Brotkrume „Teams & Verbindungen › Verbindungen“;
  - „Zum Team“;
  - lokale Teamnavigation als schwarze Pille unter der Kopfkarte.
- **Nachher:**
  - **Zeile 1:** Logo, Start, Profil, Teams & Verbindungen, Find, Connect. Rechts leiser: Nachrichten, Feedback, Founder/Advisor, Sprache, Konto.
    - kleinere Schrift, weniger Innenabstand;
    - ab 1024 px `flex-nowrap`;
    - Kontoname erst ab 1280 px;
    - aktive Sprache hellgrau statt schwarz.
  - **Zeile 2:** nur kontextabhängig, mit Unterstrich (z. B. Verbindungen · Founder Library).
  - **Brotkrume:** nur auf dem Telefon und nur auf Seiten unterhalb eines Unterbereichs (z. B. ein einzelnes Inserat); nie auf Teamseiten, nie auf Desktop.
  - **Teamseiten** (`TeamPageHeader`):
    - „← Verbindungen“;
    - Teamname bzw. „Maria + FotoMia“;
    - Seitentitel;
    - Reiter Übersicht · Euer Zusammenspiel · Fähigkeiten & Verantwortung · Founder Setup · Library;
    - danach Aktionen (PDF, Ausführliche Fassung, Stand festhalten) und sofort der Bericht.
  - „Zum Team“ und der Reiter „Frühere Auswertungen“ sind entfernt; Frühere Auswertungen stehen eingeklappt auf der Übersicht.
- **Aktive Zustände:**
  - global die bestehende violette Pille (`brand-here`);
  - zweite Ebene Unterstrich;
  - Teamreiter Unterstrich in Violett, keine dunkle Pille.
- **Vertikaler Platz:** Kopfleiste `py-2`, zweite Reihe `pb-1`/`min-h-9`, Seiten `py-5/6`, Titel `text-2xl/3xl`.
- **Gemessen bei 1280 px:** Kopf 103 px. „Euer Zusammenspiel auf einen Blick“ beginnt bei 377 px, der Einzelbericht bei 403 px – beides im ersten Laptop-Viewport.
- Übernommen: Teamübersicht, Zusammenspiel, Fähigkeiten & Verantwortung, Founder Setup. Setup-Detail, Library und Commitment Lab behalten ihren Rückweg, nutzen aber die neuen Reiter (Restpunkt).

## 13. Mobile (390 px)

- Eine Kopfzeile: Logo plus Menüknopf mit dem aktuellen Bereich als Ortsangabe (z. B. „Teams & Verbindungen“). Keine zweite Reihe, auf Teamseiten keine Brotkrume.
- „← Verbindungen“ ist sichtbar.
- Teamreiter horizontal scrollbar, jedes Ziel 44 px hoch.
- Bereichskarten untereinander, Spuren gestapelt mit Namen. Gesprächskarten einspaltig, Chips umbrechend.
- Kein horizontaler Überlauf auf allen geprüften Seiten (`scrollWidth − innerWidth = 0`).

## 14. Print

- Keine Navigation (ProductShell `print:hidden`, Teamkopf und Reiter `ws-no-print`), keine Freigabe- oder Austrittskarten, keine Aktionen. Geprüft: 0 sichtbare `nav`, 0 Buttons.
- Accordions sind im Druck aufgeklappt, ohne Bedienelement. Ausnahme: „Bereich für Bereich“ druckt den Bereichstitel als Überschrift.
- Bereichskarten stehen zwei je Zeile; Karten, Spuren und Gesprächskarten werden nicht geteilt.
- Punkt schwarz, Spannweite schraffiert mit gestricheltem Rahmen, Chips als „[viel Erfahrung]“.
- Der Anhang mit allen Antworten erscheint nur in der ausführlichen Fassung.

## 15. Tests

- **pgTAP, neu:** `supabase/tests/team_shares_and_leave.sql`.
  - **A** Mitgliedschaft teilt nichts; direkte Schreibzugriffe und fremde Teams werden abgewiesen.
  - **B/C** Teamfreigabe aus/an für eine bzw. beide Personen:
    - gleicher Bericht für alle;
    - Fähigkeiten-Tiefe trotz `private`;
    - FIND und CONNECT unverändert;
    - nur 29 Core-Antworten, kein Forschungs-Item, Forschungstabelle für Clients nicht lesbar;
    - kein FIND-Opt-in.
  - **D** Neues Mitglied sieht bestehende Teamfreigaben; nicht geteiltes Mitglied blockiert den Bericht; 2er-Snapshot wird nicht als 3er ausgeliefert; 3 und 4 Personen.
  - **E** Vorhaben: gleiches Team sichtbar; nicht abgegeben, anderes Team, Außenstehende und Advisor nicht; im Teambericht ohne Freigabe.
  - **F** Widerruf: Bericht für alle weg, Snapshot weg, erneutes Teilen stellt ihn wieder her.
  - **G** Austritt:
    - Mitgliedschaft endet, Teamfreigabe zurückgenommen, Zeile bleibt;
    - Bericht, Profil, Vorhaben und Fähigkeiten in beide Richtungen weg;
    - die verbleibenden drei behalten den Bericht;
    - Paarbeziehung unverändert, zweiter Austritt wird abgewiesen;
    - Wiederbeitritt über die gebundene Paarbeziehung;
    - 2er-Team wird zum Solo-Team, nichts gelöscht.
  - **H** Bestand mit gerichteten Freigaben gilt weiter; ausgeblendeter Block zählt nicht; Teamfreigabe hebt das auf.
  - **I** Advisor-Fehler (siehe 8).
  - **J** Beitritt mit Freigabe, ohne Freigabe, ohne Wahl abgewiesen.
  - Hilfsfunktionen sind nicht aufrufbar.
- **pgTAP, bestehend:** alle 146 Suites unverändert grün.
- **Node, neu:** `src/features/teams/__tests__/phase117b.test.ts`.
  - Migration;
  - kein „Workstyle Signature“ in Code und Texten;
  - Reihenfolge des Teamberichts;
  - keine Kürzel-Token;
  - Teamtexte;
  - Freigabe-UX;
  - Beitritt ohne Vorauswahl;
  - Austritt;
  - Vorhaben ohne ShareForm;
  - Navigation: keine Brotkrume auf Teamseiten, kein „Zum Team“, ruhige Reiter, `ws-no-print`/`print:hidden`.
- **Node, angepasst:**
  - Positive Strukturerwartungen an das neue Layout: `phase115`, `phase10Narrative`, `phase10bClaimBoundaries`, `phase116`, `phase116c`, `teamHomebaseOrder`, `founderConnections`, `headerFitsOnAPhone`, `woBinIch`.
  - Negative Garantien bleiben: kein Score, keine Prozentangaben, keine Lückensprache, Claim-Grenzen.
- **Ergebnis `npm run ci:check`:**
  - tsc ok;
  - 2861/2861 Node-Tests;
  - `next build` ok;
  - DB 147 Dateien, 2266 Tests, „Result: PASS“;
  - `git diff --check` ok.

## 16. Browserreview

Lokal, eigener Dev-Server (Port 3194), Chrome headless über CDP, 1280 und 390 px. Die Testdaten lagen nur in der lokalen DB (Konten `p117-*`) und wurden danach gelöscht; der Ausgangszustand (4 Nutzer, 1 Team) ist wiederhergestellt.

| | Ergebnis |
|---|---|
| A Einzelbericht | neue Struktur; Karten ohne Doppelung; Bericht ab 403 px; kein Overflow; Druck ohne Navigation |
| B 2er-Teambericht | gestapelte Spuren mit Namen; Karten-Grid; ab 377 px; Druck ok |
| C 3er-Teambericht | drei Spuren je Karte; nach Jos Austritt korrekt als 2er-Bericht (Alex + FotoMia) |
| D Fähigkeiten | Textchips, „Keine Angabe“ grau, „Weitere Bereiche (3)“ eingeklappt, „46 weitere Bereiche …“ |
| E Teambeitritt | zwei gleichwertige Karten, 0 vorausgewählt; „beitreten und teilen“ setzt Mitgliedschaft und Teamfreigabe (DB geprüft) |
| F Teamfreigabe | zurücknehmen nur über zweiten Klick mit Folgen; Status „Gespeichert“; erneut freigeben ok |
| G Team verlassen | Folgen sichtbar, zweiter Klick, Weiterleitung zu `/connections?team=verlassen` mit Hinweis |
| H Vorhaben | Abschnitt „Wer das sieht“; Hinweis vor dem Absenden; keine ShareForm |
| I Advisor | sieht den 2er-Bericht über Teamreview plus eigene Freigaben; keine Teamreiter |
| J Navigation | 1280: eine Hauptzeile plus Unterzeile, keine Brotkrume; 390: eine Kopfzeile mit Bereichsname |

**Im Review gefunden und behoben:**
- Eine Person mit Teamfreigabe, aber ohne Arbeitsprofil erschien als „noch nicht geteilt“. Jetzt erscheint sie als „geteilt, Arbeitsprofil fehlt noch“.
- In den Kartenkontexten stand „Sichtbar etwa bei: bei …“. Jetzt steht dort „Etwa: …“.
- Bei sechs Gegenpolen verdrängten die Arbeitsweise-Karten die Verantwortungs- und Vorhaben-Karten.
- Beim Einzelbericht stand „je nach Situation“ doppelt.
- Der neue Teamkopf trennte Namen mit „·“. Jetzt steht dort wie im übrigen Produkt „+“.

## 17. Restpunkte

1. **Advisor und Vorhaben:** Für neue gerichtete Vorhaben-Freigaben an Advisors gibt es keine Oberfläche mehr; bestehende gelten weiter. Lösung mit P2 „Advisor-Freigaben an einem Ort“.
2. **Org-Grants** in `alignment_share_is_effective` (P2, unverändert).
3. **Mitglieder entfernen und Rollen:** bewusst nicht gebaut.
4. ~~**Weitere Teamseiten**~~ – erledigt in 11.7B.1 (Abschnitt 19).
5. ~~**Seite „Fähigkeiten & Verantwortung“**~~ – erledigt in 11.7B.1 (Abschnitt 19).
6. **FIND-Teams** (`open_discovery_workstyle_team`) haben keinen Beitrittsdialog; Teilen geschieht dort auf der Teamseite.
7. **Lokales Testartefakt:** Nach dem Beitritt leitet `/join/start` auf `localhost` statt `127.0.0.1` weiter, die Sitzung geht im Test verloren. Das ist bestehendes Verhalten, unabhängig von 11.7B, und in Produktion mit einheitlicher Domain nicht relevant.
8. ~~**Mobile Aktionen**~~ – erledigt in 11.7B.1 (Abschnitt 19).
9. ~~**Fähigkeiten im Teamkontext**~~ – in 11.7B.1 teamgenau gemacht (Abschnitt 19).
10. **Englische Fassung** der Berichte (P2); die Seitenumgebung ist übersetzt.
11. **Remote:** Beide Migrationen (`20261119120000`, `20261119130000`) sind nur lokal angewendet. Vor einem Release per Release-Prozess anwenden; Maria entscheidet.

## 18. Auswirkungen auf Phase 12

- Phase 12 kann auf einem eindeutigen Teamkontext aufbauen:
  - eine Teamfreigabe statt N·(N−1) gerichteter Freigaben;
  - Austritt mit klaren Folgen;
  - Vorhaben ohne Freigabeschritt.
- **Neue Teamfunktionen** sollten `team_share_active(team, person)` bzw. `team_member_shares_with_team` nutzen, statt eigene Freigaben einzuführen. Neue Datenbereiche im Team brauchen eine Produktentscheidung, ob sie zum Paket `workstyle_capability` gehören oder einen eigenen Scope bekommen.
- **Advisor-Freigaben** sind weiterhin zweigleisig (Grant plus gerichtete Antwortfreigabe). Ein gemeinsamer Ort mit Bereichen als Chips ist der nächste logische Schritt.
- **Berichte:**
  - Der Gesprächsteil ist jetzt die natürliche Brücke ins Founder Setup („Im Founder Setup festhalten“).
  - Die Bereichskarten (`WorkstyleGlance`) sind für Einzel-, Team- und Advisor-Ansichten wiederverwendbar.

## 19. Abschlusskorrekturen (Phase 11.7B.1)

Kleiner Abschluss-Patch auf demselben Branch, ohne neuen Scope. Weiterhin nicht committet, nicht gepusht, kein Deploy, kein Remote-Supabase-Push.

**Migration** `20261119130000_team_share_scope_corrections.sql`, nur lokal angewendet:

- **Fähigkeiten teamgenau.**
  - Neu: `get_team_capability(team_id, person)` mit explizitem Teamkontext. Er antwortet nur aktuellen Mitgliedern dieses Teams über aktuelle Mitglieder.
  - Bereich, Erfahrungsstufe und Verantwortungswunsch gibt es nur bei aktiver Teamfreigabe dieser Person für genau dieses Team; sonst gilt die unveränderte Freigabeleiter.
  - `get_disclosed_capability` ist wieder exakt die Fassung aus `20261022120000`, ohne Teamfreigabe-Abkürzung. FIND und CONNECT bleiben unverändert.
  - `get_workstyle_product_team` liest Fähigkeiten über `get_team_capability(p_team_id, …)`.
  - Advisor-Weg unverändert.
- **Eine Teamentscheidung ist autoritativ** (`team_member_shares_with_team`, ebenso der historische Adapter `get_workstyle_team_inputs`):
  - kein `team_shares`-Datensatz für Person und Team: Bestand über vollständige gerichtete Freigaben zählt;
  - aktiver Datensatz: geteilt;
  - widerrufener Datensatz: ausdrücklich nicht geteilt, kein Rückfall auf den Bestand.
  - Gerichtete Freigaben werden weder gelöscht noch verändert; Einzelansichten daraus funktionieren weiter.
  - Gilt auch nach einem Austritt: Der Austritt widerruft die Teamfreigabe, nach einem Wiederbeitritt zählt der Bestand nicht mehr.

**Texte gegen die Regel geprüft:** „für dieses Team“, „aktuelle und später hinzukommende Mitglieder dieses Teams“ und „bis du die Freigabe zurücknimmst“ entsprechen jetzt exakt der Logik. Der Hinweis zu früheren Einzelfreigaben erscheint nach einem Widerruf nicht mehr. Für die Arbeitsweise gilt: Mitglieder eines Teams, in dem geteilt wurde, sehen sie; ein anderes gemeinsames Team wird dadurch nicht „bereit“. Die Bereitschaft ist teamgenau.

**Navigation:** Setup-Detail, Founder Library und Commitment Lab nutzen jetzt `TeamPageHeader`, also „← Verbindungen“, Teamname, Seitentitel und die fünf Reiter mit Unterstrich.
- Entfallen sind die alten Rückwege „Zurück zum Setup“ und „Zurück zur Zusammenarbeit“ sowie die Reiterleiste unter der Kopfkarte.
- Der aktive Reiter ist beim Setup-Detail „Founder Setup“, beim Commitment Lab „Übersicht“.
- `FounderLibraryView` bekommt im Team einen `teamHeader`. Der Titel ist kurz („Founder Library“), der Leitsatz steht darunter.
- Damit nutzen alle sieben Teamseiten denselben Kopf.

**Roles-Seite:** `/teams/[id]/roles` nutzt dieselbe `ComponentMatrix` wie der Teambericht (`heading={false}`), keine zweite Darstellung.
- Daten aus `getTeamCapabilityForTeam` über `get_team_capability`.
- Die Basiszeile nennt die Teamfreigabe für dieses Team.
- Der Leerzustand verweist auf „Mit diesem Team teilen“ (`/teams/[id]#teamfreigabe`) statt auf die Profil-Freigabestufe.
- `CapabilityTeamReadoutView` bleibt unverändert für die Advisor-Gruppenansicht.

**Mobile Aktionen:** Am Rechner stehen die Aktionen weiter nebeneinander. Unter 640 px ist nur „Drucken / als PDF speichern“ sichtbar, dazu ein ruhiges „Mehr“ (`<details>`) mit „Ausführliche Fassung“ und „Stand festhalten“. Gemessen: eine Zeile, 44 px hoch.

**Tests:**
- pgTAP `team_shares_and_leave.sql`:
  - Fähigkeiten im Team jetzt immer mit Teamkontext.
  - Neu **K** (zwei gemeinsame Teams): A mit Freigabe zeigt Tiefe; B ohne Freigabe nichts; die kontextfreie Leiter ignoriert Teamfreigaben; Nichtmitglied nichts; B später geteilt zeigt Tiefe; A widerrufen blendet A aus, B bleibt; der Teambericht B trägt B-Tiefe; FIND und CONNECT unverändert.
  - Neu **L** (Bestand und Widerruf): aktiv bereit; widerrufen nicht bereit trotz vollständiger gerichteter Freigaben; Readiness „nicht geteilt“; gerichtete Freigaben unverändert; Einzelansicht funktioniert weiter; erneut geteilt wieder bereit.
- Node:
  - `phase117b.test.ts` um vier Tests ergänzt: Migration, alle sieben Teamseiten mit Teamkopf ohne alte Rückwege, Roles mit `ComponentMatrix`, mobile Aktionen.
  - Angepasst: `capabilityTeamPage` (neuer Leser, neuer zweiter Weg), `commitmentLabV1` (Teamkopf), `phase116c` (Migrationsreihenfolge).
- `npm run ci:check`: 2865/2865 Node-Tests, Build ok, DB 147 Dateien „Result: PASS“; `git diff --check` ok.

**Browserreview** (1280 und 390 px, eigene lokale Testdaten `p117c-*`, danach gelöscht; Ausgangszustand 4 Nutzer, 1 Team):

| | Ergebnis |
|---|---|
| Team A geteilt | Roles: Marias Chips „viel Erfahrung · möchte verantworten“ sichtbar (Maria hat `private`) |
| Team B nicht geteilt (gleiche zwei Personen) | Roles: keine Zeile von Maria; Teambericht B nicht bereit, „Maria ○ noch nicht geteilt“ |
| Widerruf bei vorhandenen Bestandsfreigaben | vorher `ready`, nach Widerruf `not_ready`; Anzeige „Alex ○ noch nicht geteilt“ |
| Roles, Setup-Detail, Library, Commitment Lab | gemeinsamer Teamkopf, richtiger aktiver Reiter, keine dunkle Pille, keine alten Rückwege |
| Teambericht mobil | PDF + „Mehr“ in einer Zeile; Menü im Viewport |
| Overflow | 0 auf allen Seiten |

**Verbleibende Restpunkte:** 1–3, 6, 7, 10 und 11 aus Abschnitt 17.
