# Problem Radar – manueller Admin-Pilot, Phase 7.8b

## Basis und Ergebnis

Basis: lokaler `main` auf `3905d6a`, die drei [7.8a-Dokumente](problem-radar-current-state.md), Code und lokale Supabase-DB bis `20261106120000`. Keine vorhandenen Radar-Tabellen. Wiederverwendet werden `platform_admins`, `is_platform_admin()`, `requirePlatformAdmin()`, Session-Supabase-Client, Server-Action-/Pagination-Muster und `SubmitButton`.

Implementiert: R0 Quellenregister, R3 interne Problemsignale/Review, R1 manuelle URL-Erfassung unter `/admin/problem-radar`. Pilotkontext: IT, digitale Arbeitsprozesse und Softwareprobleme in kleinen Teams/Organisationen; DE/EN; DACH/EU bevorzugt, Region unbekannt erlaubt. Keine geografische Ableitung aus Personenmerkmalen.

## 1. Tabellenmodell und Migrationen

| Tabelle | Inhalt |
| --- | --- |
| `radar_sources` | Name, Domain + `allowed_path` als expliziter URL-Scope, Typ, Abrufmethode, Öffentlichkeit, Permission/Status, Sprache/Region/Zielkontext, Art/Primär-/Sekundärquelle, Policy-/ToS-/API-/Lizenzverweise, Prüfnote, Reviewer/Fristen, Revision, Zeitstempel |
| `radar_signals` | Source-FK, minimierte URL/optionaler Titel/Datum, Capture-Zeit, Quellen-/Zusammenfassungssprache, eigene Kurzfassung/Beobachtung/Kontext, Tags, Reviewstatus, Sensibilität/Sperre, manuell gesetzte Verfügbarkeit, interne Actor-IDs, Revision/Fristen und Dedupe-Fingerprints |
| `radar_review_events` | Source **oder** Signal, interner Actor, Zeitpunkt, Revision, feste Aktion und optional neutraler Grundcode. Keine Textkopien früherer Fassungen |

Neue additive Migrationen in dieser Reihenfolge:

1. `20261107120000_problem_radar_manual_pilot.sql`: Tabellen, RLS, Admin-RPCs, syntaktische URL-Regeln, manuelle Bereinigung.
2. `20261107121000_problem_radar_unblock_guard.sql`: zusätzlicher Lebenszyklus-Guard. Jeder Rückweg in new/reviewed/discarded besitzt eine begrenzte Löschfrist; verworfene Zeilen können nicht wieder aktiviert werden.
3. `20261107122000_problem_radar_item_identity.sql`: stabile Item-Identität hat Vorrang; mehrere ausdrücklich verschiedene Items dürfen eine Sammelseiten-URL teilen. Der kleine manuelle Schreibweg wird pro Quelle serialisiert, sodass URL-/Item-Retries keine konkurrierenden Dubletten erzeugen.

4. `20261107123000_problem_radar_review_scope.sql`: auch erneute Freigabe/Entsperrung prüft die gespeicherte Signal-URL gegen den aktuell erlaubten Quellenpfad. Ein Scopewechsel kann nicht durch Re-Review umgangen werden.

Die drei Präzisierungen wurden nach lokaler Anwendung der ersten Migration als weitere Migrationen ergänzt. Keine historische Migration verändert. Keine Hypothesen-, Evidence-, Workspace-Handoff- oder Personen-Tabelle. Kein Excerpt-Feld.

## 2. Admin- und RLS-Modell

Jede Page **und** jede Action ruft `requirePlatformAdmin()` auf; Layout zusätzlich geschützt. Nichtberechtigte bekommen `notFound()`. Jede Daten-RPC prüft erneut den bestehenden DB-Adminstatus anhand `auth.uid()`. Ein Adminentzug wirkt beim nächsten Aufruf, ohne neues JWT.

Alle Radar-Tabellen haben RLS und keine direkten Tabellenprivilegien für PUBLIC, anon oder authenticated – einschließlich TRUNCATE. Keine direkten Admin-Tabellenpolicies. Die schmalen authenticated-RPCs sind:

- `list_radar_sources`, `save_radar_source`, `review_radar_source`
- `list_radar_signals`, `save_radar_signal`, `review_radar_signal`
- `purge_radar_expired`

`SECURITY DEFINER`, leerer `search_path`, qualifizierte Tabellen-/Funktionsnamen. Interne Hilfsfunktionen nicht für Clients ausführbar; implizites PUBLIC-Execute ausdrücklich entfernt. Create-/Edit-JSON erlaubt nur bekannte Felder; fremde Actor-/Review-/Excerpt-Felder werden DB-seitig abgewiesen. Actor, Zeit und Revision entstehen in der DB. Keine Service-Role in Radar-UI/Actions, keine neue Rolle.

Radarrechte erweitern keine Workspace-, Profil- oder Conversation-Rechte. Eigene Radar-IDs erlauben keine allgemeinen Fremdobjekt-Lookups. Interne Actor-FKs werden bei Account-Löschung auf NULL gesetzt; es gibt keine externen Autoren-Accounts und keine Radar-bedingte Löschung fremder CONNECT-Objekte.

## 3. Source-Gate

Neue Quelle: `pending` + `paused`. Dokumentierte Freigabe benötigt:

- `is_public = true`;
- nichtleere Policy-/Nutzungsreferenzen und interne Prüfnote;
- zukünftige Reviewfrist, höchstens 180 Tage;
- ausdrückliche Entscheidung einer Plattform-Adminperson.

Das ist eine verantwortete manuelle Entscheidung, keine maschinell verifizierte oder juristische Freigabe. GitHub Issues und Stack Exchange/Stack Overflow wurden **nicht** angelegt oder freigegeben. Testquellen verwenden ausschließlich `.invalid`.

Für manuelle Erfassung zusätzlich nötig: `active`, `approved`, nicht abgelaufen, `retrieval_method = manual_url`. RSS, official_api und approved_http sind speicherbare Registermetadaten, aber ohne ausführbaren Abrufweg.

**Jede** Quellenbearbeitung setzt konservativ auf pending/paused zurück – damit insbesondere Änderungen von Domain, Pfad, Methode und Scope. Eine neue Status-/Freigabeentscheidung erhöht die Source-Revision. Signal-Freigaben speichern die geprüfte Source-Revision. Auch nach einer ausdrücklichen Reaktivierung werden alte Signale deshalb nicht still wieder nutzbar, sondern benötigen erneuten Review.

## 4. Manueller Signalflow und Oberfläche

Quellenregister → Quelle anlegen → Freigabe dokumentieren → aktiv freigeben → Signal hinzufügen → manuelle URL/optionale Metadaten/eigene Texte → speichern.

Der Server führt **keinen** Abruf der URL aus: kein GET/HEAD, DNS-/Redirect-Lookup, OpenGraph, Favicon, robots.txt, Screenshot oder API-Call. Die einzige Datenverbindung des Radar-Features ist der bestehende Session-Supabase-Client. Externe Quelllinks sind normale, ausdrücklich anzuklickende Links mit `noopener noreferrer nofollow` und `no-referrer`; keine eingebetteten Ressourcen.

Liste: 25 Signale pro Seite (26 für die nächste Seite abgefragt), neueste zuerst, stabiler ID-Tie-Breaker. Filter Status/Quelle/DE-EN. Anzeige von Beobachtung, Quelle/Typ, Sprache, Quell-/Capture-Datum, Sperre und aktueller Nutzbarkeit. Detail mit eigenen Texten, Herkunft, Tags, Fristen, Revision und letztem internem Reviewer.

Review-Aktion wird als Auswahlfeld mit separatem Absenden übertragen; die UI bietet passende Übergänge an, die DB bleibt maßgeblich. Dies vermeidet die im Browsertest entdeckte fehlende Übertragung eines Submit-Button-Werts. Fehlermeldungen bleiben neutral; veraltete Revisionen melden einen Konflikt. Kein stilles Überschreiben paralleler Änderungen. Bei Fehlern ggf. aktuelle Fassung neu öffnen; kein automatischer Konflikt-Merge.

DE/EN-Nachrichten in `web/messages/{de,en}/radar.json`. Interner Einstieg neben Moderation auf `/account` nur nach Adminprüfung. Metadaten aller Radar-Unterseiten: noindex/nofollow, kein Referrer. `/admin/problem-radar` zusätzlich in `robots.ts` ausgeschlossen. Sitemap und öffentliche CONNECT-Routen unverändert.

## 5. Datenminimierung

Eigene Zusammenfassung maximal 800 Zeichen, konkrete Beobachtung 1.000, betroffener Kontext 400, optionaler Titel 200; höchstens acht Tags mit jeweils 40 Zeichen. Keine Zitateingabe, Originaltexte, Autorenprofile, Avatare, Kontaktdaten oder Social Graphs.

Hinweise und erforderliche Formularbestätigung verlangen eigene Formulierungen und minimierte Titel/URLs; sensible Einzelgeschichten sind ausgeschlossen. Ein als `sensitive` deklarierter Create-/Edit-Input wird DB-seitig abgewiesen. Nachträglich erkannte Fälle lassen sich sperren und verwerfen/minimieren. Die menschliche Inhaltsprüfung wird nicht durch eine vermeintlich zuverlässige automatische PII-Erkennung ersetzt.

Fingerprint allein ist keine Anonymisierung. URLs können Personenbezug/Tracking enthalten; die technische Normalisierung ersetzt keine manuelle Prüfung. Kein Inhaltlogging, keine Provider-Response-Logs, kein Volltext-Auditarchiv. Fehlermeldungen geben weder DB-Details noch Texte weiter.

## 6. Review und Nutzbarkeit

`new` → `reviewed` → `relevant`; alternativ `discarded`. Eigene Funde dürfen selbst freigegeben werden. Relevant bedeutet **nur** ein fachlich geprüfter Hinweis, keine Validierung oder Markt-/Nachfrageaussage.

Jede erfolgreiche relevante Mutation protokolliert Actor, Zeitpunkt, Revision und Aktion/ggf. Grundcode. Bei Inhaltsänderung wird die Freigabe auf new zurückgesetzt; Reviewer/alte Source-Freigabe werden entfernt. Quellenänderungen/Stops invalidieren die Nutzbarkeit zusätzlich über die aktuelle Source-Revision und den Source-Gate-Check.

`usable` wird bei jedem Read berechnet: Signal relevant, aktuelles Source-Gate erfüllt, gleiche freigegebene Source-Revision, keine Sensibilität/Sperre, nicht entfernt und Reviewfrist nicht abgelaufen. Verfügbarkeit und Nutzungserlaubnis sind getrennt; „vorübergehend nicht erreichbar“ ist nicht automatisch ein Takedown. Es gibt in 7.8b noch keinen nachgelagerten Verbraucher dieses Hinweises.

## 7. Deduplizierung

Version 1, ausschließlich syntaktisch:

- Stabile öffentliche **Beitrags-/Issue-ID**, falls bewusst angegeben, gehasht pro Quelle; keine Personen-ID.
- Sonst Source + SHA-256-Fingerprint der normalisierten URL.
- Scheme/Host kleinschreiben, Default-Port entfernen, leeren Pfad als `/`, Fragment entfernen.
- Ausschließlich explizite Trackingparameter `utm_*`, `fbclid`, `gclid` entfernen; übrige Parameter **einschließlich ihrer Reihenfolge** erhalten. Keine pauschale Query-Löschung, keine www-/Host-/Trailing-Slash-Gleichsetzung.
- Nur HTTP(S), keine URL-Zugangsdaten, fremden Ports oder Whitespace/Backslashes. Punktsegmente und codierte Pfadseparatoren werden konservativ abgewiesen. Exakter registrierter Host und Pfadgrenze, kein bloßer unsicherer Präfixvergleich.

Bei Dublette Rückgabe der vorhandenen ID und sichtbarer Hinweis. Keine Revision, Frist, Relevanz oder Inhalte verändern. Ein URL-only-Retry kann auch einen vorhandenen Item-Datensatz nicht verdoppeln. Verschiedene ausdrücklich angegebene Item-IDs können hingegen auf derselben Sammelseite liegen. URL/Identität bestehender Signale sind im Editor unveränderlich. Keine Embeddings, Ähnlichkeitswerte oder semantischen Merges.

## 8. Retention und manuelle Bereinigung

| Zustand | Vertrag |
| --- | --- |
| new und reviewed ohne relevante Freigabe | 30 Tage; reviewed ist kein Weg zur unbegrenzten Aufbewahrung. Bearbeitung und wiederholte Erfassung verlängern die laufende Frist nicht |
| discarded | Texte, URL, Titel, Datum und Tags sofort entfernt. Minimaler Identitäts-/Statusvermerk als Dublettensperre für höchstens 30 Tage; danach löschen |
| relevant | `review_due_at = ausdrückliche Prüfung + 180 Tage`; danach sofort nicht nutzbar und im UI überfällig, bis bewusst neu geprüft oder verworfen |
| Rückkehr von relevant in ungeprüften Zustand | neue begrenzte 30-Tage-Bearbeitungsfrist; keine ungeprüfte Zeile ohne Löschfrist |
| Review-Ereignisse | mit Signallöschung kaskadierend entfernen; übrige Ereignisse bei Bereinigung nach 180 Tagen entfernen |

`purge_radar_expired()` löscht pro Aufruf bis zu 250 fällige Signale und alte Events. Button im Radar. Keine Cron-/Collector-Ausführung. Der verantwortliche Admin muss im Pilot regelmäßig bereinigen und überfällige relevante Signale prüfen; physische automatische Löschung ist noch nicht eingerichtet. Schon vor dem Cleanup werden abgelaufene ungeprüfte Texte/URLs in allen Reads ausgeblendet und Änderungen/Freigaben abgewiesen.

Später kann ein ausdrücklich autorisierter Wartungsweg dieselbe begrenzte Bereinigung verwenden. Keine `last_seen`-Verlängerung; 7.8b benötigt kein solches Feld. Nach Ablauf/Löschung des minimalen Sperrvermerks gibt es keine unbegrenzte URL-Sperrliste: Eine spätere neue manuelle Erfassung beginnt wieder ungeprüft. Keine Retry-/Collector-Automatik, die verworfene Funde wiederbelebt.

## 9. Takedown und operativer Kanal

Quelle pausieren/zurückziehen oder Permission verweigern sperrt neue Erfassung und macht alle abhängigen Signale sofort nicht nutzbar. Einzelne Signale können blockiert, ausdrücklich wieder zur Prüfung entsperrt oder irreversibel verworfen/minimiert werden. Ein blockierter/verworfener Fund wird durch erneute Erfassung nicht reaktiviert. Es existieren noch keine Hypothesen oder Workspace-Kopien, die propagiert werden müssten.

Organisatorisch zuständig: eine vor Pilotbetrieb benannte bestehende Plattform-Adminperson; keine neue Rollen-/Ticketplattform. Tatsächlich vorhandene Konfiguration: `FEEDBACK_NOTIFICATION_EMAIL` für die interne Feedback-Benachrichtigung, bestehende Resend-Absenderkonfiguration und optional `RESEND_REPLY_TO_EMAIL`. `features/auth/betaAccess.ts` verwendet ebenfalls Reply-To mit bestehendem Fallback. Hier wird keine neue externe Supportadresse eingeführt und keine Adresse aus dem Repository zur Radar-Zusage umgedeutet.

Der Betreiber muss prüfen, welches vorhandene Postfach tatsächlich betreut ist, und es für Freigabe-/Takedown-Eskalation organisatorisch festlegen. Die vorhandene Konfiguration belegt keinen produktiv besetzten Supportkanal. Radar selbst versendet keine E-Mails/Slack-/Ticketnachrichten und benötigt keine neue Env-Variable.

## 10. Tests

DB: `supabase/tests/problem_radar_manual_pilot.sql`, echte pgTAP-Rollen/Grants/RPCs, Transaktions-Rollback und ausschließlich synthetische `.invalid`-Daten. Abgedeckt: Admin/normal/anon/Entzug, direkte Rechte, fremder Workspace, manipulierte IDs/Actor/Excerpt, Source-Zustände/Fristen/Methoden/Scope, URL-/Textgrenzen, DE/EN, unbekanntes Datum/Region, eigene Freigabe, Revisionkonflikte, Inhaltsänderung, stabile Item-/URL-/Tracking-Dedupe, Sperre/Stop/Retry, 30-/180-Tage-Fristen und Bereinigung. Tests sind von vorhandenen lokalen Radar-Zeilen unabhängig.

App: `features/problem-radar/__tests__/radar.test.ts`, bestehender Node-Test-/Dependency-Hook-Ansatz. Reale Actions mit Session-/RPC-Mocks; ein werfender Fetch-Mock bleibt bei URL-Erfassung und syntaktischer Prüfung unaufgerufen. Zusätzlich Guard, Konflikt-/Fehlerredirects ohne sensible Details, Actor-/Excerpt-Whitelist, DE/EN-Key-Gleichheit, private Metadaten und keine Remote-Loader im Feature.

Abschließender Production-Build zusätzlich mit frischen getrennten Sitzungen geprüft: angemeldeter Nichtadmin ohne Account-Einstieg, Liste/Source/Detail verweigert; Admin mit Einstieg und erfolgreicher reviewed/relevant-Abgabe.

Browser mit zwei isolierten lokalen `.invalid`-Accounts (Admin/Nichtadmin), lokalem Next-Build/Dev-Server und bereits lokal vorhandenem `agent-browser`: Source pending/paused anlegen, ausdrücklich freigeben, Signal manuell speichern, new/reviewed/relevant, Tracking-Dublette, block/unblock, Source-Pause. Normaler User kann Liste/Source/Detail nicht lesen und erhält keinen Account-Einstieg; anon ebenfalls keine Radardaten. Quelllinks nicht geöffnet; keine echten Drittquellen verwendet. Synthetische Quelle/Signale, beide Testaccounts und temporäre Auth-State-Dateien nach Abschluss entfernt. Browser-Resource-Einträge ohne `.invalid`-Abrufe, keine Browserfehler im geprüften Flow.

Liste und Detail DE/EN, Signalformular DE/EN und Quellenformular DE bei 320/375/768/1440 px, Höhe 650 px geprüft, ohne horizontalen Überlauf. Screenshots lokal kontrolliert. Datumseingabe der Browser-CLI erforderte das direkte Setzen des nativen Formularwerts; leeres Datum wurde korrekt abgewiesen. Eine zunächst fehlende Review-Aktionsübertragung wurde im echten Browser gefunden und durch ein reguläres Auswahlfeld korrigiert.

Abschlussprüfungen: `npm run ci:check` bestanden (TypeScript, 2.712 App-Tests, Production-Build, 1.966 DB-Tests in 133 Dateien); `npx supabase test db` zusätzlich separat bestanden. Neue Radar-Suite: 82 pgTAP-Prüfungen, neue App-Suite: 13 Tests. `git diff --check` bestanden. Vorhandene Build-/Lint-Warnungen außerhalb dieses Scopes unverändert. Keine externen Mail-, API-, RSS-, robots- oder Modellaufrufe. Die vollständige DB-Suite enthält die bestehenden Moderations-/CONNECT-/Workspace-/Opportunity-/Venture-/Publish-Regressionen; diese Flows wurden nicht alle erneut im Browser durchgespielt.

## 11. Bewusste Grenzen

Keine Hypothesen, Evidence-Aggregation, Workspace-Übergabe, öffentliche Radaransicht, Publikation, Opportunity-/Venture-Erzeugung, Empfehlungen, Scores, externe Abrufe, AI oder Cron. Kein tatsächlich freigegebenes Drittquellenregister ausgeliefert. Review-Notizen/Referenzen sind einfache begrenzte Textfelder, keine rechtliche Prüfung oder Dokumentenablage. Konservative Syntaxregeln unterstützen bewusst nicht jede denkbare URL-Form.

Kein ausführbarer SSRF-sicherer Collector: Die Linkprüfung ist **keine** Abrufgenehmigung oder DNS-/Egress-Sicherung. Retention ist ohne Cron organisatorisch zu betreiben; fällige relevante Signale bleiben zur erneuten menschlichen Entscheidung intern sichtbar, dürfen aber nicht als nutzbar gelten. Kein Versprechen, fremde Exporte/Backups sofort zurückholen zu können. Keine automatische Erkennung sämtlicher personenbezogener Freitextdetails.

## 12. Voraussetzungen für 7.8c und Deployment

Vor echtem Pilotmaterial: verantwortliche Adminperson und betreuter Kanal festlegen, konkrete Quellen formal prüfen, passende Pfade/Methoden dokumentieren und bewusst freigeben. Im Pilot nur manuelle Erfassung; geplante APIs sind noch keine automatischen Berechtigungen.

7.8c kann eigene Hypothesen-/Signalrelationsobjekte anschließen. Dabei dieselbe aktuelle Nutzbarkeitsprüfung und Revisionbindung DB-seitig verwenden; gesperrte/abgelaufene Hinweise nicht als Evidence übernehmen. Für spätere Workspace-Übergabe gesonderter atomarer, bewusster Übergang und Herkunfts-/Takedown-Vertrag, kein Admin-Override und keine Radar-Publish-Abkürzung. Die Runden-/Assessment-/Phase-8-Modelle bleiben unberührt.

Branch: `codex/phase-7-8b-manual-radar`. Keine neuen Env-Variablen. **DB vor Code: ja**, die neue UI benötigt die vier Migrationen/RPCs. Aus dem Repository-Root, nach Prüfung des verknüpften Supabase-Projekts:

```sh
git switch codex/phase-7-8b-manual-radar
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-8b-manual-radar
git push origin main
```

Der bestehende Git-Deploy auf Vercel folgt dem Push auf main. Bei fortgeschrittenem main stoppt `--ff-only`; dann zunächst integrieren und erneut prüfen. In dieser Phase ausschließlich lokale Migrationen/Tests, kein Production-DB-Push und kein Deployment.
