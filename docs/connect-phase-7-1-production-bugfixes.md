# Phase 7.1 – CONNECT Production Bugfixes

Stand: 02.10.2026. Basis: `6a2811c` (Phase 6.1, Phase-7-Dokumentation und Feedback-Mail). Branch: `feat/connect-7-1-bugfixes`.

## 1. Audit und Ursache F1

Code und laufende lokale DB wurden vor Änderungen geprüft, einschließlich `pg_get_functiondef`, Constraints, Indizes, Policies, Trigger und Grants. Die drei CONNECT-v2-Dokumente dienten der Einordnung, nicht als Ersatz für diese Prüfung.

`saveConnectProblemApproachAction()` verwendet weiterhin den Supabase-Upsert mit `onConflict: "problem_id,author_user_id"`. Die DB besaß seit `20260923120000` nur den partiellen Unique-Index `network_problem_approaches_one_per_author WHERE author_user_id IS NOT NULL`. Ohne Indexprädikat findet PostgreSQL für dieses ON CONFLICT keinen passenden Arbiter.

Tatsächliche Semantik:

- `problem_id` ist Pflicht; Problem-Löschung entfernt dessen Ansätze per CASCADE.
- `author_user_id` ist nullable und verweist mit `ON DELETE SET NULL` auf `auth.users`.
- Die Eindeutigkeit gilt pro Person und Problem für **alle Status**, nicht nur `active`. `withdrawn` bewahrt denselben Datensatz. Erneutes Speichern setzt ihn auf `active`.
- RLS: INSERT nur eigener Autor, aktive Mitgliedschaft und aktives Problem; SELECT eigener Ansatz (auch withdrawn) oder aktiver Ansatz eines aktiven Problems für Mitglieder; UPDATE/DELETE nur eigener Autor. Anonymisierte Zeilen kann niemand übernehmen.
- `prepare_network_content_for_account_deletion` entfernt nicht zu bewahrende Inhalte vor der Auth-Löschung. Bewahrte Inhalte verlieren anschließend per FK den Autor. Diese Logik und `outlives_account` bleiben unverändert.

## 2. Vergleich und gewählte Lösung F1

| Variante | Bewertung |
| --- | --- |
| A: vollständiger Unique-Constraint | Ein kleiner DB-Fix erhält den atomaren Upsert. Mit explizitem `NULLS DISTINCT` bleibt die Menge erlaubter Datensätze identisch: je ein nichtleerer Autor, beliebig viele NULL-Autoren. Keine Datenbereinigung oder Umschreibung. |
| B: eigenen Ansatz suchen, dann UPDATE/INSERT | Möglich ohne Schemaänderung, aber zusätzlicher Roundtrip und Wettlauf bei zwei gleichzeitigen erstmaligen Einsendungen. Der vorhandene Index würde Duplikate verhindern; für ein robustes Speichern wäre zusätzlich ein gezielter Retry nach Unique-Verletzung nötig. Mehr Logik für dieselbe Regel. |

Gewählt: **A**, `UNIQUE NULLS DISTINCT (problem_id, author_user_id)`. Der vollständige Constraint wird hinzugefügt, bevor der partielle Index entfernt wird. Es gibt keine Lücke ohne Eindeutigkeit. Die Action bleibt unverändert.

Die gegenteilige Erklärung im Kommentar der alten Migration („nur ein verwaister Ansatz“) trifft auf PostgreSQLs normales UNIQUE nicht zu: NULL-Werte gelten standardmäßig als verschieden. Diese Semantik wird hier explizit gemacht und mit zwei gelöschten Autoren am selben Problem getestet. Siehe [PostgreSQL Unique Indexes](https://www.postgresql.org/docs/18/indexes-unique.html) und [ON-CONFLICT-Inferenz](https://www.postgresql.org/docs/current/sql-insert.html).

## 3. Audit und Ursache F2

`network_conversations` speichert zwei Participants direkt: `participant_a_user_id`, `participant_b_user_id`. Beide sind wegen Account-Löschung nullable. Ursprung ist je eine der Spalten `contact_request_id`, `problem_interest_id`, `discovery_intro_request_id`. Ein neuer Datensatz braucht genau einen Ursprung; nach Löschung eines Ursprungs erlaubt die bestehende Semantik auch null Ursprünge. Der Contract-Trigger gleicht Participants gegen den Ursprung ab.

- Contact Request: angenommene Anfrage; Sender/Empfänger werden Participants.
- Problem Interest: Interessent und Problem-Autor bzw. Ansatz-Autor; Annahme über `accept_network_problem_interest`.
- FIND Intro: angenommene `discovery_intro_requests`; Öffnen über `ensure_discovery_intro_conversation`, auch ohne CONNECT-Mitgliedschaft.
- Tabellenzugriff auf Conversations und Messages ist für Clients gesperrt. Lesen/Schreiben läuft über RPCs, `can_use_network_messaging`, `can_use_network_conversation` und den bestehenden Nachrichtenvertrag.

Die Safety-Schicht war nicht mitgezogen:

1. `block_network_user` verlangte aktive CONNECT-Mitgliedschaften und eine Kontaktanfrage.
2. `network_reports.contact_request_id` war NOT NULL; `report_network_interaction` konnte nur deren Participants ableiten.
3. Die Conversation-Seite übergab für die beiden anderen Ursprünge eine leere Contact-ID.
4. Safety-, Sende- und Gelesen-Actions verwendeten noch `context()` mit CONNECT-Mitgliedschaftspflicht. Das widersprach dem bereits vorhandenen gemeinsamen FIND-Postfach.
5. `safeConnectRedirect` verwarf `/messages/...`; `get_network_block_state` verlangte ebenfalls CONNECT-Mitgliedschaft.

`network_blocks` war bereits die passende personenbezogene Struktur: `(blocker_user_id, blocked_user_id)` als Primary Key, Selbstblockierung verboten, beide FKs mit Account-CASCADE. Die interne Funktion `is_network_interaction_blocked` prüft beide Richtungen. Nachrichtenversand, normale/personenbezogene Kontaktanfragen, Problem-Interesse-Annahme, Nachrichtenbenachrichtigungen und Vorschläge verwendeten diese Funktion bereits. **Neue** Problem-/Ansatz-Interessen und FIND-Intros einschließlich Annahme und nachträglichem Conversation-Öffnen waren hingegen ungeschützt.

## 4. Neues Report- und Blocking-Modell

Reports erhalten eine optionale `conversation_id`. `contact_request_id` wird optional, mindestens einer der beiden Kontexte bleibt Pflicht. Die alte eindeutige Kombination Reporter/Contact bleibt; zusätzlich gilt Reporter/Conversation eindeutig. Bestehende Contact-Reports werden, soweit möglich, um ihre Conversation ergänzt; sonst bleiben sie Contact-only. Kein Report wird bei der Migration gelöscht. Lokal waren vor dem Test keine Reports vorhanden.

`report_network_conversation` authentifiziert, prüft beide Participants NULL-sicher und leitet die gemeldete Person aus der DB ab. Kein Parameter für Reporter oder gemeldete User-ID. Ein unbeteiligter Aufruf, eine fehlende Conversation oder ein gelöschtes Gegenüber wird abgewiesen. Die vier Kategorien und das 1.000-Zeichen-Limit bleiben bestehen. Auch nach einer Blockierung darf die betroffene Person melden.

Bei Contact-Conversations verwendet die neue RPC intern den erhaltenen `report_network_interaction`-Weg. Alte Clients, Kontaktkarten und vorhandene Reports bleiben kompatibel; erneutes Melden aktualisiert denselben Datensatz statt einen zweiten anzulegen. Die Action bevorzugt bei vorhandenem Conversation-Kontext diesen Weg und fällt bei Zugriffsverweigerung nicht auf einen anderen Kontext zurück.

Blockieren bleibt eine Beziehung in `network_blocks`. Die RPC akzeptiert als Nachweis entweder eine bestehende Kontaktanfrage oder eine Conversation, in der beide User Participants sind. Eine beliebige Client-User-ID genügt nicht. Anmeldung ist Pflicht; aktuelle CONNECT-Mitgliedschaft ist für die eigene Safety-Aktion keine Voraussetzung. Blockstatus und Aufheben funktionieren ebenfalls für angemeldete FIND-Teilnehmende; beim Aufheben kann nur der eigene Block entfernt werden.

Die vorhandene symmetrische Blockprüfung bleibt erhalten. Drei kleine DB-Trigger schließen die geprüften Umgehungswege:

- Problem-/Ansatz-Interessen prüfen beim Anlegen bzw. Zielwechsel den tatsächlichen Zielautor.
- FIND-Intros prüfen neue Anfragen und Annahmen. Ablehnen/Abbrechen bleibt möglich.
- Neue Conversations aller Ursprünge prüfen das User-Paar. So kann auch ein vor der Blockierung angenommenes Intro keinen neuen Chat eröffnen.

Alle drei verwenden denselben transaktionalen Advisory-Lock für das User-Paar wie die vorhandene Blockier-/Nachrichtenlogik. Bestehende Verläufe bleiben lesbar; der Nachrichtenversand bleibt beidseitig gesperrt. Keine neue Blocking-Tabelle, Notification-Engine oder Moderation.

## 5. Migrationen und Rollout

Neue Migrationen, keine historischen Änderungen:

1. `20261101120000_connect_approach_upsert.sql`
2. `20261101121000_conversation_safety.sql`

Die Versionsnummern liegen nach dem aktuellen Repository-Ende `20261095120000`. Beide wurden mit `npx supabase migration up --local` auf die laufende lokale DB angewendet. F1 legt einen normalen Unique-Index an und benötigt währenddessen einen Schreiblock; es findet keine Datenumschreibung statt. F2 erweitert das Schema und ersetzt ausschließlich die betroffenen RPCs bzw. ergänzt die Sicherheitsprüfungen.

**DB vor Code deployen:** Die neue Oberfläche benötigt `report_network_conversation`. Die Migrationen sind mit dem bisherigen Code kompatibel. Keine neuen Env-Variablen.

Vom Repository-Root, für das bereits mit Production verknüpfte Supabase-Projekt, nach Freigabe:

```sh
git switch feat/connect-7-1-bugfixes
npx supabase db push
git switch main
git merge --ff-only feat/connect-7-1-bugfixes
git push origin main
```

Der letzte Push löst den im Repository dokumentierten Vercel-Git-Deploy aus. Kein Produktions-`db push`, Merge, Push oder Deploy wurde hier ausgeführt.

## 6. RLS, Grants und Löschung

- Ansatz-, Interessen- und FIND-RLS bleiben bestehen. Die Block-Trigger ergänzen Prüfungen; sie ersetzen keine Ownership- oder Sichtbarkeitsprüfung.
- Reports und Blocks bleiben ohne direkte Client-Grants und ohne lesende Client-Policy. `service_role` behält seinen bestehenden Verwaltungszugriff.
- Neue Report-RPC: SECURITY DEFINER, leerer `search_path`, nur `authenticated`/`service_role`, keine anonyme Ausführung. Die neuen Trigger-Funktionen sind nicht direkt für Clients ausführbar. Die ersetzten RPCs behalten ihre expliziten Grants.
- Die bestehenden Kommunikations-Leserechte und Mitgliedschaftssperren in der DB werden nicht gelockert. Die Action prüft Anmeldung; die DB entscheidet weiterhin je Ursprung und Person über Nachrichtenrechte. Nur personenbezogene Safety-Aktionen hängen nicht mehr von CONNECT-Mitgliedschaft ab.
- Alte Reports behalten ihre Account-/Contact-CASCADE-Regeln. Neue Conversation-Reports werden mit der Conversation entfernt; Account-CASCADE für Reporter/Gemeldeten gilt weiterhin. Es werden keine Identitäten anonymisierter Participants rekonstruiert.
- Downstream: vorhandene Kontaktkarten verwenden weiter den alten Report-Weg. Conversation-Seite und Conversation-Karte erhalten den gemeinsamen Kontext. Bestehende Blockierdialoge, Kategorien und DE/EN-Texte bleiben unverändert.

## 7. Tests und geprüfte Ursprünge

`supabase/tests/connect_phase_7_1_security.sql`: **109 echte pgTAP-Prüfungen**, transaktional mit Rollback, unter `authenticated` bzw. `anon`, keine gemockten Security-Entscheidungen.

F1: eigener Upsert-Insert/Update, zweiter Autor, fremdes UPDATE ohne betroffene Zeile, gefälschter Autor beim Upsert verboten, Rückziehen/Reaktivieren, Duplikat verboten, zwei Account-Löschungen ergeben zwei gültige NULL-Autor-Ansätze am selben Problem, anonymisierte Ansätze bleiben schreibgeschützt.

Für **Contact Request, Problem Interest und FIND Intro jeweils**: Participant meldet, zweiter Participant meldet, Nicht-Participant wird abgewiesen, Selbst-/Fremdblockierung ohne Beziehung verboten, Blockieren/Aufheben, sichere Ableitung des Gegenübers, Report-Update ohne Duplikat, Nachrichten in beide Richtungen gestoppt, Verlauf weiter lesbar, neue FIND-Anfragen/Annahmen sowie nachträgliches Öffnen eines akzeptierten Intros gestoppt. FIND-Fixtures besitzen ausdrücklich **keine CONNECT-Mitgliedschaft**. Bei den CONNECT-Fixtures zusätzlich: neue Personenkontaktanfragen sowie Problem- und Ansatz-Interessen in beiden Richtungen gesperrt.

Zusätzlich: Contact-only-Reports ohne Conversation, Kompatibilität alter/neuer Report-RPC, Kategorie-/Längenvalidierung, direkte Tabellenzugriffe und anonyme RPCs verweigert, NULL-Participant als Rechte-Umgehung ausgeschlossen, Account-Cleanup. Zwei zusätzliche Node-Regressionsprüfungen im vorhandenen `sharedInbox.test.ts` sichern die Action-Anmeldung und Weitergabe des Conversation-Kontexts.

## 8. Browsernachweis und Abgrenzung

Die lokale DB enthielt zunächst keine Conversations oder Probleme. Für den Browsercheck wurden deshalb gezielt drei gültige Conversations samt Ursprüngen und Testprofilen für die bestehenden lokalen Konten Nora/Pia angelegt. Die ursprüngliche Anfrage-/Annahme-Strecke wurde **nicht** komplett im Browser durchgeklickt; Gegenstand war die reparierte Safety-Oberfläche dieser Conversations.

| Fall | Browser | DB |
| --- | --- | --- |
| Contact Request | Melden, Blockieren, Editor verschwindet, Aufheben | Report enthält Contact- und Conversation-ID |
| Problem Interest | Melden, Blockieren, Editor verschwindet, Aufheben | Report enthält Conversation-ID, keine Contact-ID |
| FIND Intro | Melden, Blockieren, Editor verschwindet, Aufheben | Report enthält Conversation-ID, keine Contact-ID |
| F1 | Ansatz veröffentlichen, bearbeiten, Rückziehen bestätigen | Genau ein Ansatz, aktualisierter Text und `withdrawn` bestätigt |
| FIND ohne CONNECT-Mitgliedschaft | Nicht separat im Browser | Eigene FIND-only-Fixtures in pgTAP |
| Fremdzugriff, anonyme Accounts, neue Kommunikationswege nach Block | Nicht durch Browsermanipulation simuliert | pgTAP und bestehende DB-Suiten |

Bestehende Erfolgsansichten und blockierte Ansichten wurden per Screenshot geprüft; keine gemeldeten JavaScript-Fehler oder Next.js-Fehleroverlays. Blockierungsbestätigungen wurden im automatisierten Browser bestätigt. Resend war über einen temporären Preload abgefangen, kein echter Mailversand. Die neu erzeugten Browser-Testobjekte einschließlich Reports und Testprofile wurden danach gezielt entfernt; vorhandene Konten und Mitgliedschaften bleiben erhalten. Dev-Server und Testbrowser wurden beendet.

## 9. Verbleibende bekannte Probleme und Abschluss

- Die bestehende App hat weiterhin keinen Moderations-/Admin-Arbeitsplatz zur Bearbeitung der Reports (F3 der Gap-Liste). Hier wird ausschließlich korrektes und vertrauliches Melden repariert.
- Bei kleiner Browserhöhe kann der bereits vorhandene sticky Nachrichten-Editor den Absende-Button des offenen Meldedialogs überdecken. Der Funktionscheck lief mit 1.280 × 1.100 Pixeln. Keine Layout-/Textänderung in dieser Phase.
- Die übrigen Phase-7-Gaps und CONNECT-v2-Bausteine wurden nicht bearbeitet.

Abschließende Ergebnisse:

- `npm run ci:check`: Exit 0; TypeScript, **2.623 Node-Tests bestanden, 0 fehlgeschlagen/übersprungen**, Next.js-Produktionsbuild und integrierter DB-Testlauf erfolgreich.
- Zusätzlich separat `npx supabase test db`: Exit 0; **127 SQL-Dateien, 1.428 Prüfungen, PASS**. Darunter die bestehenden Suiten zu Account-Löschung, anonymisierten Ansätzen, Messaging, Problem-Interessen und FIND-Intros.
- `git diff --check`: erfolgreich. Bestehende Build-/Lint-Warnungen außerhalb der geänderten Dateien bleiben bestehen.
