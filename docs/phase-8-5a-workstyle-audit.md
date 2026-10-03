# MADE2FOUND Phase 8.5a – Architektur-Audit

Stand: 03.10.2026. Ausgangscommit: `c17b965`.

**Entscheidung: Stop nach dem Audit gemäß Aufgabenstellung.** Keine Migration, neue Route oder Produktänderung. Die vorhandenen Person-, Team-, Assessment- und Freigabestrukturen sind weitgehend wiederverwendbar. Die verbindliche Inhaltsgrundlage „Phase-8.4-v0.2-Pool“ einschließlich vereinbarter Core-Auswahl ist jedoch im untersuchten Repository nicht identifizierbar. Außerdem darf ein kombinierter Core-/Research-Bogen nicht ungeprüft in die bestehende assessmentweite Antwortfreigabe aufgenommen werden: Diese kennt keine Research-Klassifikation.

## Prüfgrundlage und Grenzen

- Aktueller Code, Registries, Migrationen, Server Actions, RLS, Trigger und Tests.
- Laufende **lokale** Supabase-Datenbank `supabase_db_cofoundery-app`: Systemkataloge, Constraints, Policies, Funktionsdefinitionen und Instrumentkennungen. Strukturabfragen in `BEGIN READ ONLY`; keine personenbezogenen Antwortdaten ausgelesen.
- Lokaler letzter Migrationseintrag: `20261110140000`. Das ist eine vorgefundene Migrationskennung, keine Behauptung über das heutige Datum oder den Produktionsstand.
- **Keine Prüfung der produktiven Remote-Datenbank**, kein Deployment und keine Schemaänderung.
- Alte Dokumente sind nicht alleinige Wahrheit: `docs/invite_relationship_audit.md` beschreibt noch fehlende Tabellen, die inzwischen existieren. Auch der ältere Team-Intake-Audit muss zusammen mit der inzwischen implementierten Phase 7.5b gelesen werden.

## A. Wiederverwendbare Tabellen und Modelle

| Schicht | Bestand | Entscheidung |
| --- | --- | --- |
| Person | `auth.users.id`, `person_core.user_id`, `profiles.user_id` | Dieselbe User-ID als kanonische Personenreferenz verwenden. `profiles.id` ist keine alternative Personenidentität. |
| Profilprojektionen | `profiles`, `network_profiles`, `founder_discovery_profiles` | Keine zweite Founder-Person anlegen; vorhandene Kern-/Projektionssynchronisierung erhalten. |
| Team/Venture | `founder_teams`, `founder_team_members(team_id,user_id)` | Kanonischer Vorhabencontainer und n:m-Mitgliedschaft bleiben bestehen. |
| Paar/Einladung | `relationships`, `invitations`, `invitation_modules`, Matching-Session-Strukturen | Bestehende Annahme-, Token-, Versand- und Relationship-Flows erhalten. |
| Instrument/Erhebung | `instruments`, `instrument_transitions`, `assessments` | Instrument-ID, Person, Abgabe, Erstellungszeit und optionales Venture wiederverwenden. |
| Antworten | `alignment_answers`; ältere `assessment_answers` | Aktuelles typisiertes Antwortmodell als Ausgangspunkt prüfen; keine dritte vollständige Profilablage. |
| Messung | `alignment_item_views`, `research_events`, `product_analytics_events` | Vorhandene Zeit-/Eventkonzepte berücksichtigen; Produktmessung ist keine Research-Einwilligung. |
| Forschungseinwilligung | `research_consent_preferences`, `set_my_research_consent` | Bestehende Einwilligungsverwaltung und Widerruf erweitern. |
| Reports | `report_runs`, `matching_report_runs`, `person_alignment_snapshots`, aktuelle ALIGN-Vergleichsleser | Bestehende Snapshots erhalten; neue Datenvorbereitung daneben im bestehenden Instrumentbereich, kein Ersatzreport. |
| Founder Setup | `founder_team_setup_items`, Revisionen, Bestätigungen, Diskussionen | Gemeinsame Vereinbarungen bleiben eigenständig, kein diagnostischer Antwortspeicher. |
| Advisor/Sharing | `relationship_advisors`, `advisor_person_grants`, `alignment_shares`, `alignment_share_hidden_blocks`, Setup-Grants/-Consents | Je Inhalt den bestehenden expliziten Freigabetyp nutzen, keine Universalberechtigung. |
| Team Intake | `team_intake_rounds`, Participants, Reviewers, gemeinsame/paarweise Antworten, separate private Hinweise | Vorhandenen Teamkontext nur bei wirksamem Intake-Zugriff ergänzen. |
| Admin | `platform_admins`, `is_platform_admin()`, `requirePlatformAdmin()` | Bestehende Plattform-Adminprüfung verwenden; Profilrollen reichen nicht. |

Quellen: [Teammodell](../supabase/migrations/20260823210000_create_founder_team_foundation.sql), [Person Core](../supabase/migrations/20260907120000_create_person_core_v01.sql), [Kern als Quelle](../supabase/migrations/20261092120000_person_core_is_the_source.sql), [Instrumentversionen](../supabase/migrations/20261053120000_instrument_versions.sql), [Antwortmodell](../supabase/migrations/20261054120000_alignment_answers_v2.sql), [Team Intake](../supabase/migrations/20261104120000_team_context_intake.sql).

## B. Vorhandene Routen

| Zweck | Routen |
| --- | --- |
| Person/Founder | `/dashboard`, `/profile`, `/me/profile`, `/me/report` |
| Arbeitsprofil | `/founder-alignment/profil`, `/founder-alignment/profil/antworten` |
| Venture Alignment | `/founder-alignment/vorhaben`, `/founder-alignment/vorhaben/antworten`, `/founder-alignment/vorhaben/bestaetigen` |
| Vergleich/Archiv | `/founder-alignment/vergleich/[partnerId]`, `/founder-alignment/versionen`; ältere Pilot-/Workbook-Routen bestehen ebenfalls |
| Founder-Einladung | `/invite/new`, `/invite/[sessionId]`, Unterrouten für Resume/Abschluss; API für bestehendes Profil und Report-Run |
| Team/Setup | `/teams/[teamId]`, `/teams/[teamId]/roles`, `/teams/[teamId]/setup`, Setup-Dokument und Einzelpunkte |
| Bestehende Reports | `/report/[sessionId]`, `/report/[sessionId]/individual`, `/matching/[matchingSessionId]/report` |
| Advisor | `/advisor/dashboard`, `/advisor/person/[userId]`, `/advisor/report`, `/advisor/review/[reviewId]`, `/advisor/snapshot`, `/advisor/session` |
| Advisor-/Intake-Invites | `/team-invite/[token]`, `/advisor/invite/[token]`, `/invite/person-access/[token]`, `/invite/advisor-org/[token]` |
| Team Intake | `/advisor/intake/new`, `/team-intake`, `/team-intake/invite/[token]`, `/team-intake/[roundId]` |
| Forschung/Administration | `/api/research/track`, Research-Einstellungen unter `/account`, `/admin/moderation`, `/admin/problem-radar` |

Eine Route `/admin/research/workstyle-pretest` oder ein A/B/C-Pretest-Flow wurde nicht gefunden. Keine dieser Routen wurde geändert.

## C–D. Founder A ↔ B, Ventures und mehr als zwei Mitglieder

`relationships` ist weiterhin ein Zweiermodell mit `user_a_id`, `user_b_id` und global eindeutigem ungeordnetem Paar `user_low/user_high`. Die optionale Zuordnung `founder_team_id` ist nach dem Setzen unveränderlich. Dieselben Personen lassen sich deshalb nicht durch zwei Relationships für zwei unterschiedliche Ventures darstellen.

Darüber liegt bereits das generalisierbare Modell `founder_teams → founder_team_members`. Personen können mehreren Teams angehören. Der lokale Trigger `enforce_founder_team_member_limit` sperrt die Teamzeile und begrenzt aktuell auf **drei** Mitglieder. Das ist n:m, aber noch keine unbeschränkte 3+-Unterstützung. Größere Teams erfordern später eine bewusste Erweiterung von Limits und betroffenen Zustimmungs-/Intake-Flows.

Die Founder-Einladung nutzt `create_founder_invitation_reliable`; nach Annahme ordnet `ensure_founder_team_after_invitation_acceptance` die Paarbeziehung einem Team zu. `ensure_founder_team_for_relationship` kann intern ein explizites Team verwenden. Daraus folgt noch kein vollständiger UI-Einladungsflow für beliebig viele Mitglieder. Solo-Ventures bestehen ebenfalls. **Kein neues A/B-Team-Schema anlegen und die globale Paar-Eindeutigkeit nicht für 8.5a umbauen.**

Für zukünftige Datenzugriffe ist die kanonische Kontextreferenz `founder_team_id` bzw. `assessments.venture_id`, ergänzt um die tatsächlich ausgewählten Mitglieder und konkreten Assessment-IDs. Eine Relationship kann Herkunft/Navigation liefern, ist aber nicht alleinige Venture-Identität.

## E. Advisor Access und Consent

Die Berechtigungen sind absichtlich getrennt:

- Legacy-Teamreport: `relationship_advisors`, eigener Advisor-Zugang, beide Founder-Zustimmungen, kein Widerruf; bestehende Serverchecks bleiben erforderlich.
- Individuelle Profilbereiche: `advisor_person_grants` und eng begrenzte Leser je Scope, gegebenenfalls mit Organisationshalter.
- Aktuelle ALIGN-Antworten: explizite `alignment_shares` pro Assessment und Empfänger, mit `alignment_share_hidden_blocks`. Die Antwort-RLS prüft Share-Wirksamkeit und ausgeblendete Blöcke.
- Founder Setup: zusätzlicher aktiver `confirmed_only`-Zugang und Zustimmung aller aktuellen Mitglieder; keine allgemeinen Entwurfsrechte.
- Team Intake: explizite Reviewer, bestätigte Besetzung und Veröffentlichung nach den bestehenden Regeln; private Hinweise werden getrennt gelesen.

**Anschlussrisiko:** Die lokal ausgelesene `alignment_share_is_effective` prüft einen nicht widerrufenen Share und bei vorhandenen persönlichen Advisor-Grants mindestens einen aktiven Grant. Sie enthält keinen Workstyle-/Research-Scope und keine `research_only`-Prüfung. Die Research-Erweiterung einfach in ein freigegebenes Assessment zu schreiben würde daher keine verlässliche Datenschutzgrenze schaffen. Auch die mehreren Requests in `shareScope` sind keine atomare Freigabe samt Hidden-Blocks. Dieser Audit verändert diese bestehenden Flows nicht.

Der aktuelle Advisor-Leser wählt je Instrument das neueste sichtbare abgegebene Assessment. Ein Teamreport benötigt stattdessen explizite Bindung an dasselbe Venture und konkrete Versionen. URL, Personen-ID, Researchteilnahme oder Organisationszugehörigkeit sind dafür keine Freigabe.

Quellen: [Share-Action](../web/src/features/instruments/align/shareActions.ts), [Advisor-Leser](../web/src/features/instruments/align/advisorView.ts), [Intake-Implementierung](advisor-team-intake-phase-7-5b-implementation.md), [Adminprüfung](../web/src/features/moderation/access.ts).

## F. Aktuelle Antworten, Versionierung und Research

`assessments` speichert `user_id`, `module`, `instrument_id`, `venture_id`, `created_at`, `submitted_at` und `answers_confirmed_at`. `founder-profile-v1` gehört zur Person ohne Venture; `venture-alignment-v1` nutzt `venture_id → founder_teams.id`. Ein Index verhindert mehrere offene Entwürfe derselben Person/Modul/Instrument/Venture-Kombination.

`alignment_answers` enthält `(assessment_id, block_id)`, Antwortformat, JSON-Wert **oder** `missing_code`, Antwortzeitpunkt, Sprache und Gesprächsmarkierungen. `cannot_assess` existiert bereits separat; `num_nonnulls(value, missing_code)=1` verhindert gleichzeitigen Wert und Missing-Grund. Abgegebene Antwortinhalte werden durch einen Update-Trigger geschützt; Gesprächsmarkierungen bleiben bearbeitbar. Das ist keine vollständige Itemversionsarchitektur.

Die Fragen liegen in Code-/JSON-Registries. Die lokale DB enthält fünf Instrumente: `founder-compatibility-v1`, `founder-alignment-v2`, `founder-alignment-v2-1`, `founder-profile-v1`, `venture-alignment-v1`. **Keine persistierte Itemversion, kein unveränderliches Itemmanifest und keine A/B/C-Zuweisung** in den untersuchten Assessment-/Antwortstrukturen. Das bestehende `instrument_id` ist wiederverwendbare Grundlage, ersetzt aber nicht die geforderte Bindung jeder Antwort an eine konkrete Itemversion.

Die aktuelle Founder-Registry hat **16 Items in fünf Bereichen**, die Venture-Registry 43 Items. Zusätzlich existieren vier `candidate_for_pretest`-Verhaltensitems. Diese Quellen sind nicht nachweislich der verlangte neue Phase-8.4-v0.2-Pool mit sechs Entwicklungsbereichen einschließlich Arbeitsorganisation/Selbststeuerung. Die gemeinsame Core-Auswahl und drei Erweiterungen lassen sich daraus nicht autorisiert rekonstruieren.

`alignment_item_views` enthält erstes Anzeigen, Antworten und Revisionen. Das misst Zeitdifferenzen, nicht zuverlässig aktive Bearbeitungsdauer. Research-Events besitzen bereits Instrument-/Consent-Versionsfelder und pseudonymisierte Bezüge. Sie sind jedoch kein vollständiger versionsgebundener Antwortspeicher.

`research_consent_preferences` hält Zustand, pseudonyme Research-Identität sowie Annahme-/Ablehnungs-/Widerrufszeit. Eine belegte instrumentbezogene Einwilligung mit `consent_version` fehlt dort. Der vorhandene Widerruf löscht zuordenbare `research_events` für `research_consent_v1`, nicht beliebige zukünftige Forschungsantworten. Die bestehenden Tests deklarieren `alignment_answers` ausdrücklich als Produktdaten. Allgemeines Research-Opt-in darf daher nicht stillschweigend als Teilnahme am neuen Pretest übernommen werden.

Quellen: [Registries](../web/src/features/instruments/align/registries.ts), [Antwort-Action](../web/src/features/instruments/align/answerActions.ts), [Vergleichsleser](../web/src/features/instruments/align/comparisonData.ts), [Consent-Migration](../supabase/migrations/20260830160000_separate_product_analytics_and_research_consent.sql), [Widerrufsvertrag](../web/src/features/research/__tests__/withdrawalCoversResearchData.test.ts), [bestehende Pretest-Auswertung](pretest-auswertung.md).

## G–H. Ergänzungen und Datenmodell-Entscheidung

**Keine neue Person-, Venture-, Team-, Invite- oder allgemeine Reportarchitektur erforderlich.** Auch ein zweiter generischer Assessment-/Response-Stack wäre eine Doppelstruktur.

Nach Klärung der Inhaltsquelle ist folgende additive Richtung zu konkretisieren; sie ist hier **nicht implementiert**:

1. Vorhandene `instruments`/`assessments` für den portablen Workstyle Core nutzen. Unveränderliche Instrumentmanifeste und Itemversionen ergänzen: stabiler Key, Version, Wortlaut, Format, Konstrukt, Facette, Herkunft und Nutzungsstatus. Alte Antworten nicht rückwirkend mit aktuellen Texten interpretieren.
2. Eine eindeutig an Assessment und Instrumentversion gebundene Pretest-Teilnahme abbilden, mit einmaliger serverseitiger Formzuweisung, Kontext, Zeitpunkten und versioniertem Consent-Beleg. Bestehende Consent-Verwaltung samt Widerruf erweitern. A/B/C transaktional gegen parallele Starts absichern und gespeicherte Zuweisung bei Resume zurückgeben; kein Zufall im Browser.
3. Core und Research-Erweiterung über ein gemeinsames versioniertes Manifest verbinden. Forschungsantworten gegen produktive Share-Leser abschirmen. Eine kleine getrennte Ablage für ausschließlich Research-Erweiterung/Feedback kann sicherer sein als eine Änderung aller produktiven Antwortfreigaben; sie wäre eine Ergänzung zur bestehenden Erhebung, keine zweite Personen-/Profilarchitektur. Diese Entscheidung erst mit dem konkreten Manifest und vollständigem Zugriffs-/Widerrufsvertrag festlegen.
4. Produktiv gespeicherter Core und Research-Nutzungsrecht getrennt behandeln: Widerruf der Forschung darf weder produktive Freigaben erweitern noch ungeplant das portable Produktprofil löschen. Keine Exporte ohne wirksamen instrumentbezogenen Research-Consent.
5. Adminansicht und Export unter `platform_admins` absichern, zusätzlich in RPC/Serverzugriffen. Pseudonyme Sessions, Versionen, Missing-Gründe und Completion exportieren; keine direkten User-IDs. Freitextfeedback kann selbst identifizierend sein und darf nicht als automatisch anonym bezeichnet werden.
6. Datenvorbereitung beim bestehenden ALIGN-/Reporting-Bereich ergänzen: exakt zwei berechtigte aktuelle Mitglieder, dasselbe Team/Venture, konkrete abgegebene Workstyle-/Venture-Assessment-IDs, identische Core-Itemversionen, expliziter Access-Status. `research_only` per Positivliste ausschließen. Bei fehlender Freigabe, unvollständigen Daten oder unterschiedlichen Versionen einen definierten Nicht-bereit-Status liefern. Keine stillschweigende Auswahl irgendeines neuesten Ventures und kein paarweiser Bericht für ein unvollständiges Dreierteam.

Dashboard, Kennzahlen, Feedback, Export, Resume, A/B/C-Seed und neue Vergleichsfunktion bleiben bis zur Auflösung der Stop-Bedingung offen. Keine automatische Itembewertung, Typologie, Fit-Zahl oder Erfolgsprognose ist vorgesehen.

## I. Bestandsschutz

Unverändert bleiben CONNECT, FIND, öffentliche Sichtbarkeiten, Problem Radar, private Workspaces, Capability-Daten, Branding, Avatarlogik, Person-Core-Synchronisierung und unabhängige Advisor-Funktionen. Ebenso bleiben historische Reportpayloads, instrumentgebundene Legacy-Leser, bestehende Einladungen, Setup-Bestätigungen und Intake-Freigaben bestehen. Keine Migration historischer Antworten auf erfundene neue Versionen.

## Verifikation und Änderungsumfang

Prüfung des unveränderten Ausgangszustands:

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 2.723 Tests bestanden, keine fehlgeschlagen/übersprungen |
| `web/node_modules/.bin/tsc --noEmit` im Web-Verzeichnis | bestanden |
| `npm run lint` | bestanden, **42 bestehende Warnungen**, keine Fehler |
| `npm run db:test` gegen lokale Supabase-DB | 136 Dateien, 2.202 Tests bestanden |

Die DB-Suite enthält unter anderem Person Core, Founder-Team, Invite-Autorisierung, ALIGN, Research-Consent, Advisor-Grants, Relationship-Consent und Team Intake. Das belegt den getesteten Bestand, **nicht** die noch nicht implementierten 8.5a-Acceptance-Criteria. Kein Browser-End-to-End-Test und kein Produktionsbuild in diesem reinen Audit.

Geänderte Datei: ausschließlich `docs/phase-8-5a-workstyle-audit.md`. Neue Tabellen/Migrationen/Routen: keine. Kein produktiver Code geändert.

## Für die Fortsetzung erforderlich

Benötigt wird die verbindliche Quelle des **Phase-8.4-v0.2-Workstyle-Pools** samt bereits vereinbarter Core-Auswahl bzw. der Kennzeichnung, welche Items dafür freigegeben sind. Die gefundenen alten Arbeitsprofil-/Verhaltensitem-Dateien werden nicht als Ersatz ausgegeben. Auf dieser Grundlage kann die additive Speicherung samt Research-Abgrenzung konkret entschieden und implementiert werden, ohne drei getrennte Systeme zu schaffen.
