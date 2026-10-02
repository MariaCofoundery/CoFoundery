# Phase 7.2 – Plattform-Admin und CONNECT-Moderation

## Ist-Zustand und Abgrenzung

Audit gegen aktuellen Code und laufende lokale Supabase-DB, auf Basis von `main` (`f8cba26`), nicht nur der Phase-7-Planung:

- `network_reports`: Reporter, gemeldete Person, Kategorie, optionaler Kommentar (1–1.000 Zeichen), Zeitpunkt, optionale `conversation_id` und historische `contact_request_id`. Mindestens ein Kontext ist Pflicht. Kategorien bleiben `spam`, `harassment`, `misleading`, `other`.
- `report_network_conversation` leitet die gemeldete Person aus den geprüften Teilnehmenden ab; Kontaktunterhaltungen delegieren an `report_network_interaction`. Beide RPCs aktualisieren eine vorhandene Meldung derselben Person zum selben Kontext und liefern ausschließlich deren UUID.
- Es gab weder Status noch interne Notiz, `message_id`, Adminrolle oder Moderationsroute. `network_reports` hat RLS ohne lesende Client-Policy und keine Tabellenrechte für `anon`/`authenticated`.
- `auth.users` ist die Accountreferenz; `person_core` enthält den bestehenden Anzeigenamen. Selbst verwaltete Profilrollen und organisationsbezogene Advisor-Rechte sind fachliche Rollen und werden nicht für Plattformprivilegien verwendet. Die AI-Worker-Allowlist ist ebenfalls keine Plattform-Admin-Rolle.
- Bestehende Debug-/Dev-Routen sind in Production abgeschaltet. Service-Role-Verwendung u. a. in Mail-Empfängerauflösung, Signup-Intents, Accountlöschung und Maintenance wird nicht für diese Moderationsseite wiederverwendet: Die neue Seite verwendet ausschließlich den normalen Session-Client.

Keine globale Userverwaltung, Sanktionen, Moderationsmails, neuen Kategorien oder allgemeinen Admin-APIs.

## Admin-Datenmodell und Rollenprüfung

Neue Tabelle `platform_admins`:

- `user_id`: Primärschlüssel, FK auf `auth.users`, bei Accountlöschung entfernt.
- `created_at`: serverseitiger Erstellzeitpunkt.
- `created_by`: optionaler FK auf `auth.users`, bei Löschung auf NULL gesetzt; beim ersten administrativen Bootstrap darf er fehlen.

Keine aus E-Mail, Profilrolle oder fest eingebauten IDs abgeleiteten Rechte. Kein Account wird durch die Migration zum Admin.

`is_platform_admin()` ist parameterlos, `STABLE`, `SECURITY DEFINER`, mit leerem `search_path` und vollständig qualifizierten Tabellen-/Funktionsnamen. Sie prüft nur `auth.uid()`. Authenticated darf den eigenen Status prüfen, anon erhält kein EXECUTE. Die Allowlist selbst ist durch RLS ohne Client-Policies und entzogene Client-Tabellenrechte geschützt. Auch eine Adminperson kann im Produkt keine weiteren Admins ernennen.

Rollenentzug wirkt beim nächsten RPC, ohne JWT-Neuausstellung. Die App prüft zusätzlich über `requirePlatformAdmin()`; nicht angemeldete und nicht berechtigte Personen erhalten `notFound()`.

## Route und Datenumfang

`/admin/moderation`, serverseitig gerendert, DE/EN, `noindex/nofollow`. Kleiner Einstieg auf `/account`, nur nach erfolgreicher Adminprüfung. Keine allgemeine Navigationsänderung für normale Accounts.

`list_network_reports_for_moderation(status, limit, offset)` prüft den Adminstatus vor jeder Datenabfrage. Die Oberfläche lädt 25 Meldungen pro Seite plus einen Datensatz zur Erkennung einer Folgeseite; DB-Maximum 50. Sortierung: offen, geprüft, geschlossen; innerhalb des Status neueste zuerst, danach UUID als stabiler Tie-Breaker. Optionaler Statusfilter, feste interne Pagination-URLs.

Sichtbar sind:

- Report-ID, Zeitpunkt (explizit UTC), Kategorie, Kommentar und Status;
- Reporter/gemeldete Person: vorhandener Anzeigename und Account-UUID, keine E-Mail und keine weiteren Profilfelder;
- vorhandene Conversation- und Kontaktanfrage-ID, die beiden vorhandenen Teilnehmer-IDs;
- Ursprung Kontaktanfrage / Problem Interest / FIND-Intro; vorhandener Problem- oder Listingtitel sowie Problem-/Ansatz-/FIND-Intro-IDs;
- interne Notiz und letzte Bearbeitung mit Admin-UUID und Zeitpunkt.

Technische Referenzen sind platzsparend aufklappbar. Sie sind keine Links, die einen Zugriff auf private Unterhaltungen suggerieren. Kein frei übergebbarer User- oder Conversation-Identifier dient als Datenabfrage. Die Projektion folgt ausschließlich den Referenzen tatsächlich vorhandener Meldungen.

**Kontextgrenze:** Reports besitzen keine konkrete `message_id`. Es werden weder einzelne Nachrichten erfunden noch vollständige Nachrichtenverläufe, Kontakttexte oder FIND-Intro-Nachrichten geladen. Auch ein Admin kann private Nachrichten nicht über manipulierte Conversation-IDs oder direkte Tabellenzugriffe lesen. Fehlende gelöschte Ursprünge werden entsprechend gekennzeichnet.

## Status, Notiz und Bearbeitung

Additive Spalten in `network_reports`:

- `status`: `open` (auch für bestehende Reports), `reviewed`, `closed`.
- `admin_note`: optional, maximal 2.000 Zeichen, ausschließlich intern.
- `moderated_at`, `moderated_by`: letzte administrative Bearbeitung, serverseitig gesetzt; gelöschte Bearbeiter werden NULL.

`moderate_network_report(report_id, status, admin_note)` erlaubt ausschließlich diese Felder. Keine Löschung, Umschreibung des Nutzertexts oder Änderung von Reporter/Kontext. Die Oberfläche bietet „Als geprüft markieren“, „Schließen“, „Wieder öffnen“ sowie das Speichern der Notiz beim bestehenden Status. Notizen werden als Text gerendert; keine HTML-Ausführung.

Wenn die bisherige Reporting-Funktion Kategorie oder Beschreibung einer existierenden Meldung tatsächlich verändert, öffnet ein kleiner Trigger die Meldung erneut und leert die bisherigen Bearbeitungsmetadaten. Die interne Notiz bleibt erhalten. Eine identische Wiederholung öffnet einen erledigten Fall nicht erneut. Reporting-RPCs liefern die Notiz niemals zurück.

## RLS und Security

Auch Adminaccounts erhalten keine direkten `network_reports`-Tabellenrechte. Der Zugriff erfolgt bewusst über zwei eng begrenzte `SECURITY DEFINER`-RPCs mit leerem `search_path`, vorgeschalteter DB-Adminprüfung, validierten Parametern und gezielten Projektionen/Updates. RLS bleibt aktiviert, ohne allgemeine Admin-SELECT-Policy für private Tabellen. Anon/PUBLIC erhalten kein EXECUTE auf Adminfunktionen.

Die Seite und Server Action verwenden den Cookie-/Session-Supabase-Client, keinen Service-Role-Schlüssel. Die Action prüft zusätzlich UUID, Status, Notizlänge und interne Rücksprungparameter. Fehler werden ohne sensible Daten generisch angezeigt. Kein Cache über Accounts hinweg.

## Migration und Rollout

Neue Migration: `20261102120000_platform_admin_moderation.sql`. Keine historische Migration verändert. Bestehende Reports bleiben erhalten und beginnen im Status `open`. Bestehende Reporting-RPCs und Kategorien bleiben kompatibel. Keine neuen Env-Variablen.

Lokal mit `npx supabase migration up --local` angewendet. **Production-DB vor Code aktualisieren**, weil die neue Seite die Admin-RPCs benötigt. Vom Repository-Root, bei korrekt verknüpftem Produktionsprojekt:

```sh
git switch feat/connect-7-2-admin-moderation
npx supabase db push
git switch main
git merge --ff-only feat/connect-7-2-admin-moderation
git push origin main
```

Der letzte Befehl löst den bestehenden Vercel-Git-Deploy aus. Kein Produktions-DB-Push, Merge, Remote-Push oder Deploy wurde während der Umsetzung ausgeführt.

## Ersten Admin einmalig eintragen

Im Supabase-Projekt unter **Authentication → Users** den vorhandenen eigenen Account verifizieren und seine UUID kopieren. Anschließend ausschließlich im vertrauenswürdigen **Supabase SQL Editor** als administrativer DB-User ausführen; Platzhalter vorher ersetzen:

```sql
begin;
insert into public.platform_admins (user_id)
values ('HIER_DIE_VERIFIZIERTE_ACCOUNT_UUID'::uuid)
on conflict (user_id) do nothing;

select user_id, created_at
from public.platform_admins
where user_id = 'HIER_DIE_VERIFIZIERTE_ACCOUNT_UUID'::uuid;
commit;
```

Der FK verweigert nicht existierende Accounts. Keine E-Mail-/UUID-Werte ins Repository übernehmen, keinen Service-Key in einen Browser eingeben. Danach mit diesem Account anmelden und `/admin/moderation` öffnen. Es gibt keine öffentliche Ernennungsfunktion. Entzug erfolgt ebenfalls administrativ:

```sql
delete from public.platform_admins
where user_id = 'HIER_DIE_VERIFIZIERTE_ACCOUNT_UUID'::uuid;
```

## Meldedialog bei kleinem Viewport

Der vorhandene Meldedialog ist ein inline aufgeklapptes `<details>`, kein modales Overlay. Bisher konnte der sticky Nachrichteneditor darüberliegen. Auf schmalen Viewports (unter 640 px), bei geringer Höhe (bis 750 px) und solange der Meldedialog geöffnet ist, wird der Editor nun per gezieltem CSS-`:has()`-Zustand in den normalen Dokumentfluss gesetzt. Der Dialog bleibt normal scrollbar; auf größeren Viewports bleibt bei geschlossenem Dialog das bisherige Sticky-Verhalten erhalten. Keine Messaging-Neugestaltung und keine neuen Dialogtexte.

## Tests

- Neue pgTAP-Datei `supabase/tests/connect_phase_7_2_moderation.sql`: 56 Prüfungen für Allowlist, fehlendes Self-Enrollment, RLS/Grants, Adminprüfung, Lesen/Status/Notiz, anonyme und normale Nutzer, Rollenentzug, manipulierte IDs, unverändert private Nachrichten, Filter/Pagination, alle drei Conversation-Ursprünge, historischen Kontakt-Report und Wiederöffnen bei geändertem Nutzertext. Transaktionaler Rollback.
- 17 neue App-Tests: tatsächlicher Route-Guard und Server Action mit gemockter Supabase-Grenze, nicht berechtigte/fehlende Sitzung, DB-Fehler, drei Statuswechsel, Eingabevalidierung, feste interne Redirects und DE/EN-Schlüssel.
- Browser: anonym und normales Testkonto sehen 404; vorübergehend eingetragener lokaler Admin sieht alle drei Ursprünge und den kleinen Einstieg im Konto. Notiz speichern, offen → geprüft → geschlossen → wieder offen, Geprüft-/Geschlossen-Filter einschließlich Formularbedienung, DE/EN und mobile Adminansicht geprüft. DB-Nachkontrolle bestätigt Status, Notiz, Zeitpunkt und Actor.
- Browser-Meldedialog bei **320 × 640** und **375 × 667** visuell geprüft: kein horizontaler Überlauf, erreichbarer Absende-Button. Eine Kontaktmeldung tatsächlich über die Oberfläche abgeschickt, Erfolgsredirect `safety=reported` und gespeicherten Report geprüft. Desktop **1280 × 900**: Editor geschlossen sticky, bei geöffneter Meldung static.
- Abgrenzung: Problem-Interest- und FIND-Meldungen wurden für die Browserliste über die echten DB-RPCs vorbereitet, nicht in dieser Phase über ihre vollständigen Entstehungsflows im Browser angelegt. Ihr Reporting-Vertrag ist durch pgTAP abgesichert. Keine neu behaupteten Browserchecks der vollständigen FIND-/Problem-Flows.
- Nach Entzug der temporären Adminrolle erneut im selben Browser geprüft: sofort 404 ohne erneute Anmeldung.
- Keine Browser-JavaScriptfehler im abschließenden Error-Check. Temporäre lokale Profile, Kontexte, Meldungen und Adminzuordnung nach der Prüfung entfernt; keine dauerhaften Test-Admins und keine Moderationsmails.
- Ein erster vollständiger Lauf hatte grüne App-Tests und Build, aber DB-Testfehler durch gleichzeitig vorhandene Browser-Fixtures (bestehende Tests setzen leere Listen voraus). Der finale Gesamtlauf nach vollständiger Bereinigung ist grün.

- `npm run ci:check`: erfolgreich; TypeScript, 2.640 App-Tests, Next.js-Production-Build sowie 1.484 DB-Tests in 128 Dateien. Bestehende Lint-Warnungen außerhalb dieser Änderung bleiben bestehen.

- `npx supabase test db` separat: ebenfalls erfolgreich, 1.484 Prüfungen in 128 Dateien.

## Verbleibende Moderationslücken

- Keine einzelne gemeldete Nachricht referenziert; Bericht und begrenzter Ursprung sind die Bewertungsgrundlage. Kein privater Verlaufzugriff.
- Kein unveränderbares Bearbeitungsprotokoll, keine Zuständigkeiten und kein Versions-/Konfliktmanagement bei gleichzeitigem Bearbeiten durch mehrere Admins. Letzte gespeicherte Bearbeitung gilt.
- Vorhandene `ON DELETE CASCADE`-Beziehungen der Reports zu Accounts/Kontaktanfragen/Conversations bleiben unverändert. Es wird kein neues Aufbewahrungsarchiv geschaffen.
- Die Adminseite kann keine Accounts sperren, Inhalte entfernen oder Sanktionen versenden. Solche Maßnahmen bleiben außerhalb dieser Phase.
