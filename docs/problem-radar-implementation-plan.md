# Problem Radar – Umsetzungsplan, Phase 7.8a

**Nur Planung.** Es wurden weder Migrationen noch Tabellen, Routen, Cron-Einträge, externe Requests oder AI-Calls erzeugt. Basis: [Code-/DB-Audit](problem-radar-current-state.md), verbindlich vorgeschlagener Produktvertrag: [Produktspezifikation](problem-radar-product-spec.md).

## Empfehlung für 7.8b

Ein kleiner **manueller Admin-Pilot**: Quellenregister + private Problemsignale + Review + manuelle URL-Erfassung. Kein serverseitiges URL-Laden, keine Modellhilfe, keine Nutzerbenachrichtigung. Eigene Kurzfassung durch den Reviewer, Excerpt zunächst ausgeschaltet. So lassen sich tatsächlicher Informationswert, Datenminimierung und Löschung prüfen, bevor externe Abrufe vervielfacht werden.

Hypothesen/Evidence und Workspace-Handoff anschließend gezielt ergänzen. Collector erst nach stabilen Inhalts-/Review-/Löschverträgen, Wochenlauf erst nach sicherem manuellem Collector-Start. Ein LLM ist für keine dieser Stufen Voraussetzung.

## 1. Stufen und Abhängigkeiten

Die R-Labels benennen Bausteine, nicht ihre Ausführungsreihenfolge. **Empfohlene Reihenfolge: R0 → R3 → R1 → R4 → R5 → R2 → R7; R6 bleibt optional.** Signal-/Review-Sicherheit muss vor dem ersten Import existieren. Ein kleiner RSS/API-Pilot kann nach R4 parallel zur noch nicht freigegebenen Workspace-Übergabe vorbereitet werden; ohne erfüllte Release-Gates keine Aktivierung.

| Stufe | Scope / Ergebnis | Existiert / erweitern / neu | Künftige Migration / RLS | UI-Aufwand | Abhängigkeit / Hauptrisiko |
| --- | --- | --- | --- | --- | --- |
| R0 Quellenregister + Admin | Geprüfte Quellen und zulässige Methoden, pausiert als Default; keine Fetch-Funktion | Rolle/Guard vorhanden; neuer Source-Datensatz und Adminbereich | Ja: `radar_sources`, enge Admin-RPCs, RLS, Client-Tabellenrechte explizit entziehen | Klein–mittel | Konkrete Policy-/Quellenfreigabe; „öffentlich“ nicht als pauschale Erlaubnis behandeln |
| R3 Signale + Review | Minimale Felder, new/reviewed/relevant/discarded, Sensibilität, Sperre, Revision, Löschung | Neu; Moderationsmuster wiederverwenden, nicht `network_reports` | Ja: `radar_signals` + kleine Review-Ereignisse; jede Read/Write-RPC prüft `is_platform_admin()` | Mittel | R0; PII/Originaltext in Metadaten/Logs und Nebenwirkungen paralleler Reviews |
| R1 Manueller URL-Import | Zulässige Registerquelle wählen, URL und eigene Kurzfassung eingeben; Vorschau, keine Netzaktivität | Neuer kleiner Form-/Validierungsweg | Bereits R0/R3; gegebenenfalls nur enge Create-RPC, keine Collector-Rechte | Klein–mittel | R0/R3; heimliche OpenGraph-/Favicon-Abfragen vermeiden, sichere Darstellungslinks |
| R4 Hypothesen + Evidence | Manuelle Hypothese, n:m-Signalbezüge, sichtbare Abdeckung/Widersprüche, Versionsreview | Neu; keine Score-/Matching-Übernahme | Ja: `radar_hypotheses`, `radar_hypothesis_signals`; atomare Zuordnung aktuell relevanter/zulässiger Revisionen | Mittel | R3/R1; Dubletten nicht als unabhängige Evidenz zählen |
| R5 Workspace-Übergabe | Vorschau, explizite Auswahl, eigener neuer privater Workspace, Herkunft, Takedown-Vertrag | Bestehende Create-/Entry-RPCs nutzen; enger atomarer Übergang neu | Ja: Handoff-/Signalrevision-/Entry-Herkunftsbezüge; bestehende Workspace-Rechte bleiben; gezielt eingeschränkte Sperr-/Redaktionsoperationen | Mittel | R4; keine Admin-Override-Rechte, keine Veröffentlichung, keine nicht widerrufbaren Schattenkopien |
| R2 RSS/API-Collector | Zunächst manuell gestartete, begrenzte Source-Slices mit abgesichertem Egress, Dedupe und Fehlerstatus | Neu; Timeout-/Claim-Prinzipien vorhanden, kein fertiger sicherer Fetcher | Ja: Source-Runs/Claims, Maschinenrechte, Unique-Keys/Lease-Fencing; kein Profil-/AI-Job-Recycling | Mittel–groß | R0/R3, freigegebene konkrete Quelle und technische Limits; SSRF, Parser, Rate Limits, Speicherung |
| R7 Weekly Automation | Authentifizierter Wochen-Trigger, fällige Sources, Deadline, Resume, Betriebspanel | Cron-/Secret-Muster vorhanden, Radar-Endpunkt/Schedule neu | Source-/Run-Infrastruktur aus R2; ggf. geplanter Wochenlauf-Key/RPC-Erweiterung | Klein–mittel | R2 nach manuellem Pilot; reale Vercel-Limits, keine Exactly-once-Annahme oder unbemerkte Retry-Schleife |
| R6 Semantische Clusterhilfe | Optional Embeddings oder LLM-Vorschläge mit Review/Evaluation, getrennt abschaltbar | Modellhelper als Transportmuster; neue auf Radar begrenzte Vorschlagsdaten/Jobs | Ja falls persistiert; eigener Bereich ohne Personen-FK, Lösch-/Revisionspropagation | Mittel–groß | R4 + datensparsamer Evaluationssatz; Bias, Prompt Injection, Anbieter-/Retention-Freigabe |

Keine Phase-8-Abhängigkeit: keine Assessment-Items, Dimensionen, Scores, Arbeitsprofile oder psychometrische Interpretation verwenden. Keine Erweiterung von FIND, Advisor-Team-Intake oder Recommendation-Engines.

## 2. Daten- und Berechtigungsvertrag vor R0/R3

Noch keine DDL. Vorgeschlagene Tabellen folgen dem eigenständigen Präfix `radar_`; sie sind weder CONNECT-Inhalte noch Personen-/Moderationsreports:

- Quellenregister → viele minimierte Signale.
- Hypothese ↔ Signalrevisionen über explizite Zuordnung.
- Kleines Review-Ereignis → Actor, Aktion, Revision, Zeit, neutraler Grund; kein allgemeines Audit-Volltextarchiv.
- Run → Source-Slices mit begrenzten Status-/Fehlerdaten, erst ab R2.
- Handoff → geprüfte Hypothesenrevision, selektierte Signalrevisionen, Workspace-/Entry-Referenzen, erst ab R5.

Alle internen Read-Projektionen müssen Sensibilität, Quellensperre und aktuelle Reviewfassung beachten. DB-Constraints schützen Status, Textlängen und Referenzkonsistenz; kein frei gesetzter Reviewer-/Actor-User-Identifier. Server setzt `auth.uid()`, Zeit und Revision. RLS aktiv, direkte Tabellenrechte für anon/authenticated/PUBLIC explizit entziehen; `SECURITY DEFINER` mit leerem `search_path`, qualifizierten Referenzen und eingegrenzten Grants.

Adminzugang über vorhandene `platform_admins`, nicht über E-Mail, Profilrolle oder Organisation. Entzug gilt beim nächsten Read/Write ohne neues JWT. Kein Adminzugriff auf Nutzer-Workspaces allein aufgrund der Rolle. Keine Möglichkeit, beliebige fremde IDs für Profil-/Conversation-/Workspace-Reads durch Radar-RPCs zu schleusen.

Für den manuellen Pilot reichen Session-Client und Admin-RPCs. **Kein Service-Role-Client in der Radar-UI oder ihren Actions.** Technische Source-Collection ist eine andere Berechtigung als menschlicher Review.

## 3. Maschinenrechte und Betrieb für R2/R7

Der bestehende Cron-Service-Role-Key ist technisch breit privilegiert. Eine enge RPC-Schnittstelle macht diesen Schlüssel nicht nachträglich zu einem DB-seitig beschränkten Collector. Der vorhandene AI-Worker hat wiederum ein anderes, nutzergebundenes Datenmodell und keinen passenden Lease-/Retry-Vertrag.

Empfehlung für automatisierte Sammlung: **separate zweckgebundene technische DB-Rolle** für Radar, ausschließlich Execute auf Claim/Source-Konfiguration/Signal-Ingest/Complete/Fail, keine direkten Tabellenrechte und keine Review-, Publish-, Workspace-, Opportunity- oder Venture-Grants. Als konkreter späterer Betriebspfad bietet sich ein eigener technischer DB-Login mit dieser Rolle über TLS/Pool an; Zugang ausschließlich als Server-Secret. Keine gewöhnliche Person/Founder-Identität dafür hochstufen, keine erneute allgemeine Rollenplattform bauen.

Vor R2 muss die tatsächlich verfügbare sichere Verbindungs-/Poolinglösung für den Deploy verifiziert und der Maschinenvertrag im Test bewiesen werden. Wenn sie nicht verfügbar ist, R2 zurückstellen oder den breiteren Service-Role-Trust ausdrücklich neu bewerten; kein unbemerkter Service-Role-Fallback. Menschliche Freigaben bleiben Auth-Session-RPCs. Ein Modell erhält grundsätzlich keine dieser Credentials.

Die Cron-Route übernimmt nur Authentifizierung und ein begrenztes Triggern/Drain der Radar-Slices. Bereits vorhandenes `CRON_SECRET`-Muster kann genutzt werden; für Maschinen-DB/API-Zugänge wären später zweckgebundene Secrets nötig. **7.8a benötigt und setzt keine Env-Variablen.** Keine Provider-Schlüssel, konkrete Quellenendpunkte oder Tokens in Beispielen/Repository.

R2 ist ohne R6 nutzbar: Collector legt ungeprüfte Kandidaten mit minimalen zulässigen Metadaten an; fehlende eigene Kurzfassung/Beobachtung vervollständigt der Reviewer. Nur das explizite Relevanz-Gate verlangt vollständige geprüfte Kontextfelder. Kein Kopieren von RSS-Volltext in ein Zusammenfassungsfeld, um ein Pflichtfeld zu füllen.

Vor Aktivierung schriftlich festhalten:

1. Tatsächlicher Vercel-Tarif, Funktionsruntime/Region, erlaubte Cron-Frequenz, Laufzeit, Concurrency und Egress-/DB-Pool-Grenzen. Keine alten Skill-/Codekommentare als aktuelle Tarifgarantie.
2. Deadline mit Reserve unter dem echten Function-Limit, Default- und Source-spezifische Request-/Byte-/Item-Budgets.
3. Wochenfenster in UTC, Retry-Politik: fällige Retries im nächsten Wochenlauf oder manuell; keine versprochene stündliche Reparatur ohne bewusst ergänzten Drainer.
4. Atomarer Claim mit Lease-Token, maximale Versuche und terminaler Zustand auch nach Worker-Absturz; Dedupe/Cursor-Commit ohne automatische Reaktivierung verworfener Funde.
5. Globaler Pause-Schalter und Source-Pause; bei geänderten Rechten/robots/ToS kein weiterer Abruf bis Review. In-flight Results vor Commit nochmals gegen Source-Version/Sperre prüfen.
6. Aggregierte, inhaltsfreie Statusausgabe; kein Radar-Versand an Nutzer und kein Anschluss an Suggestions-/Push-/Mail-Routine.

## 4. Kleine Release-Gates statt automatischer Freigaben

### Vor erstem manuellen Signal

Freigegebene konkrete Pilotquellen, benannte verantwortliche Reviewer, gewählte Retention, Excerpt-Politik und Verfahren für Sensibilität/Takedown. Alle Datenfelder begrenzt; keine URL-Vorschau-/Metadatenfetches. Quelle und Signal lassen sich sperren/löschen; verworfene Dubletten kehren nicht als „neu“ wieder.

### Vor erster Hypothese

Evidence-Zählregeln und bekannte Unabhängigkeitsgrenzen verständlich. Hypothese ist eigene Arbeitsannahme, nicht maschinell behauptete Tatsache. Quellen-/Signaländerung invalidiert die Freigabe der betroffenen Revision. Unbekannte Sprache/Zeit/Region bleibt unbekannt.

### Vor erster Workspace-Übergabe

Explizite Vorschau und Session-Owner, aktives CONNECT-Recht, atomarer/gegen Doppelklick geschützter Handoff. Kein Einladen/Profilanlegen für externe Autoren. Kontrollierte Herkunftsbezüge vorhanden. Tests beweisen, dass Source-Sperre/Takedown neue Übergaben stoppt und gekennzeichnete Importbestandteile gezielt entzogen werden können, ohne beliebige private Inhalte an Admins auszuliefern.

Die unabhängige spätere Formulierung eines Owners und schon publizierte Fassungen sind keine live synchronisierten Radarobjekte. Bei beanstandeten Übernahmen muss die Herkunft eine Prüfung ermöglichen; keine Zusage, dass ein Source-Delete alle eigenständig verfassten Texte oder externen Exporte vollständig entfernt. Der normale Publish-Flow bleibt der einzige Weg zum Problemboard. Ein Takedown-Vertrag darf dessen bewusste Freigabe ergänzen, aber keinen Radar-Publish-Bypass schaffen.

### Vor erstem automatisierten Abruf

Konkrete Abrufart ausdrücklich zugelassen; SSRF-/DNS-/Redirect-/Parser-/Dekompressionsschutz unter echten Laufzeitbedingungen verifiziert. Keine privaten API-Scopes oder Anmeldung im Forum. Begrenzte Retry-/Cursor-Tests, kein Collector im Public-HTTP-Request von normalen Nutzern. Quellen mit erforderlicher HTML-Ausführung/Scraping bleiben außerhalb des RSS/API-MVP; `approved_http` ist kein pauschal aktivierter Adapter.

### Vor Wochenlauf und vor Modellhilfe

Wochenlauf erst nach mindestens einem beaufsichtigten Source-Slice einschließlich Fehlersimulation/Abbruch/Resume. Modellhilfe erst nach separat freigegebenem minimiertem Input, Anbieter-/Hosting-/Retention-Entscheidung und DE/EN-Evaluation. Collector und Modell dürfen weiterhin keine Reviewentscheidung oder Nutzeraktion ausführen.

## 5. Testplan der späteren Umsetzung

| Bereich | Erforderliche echte Prüfungen |
| --- | --- |
| Admin/RLS | Admin liest/reviewt; normal/anon/entzogener Admin nicht; keine direkten Tabellenrechte; manipulierte IDs/Actor/Revision; Adminstatus verleiht keine privaten Workspace-Reads |
| Quellen | pending/paused/withdrawn/veraltete Freigabe sperrt; Endpoint-/Methodenänderung invalidiert; nur registrierter Scope; API-Ausfall hat keinen HTML-Fallback |
| Manuell | Daten speichern ohne **jeden** serverseitigen Netzrequest, auch ohne Favicon/OpenGraph; Textgrenzen/Sprachen; URL-Zugangsdaten/Token/Personenbezug; entfernter Source während Save |
| Signal | neue/verworfene/sensible Revision nicht als Evidence; Tags/Kurzfassung ändern erfordert Review; Race zwischen Freigabe und Source-Takedown; inhaltsfreie Fehler/Logs |
| Dedup | URL-Tracking vs inhaltsrelevante Parameter; separate Items einer Sammelseite; Wiederholung erzeugt keine zusätzliche Evidence; Crosspost kein unabhängiger Ursprung; kanonisierte ID-Versionen |
| Evidence | korrekte distinct Counts und Zeiträume mit unbekannten Daten; Widerruf/gelöschte/unerreichbare Quellen sichtbar unterschieden; keine Doppelzählung übersetzter Kurzfassungen; kein Score |
| Collector | lokale synthetische RSS/API-Fixtures statt echter Drittseiten; byte-/zeitlimitierte Antworten, XML-Entitäten aus, keine Ressourcen-Nachladung; private IPs/IPv6/Redirect/DNS-Rebinding; 429/Retry-After, 403, 404/410, ungültiges Format |
| Jobs/Cron | fehlendes/falsches Secret, paralleler Wochenaufruf, Lease-Verlust/alte Completion, Crash im letzten Versuch, Cursor nicht vor Commit, ein Fehler isoliert pro Source, Pausierung während Run, Deadline und fairer Resume |
| Maschinenrechte | Collector kann keine Adminfreigabe, Persondaten, Workspace-/Problem-/Opportunity-/Venture-Mutation ausführen; keine breiten Tabellen-/Defaultgrants; Secrets nicht in Output/URLs |
| Handoff | nur geprüfte aktuelle Revisionen; Admin ohne CONNECT scheitert; Owner ausschließlich Session; keine externen Mitglieder/Personprofile; Doppelklick; Quellenwahl; Quelle während Export widerrufen; kontrollierte Importkopien/Takedown |
| Publish-Regression | Keine Radar-Publish-RPC; unverändert 7.7-Vorschau, keine automatischen Entries/Quellen/Namen; bestehende members-only/Public-Sitemap-Regeln |
| Retention | Ablauf unabhängig von wiederholtem Last-seen; minimale Tombstones nicht zum Archiv ausbauen; Derivate/Embeddings/kontrollierte Kopien; Restore berücksichtigt Sperren |
| UI | DE/EN, 320/375/768/Desktop; Source öffnen ohne Referrer-/Preview-Leak, Statusfilter/Pagination, neutraler Ausfall-/Missing-Evidence-Text, keine normalen User-Einstiege |

Für echte Implementierungsphasen: `npm run ci:check` und `npx supabase test db`, Browser-E2E mit lokalen Konten und gefaktem HTTP-Transport. Erst nach ausdrücklicher Source-Freigabe ein separat kontrollierter Real-Source-Smoke-Test; nicht in 7.8a und nicht als normaler CI-Test.

## 6. Bewusst offene technische Prüfungen

Diese Punkte erfordern später technische Nachweise, keine Produktentscheidung aus Vermutung:

- Reale Vercel- und Datenbank-Verbindungsgrenzen; passende Machine-Credentials ohne Service-Role-Ausweitung.
- Tatsächliche robots-/ToS-/API-/Lizenzbedingungen der noch zu wählenden Quellen und deren Änderungs-/Widerrufspflichten. Keine juristische Freigabe aus diesem Entwurf.
- Konkrete Source-Item-Identität und URL-Kanonisierung; kein universeller URL-Stripper.
- Herkunftsgebundene Sperr-/Redaktionsmechanik vor Handoff; Aufwand bewusst höher als bloß `source_url` kopieren.
- Falls später R6: geeignete Datenbasis, Fehlerraten/DE-EN-Abdeckung, Modellbetrieb und verlässliche Derivatlöschung. Kein Phase-8-Datenzugriff.

## 7. Produktentscheidungen vor 7.8b (maximal sieben)

1. **Umfang des ersten Releases:** dem empfohlenen manuellen Pilot R0/R3/R1 folgen, oder bereits Hypothesen/Evidence (R4) einschließen? Collector/Weekly/AI bleiben in beiden Fällen draußen.
2. **Pilotfokus:** welche ein bis zwei Zielgruppen/Themen und welche Regionen sollen zuerst betrachtet werden? Empfehlung: enger Fokus, DE/EN als mögliche Quellensprachen; keine allgemeine Internetsuche.
3. **Erste Quellen:** welche konkreten ein bis drei Quellen sollen zur Freigabeprüfung vorgeschlagen werden? Noch keine automatische Zulässigkeitsannahme; ein Pilot kann erst nach dieser Prüfung Inhalte speichern.
4. **Review-Verantwortung:** darf eine Plattform-Adminperson ihren eigenen manuellen Fund als relevant freigeben, oder muss eine zweite bereits eingetragene Adminperson bestätigen? Empfehlung für den begrenzten Pilot: eine ausdrücklich verantwortliche Person, protokollierte Entscheidung; kein neuer Rollenapparat.
5. **Excerpts:** im ersten Release vollständig weglassen (Empfehlung), oder als standardmäßig leeres, nur je Quelle gesondert freigebbares Kurzfeld anbieten? Eine Zeichengrenze ersetzt keine Freigabe.
6. **Aufbewahrung:** den vorgeschlagenen begrenzten Pilotfristen folgen (ungeprüft/verworfen 30 Tage, relevante Signale/Hypothesen nach 180 Tagen erneut prüfen, technische Runs 30 Tage), oder kürzere konkrete Fristen wählen? Quellenanforderungen können nur verkürzen; keine Verlängerung durch bloße erneute Erfassung.
7. **Operativer Verantwortlicher:** wer übernimmt vor Pilotstart Quellenfreigaben sowie sensible Funde/Takedown-Anfragen, und über welchen bereits betreuten internen Kanal wird ein Stop gemeldet? Dafür zunächst einen bestehenden organisatorischen Weg festlegen, keine neue Slack-/Mail-/Ticketintegration bauen.

Owner-/Contributor-/Viewer-Regeln, kein Scoring, keine automatischen Publikationen, keine Personenprofile und der vorhandene Publish-Weg sind bereits entschieden und werden nicht erneut zur Abstimmung gestellt. Detaillierte Collector-Schedules, Modelle und spätere Handoff-Erweiterungen sind keine vorgezogenen Produktblocker für den manuellen 7.8b-Pilot.
