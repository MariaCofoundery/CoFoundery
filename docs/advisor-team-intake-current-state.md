# Phase 7.5 – Advisor / Accelerator Team Intake: Ist-Zustand

Audit vom 02.10.2026, Codebasis `main` / `24ad674`. Maßgeblich waren Anwendungscode und **aktuelle lokale DB-Definitionen**, nicht die Beschreibung älterer Migrationen. Dieses Dokument beschreibt den Bestand; Vorschläge stehen in der [Produktspezifikation](advisor-team-intake-product-spec.md), Umsetzungslücken im [Gap-Plan](advisor-team-intake-gap-plan.md).

## 1. Ergebnis

Ein Advisor kann heute **sowohl einzelne Personen als auch ein Zweierteam einladen**. Für die Team-Einladung müssen weder Accounts der Founder noch ein `founder_team` vorher existieren. Daneben gibt es organisationsgebundene Personenfreigaben und gemeinsame Auswertungen für zwei bis acht Personen. Das sind unterschiedliche Zugriffs- und Datenmodelle, kein durchgängiger Accelerator-Intake.

Es fehlen strukturierte relationale Team-Context-Antworten, ein Selection-/Development-Zweck je Erhebung, ein organisationsgebundener Team-Intake für zwei/drei Founder sowie eigenständige Programm-, Batch-, Bewerbungs- und Selection-Statusobjekte. Vorhandene `team_context`-Felder bedeuten lediglich `pre_founder` oder `existing_team`; sie enthalten keine gemeinsame Vorgeschichte und keinen Selection-Modus.

## 2. Audit-Methode und Grenzen

Gelesen wurden Routes, Server Actions, Datenleser, Berichtskomponenten und Tests. Lokal wurden `pg_get_functiondef`, `pg_policies`, Tabellen-/Spaltenkatalog, Constraints, Indizes und effektive Tabellen-Grants geprüft. Insbesondere wurden später ersetzte RPCs in ihrer **jetzigen** Definition gelesen.

Die lokale DB enthielt beim Audit ein Solo-Vorhaben, keine persistenten Zwei-/Dreierteam-Fixtures. Diese Bestandszahl ist keine Aussage über Production. Es wurden keine personenbezogenen Antwortinhalte in diese Dokumente übernommen und keine Einladungen versendet. Kein Browser-End-to-End-Flow wurde in Phase 7.5 durchgespielt.

Zusätzliche Prüfung: `npx supabase test db` erfolgreich, **129 Dateien / 1.557 Prüfungen**. Das sind vorhandene Regressionstests, keine Implementierung oder Tests des vorgeschlagenen Intakes. Relevante Suiten: `advisor_person_invites`, `advisor_person_grants`, `advisor_organisations`, `advisor_org_invites`, `advisor_person_views`, `advisor_team_reviews`, `advisor_team_invite_p0_security`, `advisor_invitation_ux_reliability`, `relationship_advisor_consent_security`, `founder_team_foundation`, `founder_team_advisor_setup_access`, `align_scoped_shares` und `alignment_shares_advisor`.

## 3. Vorhandene Einladungswege

| Weg | Wer lädt wen ein? | Was entsteht? | Team nötig? | Was gibt die Annahme frei? |
| --- | --- | --- | --- | --- |
| Advisor-Personeneinladung | Angemeldete Person im eigenen Namen oder als aktives Org-Mitglied → eine E-Mail-Adresse | `advisor_person_invites`; nach Claim scopeweise `advisor_person_grants` im Zustand `requested` | Nein | Noch keine Inhaltsfreigabe; die betroffene Person entscheidet anschließend je Bereich |
| Advisor-Org-Einladung | Aktiver Org-Owner → künftiges Org-Mitglied | `advisor_org_invites`; nach Claim Mitgliedschaft `owner` oder `advisor` | Nein | Mitgliedschaft; dadurch Zugriff auf bereits dieser Organisation freigegebene Bereiche gemäß wirksamen Grants |
| Advisor-Team-Einladung | Einzelner Advisor → genau zwei unterschiedliche Founder-E-Mail-Adressen | `advisor_team_invites` mit A/B-Slots, später klassische Einladung, Beziehung, Team und Advisor-Beziehungszugang | Nein | Nach beiden Founder-Claims wird der Legacy-Beziehungszugang mit beiden Founder-Zustimmungen verknüpft |
| Founder-Co-Founder-Einladung | Founder → andere Person per E-Mail | `invitations`, `invitation_modules`, Matching-Bindings; bei Annahme Beziehung und Teamzuordnung | Nein | Teilnahme am jeweiligen Basis-/Werte-Vergleich; kein allgemeiner Advisor-Personenzugriff |
| Founder lädt Advisor hinzu | Beteiligte Founder → Advisor | `relationship_advisors`, nach Zustimmung beider und Token-Claim verknüpfter Zugang | Beziehung muss auflösbar sein | Freigegebener Legacy-Beziehungsreport; Founder Setup benötigt weitere Zustimmung |
| Gemeinsame Advisor-Auswertung | Advisor/Org → bereits begleitete Accounts | `advisor_team_reviews` plus `advisor_team_review_members` | Nein | Nach Zustimmung aller darf die konkrete Gruppe gemeinsam betrachtet werden; Einzelfreigaben bleiben zusätzlich nötig |

### 3.1 Personeneinladungen

`invitePersonAction` erzeugt einen zufälligen Token, speichert nur dessen SHA-256-Hash und ruft `create_advisor_person_invite` auf. Der Mail-Link führt nach `/invite/person-access/[token]`; ohne Sitzung folgt Login mit Rücksprung. Nach Anmeldung prüft `claim_advisor_person_invite` die eingeladene E-Mail gegen das Auth-Konto, Offenheit und Ablauf.

Der Claim erzeugt **Anfragen**, keine aktiven Grants. `/account#person-access` zeigt anfragende Person, gegebenenfalls Organisation und die angefragten Bereiche. `decide_advisor_person_access` ermöglicht zustimmen, ablehnen und widerrufen. Ein bereits aktiver Grant wird durch einen neuen Claim nicht pauschal ersetzt. Es wird weder ein Founder-Team noch eine Beziehung angelegt.

Verfügbare Scopes: `base`, `alignment_report`, `capability`, `capability_depth`, `strengths`, `direction`. `base` bedeutet hier **Profildaten**, nicht automatisch Freigabe oder Absolvieren des alten Basisfragebogens. `alignment_report` betrifft den gespeicherten Legacy-Alignment-Snapshot. Der aktuelle Founder-/Venture-Fragebogen hat einen zusätzlichen, assessmentbezogenen Freigabeweg.

Quellen: [Personen-Action](../web/src/features/advisor/personInviteActions.ts), [Freigabe-Actions](../web/src/features/advisor/personAccessActions.ts), [Scopes und Einwilligungsanzeige](../web/src/features/advisor/personAccessData.ts), [Claim-Route](../web/src/app/(product)/invite/person-access/[token]/page.tsx). Live-RPCs: `create_advisor_person_invite`, `claim_advisor_person_invite`, `decide_advisor_person_access`, `has_advisor_person_access`.

### 3.2 Organisationen und Org-Mitglieder

`advisor_orgs` enthält Namen, Beschreibung, Website, Schwerpunkte, Region, `active/suspended` sowie optionales `person_seat_limit`. `advisor_org_members` enthält `(org_id, user_id)`, Rollen `owner/advisor`, Status `active/revoked`. Der Ersteller wird Owner; Org-Mitglieder können eingeladen werden, der letzte aktive Owner kann über die Mitgliedschafts-RPC nicht entfernt werden.

Ein Personen-Grant gehört **entweder einem Advisor oder einer Organisation**, durch `advisor_person_grants_one_holder` abgesichert. Wirksamer Org-Zugriff benötigt aktiven Grant, keine Revokation, gültige Laufzeit, aktive Org und aktive Mitgliedschaft. Einzelfreigaben werden nicht auf jedes Org-Mitglied kopiert. Ein neuer aktiver Org-Advisor kann deshalb bestehende Org-Freigaben nutzen; eine fallweise Zuweisung nur an bestimmte Reviewer gibt es in diesem Modell nicht.

`person_seat_limit` ist eine Begrenzung im Einladungs-/Betreuungsmodell, kein Batch und keine Bewerbung. Eine Org kann fachlich „Programm“ genannt werden; das ist kein separates Programmobjekt mit mehreren Cohorts.

Die RPCs prüfen Authentifizierung und Org-Rollen; daraus folgt keine Plattform-Admin-Rolle oder formale Prüfung, ob ein Konto beruflich Advisor ist.

Quellen: [Org-Actions](../web/src/features/advisor/orgActions.ts), [Org-Daten](../web/src/features/advisor/orgData.ts); Live-RPCs `create_advisor_org`, `create_advisor_org_invite`, `claim_advisor_org_invite`, `set_advisor_org_membership`, `has_advisor_person_access`.

### 3.3 Bestehende Advisor-Team-Einladung im Detail

`/advisor/dashboard` enthält bereits `AdvisorTeamInviteForm`. Erfasst werden optionaler Teamname und zwei E-Mail-Adressen. Die Tabelle ist fest auf `founder_a_*` und `founder_b_*` ausgelegt; **kein C-Slot, kein `org_id`, kein Modus, kein Programmbezug**.

1. `create_advisor_team_invite_reliable` legt die Einladung mit separaten Token-Hashes an. Pro Advisor ist dasselbe offene E-Mail-Paar durch einen partiellen Unique-Index gegen parallele Duplikate geschützt.
2. Beide erhalten eigene `/team-invite/[token]`-Links. Ohne Konto/Sitzung erfolgt der bestehende Auth-Flow. Der Advisor legt keine fremden Accounts an. Vorhandene Accounts werden über die eingeladene E-Mail gebunden; falsche E-Mail ist kein gültiger Claim.
3. `claim_advisor_team_invite_founder` bindet nur den betreffenden Slot, verbraucht dessen Token, prüft Ablauf/Status und bestehende Widerrufe.
4. Bereits nach dem ersten Claim kann die serverseitige Finalisierung eine klassische `invitations`-Zeile erstellen oder wiederverwenden. Die zuerst claimende Person wird technischer Inviter. `team_context` wird **`pre_founder`**, Pflichtmodul **`base`**. Vorhandene abgegebene Basisantworten können gebunden werden; Annahme bedeutet nicht Assessment-Abschluss.
5. Nach beiden Claims wird die globale Personenbeziehung aufgelöst/angelegt, die klassische Einladung auf `accepted` gesetzt und über den DB-Trigger das Founder-Team hergestellt. Ein geeignetes einzelnes Solo-Vorhaben kann übernommen werden; es gibt im Formular keine explizite Wahl eines bestehenden Teams.
6. Der serverseitige Bootstrap verknüpft `relationship_advisors` mit beiden Approval-Flags. Er interpretiert die beiden Team-Claims als Zustimmung zu diesem Beziehungspfad; **es ist nicht der separate scopeweise Personenfreigabe-Flow**. Ein bestehender Widerruf wird dabei nicht zurückgesetzt.
7. Der Report folgt erst, wenn die bisherigen Report-Voraussetzungen erfüllt sind. Versandstatus, erneutes Senden/Tokenrotation und Widerruf offener Einladungen existieren bereits.

Die Finalisierung verwendet einen serverseitigen `service_role`-Client, mehrere reparierbare Schritte und vorhandene Prüfungen. Sie ist kein beliebig wiederverwendbares Intake-RPC für Organisationsfälle oder neue Erhebungen. Der neue Flow darf diese implizite Kopplung an `base`, paarweise Reports und Approval-Flags nicht ungeprüft übernehmen.

Quellen: [Team-Invite-Actions](../web/src/features/dashboard/advisorTeamInviteActions.ts), [Lookup/Bootstrap/Finalisierung](../web/src/features/dashboard/advisorTeamInviteData.ts), [Founder-Claim-Seite](../web/src/app/team-invite/[token]/page.tsx), [Formular](../web/src/features/dashboard/AdvisorTeamInviteForm.tsx).

### 3.4 Founder-Team-Erzeugung und dritte Person

Die normale Founder-Einladung ruft `create_founder_invitation_reliable` mit E-Mail, Kontext `pre_founder/existing_team` und Reportumfang `basis/basis_plus_values` auf. Der sichtbare Aufruf hat **keine Auswahl eines `founder_team_id`**. Bei Annahme ordnet `ensure_founder_team_after_invitation_acceptance` die Beziehung einem Team zu. `ensure_founder_team_for_relationship` kann serverintern auch ein bestimmtes passendes Team verwenden; das ist noch kein vollständiger Produktflow zum Einladen eines dritten Founders.

Zusätzlich kann `create_solo_venture` ein eigenes Solo-Vorhaben erzeugen; der Matching-Workspace hat einen Team-Erzeugungstrigger. `founder_teams` ist damit bereits der kanonische Team-/Venture-Container, nicht zwingend immer eine Gruppe von mindestens zwei Personen.

Die DB sperrt das Team beim Hinzufügen eines Mitglieds und begrenzt auf **maximal drei**. Mitgliedschaftsidentität ist unveränderlich. Der Bestand unterstützt drei Mitglieder beispielsweise bei Founder-Setup-Zustimmungen, aber die Advisor-Einladungs- und Legacy-Berichtswege sind weiterhin paarweise. „DB erlaubt drei“ bedeutet nicht „alle Intake-Wege unterstützen drei“.

Quellen: [Founder-Einladungs-Action](../web/src/app/(product)/dashboard/actions.ts), [Venture-Auflösung](../web/src/features/instruments/align/ventureResolution.ts), [Homebase-Daten](../web/src/features/teams/founderTeamHomebaseData.ts); Live-Funktionen `enforce_founder_team_member_limit`, `ensure_founder_team_after_invitation_acceptance`, `ensure_founder_team_for_relationship`.

## 4. Kanonische Objekte und ihre Grenzen

| Objekt | Tatsächliche Bedeutung / Grenze |
| --- | --- |
| `person_core` | Individuelle Kerninformationen; keine Aussage A über B |
| `founder_teams` | Team/Vorhaben mit Name und einfachem Kontext; geeigneter Container |
| `founder_team_members` | Mitgliedschaft `(team_id, user_id)`, maximal drei; noch keine versionierte Intake-Besetzung |
| `relationships` | Zwei Auth-User; global eindeutiges ungeordnetes Paar über `user_low/user_high`; optional **ein** `founder_team_id`, nach Setzen unveränderlich |
| `invitations` / Matching-Inputs | Einladungs-/Vergleichsvorgang und gebundene Assessments; keine dauerhafte Teamgeschichte |
| `advisor_team_invites` | A/B-Einladung durch einen Advisor; kein allgemeines kanonisches Team |
| `advisor_team_reviews` | Konkreter Zustimmungs-/Auswertungsvorgang für **2–8** bereits begleitete Personen; kein `team_id`, keine Formationserhebung |
| `alignment_shares` | Ein bestimmtes Assessment → einzelner Empfänger; keine Team-Context-Freigabe oder Org-Freigabe |

Eine globale Beziehung kann deshalb nicht unbesehen „A↔B in Team X und später Team Y“ abbilden. Für den vorgeschlagenen Team Context ist **Team + beteiligte Mitglieder + Richtung + Erhebungsrunde** die passendere fachliche Identität. Eine vorhandene Beziehung kann Herkunft/Navigation liefern, sollte die neue kanonische Referenz aber nicht ersetzen.

## 5. Was Advisor tatsächlich sehen

Es gibt keine allumfassende Advisor-Team-Berechtigung. Die folgenden Ebenen gelten unabhängig voneinander.

| Ansicht / Ebene | Voraussetzungen | Sichtbar | Nicht automatisch sichtbar |
| --- | --- | --- | --- |
| `/advisor/person/[userId]`: Kernprofil | Wirksamer `base`-Grant | Name, Headline, Bio, Region, Remote-Modus, Expertise, Branchen laut RPC | Sonstige owner-only Profildaten |
| Fähigkeiten / Erfahrung / Ownership | `capability`; für Tiefe und Ownership zusätzlich `capability_depth` | Bereiche; mit Depth Anwendungsniveau und Verantwortungswunsch | Rohinterview, sämtliche Erfahrungsnarrative oder private Notizen |
| Stärken / Direction | Je eigener Grant | Gespeicherte Statements, vorhandene Selbst-/Fremdrückmeldungsfelder bzw. Direction-Facetten | Herleitende Interviews und zusätzliche private Daten |
| Legacy-Alignment-Snapshot | `alignment_report` | `person_alignment_snapshots`, ältere Scores/Werteauswertung | Beliebige rohe alte Antworten oder ein neues wissenschaftliches Instrument |
| Aktuelles Arbeitsprofil / Venture Alignment | Explizite `alignment_shares` zum konkreten Assessment/Empfänger; Antwort-RLS | Freigegebene abgegebene Antworten; ausgeblendete Blöcke fehlen | Entwürfe, verborgene Blöcke, jedes andere Venture oder sämtliche Org-Mitglieder |
| `/advisor/review/[reviewId]` | Aktive gemeinsame Zustimmung und wirksame Einzelfreigaben für die jeweiligen Inhalte | Rollen-/Fähigkeitenlage und freigegebene Legacy-Selbstbilder nebeneinander | Automatische zusätzliche Personenrechte, Team Context, vollständiger Venture-/Setup-Gesamtreport |
| Beziehungspfad `/advisor/report`, Snapshot, Session | Expliziter eigener Relationship-Advisor-Zugang, beide Founder-Approvals, kein Widerruf | Bestehender Legacy-Teamreport, Advisor-Snapshot/-Impulse und gegebenenfalls historische freigegebene Workbook-Inhalte | Allgemeiner Personenzugang; neue Vertiefungen, Open Points, Commitment Lab oder Setup-Entwürfe allein durch diesen Zugang |
| Founder Setup | Zusätzlicher aktiver `confirmed_only`-Grant und Zustimmung **aller aktuellen Mitglieder** | Aktuelle bestätigte Revisionen samt Referenzen | Arbeitsnotizen, offene Vorschläge, interne Diskussionen |
| Advisor-Notiz / Follow-up | Eigene Notiz-/Wiedervorlagezeile | Private Advisor-Aufzeichnungen zu Person, Beziehung oder Review | Zugriff anderer Org-Mitglieder oder Founder allein aufgrund ihrer anderen Freigaben |

Wichtige technische Unterschiede:

- `get_advisor_person_*` sind enge `SECURITY DEFINER`-Lesefunktionen mit festem `search_path` und Scope-Prüfung. Rohdaten von `person_core` bleiben owner-only.
- Auf Review-Tabellen hat `authenticated` kein direktes SELECT/INSERT/UPDATE; der Zugriff läuft über RPCs. `request_advisor_team_review` benötigt bereits aktive `base`-Freigaben für den konkreten persönlichen/Org-Halter. Die UI verlangt zusätzlich `capability` für die Auswahl. Alle Beteiligten entscheiden; ein Nein beendet die Anfrage, ein Widerruf beendet die gemeinsame Auswertung. Die Zusammenstellung erweitert keine Einzel-Scopes.
- Der klassische Advisor-Report liest nach serverseitiger Zugriffsprüfung über `service_role` Snapshots und gegebenenfalls alte Rohantworten zur bestehenden Berechnung. Diese Rohantworten werden nicht als beliebiger Datenzugang an den Advisor ausgeliefert. Das unterscheidet sich von ausdrücklich geteilten aktuellen Assessment-Antworten.
- Founder-Setup-Leser prüfen den aktuellen Mitgliedsstand erneut. Ein drittes Mitglied pausiert einen zuvor aktiven 2/2-Zugang bis zur zusätzlichen Zustimmung. Bestätigte Revisionen, nicht laufende Entwürfe, sind sichtbar.

Quellen: [Personenleser](../web/src/features/advisor/personViewData.ts), [Review-Details](../web/src/features/advisor/teamReviewDetailData.ts), [Gruppenleser](../web/src/features/advisor/groupReadoutData.ts), [Review-Route](../web/src/app/(product)/advisor/review/[reviewId]/page.tsx), [aktueller Assessment-Leser](../web/src/features/instruments/align/advisorView.ts), [Freigabe-Actions](../web/src/features/instruments/align/shareActions.ts), [Legacy-Report-Zugriff](../web/src/features/reporting/advisorReportPageData.ts), [Relationship-Prüfung](../web/src/features/reporting/advisorTeamContext.ts), [Setup-Freigaben](../web/src/features/teams/founderSetupAdvisorAccessData.ts), [Notizleser](../web/src/features/advisor/notebookData.ts).

## 6. Bestehende Bausteine des langfristigen Teamreports

| Gewünschte Schicht | Heute vorhanden | Fehlende Verbindung |
| --- | --- | --- |
| Founder A/B, künftig C | Individuelle Profilansichten und einzelne Freigaben | Verbindlicher Intake-Roster und gleichwertige Darstellung von C |
| Wissenschaftliches Arbeitsprofil | Bestehendes Arbeitsprofil, historische Instrumente und Freigaben | Wissenschaftliche Neuentwicklung ausschließlich Phase 8; keine Validierung aus vorhandenen Ansichten ableiten |
| Fähigkeiten / Erfahrung | Capability-Bereiche, Tiefe, personelle Ownership-Wünsche, verschiedene persönliche Erfahrungs-/Profilansichten | Selektiver freigegebener Erfahrungsanteil im gemeinsamen Intake-Bericht; nicht vollständiges Dossier übernehmen |
| Rollen / Ownership | `/teams/[teamId]/roles`, CapabilityTeamReadout sowie Setup-Absprachen | Wunsch, Erfahrung und gemeinsam bestätigte Verantwortung im Bericht sauber unterscheiden |
| Motivation / Direction | Personen-Statements mit eigenem Advisor-Scope | Teambezogene Gründungsmotivation ist eine andere Information |
| Team Context | Kein strukturierter relationaler Erhebungs-/Freigabeprozess gefunden | Neu konzipieren; nicht mit dem vorhandenen Kontext-Enum verwechseln |
| Venture Alignment | Individuelle venturebezogene Assessments/Antworten, Vergleich und Freigaben | Intake-spezifisch das richtige Venture auswählen; bestehender Advisor-Leser lädt aktuell je Scope das neueste freigegebene Assessment, nicht einen explizit gewählten Intake-Teamkontext |
| Founder Setup | Teambezogene Revisionen, Bestätigung und confirmed-only Advisor-Zugang | Integration in Gesamtreport ohne Erweiterung der Rechte; Org-/Intake-Haltermodell klären |
| Gesprächspunkte | Bestehende Report-Impulse, Session-/Snapshot-Wege, private Notizen/Follow-ups und aktuelle Gesprächsansichten | Neutrale, quellengebundene Team-Context-Punkte; keine Ableitung eines Selection-Scores |

Es bestehen also Berichte und Teilansichten, aber kein einzelner freigabevollständiger „10-Schichten-Teamreport“. Bestehende Legacy-Berechnungen wurden nur auditiert; sie werden weder verändert noch als neue Selection-Methode empfohlen.

## 7. Programme, Batches und Selection

Im aktuellen öffentlichen DB-Schema und den relevanten App-Flows wurden keine eigenständigen Tabellen oder Referenzen für Programm, Batch/Cohort, Bewerbung oder Selection-Status gefunden. Die Suche umfasste Tabellen und Spalten (`program`, `programme`, `batch`, `cohort`, `application`, `selection_status`) sowie dazugehörige Code-Einstiege.

`advisor_orgs` kann eine Beratung oder ein Programm repräsentieren, hält aber Org-Zugänge. `advisor_team_reviews.status` ist der Zustand gemeinsamer Zustimmung, **kein Aufnahmeentscheid**. Das Review-Limit von acht Personen ist ebenfalls keine Cohort-Struktur. Private Wiedervorlagen sind kein Accelerator-CRM.

## 8. Konkrete Anschlussrisiken – keine Behebung in diesem Audit

1. **Begriffe:** `base`-Scope, Legacy-Base-Assessment und aktuelles Arbeitsprofil dürfen im Intake nicht als derselbe Baustein behandelt werden.
2. **Paar gegen Team:** Global eindeutige Beziehung und immutable Teamzuordnung eignen sich nicht als alleiniger Container kontextspezifischer relationaler Antworten.
3. **Drei Personen:** DB-Mitgliedschaft und einstimmige Setup-Zustimmungen unterstützen drei; Einladung, Legacy-Reports und Teile der Navigation bleiben paarweise.
4. **Halter:** Personen-Grants/Reviews können der Org gehören, Team-Invites und Relationship-/Setup-Zugänge sind personenbezogen. Das ist keine austauschbare Berechtigung.
5. **Uneinheitliche Wirksamkeitsprüfungen:** `has_advisor_person_access` prüft Ablauf und aktiven Org-Status. Die aktuelle Review-Anfrage prüft aktive Base-Grants, aber nicht deren Ablauf; `get_advisor_team_reviews` prüft Mitgliedschaft, nicht zusätzlich Org-Status. Die Profil-RPCs bleiben für Inhaltsdaten separat wirksam. Für den künftigen Intake braucht es eine einheitliche Read-Prüfung statt Vertrauen allein auf gespeicherte Statuswerte.
6. **Aktuelle Antwortfreigaben:** `alignment_share_is_effective` koppelt den Share an vorhandene persönliche Advisor-Grants, jedoch an irgendeinen aktiven persönlichen Grant, nicht an einen Team-Context-Scope oder Org-Grant. Dies ist kein zukünftiges Team-Context-Rechtemodell. Der Share-Action setzt Share und Hidden-Blocks zudem in mehreren Requests; ihr Kommentar zur Vorschau ersetzt keine atomare Freigabeoperation.
7. **Venture-Identität:** Die aktuelle Advisor-Einzelansicht wählt pro Scope das neueste freigegebene Assessment; ein späterer Teamreport muss zusätzlich das konkrete Team/Venture fixieren.
8. **Privat bleibt privat:** Vorhandene Advisor-Notizen sind persönliche Notizen des Advisors. Sie sind kein Speicher für von Foundern vertraulich eingereichte Team-Context-Antworten und keine gemeinsame Org-Akte.

Diese Punkte sind Grenzen für eine spätere Implementierung, keine Behauptung einer durchgeführten Penetrationsprüfung. Phase 7.5 verändert keine davon.
