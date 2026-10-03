# Phase 7.9 – CONNECT Lifecycle & Launch Hygiene

## Grundlage und tatsächlicher Audit

Geprüft wurden der Code ab `abfc880` (aktueller main zu Beginn), die tatsächlich laufende lokale Supabase-DB einschließlich Phase 7.8c, ihre Constraints/FKs/Policies/Grants und die aktuellen Server Actions. Die Phase-7-Dokumente dienten als Orientierung, nicht als Ersatz für den Datenvertrag. Keine Assessment-, Matching-, Collector- oder KI-Neuentwicklung.

| Objekt | Vorheriger tatsächlicher Lifecycle | Finaler Lifecycle / Entscheidung |
| --- | --- | --- |
| CONNECT-Mitgliedschaft | `active` / `suspended`; kein freiwilliger Austritt | Zusätzlich `inactive`; ausdrücklich verlassen/zurückkehren, niemals selbst `suspended` aufheben |
| CONNECT-Profil | `draft`, `active`, `paused`; Upsert mit Draft-Intent setzte auch aktive Profile auf draft | Aktives Speichern bleibt aktiv. Pausiertes Profil bleibt beim Speichern pausiert, ausdrückliches Veröffentlichen separat. Kein direkter Profil-DELETE durch authenticated; Austritt ist keine Accountlöschung |
| Listing | `draft`, `active`, `paused`, `completed`; expiry nach 60 Tagen ist abgeleitet; Draft-Save deaktivierte aktive Anzeige; kein sichtbarer Delete-Einstieg | Aktive Änderungen erhalten Status und Ablaufdatum. Zurückziehen = paused; erledigt = completed; erneute Veröffentlichung explizit für 60 Tage. Eigenes Listing endgültig löschbar |
| Problem | `draft`, `active`, `withdrawn`, `resolved`; Editor konnte inaktive Fassungen implizit reaktivieren; keine Restore-UI | Normaler Save erhält bestehenden Status. Zurückziehen/gelöst markieren, Wiederöffnung mit gespeicherter Fassung als Vorschau und Bestätigung; endgültiges Delete mit Folgenhinweis |
| Venture-Darstellung | `network_ventures`: active/hidden, Bearbeiten ohne Statuswechsel, eigenes Delete bereits vorhanden | Modell bleibt. Austritt verbirgt aktive Darstellung. Löschbestätigung unterscheidet ausdrücklich die CONNECT-Darstellung vom kanonischen Vorhaben |
| Kanonisches Venture/Team | `founder_teams` und `founder_team_members`, eigener bestehender Lifecycle | Unverändert. Keine Venture-/Teamlöschung durch CONNECT-Austritt, Workspace-Archivierung oder Problem-/Listinglöschung |
| Privater Workspace | active → archived, pending Invites dabei revoked und Hash NULL; bisher kein Restore | Owner kann ausdrücklich wieder öffnen; gleiche Besetzung, kein Invite-/Token-Restore, keine automatische Veröffentlichung |
| Opportunity | active → archived; Venture-Link bleibt | Owner kann im aktiven Workspace ausdrücklich wieder öffnen; Venture-Link und öffentliche Objekte unverändert |
| Veröffentlichte Problemfassung | normale `network_problems`-Zeile; getrennte `source_problem_id`/`published_problem_id` am Workspace | Problem-Lifecycle gilt; beide FKs bleiben ON DELETE SET NULL; keine Live-Synchronisation und keine Kaskade in Workspace/Venture |
| Saved Search | eigene Suche erstellen/bearbeiten, notify an/aus, löschen; Hits via Such-FK gelöscht | Unverändert; Austritt schaltet nur CONNECT-notify aus. Der bestehende 7.3-Read/Send-Check verhindert Auslieferung nicht mehr berechtigter Inhalte. Rückkehr schaltet notify nicht an |
| Suggestion | systemseitig erzeugt, Nutzer darf nur dismiss; Subject-FKs mit CASCADE | Bei Deaktivierung von Profil/Listing/Problem/Venture werden vorhandene Suggestions dismissed; Delete entfernt Subject-Zeilen per FK. Reaktivierung stellt sie nicht wieder her |
| Interest | eigene Meldung erstellen/zurückziehen; Ansatz-/Problem-FKs cascade, Conversation-FK bereits SET NULL | Austritt entfernt eigene Interests. Annahme prüft auch aktuelle Mitgliedschaft der interessierten Person. Vorhandene Gesprächshistorie bleibt lesbar, ohne Ursprung nicht beschreibbar |
| Contact Request | pending / accepted / declined / canceled; Listing-FK CASCADE konnte Gesprächskontext entfernen | Listing-Delete löst Referenz und Titel-Snapshot, beendet pending; accepted bleibt samt Conversation erhalten. Austritt beendet offene Anfragen in beide Richtungen |
| Conversation | drei Ursprünge; Teilnehmer-Snapshots; Accountlöschung anonymisiert; weggefallenes Interest machte vorhandene Historie über RPC unzugänglich | Freiwillig ausgetretene Teilnehmer können CONNECT-Historie lesen, nicht neu schreiben. Ohne Ursprung eigene Kennzeichnung „Frühere Unterhaltung“, ebenfalls read-only. FIND behält unabhängige Berechtigung |

Die maßgeblichen App-Stellen sind `connectActions.ts`, `connectProblemActions.ts`, `connectVentureActions.ts`, `workspaces/actions.ts`, `workspaces/developmentActions.ts`, `/account`, `/connect/my`, die Problem-/Workspace-Detailseiten und `/messages/[conversationId]`. Die bestehenden Public-RPCs, Highlight-/Saved-Search-Pfade und Sitemap bleiben status-/berechtigungsabhängig.

## F8 und normale Bearbeitung

Profil- und Listing-Upserts unterschieden bisher nur den Submit-Intent. `draft` nahm bestehende aktive Datensätze offline. Beim Problem war active bereits geschützt, withdrawn/resolved aber nicht. `savedPublicationStatus` erhält jetzt jeden bestehenden Nicht-Draft-Inhaltsstatus. Eine DB-Triggergrenze schützt zusätzlich aktive Datensätze gegen alte Draft-Requests und verhindert implizite Reaktivierung inaktiver Listings/Probleme.

Ein normaler Save bearbeitet weiterhin dieselbe Fassung: **kein paralleler unveröffentlichter Entwurf einer schon aktiven Fassung**, keine Versionshistorie. Aktive Inhalte müssen deshalb auch beim Zwischenspeichern die bestehenden Publikationsbedingungen erfüllen. Eine normale Listing-Bearbeitung verlängert nicht mehr nebenbei die 60-Tage-Frist.

Explizite Inhaltsübergänge laufen über `transition_connect_content`: Session-Owner, aktive CONNECT-Mitgliedschaft, konkrete erwartete Ausgangslage, ausdrückliche Bestätigung, Zeilensperre und bestehende Publikationsvalidierung. Ein veraltetes Formular erhält einen Konflikt statt einer stillen Statusüberschreibung.

## Delete, Archive und Withdraw

- **Zurückziehen:** veröffentlichte Darstellung verschwindet; gespeicherte Fassung bleibt zur bewussten Wiederveröffentlichung erhalten. Listing technisch paused, Problem withdrawn.
- **Gelöst/erledigt:** bewusster fachlicher Abschluss, ebenfalls nicht aktiv ausgeliefert; keine automatische Reaktivierung.
- **Archivieren:** privater Workspace/Opportunity bleibt berechtigt lesbar, vorerst nicht bearbeitbar; ausdrücklicher Owner-Restore möglich.
- **Löschen:** Listing/Problemfassung wird endgültig entfernt. Keine Wiederherstellung, keine Löschung vorhandener Nachrichten oder fremder privater Arbeitsdaten.

Listing-Delete löst vor dem FK-Delete `listing_id` und `listing_title_snapshot` gemeinsam (Snapshot-Constraint), cancelt offene Anfragen und bewahrt angenommene Anfragen. Problem-Delete entfernt abhängige Ansätze/Interests/Bestätigungen, lässt private Räume via SET NULL bestehen und bewahrt Conversation-Teilnehmer und Nachrichten. Generische Saved-Search-Hits können bestehen bleiben, bestehen aber den aktuellen Delivery-Check nicht mehr.

## CONNECT verlassen und zurückkehren

Einstieg: **Account & Einstellungen → Deine CONNECT-Teilnahme**. Eigene erklärende, aufklappbare Bestätigung mit Pflicht-Checkbox; keine generische „Bist du sicher?“-Abfrage.

`set_connect_participation(false, true)` arbeitet atomar:

1. Eigene Mitgliedschaft sperren; suspended bleibt nicht veränderbar.
2. Eigene Workspaces archivieren, pending Invites widerrufen; eigene Mitgliedschaften in fremden Workspaces entfernen und ausstehende Einladungen an die eigene Auth-E-Mail widerrufen.
3. Aktive Listings pausieren, Probleme und eigene Ansätze zurückziehen, Venture-Darstellungen verbergen, Profil pausieren; eigene Interests entfernen.
4. Offene Kontaktanfragen in beide Richtungen canceln, CONNECT-Suchbenachrichtigungen abschalten, eigene/zu eigenen Inhalten bestehende Suggestions dismissen.
5. Mitgliedschaft auf inactive setzen.

Founder-Rollen, person_core, Founder-Teams, ALIGN, FIND und FIND-Suchen werden nicht verändert. Private Beiträge in fremden Räumen bleiben unter dem bestehenden Urhebervertrag erhalten, die Person verliert den Zugang. Bestehende Mitglieder eigener archivierter Räume behalten ihren zuvor berechtigten Lesezugriff; Archivieren ist keine Löschung.

Rückkehr setzt ausschließlich inactive → active. Danach führt die UI zur ausdrücklichen Prüfung/Veröffentlichung des weiter pausierten Profils. Zurückgezogene Inhalte, verborgene Darstellungen, archivierte Räume, gelöschte Interests, entfernte Mitgliedschaften, widerrufene Tokens und deaktivierte Suchbenachrichtigungen werden nicht rekonstruiert. Aktive Opportunities innerhalb archivierter Räume ändern ihren eigenen Status nicht; die Workspace-Sperre macht sie read-only.

CONNECT-Nachrichten setzen aktive Mitgliedschaft beider Teilnehmer voraus. Bei freiwilligem Austritt bleibt die Historie für ihre Teilnehmer lesbar. FIND-Intros folgen weiterhin ihrem unabhängigen Vertragsmodell und werden nicht durch CONNECT-Austritt gelöscht oder deaktiviert. Die bestehenden beidseitigen Blocks gelten weiter.

## Moderationsvorrang und Security

Die vorhandene Admin-Moderation verwaltet Meldungen/Notizen; sie hatte keinen Inhalts-Sperrstatus und keine Sanktionsoberfläche. `network_memberships.suspended` bleibt ausschließlich administrativ kontrolliert. Freiwilliger Austritt ist deshalb bewusst ein anderer Status.

Für Probleme kommt die kleine, unabhängige DB-Sperre `moderation_blocked` hinzu: nur vertrauenswürdige administrative DB-Operationen können sie setzen/lösen. Setzen zieht die Fassung zurück. Authenticated kann sie weder setzen noch löschen; Editor, Restore und Workspace-Publish umgehen sie nicht. Keine neue Moderations-/Sanktions-UI. Freigeben der Sperre veröffentlicht nicht automatisch: der Status bleibt withdrawn, bis ausdrücklich neu veröffentlicht wird.

Neue RPCs sind SECURITY DEFINER mit leerem search_path, Actor immer Sessionuser, keine frei übergebenen Owner-IDs. PUBLIC/anon haben keine Ausführungsrechte. Der Inhalts-Statusguard ist absichtlich **SECURITY INVOKER**: direkte Client-Schreibwege werden von autorisierten Definer-Übergängen unterschieden, ohne clientseitig setzbaren GUC-Bypass. Er ersetzt keine RLS-Ownership-Prüfung.

Aktive Publikationsschreibvorgänge sperren die zugehörige Mitgliedschaft gegen gleichzeitigen Austritt/Suspension. Konflikte brechen eine Transaktion ab; es gibt keinen partiellen Austritt. RLS für Profile/Listings/Probleme berücksichtigt aktive Besitzer-Mitgliedschaft, aktives Profil und beidseitige Blocks. Der enge RLS-Helfer bindet die Blockprüfung an auth.uid(); die interne Zwei-Personen-Blockfunktion bleibt ohne neuen Client-Grant.

Workspace-/Opportunity-Restore prüft Owner, aktive Mitgliedschaft, passende Workspace-ID und Status. Er erzeugt keine Mitglieder, keine Founder und keine Invite-Tokens. Kein allgemeiner Adminzugriff auf private Räume.

## Accountlöschung und neue Phasen

Der bestehende Account-Delete-Vertrag wird erhalten:

- Team Intake: der bestehende Auth-Delete-Trigger entfernt zugehörige sensible Runden bei Creator/Advisor/Participant/Reviewer-/E-Mail-Bezug. Er erzeugt keine neuen Teamrechte.
- Eigene private Workspaces werden bei Ownerlöschung gelöscht, Einträge/Opportunities/Zuordnungen kaskadieren. Keine herrenlosen privaten Owner-Räume.
- Opportunity-Venture-Verknüpfungen löschen keine kanonischen Founder-Teams; Teams mit verbleibenden Foundern bleiben erhalten.
- Problem-/Ansatz-Aufbewahrung folgt weiter der bestehenden ausdrücklichen `outlives_account`-Entscheidung und Anonymisierung; keine automatische Veröffentlichung.
- Listings/Profile verschwinden beim Accountdelete; Conversations und gesendete Nachrichten bleiben nach bestehender Teilnehmer-/Sender-Anonymisierung erhalten.
- Entry-Delete entfernt Opportunity-Entry-Referenzen und Radar-Import-Provenance über bestehende FKs. Kein dangling Radar-Read-/Takedown-Recht. Radar-Handoff erhält kein neues Recht auf fremde private Inhalte.

Die vorhandenen DB-Suiten zu Team Intake, Accountlöschung, privaten Workspaces, Opportunity-Übergängen und Radar-Hypothesen/Handoffs bleiben Bestandteil der Gesamtausführung.

## Migrationen und Deployment

Neue additive Migrationen, keine historischen Migrationen geändert:

- `20261109120000_connect_lifecycle.sql`
- `20261109130000_connect_lifecycle_read_contract.sql`
- `20261109140000_connect_exit_publication_guard.sql`

Die zweite Migration korrigiert die im ersten lokalen Testlauf erkannte RLS-Ausführungsgrenze und ergänzt den lesbaren, schreibgeschützten Gesprächsvertrag. Die dritte ergänzt Serialisierung bei parallelem Austritt/Publizieren und die konsistente Behandlung eigener Ansätze/Interests.

**Keine neuen Env-Variablen. DB vor Code: ja.** Neue UI benötigt die neuen RPCs. Branch: `codex/phase-7-9-connect-lifecycle`. Nach Prüfung des verknüpften Production-Projekts aus dem Repository-Root:

```sh
git switch codex/phase-7-9-connect-lifecycle
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-9-connect-lifecycle
git push origin main
```

Vercel deployt über den bestehenden main-Git-Deploy. Fortgeschrittener main muss vor Integration erneut geprüft werden; `--ff-only` verhindert einen unbemerkten Merge. Kein Production-Push oder -Deploy während dieser Arbeit.

## Tests und bewusste Grenzen

`npm run ci:check`: erfolgreich, **2.725 App-Tests**, TypeScript, Production-Build und **135 DB-Dateien / 2.145 pgTAP-Prüfungen**. Der Build meldet bestehende Lint-Warnungen außerhalb dieses Tasks; keine fehlgeschlagenen Checks. `npx supabase test db` wurde zusätzlich separat ausgeführt: ebenfalls **135 Dateien / 2.145 Prüfungen, PASS**.

Neue Suite `supabase/tests/connect_lifecycle_79.sql`: **78 Prüfungen** zu aktiven Zwischenständen, explizitem Withdraw/Resolved/Reopen, Moderationssperre, fremden IDs, Pflichtbestätigungen, Workspace-/Opportunity-Restore und Tokeninvalidität, Listing-/Problem-Delete, erhaltenen Nachrichten/Ventures, Saved-Search-Delivery, Suggestion-Dismiss, getrenntem Austritt/Rückkehr, Suspension, anon und Accountdelete. Die Radar-Suite ergänzt Entry-/Accountdelete mit Provenance-Prüfungen. Die Interest-Conversation-Suite prüft jetzt ausdrücklich den lesbaren, nicht beschreibbaren historischen Verlauf.

Der ältere Test `network_schema_drift_repair.sql` führte bewusst DDL ohne umschließende Transaktion aus. Bei einem Fehler blieben seine Schemaänderungen und zwei Testkonten zurück. Er ist nun vollständig transaktional mit Rollback; die ausschließlich durch den unterbrochenen Test entfernten lokalen Schemafelder wurden wiederhergestellt und seine exakten synthetischen Konten entfernt. Keine historischen Migrationen wurden geändert.

Browserprüfungen mit `agent-browser`, lokalem Server und zwei ausschließlich synthetischen `.invalid`-Konten; Resend-Schlüssel für den Testserver explizit leer. Keine externen Testmails. Testdaten nach Abschluss entfernt:

| Ablauf | Browsernachweis | Ergänzende DB-Prüfung |
| --- | --- | --- |
| Problem zurückziehen / erneut veröffentlichen | DE: echte Form-Abgaben, eigene Vorschau und Pflichtbestätigung, 320 px; EN: Wiederöffnungs-Vorschau bei 320 px | Active-Save, withdrawn/resolved bearbeiten ohne Reaktivierung, ausdrückliches Reopen beider Zustände, Moderationsvorrang und Delete |
| Arbeitsraum | DE: echte Archivierung und Wiederöffnung, 375 px | Owner/foreign/anon/suspended, alte Tokens weiterhin NULL/revoked |
| Opportunity | DE: echte Archivierung und Wiederöffnung, 375 px | Venture-Link erhalten; fremde IDs abgewiesen |
| CONNECT verlassen / zurückkehren | DE: echte Account-Formulare, danach direkte Prüfung der sechs Fixture-Statuswerte; Rückkehr führt zur Profilprüfung | Inhalte bleiben separat inaktiv, keine neue CONNECT-Nachricht, FIND-Suche unverändert |
| Profil | DE: ausdrückliche Wiederveröffentlichung und normaler Save des danach aktiven Profils; 768 px und Desktop | Aktiver Draft-Save nimmt Profil nicht offline |
| Listing | EN: ausdrückliche Wiederveröffentlichung, Titelbearbeitung/Save bleibt unter Active; anschließend endgültige Löschung | Nachrichtenerhalt, kein neuer Kontakt, bestehende Saved-Search-Delivery und Suggestions korrekt |
| Bestätigungs-Layout | EN Listing-Delete bei **320 / 375 / 768 / 1280 px**, jeweils 700 px Höhe: kein horizontaler Überlauf; Problem-Reopen EN 320 × 650 mit sichtbarer Checkbox und erreichbarem Button | DE/EN-Schlüssel und unterschiedliche Konsequenztexte durch App-Tests |
| Fremder Workspace | Zweites Testkonto erhält 404 auf Owner-Raum | RLS-/RPC-Fremdzugriff und Blocks durch Security-Suiten |

Keine Behauptung einer vollständigen Browserprüfung jedes DE/EN-/Viewport-Kreuzprodukts. Resolved-Reopen, Moderationssperre, manipulierter Clientzugriff, Block-/Suspension-Fälle und Accountlöschung wurden als echte DB-Tests geprüft. Die vorhandenen 7.1–7.8c-Suiten decken zusätzlich Public Problems, Highlights, Suggestions, Saved Searches, Blocks, Team Intake, Founder-Teams und Radar-Takedown ab. Kein neuer Radarabruf, kein externer Collector und keine künstliche AI-Auswertung.

React-Review: neue Formulare nutzen bestehende Server Actions/SubmitButton, Session-Clients, echte Labels, Pflicht-Checkboxen, native aufklappbare Bereiche und Pending-Sperren. Keine neu eingeführte globale Zustandsverwaltung oder clientseitige Berechtigungsentscheidung.

Kein papierkorbähnliches Restore endgültig gelöschter Inhalte, kein Ownership-Transfer, keine Edit-History, kein neues Blocking-/Moderationssystem und kein neuer Produktbereich. Keine Wiederbelebung widerrufener Einladungen. Konto verlassen, öffentliche Darstellung entfernen und gesendete Kommunikation löschen sind bewusst unterschiedliche Vorgänge. Bereits anderweitig kopierte öffentliche Inhalte können dadurch nicht zurückgerufen werden.
