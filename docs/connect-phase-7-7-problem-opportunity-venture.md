# Phase 7.7 – Problem → Opportunity → Venture

## Audit und Entscheidungen

Basis: `main` mit Phase 7.6 (`baeb8a2`), CONNECT-v2-Dokumente und die tatsächlich laufende lokale DB. Geprüft wurden Tabellen, Constraints, RLS, Trigger, Public-RPC/Sitemap, Problem-Actions/Formular, Workspace-RPCs sowie kanonische Team-Erstellung, Team-Routen und Founder-Zugriff.

Die konkreten Produktentscheidungen dieser Phase ersetzen die älteren Überlegungen in der CONNECT-v2-Spezifikation, wonach eine Opportunity lediglich ein Zustand/Feld am Raum sein sollte: Ein Raum kann jetzt mehrere eigenständige private Opportunities enthalten.

`network_problems` besitzt heute Titel, Beschreibung, Absicht (`author_intent`), Orte, geografischen Bezug, Themen, Branchen, Sichtbarkeit und die bestehende Account-Löschvoreinstellung. Ein separates Feld für eine betroffene Gruppe existiert dort nicht; dieser Kontext wird bei Veröffentlichung bewusst in der Beschreibung formuliert. Keine neue Public-Problem-Tabelle und keine Änderung dieser bestehenden Problemfelder.

`founder_teams` mit `founder_team_members` ist das kanonische Vorhaben. `network_ventures` ist die davon getrennte CONNECT-Darstellung und wird hier weder erzeugt noch umgedeutet. Die Teammitgliedschaft ist die bestehende Berechtigungsgrundlage; der DB-Trigger begrenzt ein Team weiterhin auf drei Founder.

## 1. Publish-Modell

Additive Migration: `20261106120000_problem_workspace_transitions.sql`.

`network_problem_workspaces.published_problem_id` verweist auf höchstens eine aktuell zugeordnete Problemfassung. `source_problem_id` bleibt unverändert die eingehende Herkunft „bestehendes Problem → Workspace“. Beide Foreign Keys zeigen zum Problem und verwenden `ON DELETE SET NULL`; Löschen eines Workspace löscht deshalb kein Problem.

Bei einem neuen Raum beginnt die Veröffentlichungsmaske **leer**. Es gibt keinen Importknopf für private Beiträge und keine automatische Zusammenfassung. Bei einer vorhandenen eigenen aktiven Fassung werden ausschließlich deren bisherige Veröffentlichungsfelder zur Bearbeitung geladen. Bei einem aus einem Problem entstandenen Workspace wird dieses Quellproblem verwendet, solange die Person weiterhin dessen Autor ist. Erst beim ausdrücklichen Speichern wird es zusätzlich als veröffentlichte Fassung zugeordnet; die Herkunft bleibt bestehen.

Flow:

1. Owner öffnet `/connect/workspaces/[workspaceId]/publish`.
2. Owner formuliert/bearbeitet die bekannten Problemfelder und wählt `members_only` oder `public`.
3. „Veröffentlichung prüfen“ zeigt eine eigene Vorschau aller freizugebenden Felder. Zurück zur Bearbeitung erhält die Eingaben.
4. Eine ausdrückliche Bestätigung gibt genau diese Vorschau für die gewählte Sichtbarkeit frei.
5. `publish_problem_workspace()` legt die Fassung an oder aktualisiert die eindeutig zugeordnete eigene aktive Fassung. Er akzeptiert keine beliebige Ziel-Problem-ID.

Workspace-Lock und Abgleich mit der in der Vorschau erwarteten Ziel-ID verhindern, dass parallele/stale Erstveröffentlichungen weitere Problemfassungen erzeugen. Ein zwischenzeitlicher Rechteverlust verhindert Updates. Zurückgezogene/gelöste Fassungen werden nicht über diesen Weg wiederhergestellt; die UI erklärt die fehlende Bearbeitbarkeit. Keine Erweiterung der offenen Lifecycle-Entscheidungen aus F8.

Die vorhandenen Längen-/Enum-/Array-Constraints, Slug-Defaults und der Publish-Trigger von `network_problems` bleiben wirksam. Zum Veröffentlichen sind aktive CONNECT-Mitgliedschaft und aktives CONNECT-Profil nötig. Die vorhandene Problem-Formularkomponente wird mit einem optionalen Vorschau-Button wiederverwendet; bestehende Create/Edit-Flows behalten ihr Verhalten.

## 2. Trennung privat/öffentlich

Die neue Server Action und der DB-RPC verwenden eine ausdrückliche Positivliste der bestehenden öffentlichen Problemfelder. Sie lesen für den Veröffentlichungstext keine Workspace-Titel, Beschreibungen, Entries, Mitglieder, Rollen, Quellen oder Einladungen aus. Autor ist ausschließlich `auth.uid()`.

Veröffentlicht wird eine eigenständige Formulierung des Owners mit der bestehenden CONNECT-Autorenidentität. Die Vorschau erklärt dies. Andere Workspace-Mitglieder, deren Aussagen oder Quellen werden niemals automatisch publiziert. Spätere private Änderungen verändern die Problemfassung nicht; Änderungen der Problemfassung verändern die privaten Daten nicht.

Bei einer neuen Fassung wird der vorhandene `notifySavedSearchMatches()`-Weg wiederverwendet. Er verarbeitet ausschließlich den tatsächlich gespeicherten Problem-Datensatz und verwendet weiterhin die in Phase 7.3 gehärtete Autorisierung vor Hit/Versand. Keine neue Notification-Architektur, keine privaten Daten in Benachrichtigungen.

## 3. Opportunity-Modell

Neue zweckgebundene Tabelle `network_problem_opportunities`:

- ID, Workspace-ID, `created_by` aus Session.
- `title` (1–160 Zeichen), `affected_group` (1–500), `opportunity_statement` (1–2.000), `possible_value` (1–2.000).
- `active` oder `archived`, Erstellungs-/Änderungszeitpunkt.
- Optionale `venture_id` als Referenz auf das kanonische `founder_teams`.

Ein Workspace hat beliebig mehrere Opportunities. Eine Opportunity hält eine bewusst formulierte Hypothese über betroffene Menschen und möglichen Nutzen fest. Der vorhandene Entry-Typ `approach` bleibt eine mögliche Lösungsrichtung innerhalb der Exploration. Kein automatischer Übergang zwischen beiden, kein Score, keine Bewertung und keine Aussage über Validierung.

Owner erstellen, bearbeiten und archivieren. Contributors/Viewer lesen gemäß ihrer aktuellen Workspace-Rechte. Die Workspace-Seite zeigt Opportunities kompakt; eigene private Detailrouten liegen unter `/connect/workspaces/[workspaceId]/opportunities/[opportunityId]`. Kein Funnel, CRM, Ranking oder öffentliches Opportunity-Board.

## 4. Interne Entry-Bezüge

`network_problem_opportunity_entries` ist die kleine explizite Zuordnung zwischen Opportunity und ausgewählten Entries. Bis zu 50 Referenzen je Speichervorgang. Zusammengesetzte Foreign Keys stellen sicher, dass Opportunity und Entry tatsächlich demselben Workspace gehören – zusätzlich zur RPC-Prüfung.

Nur der Owner wählt aus. Der Referenz-Read prüft bestehende Blockierungen erneut und gibt keine dadurch unzugänglichen Entry-IDs aus. Die UI zeigt Originalbeiträge und Urheber ausschließlich innerhalb des berechtigten privaten Raums. Löschen eines Entries entfernt dessen Referenz, nicht die Opportunity. Referenzen sind keine Beweise für Marktvalidierung und werden weder ins Problem noch ins Venture kopiert.

## 5. Venture-Anschluss

„Als Vorhaben weiterentwickeln“ bietet zwei ausdrückliche Wege:

- **Neu:** editierbarer Name, vorgeschlagen aus dem Opportunity-Titel (max. 120 Zeichen). Ein neues `founder_team` mit `team_context = 'pre_founder'` und genau einer Mitgliedschaft für `auth.uid()`.
- **Bestehend:** Auswahl einer konkreten ID aus bereits berechtigten eigenen Teams. Kein „neuester Datensatz“-Fallback. Name plus kurzer ID-Zusatz unterscheidet gleichnamige Teams.

`create_solo_venture()` wird nicht geändert. Sein heutiger Vertrag verwendet das älteste vorhandene Solo-Team wieder und passt deshalb nicht zum ausdrücklichen „Neu“-Vorgang. Der neue eng begrenzte Link-RPC nutzt dieselben kanonischen Tabellen, `has_founder_assessment_access()` und die vorhandenen Team-Trigger. Workspace-Zugang verleiht keine Founder-Rolle. Wer bisher keinen Founder-Zugang hat, erhält eine entsprechende Erklärung; es erfolgt keine automatische Rollenfreischaltung.

`venture_id` ist höchstens einmal pro Opportunity gesetzt, aber nicht global unique. Mehrere Opportunities können dasselbe Team referenzieren. Wiederholte identische Link-/Create-Aufrufe erzeugen kein zweites Venture; ein bereits gesetzter Link kann im MVP nicht still umgebogen werden.

Andere Workspace-Mitglieder werden niemals als Founder eingetragen. Bestehende Founder-Einladungs-/Team-Flows bleiben unverändert. Der Link speichert die Herkunft eindeutig auf Opportunity-Seite. Es entsteht kein neuer Backlink mit privaten Inhalten auf der Teamseite. Die vorhandene Route `/teams/[teamId]` wird verwendet.

## 6. Berechtigungen, RLS und Blocking

Beide neuen Tabellen haben RLS und keinerlei direkte Tabellenrechte für `PUBLIC`, `anon` oder `authenticated`. Nur eng begrenzte authentifizierte RPCs; `SECURITY DEFINER` mit leerem `search_path` und qualifizierten Referenzen. Die interne Venture-Zugriffshilfe hat keine Client-Execute-Grants. App-Actions verwenden den Session-Client, keinen Service-Role-Bypass.

Alle Workspace-Zugriffe verwenden die bestehende `problem_workspace_role()`-Prüfung aus 7.6. Anon, Nichtmitglieder, entfernte oder blockierte Mitglieder erhalten keine privaten Daten. Owner- und Active-Status werden bei jeder Mutation erneut geprüft. Opportunity-IDs und Entry-IDs werden an den konkreten Workspace gebunden. Autoren-/Owner-Identitäten sind keine freien Client-Parameter.

Workspace-Mutationen sperren die Workspace-Zeile. Beim Link zu einem bestehenden Team wird zusätzlich dessen kanonische Zeile gesperrt; Mitgliedschaftsänderungen verwenden bereits denselben Team-Lock. Es gelten vorhandene Teammitgliedschaft und beidseitige `is_network_interaction_blocked()`-Prüfung zwischen der handelnden Person und allen Teammitgliedern.

Reads erteilen keine zusätzlichen Rechte:

- Problem-Link nur bei tatsächlich zulässigem Problemzugriff; ein Workspace-Gast bekommt kein members-only-Problem freigeschaltet. Ein ohnehin öffentlich zulässiges Problem kann über dessen Public-Slug verlinkt werden.
- Venture-ID und -Name nur bei bereits bestehender eigener Teammitgliedschaft und ohne einschlägige Blockierung. Andere Workspace-Mitglieder sehen lediglich, dass eine Verknüpfung besteht, nicht den fremden Teamnamen oder einen privilegierten Link.
- Keine neue Blocking-Tabelle, keine neue Kommunikation, kein implizites Erweitern von CONNECT-/Team-Rechten.

## 7. Lifecycle

Opportunity-Archivierung beendet Bearbeitung/Verknüpfung; Lesen bleibt im berechtigten Workspace möglich. Keine Wiederherstellung im MVP. Workspace-Archivierung sperrt sämtliche neuen Mutationen, lässt berechtigte Reads zu und verändert weder veröffentlichte Probleme noch Ventures.

Workspace-/Owner-Löschung kaskadiert ausschließlich in private Opportunities und deren Referenzen. Foreign Keys von Opportunity → Venture und Workspace → Problem können kein referenziertes öffentliches/fremdes Objekt löschen. Team-Löschung setzt `venture_id` auf `NULL`; Problem-Löschung setzt die jeweilige Problemreferenz auf `NULL`. Ein erneuter Anschluss wäre wieder eine ausdrückliche Handlung.

Die bestehenden Account-Lösch-/Anonymisierungsregeln für Problems und Teams bleiben zuständig. Insbesondere bleibt ein kanonisches Team mit verbleibenden Foundern erhalten; es wird nicht wegen einer Opportunity gelöscht. Der vorhandene Auth-FK kann einen verbleibenden Problem-Autor anonymisieren. Die bestehende Löschentscheidung `outlives_account` wird im Problemformular unverändert angeboten und nicht für Workspace-/Opportunity-Daten umgedeutet.

## 8. Indexierung

Private Publish-/Opportunity-Routen erben das Workspace-Layout mit `noindex, nofollow` und `no-referrer`. `robots.ts` sperrt bereits den ganzen Workspace-Prefix. Keine neue Sitemap-/Discovery-/Highlight-/Saved-Search-/Suggestions-Quelle für Opportunities.

Veröffentlichte Fassungen verwenden unverändert `get_public_network_problem()` und `list_public_network_sitemap()`: nur `public`, `active` und die bereits bestehenden Autor-/Profil-/Mitgliedschaftsbedingungen. `members_only` bleibt außerhalb des Public-RPC und der Sitemap. Ein öffentlicher Problemtext gibt keinen Zugriff auf seine Workspace-Herkunft.

## 9. Tests

`supabase/tests/problem_workspace_transitions.sql`: **125 echte pgTAP-Prüfungen**, lokal bestanden. Unter anderem:

- Owner-Preview, ausdrückliche Bestätigung, members-only/public, vorhandenes eigenes Quellproblem, verlorene Urheberschaft, manipulierte/stale Ziel-ID, aktive Profilvoraussetzung, keine Wiederherstellung zurückgezogener Fassungen.
- Keine private Workspace-/Entry-/Quellen-/Mitgliederübernahme; Autor aus Session; Public-RPC und Sitemap.
- Mehrere Opportunities, Owner-only-Mutationen, Contributor/Viewer-Reads, Nichtmitglied/anon, Tabellen-/RPC-Grants, Textgrenzen, Status, Cross-Workspace-IDs und zusammengesetzte Entry-FKs.
- Neues echtes Solo-Team trotz vorhandenem Solo-Team, ausschließlich Owner als Founder, explizites bestehendes eigenes Team, fremdes Team, idempotenter Link, mehrere Opportunities pro Venture, unveränderte Drei-Founder-Grenze.
- Kein impliziter Founder-Zugang, keine fremden Venture-Daten für Workspace-Mitglieder; Blocks in beiden Richtungen, Removal, Archivierung, Referenzlöschung und Account-/Workspace-Lifecycle ohne Löschkaskade auf verbleibende Teams/Probleme.

Fünf neue App-Tests: öffentliche Feld-Positivliste, keine Ableitung aus privaten Workspace-Feldern, Vorschau-Payload/Sichtbarkeit/Löschvoreinstellung, fehlerhafte Payloads, DE/EN-Parität.

Browser mit lokalen isolierten Owner-/Contributor-/Viewer-Accounts:

- Leere neue Veröffentlichungsmaske; bewusste Texteingabe, Vorschau und Zurückbearbeiten ohne Datenverlust; members-only-Veröffentlichung und anschließende ausdrückliche Umstellung auf public.
- Opportunity mit ausgewählter interner Referenz; neues kanonisches Vorhaben; zweite Opportunity mit explizit ausgewähltem bestehendem Vorhaben.
- Öffentliche Seite anonym lesbar/indexierbar, ohne private Testmarker/Quellen/Mitgliedernamen. Private Opportunities bleiben `noindex`.
- Contributor/Viewer lesen die Opportunity, erhalten weder Publish-Editor noch neue Venture-Rechte.
- DE/EN und 320/375/768/1.440 px bei 650 px Höhe; Überlaufprüfungen und Screenshots. Veröffentlichungseditor/Vorschau zusätzlich in diesen Breiten geprüft; Link zur bestehenden kanonischen Teamroute geprüft.

Fehler-/Grenzfälle wie fremde IDs, Blockierung, Account-Löschung und Drei-Founder-Limit wurden gezielt in der DB geprüft, nicht als Browserdurchläufe behauptet. Keine externen Testmails; Resend im lokalen Devserver deaktiviert. Testaccounts, private/öffentliche Testobjekte und lokale Auth-Dateien wurden nach Browserprüfung entfernt.

Abschließende Gesamtprüfungen:

- `npm run ci:check`: bestanden – TypeScript, 2.699 App-Tests, Production-Build und 1.884 DB-Tests in 132 Dateien. Vorhandene Build-/Lint-Warnungen außerhalb dieses Scopes bleiben bestehen.
- `npx supabase test db`: zusätzlich separat bestanden, 1.884 Tests. Enthalten sind Regressionen für öffentliche Probleme, private Workspaces, Listings, Ventures, Highlights, Saved Searches, Suggestions, Blocking und vorhandene Founder-/Team-Flows.
- `git diff --check`: bestanden.

Der bestehende Formular-Vertragstest wurde an den engeren `Pick<ConnectProblem, …>`-Eingabetyp angepasst. Das Formular benötigt für die Vorschau keine erfundenen Read-Model-Felder wie Zähler oder Autoridentitäten; die bisherigen Create-/Edit-Routen verwenden weiterhin dieselbe Komponente.

## 10. Bewusste Grenzen und Deployment

Keine KI, psychometrischen Änderungen, Scores, Empfehlungen, öffentliche Opportunity, automatische Veröffentlichung, neue Venture-Tabelle, CRM, Organisationen oder Sponsoring. Keine automatische Übertragung privater Inhalte oder Teammitgliedschaften. Keine Link-Wechsel-/Unlink-Oberfläche, Opportunity-Wiederherstellung, Publikationshistorie oder Konflikt-Merge-Oberfläche. Die bestehenden neutralen Status werden angezeigt; fehlende Freigaben werden nicht als Qualitäts-/Risikoindikator interpretiert.

Keine neuen Env-Variablen. Bestehende Supabase-/Origin-/Mail-Konfiguration bleibt bestehen.

**DB vor Code: ja.** Neue UI benötigt neue RPCs. Nach Prüfung des verknüpften Supabase-Projekts im Repository-Root:

```sh
git switch codex/phase-7-7-problem-opportunity-venture
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-7-problem-opportunity-venture
git push origin main
```

Der Push auf `main` startet den bestehenden Vercel-Deploy. Bei fortgeschrittenem `main` stoppt `--ff-only`; zunächst integrieren und erneut prüfen. In dieser Umsetzung nur lokale DB-Anwendung, kein Production-Push/Deploy.
