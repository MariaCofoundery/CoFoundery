# Phase 9.3 – Workbook-Konsolidierung und historischer Ausstieg

Stand: 04.10.2026. Branch: `feat/workstyle-reporting-v04`. Ausgangscommit: `98ad353d598c1491afdd4db047b16a5c1790fe83`.

## 1. Audit und Journey vorher/nachher

Geprüft wurden aktueller Code, lokale PostgreSQL-Funktionen/ACLs/RLS, Phase-9.0-Deletion-Map sowie die Berichte zu Phase 9.1/9.2. Kein Produktionszugriff. Vor Testfixtures enthielten die vier lokalen Legacy-Tabellen jeweils **0 Zeilen**. Das sagt nichts über den Produktionsbestand aus.

Vorher bestanden neben der aktuellen Report→Setup-Journey weiterhin:

- Große Workbook-Editorroute samt Intro, Druckroute und Drei-Themen-Einstieg.
- Historische Report-CTAs in Richtung Workbook.
- Matching-Report → Workspace anlegen → separater Agreement-Draft. Die Workspace-Seite konnte schon beim Lesen einen Draft erzeugen.
- Gleichrangige historische Vereinbarungskarten auf der Homebase; Marketing und Einladungsmails versprachen weiterhin ein gemeinsames Workbook.
- Der Workbook-Reader war an die Verfügbarkeit früherer Scoring-Daten gekoppelt. Ein gespeicherter Payload konnte dadurch trotz vorhandener Inhalte als „in Arbeit“ enden.

Aktuell:

`Person → Workstyle / FIND → Team → Euer Zusammenspiel → Venture Alignment → optionale Vertiefung → Founder Setup`

Das ist kein Pflichtfortschritt. Report und Setup bleiben direkt zugänglich. Historische Stände bilden einen getrennten Rückblick, keine zusätzliche Vereinbarungsstufe. Workstyle v0.4, `workstyle-report/1.0.0`, aktuelle Shares, Capability-Disclosure und Research-Grenzen bleiben unverändert.

## 2. Großes Legacy Workbook

`founder_alignment_workbooks` und seine Payloads bleiben vollständig bestehen. Die normale Workbookroute rendert nun `HistoricalWorkbookPage` mit einem reinen Server-Reader unter den bisherigen Teilnehmerrechten. Für Founder braucht das Lesen weder einen alten Score noch einen neu erzeugten Report.

`HistoricalValue` rendert den gespeicherten JSON-Baum escaped und ohne inhaltliche Normalisierung. Dadurch bleiben auch ältere oder unbekannte Payloadfelder sichtbar: Einzelreflexionen, damalige Vereinbarungstexte, Zustimmungen, Advisor-Notizen, workspaceV2-Beiträge, Reaktionen und Outputs. Bekannte Feld-/Themennamen sind DE/EN beschriftet; unbekannte Schlüssel und historische Reaktionscodes werden nicht umgedeutet.

Es gibt keine Checkboxen, Texteditoren, neue Zustimmungen oder Speicheraktion im historischen Reader. Die Kopfzeile erklärt ausdrücklich den damaligen Paar-Kontext und die Abgrenzung zu heutigen Teamvereinbarungen.

`FounderAlignmentWorkbookClient`, Modell/Sanitizer, frühere Inhalte und Entwicklungs-Previews bleiben zunächst als nicht produktiv eingebundener Kompatibilitätscode erhalten. Ihre Mutationsaktionen scheitern vor dem Datenzugriff. Kein neuer Workbookstand entsteht aus einem aktuellen UI-Pfad.

## 3. Kleine Drei-Themen-Stufe

Die gesonderte Intro-/Vertiefungsseite entfällt aus der aktuellen Journey. Alte `deepDiveStep`-Links öffnen den gespeicherten historischen Gesamtstand; sie starten keinen Editor und keine neue Themenstufe.

| Alter Bestandteil | Vorhandene aktuelle Entsprechung | Entscheidung |
|---|---|---|
| `decision_rules`: Entscheidungshoheit, Regeln, Gesprächsnotiz | Report-Gesprächsagenda; Setup `decision_rights` und passende Entscheidungs-/Deadlock-Themen | Wiederverwenden, keine Promptkopie |
| `collaboration_conflict`: Einwände, Konfliktklärung | Report VOICE-Gesprächsimpuls; Setup Kommunikation und `conflict_deadlock`; optionale Paar-Labs | Bestehende Themen verwenden |
| `alignment_open_points`: eigenen Befund besprechen, Notiz festhalten | Report→Setup-Gesprächsimpuls und frei formulierbare Setup-Diskussion | Kein separater Store/Schritt |

Der Audit fand hier keinen zusätzlich notwendigen Erkenntnistyp. Die nützliche Funktion „Befund → Gespräch → bewusst gespeicherte Notiz“ ist bereits in Phase 9.1 vorhanden. Historische Prompts/Module bleiben zur Payload-/Testkompatibilität erhalten, nicht als aktuelle Pflichtstrecke. Alte Handoff-Actions sind gesperrt; der alte Handoff-RPC ist nicht mehr für authentifizierte Clients ausführbar.

## 4. Matching Workspace – eigenständiger Alt-Store

`matching_workspaces` und `matching_workspace_agreements` sind **nicht** das große Workbook. Die sieben Bereiche bleiben historisch lesbar:

- Rollen, Commitment, Entscheidungen, Konflikt, Kommunikation, Equity-Gespräch, nächste 90 Tage.
- Status bleibt `draft`; keine neuen Revisionen oder einstimmigen Bestätigungen werden daraus abgeleitet.
- `/workspaces/[workspaceId]` verwendet nur den bestehenden lesenden `getMatchingWorkspaceAgreementForWorkspace`-Pfad. Kein `createOrGet…` mehr beim Seitenaufruf.
- Bestehende normalisierte sieben Abschnittsfelder werden angezeigt; ohne Agreementzeile erscheint ein leerer historischer Zustand, ohne Insert.
- Aktive Creation-/Save-Actions scheitern vor dem Datenzugriff. Der Matchingreport zeigt nur noch einen sekundären Link, wenn bereits ein Workspace existiert.

Es gibt absichtlich keinen automatischen Import und keinen neuen Import-Workflow. Founder können ihren historischen Stand lesen und anschließend die bestehenden Setup-Themen aktiv bearbeiten. Keine vorhandene Setup-Notiz wird überschrieben.

## 5. Report → Founder Setup

Die aktuelle Workstyle-Reportlogik und `workstyle/setupHandoff.ts` wurden wiederverwendet, nicht neu gebaut. Der Handoff bleibt:

`Reportbereich → erlaubtes Setup-Thema → editierbarer Gesprächsimpuls → aktives „Beitrag hinzufügen“ → ggf. spätere Revision und Bestätigung`

URLs enthalten den erlaubten Bereichsschlüssel, keine Rohantworten. Das Öffnen erzeugt keine bestätigte Vereinbarung. Auch alte Reportseiten verweisen für die nächste aktuelle Aktion direkt auf das zugeordnete Setup; vorhandene Teamzuordnung wird gelesen, nicht auf GET neu angelegt. Ohne passende aktuelle Zuordnung führen sie zu Verbindungen. Der neue Workstyle-Teamreport führt weiterhin nie durch Workbook oder Matching Workspace.

## 6. Historische Lesbarkeit und Zugriff

- Workbook: bestehende Einladungsteilnehmer und bisherige SELECT-RLS; Teammitgliedschaft allein gewährt keinen Zugriff auf frühere Paarinhalte.
- Workspace: bestehende aktive Matching-Session-Teilnahme samt SELECT-RLS.
- Die historischen Inhalte werden weder in Setup noch in Produkt-Snapshots kopiert.
- Alte Zustimmungen sind als damalige Zustimmungen gekennzeichnet, niemals als aktuelle Roster-Bestätigung.
- Fehlender Workbookdatensatz führt zum aktuellen Setup bzw. Verbindungen; nicht zu einem neuen leeren Editor.
- Ein Homebase-Link verwendet die Einladung des tatsächlich gespeicherten Workbooks, auch wenn inzwischen ein neuerer Paarreport existiert.

Historische Sichtbarkeit bleibt an die bisherigen Berechtigungs- und Account-Lifecycle-Regeln gebunden. Es wird keine zusätzliche Archivfreigabe geschaffen.

## 7. Advisor Legacy Bridge

Unverändert erhalten:

- `founder_alignment_workbook_advisors` einschließlich Grant-/Widerrufs-Lifecycle.
- `relationshipAdvisorAccess.ts` und `syncRelationshipAdvisorFromLegacyInvitation`.
- Bestehende Advisor-Report-/Snapshot-/Sitzungsansichten und deren Projektionen.

Der Advisor-Workbook-Editor war bereits vor dieser Phase aus dem aktuellen Advisor-Produkt entfernt. Gespeicherte Advisor-Links führen weiterhin über bestehende Token-/Access-Prüfungen zum Advisor-Report; der Founder-Archivreader öffnet nicht einfach den vollständigen Payload für Advisor. Der bestehende Datenreader/Advisor-Projektor bleibt für historische Report-/Snapshot-Kontexte erhalten.

**Verbleibender technischer Schreibbedarf:** Legacy-Advisor-Claim/Link-Synchronisation kann weiterhin über den privilegierten bestehenden Pfad Advisor-Metadaten am historischen Payload pflegen. Das ist Berechtigungs-/Lifecycle-Wartung, kein wieder geöffneter Workbook-Editor. Die dafür benötigten Funktionen und Service-Rechte bleiben bestehen.

Vollständiger Ausbau der Bridge erst nach Produktionsprüfung aller alten Links/Grants und einem ausdrücklich beschlossenen Ersatz ihres historischen Zugriffsvertrags.

## 8. Account Delete / Privacy / Export

Unverändert: `delete_founder_account_data`, `scrub_deleted_advisor_from_workbook_payload`, `workbook_payload_has_advisor_personal_data`, Account-Delete-Aufrufer und FK-Lifecycle. Service-/Owner-Wartung bleibt möglich. Kein Scrubber wurde entfernt, weil die UI stillgelegt wurde.

Die bisherigen DB-Tests zur Account-Löschung, Advisor-Residuen und FK-Blockern bleiben erfolgreich. Historische Daten sind weiterhin vom normalen Account-Löschvertrag erfasst; „historisch behalten“ bedeutet nicht, Löschung oder Widerruf zu umgehen.

Der bestehende Account-Export (`features/account/accountExport.ts`) exportiert bereits vorher **kein vollständiges Workbook-/Workspace-Archiv**. Dieser Vertrag wurde nicht erweitert oder eingeschränkt. Er darf bei einer späteren endgültigen Archiv-/Drop-Entscheidung nicht als vollständiges Backup historischer Zusammenarbeit vorausgesetzt werden.

## 9. Navigation / Homebase

- Aktueller Report, Venture und Founder Setup bleiben primär; Commitment, RMM, FITW und Library erhalten ihre eigenständigen Jobs.
- Historische Paarreports, Workbooks und Workspace-Entwürfe stehen nur im eingeklappten Bereich „Frühere Auswertungen und Arbeitsstände“.
- Keine Workbook-Introkarte für Teams ohne Workbookbestand.
- Ein alter Workbookpfad aktiviert nicht mehr den Menüpunkt „Wie du arbeitest“.
- Keine neuen Invite-/FIND-Pfade verwenden Workbook-Creation. Phase-9.1/9.2-Handoffs bleiben bestehen.
- Keine neue Teamarchitektur, kein neues Venture-Modell, keine neue Taxonomie.

## 10. E-Mails / Marketing / Copy / Feedback

Aktuelle Marketingtexte und Founder-Einladungsmails beziehen sich auf Report und Founder Setup. Dashboard-/Discovery-/Invite-Hinweise, Navigation und relevante Advisorlabels wurden in DE/EN angepasst. Historische Kopien und Decoder-Schlüssel dürfen weiterhin „Workbook“ enthalten.

Feedback-Kontext `workbook` und die zugehörige E-Mail-Klassifikation bleiben als historische Herkunft erhalten; sie bewerben keinen neuen Editor. Bereits versandte E-Mail-Links werden über die historischen Routen weiter sinnvoll aufgelöst. Kein Rebranding und keine Änderung von RMM-/FITW-/Commitment-E-Mails.

## 11. Print

Die Workbook-Druckroute ist jetzt der gleiche read-only historische Reader mit deutlich sichtbarem historischem Hinweis. Sie kann über den vorhandenen Druckbutton als PDF ausgegeben werden. Text/HTML statt Screenshotgrafiken; keine neuen Datenkopien.

Aktuelle Report-Prints und Setup-Dokumente bleiben unverändert. Browserprüfung: historisches PDF erzeugt, erste Druckseite visuell kontrolliert; auf Mobil 390px keine horizontale Überbreite im geprüften Reader. Unbekannte historische Payloadstrukturen können weiterhin technische Schlüssel zeigen; es wird nichts umgedeutet.

## 12. Migration und Servergrenzen

Neue additive Migration: `supabase/migrations/20261117120000_retire_active_workbook_writes.sql` (seit Phase 11.6C umbenannt in `20261118150000_retire_active_workbook_writes.sql`, damit sie nach allen DB-first-Migrationen läuft).

- Entzieht `INSERT/UPDATE` für PUBLIC/anon/authenticated auf den drei alten Content-/Workspace-Tabellen.
- Entzieht öffentliches/authentifiziertes EXECUTE für `start_workspace_from_matching_session(uuid)`, `create_or_get_matching_workspace_agreement(uuid)` und `handoff_workbook_deep_dive_note_if_empty(uuid,text,text)`.
- Keine SELECT-Policy geändert; keine RLS-Lockerung; keine Tabelle, Spalte, Zeile oder Funktion gelöscht.
- Keine Änderung der Workbook-Advisor-Tabelle oder aktueller Grants/Setup-RPCs.
- Zusätzlich sperren serverseitige Action-/Data-Guards die früheren Editoraufrufe, einschließlich früherer Service-Role-Updates.

Nur lokal angewendet und im lokalen Migrationsverlauf vermerkt. Bei späterem freigegebenem Rollout App und Berechtigungssperren zusammen einplanen: ein alter Editor kann nach DB-Sperre absichtlich nicht mehr speichern.

Die zwei bisherigen DB-Tests zu internem Legacy-Handoff/Workspace-Replay führen ihren historischen Wartungsvertrag nun als Owner mit ursprünglichem JWT-Subjekt aus. Sie stellen keine öffentlichen Grants wieder her. Der neue Test prüft separat, dass authentifizierte Clients diese Funktionen nicht mehr aufrufen können.

## 13. Aktuelle produktive Routen

| Route | Rolle nach Phase 9.3 |
|---|---|
| `/me/profile`, `/me/profile/workstyle` | Aktuelles Personenprofil und Workstyle |
| `/discovery`, `/discovery/intros`, aktuelle Matching-Anbahnung | Bestehender FIND→Relationship→Team-Vertrag |
| `/connections`, `/teams/[teamId]` | Bestehende Verbindungen und Team-Homebase |
| `/teams/[teamId]/workstyle` | Primärer 2–4-Founder-Report |
| bestehende Venture-Alignment-Routen | Weiterhin getrennte vorhabensbezogene Erhebung |
| `/teams/[teamId]/setup`, `/setup/[itemKey]` unter Teamroute | Aktuelle Diskussion, Revision, Bestätigung |
| bestehendes Setup-Dokument und aktuelle Report-Prints | Aktuelle Druckausgabe |
| Commitment / RMM / FITW | Unveränderte optionale Experiences mit ihren bestehenden Paargrenzen |

## 14. Historische Routen / Klassifikation

| Route/Code | Klassifikation | Verhalten |
|---|---|---|
| `/founder-alignment/workbook?invitationId=…` | HISTORICAL_READ_ONLY | Gespeicherter vollständiger Payload unter alten Teilnehmerrechten |
| derselbe Link mit `deepDiveStep=…` | HISTORICAL_READ_ONLY | Historischer Gesamtstand; kein neuer Themeneditor |
| `/founder-alignment/workbook/print` | HISTORICAL_READ_ONLY | Historischer Druck |
| `/founder-alignment/workbook/intro` | REDIRECT_TO_CURRENT | Aktuelles zugeordnetes Setup, sonst historischer Reader/Verbindungen |
| `/founder-alignment/prepare-conversation` | REDIRECT_TO_CURRENT | Gleicher kontrollierter Intro-Handoff |
| `/workspaces/[workspaceId]` | HISTORICAL_READ_ONLY | Vorhandene sieben Draftfelder, niemals create-on-read |
| alte `/report/[sessionId]` und `/matching/[matchingSessionId]/report` | REMOVE_CURRENT_ENTRY | Historische Auswertung erhalten; nächste aktuelle Aktion Setup/aktueller Report |
| Advisor-Workbook-Token/Context | REDIRECT_TO_CURRENT | Bestehender Advisor-Invite-/Reportzugang mit bisherigen Prüfungen |
| `/debug/workbook-existing-team`, `/debug/workbook-advisor-preview`, `/debug/conversation-guide-preview` | KEEP_TEMPORARILY / DELETE_CODE_LATER | Entwicklungs-Previews; produktiv durch NODE_ENV gesperrt |
| alter Editor, Introcopy, Deep-Dive-Parser, Workspace-Actions | DELETE_CODE_LATER | Aktuell nicht eingebunden bzw. Mutationen gesperrt; Kompatibilität zuerst prüfen |

## 15. Produktionsbestands-Prüfliste – nur nach separater Freigabe

**Nicht ausgeführt.** In einer read-only Transaktion ausführen; nur aggregierte Ergebnisse dokumentieren. Keine Payloads/Notizen/Personenkennungen exportieren. Rollen/RLS der Prüfumgebung bewusst wählen: ein unter RLS leerer Count beweist keinen leeren Gesamtbestand.

```sql
begin transaction read only;
set local statement_timeout = '30s';
select 'workbooks' as store, count(*) as rows, max(updated_at) as last_activity
from public.founder_alignment_workbooks
union all
select 'workbook_advisors', count(*), max(updated_at)
from public.founder_alignment_workbook_advisors
union all
select 'matching_workspaces', count(*), max(updated_at)
from public.matching_workspaces
union all
select 'matching_workspace_agreements', count(*), max(updated_at)
from public.matching_workspace_agreements;

-- Nur Strukturhäufigkeiten, kein personenbezogener Freitext.
select key, count(*) from public.founder_alignment_workbooks w,
lateral jsonb_object_keys(w.payload) as key group by key order by key;
select status, count(*) from public.matching_workspace_agreements group by status;
select count(*) as workspaces_without_draft
from public.matching_workspaces w
left join public.matching_workspace_agreements a on a.matching_workspace_id=w.id
where a.id is null;
select count(*) as drafts_with_content
from public.matching_workspace_agreements a
where exists (select 1 from jsonb_each(a.sections) s
  where coalesce(s.value->>'notes','')<>'' or coalesce(s.value->>'agreement','')<>'');

-- Herkunftsverträge: fehlender Report bedeutet nicht löschbarer Workbookstand.
select count(*) as workbooks_without_report
from public.founder_alignment_workbooks w
where not exists (select 1 from public.report_runs r where r.invitation_id=w.invitation_id);
select count(*) as report_workbook_links
from public.report_runs r
join public.founder_alignment_workbooks w on w.invitation_id=r.invitation_id;
select count(*) as advisor_legacy_links_without_payload
from public.founder_alignment_workbook_advisors a
left join public.founder_alignment_workbooks w on w.invitation_id=a.invitation_id
where w.invitation_id is null;
select count(*) as orphan_workbooks
from public.founder_alignment_workbooks w
left join public.invitations i on i.id=w.invitation_id where i.id is null;
select count(*) as orphan_workspace_drafts
from public.matching_workspace_agreements a
left join public.matching_workspaces w on w.id=a.matching_workspace_id where w.id is null;

-- Abhängigkeiten vor jeder physischen Bereinigung erneut vollständig prüfen.
select conrelid::regclass as source, confrelid::regclass as target,
       conname, pg_get_constraintdef(oid)
from pg_constraint where contype='f' and
 (conrelid in ('public.founder_alignment_workbooks'::regclass,
              'public.founder_alignment_workbook_advisors'::regclass,
              'public.matching_workspaces'::regclass,
              'public.matching_workspace_agreements'::regclass)
  or confrelid in ('public.founder_alignment_workbooks'::regclass,
                  'public.founder_alignment_workbook_advisors'::regclass,
                  'public.matching_workspaces'::regclass,
                  'public.matching_workspace_agreements'::regclass));
select p.oid::regprocedure
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
  and (p.prosrc ilike '%founder_alignment_workbook%'
       or p.prosrc ilike '%matching_workspace%');
select tablename, policyname, cmd, roles from pg_policies
where tablename in ('founder_alignment_workbooks','founder_alignment_workbook_advisors',
                   'matching_workspaces','matching_workspace_agreements');
rollback;
```

Zusätzlich manuell prüfen: aktive/widerrufene Advisor-Legacy-Links und ihre Relationship-Grants; Tokenlinks in versendeten Mails; alte Snapshot-/Sitzungs-/Report-Projektionen; Trigger und `pg_depend`/Views; Account-Delete-/Scrub-Funktionen und Restore-Test; letzte Nutzung alter URLs ohne personenbezogene Logs; historische Aufbewahrungsentscheidung. Keine automatische Löschentscheidung aus Counts ableiten.

## 16. Deletion Roadmap

| Kategorie | Bestand |
|---|---|
| Jetzt aus aktiver Journey entfernt | Großer Editor, Drei-Themen-Zwischenstufe, Workspace-Neuanlage/Editor, aktuelle Workbook-CTAs, gleichrangige historische Agreementkarten |
| Historisch erhalten | Vier Legacy-Tabellen, Payloads/Drafts, gespeicherte URLs, Print, Advisor-Bridge/Projektion, Account-Lifecycle |
| Nach Bestands-/Abhängigkeitsprüfung löschbar | Ungebundene Editor-/Preview-Komponenten, alte Creation-/Handoff-RPCs und obsolete Copy; Tabellen erst nach ausdrücklich beschlossener historischer Ersatz-/Aufbewahrungslösung |
| Langfristig zu erhalten, solange historische Daten existieren | Lesbarkeit/Versionssemantik, Berechtigungsnachweise und Widerruf, Datenschutz-/Accountlöschung; aktuelle Founder-Setup-Historie und aktuelle Reports unabhängig davon |

Keine dieser Tabellen ist mit dieser Phase zum DROP freigegeben. Alte Zustimmung wird auch bei einer späteren Archivierung niemals zur heutigen Setup-Bestätigung.

## 17. Tests und Browserprüfung

Finale Ergebnisse:

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 2.776 / 2.776 erfolgreich |
| `npm run db:test` | 143 Suiten, 2.262 Prüfungen erfolgreich; lokales Supabase |
| `npx tsc --noEmit` (web) | erfolgreich |
| `npm run lint` | 0 Fehler, 43 bestehende Warnungen |
| `npm run build` | erfolgreich |
| Browser Desktop/Mobil | historische Reader, 2/3/4-Report, Setup-Handoff, Paarzugriff und Homebase geprüft; keine Browserfehler |
| Historischer Print | PDF erzeugt und Vorschau visuell geprüft |
| Produktionsprüfliste | SQL ausschließlich lokal validiert |
| `git diff --check` | erfolgreich |

Neue Tests betreffen verlustfreie/escaped Payloaddarstellung, keine historischen Editoren, kein create-on-read, aktuelle Handoffs, historische Linkzuordnung und DB-Schreibsperren. Vorhandene Privacy-, Advisor-, Teamgrößen-, Workstyle-/Research- und Setup-Vertragstests bleiben erhalten.

Browserfixtures ausschließlich lokal, temporäre Browserzustände/Screenshots/PDFs unter `/tmp`, keine Testartefakte im Repository. Geprüft: historisches Workbook und sieben Workspacefelder; mobile 390px und Desktop; keine Editorfelder; drittes Teammitglied bekommt auf beide Paararchive 404; Intro→Setup; aktueller Report für 2/3/4; Report→editierbare Setup-Diskussion; kein Workbooklink im aktuellen Report; keine entstandene Setup-Revision; historischer PDF-Druck. Produktive Researchdaten wurden nicht verwendet. Testkonten und Testdaten wurden entfernt, die vier lokalen Legacy-Tabellen haben wieder ihren Ausgangsbestand von 0 Zeilen. Der bestehende Immutable-Report-Schutz erforderte beim Fixture-Cleanup den vorhandenen transaktionalen `app.allow_account_cleanup`-Wartungsschalter; kein Trigger wurde geändert. Testserver und Browsersitzungen wurden beendet.

### Geänderte Dateien

- `docs/research/phase-9/phase-9.3-workbook-consolidation-implementation.md`
- `supabase/migrations/20261117120000_retire_active_workbook_writes.sql` (seit Phase 11.6C umbenannt in `20261118150000_retire_active_workbook_writes.sql`, damit sie nach allen DB-first-Migrationen läuft)
- `supabase/tests/founder_team_foundation.sql`
- `supabase/tests/workbook_deep_dive_handoff.sql`
- `supabase/tests/workbook_historical_read_only.sql`
- `web/messages/de/advisor.json`
- `web/messages/de/assessment.json`
- `web/messages/de/dashboard.json`
- `web/messages/de/discovery.json`
- `web/messages/de/invite.json`
- `web/messages/de/navigation.json`
- `web/messages/de/report.json`
- `web/messages/de/teams.json`
- `web/messages/de/workbook.json`
- `web/messages/de/workspace.json`
- `web/messages/en/advisor.json`
- `web/messages/en/assessment.json`
- `web/messages/en/dashboard.json`
- `web/messages/en/discovery.json`
- `web/messages/en/invite.json`
- `web/messages/en/navigation.json`
- `web/messages/en/report.json`
- `web/messages/en/teams.json`
- `web/messages/en/workbook.json`
- `web/messages/en/workspace.json`
- `web/src/app/(product)/founder-alignment/prepare-conversation/page.tsx`
- `web/src/app/(product)/founder-alignment/workbook/intro/page.tsx`
- `web/src/app/(product)/founder-alignment/workbook/page.tsx`
- `web/src/app/(product)/founder-alignment/workbook/print/page.tsx`
- `web/src/app/(product)/matching/[matchingSessionId]/report/page.tsx`
- `web/src/app/(product)/teams/[teamId]/page.tsx`
- `web/src/app/(product)/workspaces/[workspaceId]/page.tsx`
- `web/src/app/report/[sessionId]/page.tsx`
- `web/src/data/marketing.ts`
- `web/src/features/discovery/__tests__/matchingPageResilience.test.ts`
- `web/src/features/email/emailMessages.ts`
- `web/src/features/matchingCore/__tests__/matchingWorkspaceAgreementFeedback.test.ts`
- `web/src/features/matchingCore/matchingWorkspaceAgreementData.ts`
- `web/src/features/matchingCore/matchingWorkspaceData.ts`
- `web/src/features/navigation/ProductShell.tsx`
- `web/src/features/navigation/__tests__/alignMenuOrder.test.ts`
- `web/src/features/reporting/__tests__/advisorWorkbookRemoval.test.ts`
- `web/src/features/reporting/__tests__/alignmentDeepDiveEntry.test.ts`
- `web/src/features/reporting/__tests__/historicalWorkbook.test.ts`
- `web/src/features/reporting/founderAlignmentWorkbookActions.ts`
- `web/src/features/reporting/history/HistoricalValue.tsx`
- `web/src/features/reporting/history/HistoricalWorkbookPage.tsx`
- `web/src/features/reporting/history/legacyWrites.ts`
- `web/src/features/reporting/workbookDeepDiveHandoffActions.ts`
- `web/src/features/teams/__tests__/founderTeamHomebase.test.ts`
- `web/src/features/teams/__tests__/teamHomebaseOrder.test.ts`
- `web/src/features/teams/founderTeamHomebaseModel.ts`
- `web/src/i18n/__tests__/i18nConfig.test.ts`

## 18. Restpunkte

1. Produktionsbestand ist unbekannt. Physischer Cleanup braucht die separate Freigabe und Prüfliste aus Abschnitt 15.
2. Historische unbekannte JSON-Felder/Reaktionscodes bleiben sichtbar, teilweise mit technischen Schlüsseln. Keine neue fachliche Interpretation alter Generationen.
3. Der bestehende Account-Export ist kein vollständiges Legacy-Teamarchiv; vor physischer Archivierung gesondert entscheiden.
4. Advisor-Legacy-Reader/Bridge und Privacy-Routinen bleiben notwendig, solange historische Datensätze/Grants existieren können. Der alte Advisor-Datenreader behält seine bisherigen Report-/Scoring-Voraussetzungen; es wurde kein zusätzlicher Advisor-Archivzugriff geschaffen.
5. Alte Kompatibilitätsmodule/Previews/Schreibimplementierungen bleiben zunächst im Code, sind aber nicht als aktive Journey bzw. öffentliche Mutation nutzbar. Späterer Codeabbau getrennt vom Daten-Drop.
6. Kein Commit oder Deployment in dieser Implementierungsphase vorgenommen.

NO CONFIRMED FOUNDER SETUP DATA DELETED

NO LEGACY USER DATA SILENTLY MIGRATED

NO RESEARCH DATA EXPOSED

NO REMOTE DB PUSH PERFORMED

NO PRODUCTION DEPLOY PERFORMED
