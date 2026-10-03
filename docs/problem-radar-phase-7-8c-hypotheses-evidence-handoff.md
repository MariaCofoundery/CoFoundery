# Phase 7.8c – Hypothesen, Evidence und private Workspace-Übergabe

## Ausgangspunkt und Audit

Geprüft wurden der Code auf `main` (`ad68171`), die tatsächlich lokal installierten Funktionen/Grants und die Migrationen bis `20261107123000`, die Radar-Dokumentation sowie die Workspace-Flows aus 7.6/7.7. Die vorhandenen Tabellen heißen `radar_sources`, `radar_signals`, `radar_review_events`; sie sind interne Objekte ohne direkte Clientrechte. Quellenfreigaben und Signalreviews besitzen bereits Revisionen. Eine Quellenänderung invalidiert die bisherige Freigabe; Signaländerungen setzen den Review zurück.

Wiederverwendet: `platform_admins`, `is_platform_admin()`, `requirePlatformAdmin()`, Session-Supabase-Client, bestehende DE/EN-Radar-Navigation und Formularmuster. Die frühere inline Nutzbarkeitsprüfung in `list_radar_signals` ist jetzt der gemeinsame private DB-Helfer `radar_signal_usable`.

`create_problem_workspace` verlangt eine aktive CONNECT-Mitgliedschaft. Der Radar-Handoff verlangt zusätzlich ausdrücklich ein aktives `network_profiles`-Profil; Adminstatus ersetzt keines davon. Workspace-Lesezugriff erfolgt weiterhin ausschließlich über `problem_workspace_role`. Tatsächliche Leser der Entry-Texte wurden geprüft: `get_problem_workspace` liefert Inhalte; `get_problem_workspace_development` liefert nur referenzierte Entry-IDs, keine zweite Textprojektion. Die Veröffentlichungsvorschau aus 7.7 übernimmt keine privaten Entries automatisch.

## 1. Hypothesenmodell

Neue additive Migration: `20261108120000_radar_hypotheses_handoff.sql`.

- `radar_hypotheses`: Titel (160), Problemformulierung (2.000), betroffener Kontext (400), geografischer Kontext (200), Sprache DE/EN, offene Fragen, Gegenbeobachtungen und Evidenzgrenzen (je 2.000 Zeichen), Status, Revision, Actor-/Zeitfelder und Fristen.
- `radar_hypothesis_signals`: zweckgebundene n:m-Zuordnung mit konkreter Signalrevision und optionaler manueller Ursprungsgruppe.
- `radar_hypothesis_events`: Actor, Zeitpunkt, Hypothesenrevision und neutrale Aktion. Kein Volltextarchiv früherer Fassungen.
- `radar_workspace_handoffs` und `radar_workspace_handoff_items`: minimale Herkunft und Kontrolle der ausdrücklich importierten Bestandteile.

Status: `draft`, `reviewed`, `archived`. Geprüft bedeutet ausschließlich: Ein Mensch hat diese Arbeitsannahme mit ihrer konkreten Evidence-Zuordnung geprüft. Keine Validierung, Nachfrage- oder Marktbehauptung. Archivieren ist im Pilot terminal; eine neue Arbeitsfassung wird als neue Hypothese angelegt.

## 2. Revision und Review

Erstellen beginnt bei Revision 1. Jede Änderung der Hypothesenfelder und jede Zuordnungsänderung erhöht die Revision und setzt Status, Reviewer und Reviewfrist zurück. Auch Titel, Sprache oder Ursprungsgruppe erfordern konservativ einen erneuten Review. Eine Freigabe protokolliert die geprüfte Inhaltsrevision; sie verändert nicht selbst deren Inhalt.

Bei zeitlichem Ablauf oder nachträglichem Evidence-Verlust wird der **wirksame** Status DB-seitig als `draft` berechnet. Die gespeicherte historische Reviewinformation bleibt nachvollziehbar, ist aber keine gültige Freigabe mehr. Listen, Detail-RPC und Handoff verwenden dieselbe Prüfung. Das funktioniert ohne Cron und ohne Trigger, die quer über Source-/Signal-/Hypothesen-Locks laufen. Keine automatische Wiederfreigabe: Eine erneute Signal-/Quellenfreigabe ändert Revisionen; alte Zuordnungen passen anschließend weiterhin nicht.

Vor erneutem Review müssen nicht mehr nutzbare Zuordnungen entfernt oder ausdrücklich auf eine aktuell geprüfte Signalrevision gesetzt werden. Mindestens ein Hinweis genügt. Alle verbleibenden Zuordnungen müssen aktuell nutzbar sein. Eigenreview bleibt zulässig.

## 3. Signalzuordnung

Primärschlüssel `(hypothesis_id, signal_key)` verhindert doppelte Zählung innerhalb einer Hypothese. Dasselbe Signal darf mehreren Hypothesen zugeordnet werden. `signal_revision` bindet die konkrete geprüfte Fassung. Es gibt keine Textkopie in der Zuordnung und kein stilles Nachziehen späterer Fassungen.

Bei Signalbereinigung wird die echte FK `signal_id` auf NULL gesetzt. Ein opaker `signal_key` bleibt als minimaler Herkunftsbezug erhalten. Dadurch bleiben Retention aus 7.8b, unbrauchbare Zuordnungen und gezielter Takedown möglich, ohne Texte im Radar zu archivieren. Maximal 100 Zuordnungen pro Hypothese begrenzen die atomare Pilotoperation; dies ist keine Evidenzschwelle.

## 4. Evidence-Regeln

`radar_signal_usable` verlangt: relevante Signalrevision, aktive/öffentliche/approved manuelle Quelle mit gültiger Frist, passende freigegebene Quellenrevision, keine Usage-Sperre, keine Sensibilität, nicht entfernt, gültige Signalfrist und keine abgelaufene Löschfrist. Diese Prüfung gilt bei Zuordnung, Suche, jedem Evidence-Read und Handoff.

Evidence zählt ausschließlich nutzbare Zuordnungen:

- Hinweise, unterschiedliche Registerquellen und unterschiedliche Domains separat;
- manuell gekennzeichnete Ursprungsgruppen und Hinweise mit unbekanntem Ursprung separat;
- frühestes/spätestes bekanntes Quelldatum, letzte bekannte Beobachtung, Zahl fehlender Quelldaten;
- Quellsprachen, Regionen laut Quellenregister einschließlich `unknown`, unterschiedliche Tags.

Gesamtzahl der Zuordnungen bleibt sichtbar, etwa „3 zugeordnet, davon 2 nutzbar“. Für nicht nutzbare Revisionen werden nur opake ID, gebundene Revision und Nutzbarkeit ausgegeben: keine Zusammenfassung, URL, Quellentitel, Region, Tags oder Ursprungsbeschreibung. Grenzen, fehlende Abdeckung und Gegenbeobachtungen sind eigene manuelle Hypothesenfelder. Keine Gesamtpunktzahl, Ampel, Rangfolge oder Qualitätsbewertung.

## 5. Ursprünge / Crossposts

Ein kleiner `origin_key` an der Zuordnung genügt; kein neues Clustering-Objekt. Reviewer verwenden innerhalb einer Hypothese denselben Schlüssel für bekannte gemeinsame Originale/Crossposts. Keine Personennamen; leer heißt unbekannt. Zwei unterschiedliche Gruppen werden ausdrücklich **nicht** als erwiesenermaßen unabhängige Stimmen bezeichnet. Domains oder Registerquellen liefern keine Unabhängigkeitsvermutung. Die Zuordnung ist hypothesenspezifisch und vollständig manuell.

## 6. Handoff

Neue interne Routen:

- `/admin/problem-radar/hypotheses`
- `/admin/problem-radar/hypotheses/[id]`
- `/admin/problem-radar/hypotheses/[id]/handoff`
- `/admin/problem-radar/imports`

Alle erben bestehendes `noindex, nofollow`, `no-referrer`, Adminprüfung und robots-Ausschluss. Keine Einstiege für normale Nutzer.

Die Vorschau enthält einen editierbaren Arbeitstitel, eine eigene optionale Startbeschreibung und ausdrücklich gewählte Signal-Kopien. Anfangs ist kein Signal und kein Quellenlink ausgewählt. Links benötigen eine zusätzliche Auswahl und können nur zu einem ausgewählten Signal gehören. Die geprüfte Problemformulierung wird sichtbar als `assumption` übernommen. Einzelne ausgewählte redaktionelle Kurzfassungen werden als `perspective` mit Kennzeichnung „Externe Quelle · redaktionelle Kurzfassung“ übernommen; sie werden nicht als eigene Beobachtung des übergebenden Menschen ausgegeben.

Es entstehen ausschließlich ein neuer privater Workspace, dessen Owner `auth.uid()` ist, und diese Entries. Keine externen Autoren, Mitglieder, Reviewer, Source-Policies, Adminnotizen, Einladungen, öffentlichen Probleme, Opportunities oder Ventures. `source_problem_id` und `published_problem_id` bleiben unangetastet. Autor der technischen Übergabe ist die handelnde Person; das Workspace-Label unterscheidet dies vom externen Originalautor.

Die DB prüft Adminrolle, aktive CONNECT-Mitgliedschaft und aktives Profil, sperrt die Hypothese und Evidence in definierter Reihenfolge und prüft die aktuelle Revision erneut. Erstellung, Entries, Provenance und Ereignis bilden eine Transaktion. Ein Fehler hinterlässt keinen halben Arbeitsraum. Ein UUID-Anfrageschlüssel mit Payload-Fingerprint und Transaktions-Advisory-Lock macht denselben bestätigten Vorgang auch bei parallelen Anfragen idempotent. Derselbe Schlüssel mit anderem Actor oder Inhalt wird abgewiesen. Eine berechtigte identische Wiederholung gibt lediglich den bereits erzeugten eigenen Workspace zurück; sie erzeugt auch nach Evidence-Entzug keine neue Kopie.

## 7. Provenance

Der Handoff speichert Hypothesen-ID/-Revision, Workspace-ID, Sessionactor, Zeitpunkt und Request-Fingerprint. Items speichern Signal-ID/-Revision, die bekannte erzeugte Entry-ID und die Kontrollzustände von Text und Quellenlink. Keine privaten Textsnapshots.

Die Hypothesen-Annahme besitzt Abhängigkeiten zu allen bei ihrem Review zugeordneten Signalen, auch wenn einzelne Signaltexte nicht als separate Perspektive kopiert wurden. Diese Abhängigkeiten kopieren nur IDs, keine zusätzlichen Texte/URLs. Die Vorschau erklärt dies ausdrücklich. Ein neuer Handoff bleibt immer eine bewusste Kopie; spätere Änderungen der Hypothese synchronisieren keine Workspace-Texte.

## 8. Takedown nach Handoff

Zwei getrennte Schritte:

1. **Sofortige Lesesperre:** Solange ein Feld ein kontrollierter Radar-Import ist, maskiert die private Workspace-Projektion seinen Text bzw. entfernt den Link aus der Antwort, sobald seine gebundene Grundlage nicht mehr nutzbar ist. Das gilt auch bei Ablauf, Signal-Löschung und Quellenentzug, ohne Cron und ohne zuerst einen Adminbutton zu drücken. Die normale Workspace-Berechtigung wird davor geprüft.
2. **Bestätigte physische Redaktion:** Die Adminübersicht zeigt nur Signal-ID und aggregierte Workspace-/Importzahlen. Eine Vorschau benennt aktuell kontrollierte Texte/Links. Nach Bestätigung darf `redact_radar_imports(signal_id, true)` ausschließlich die bereits bekannten, weiterhin kontrollierten Import-IDs bearbeiten. Es existiert kein frei adressierbares Workspace-/Entry-Adminwerkzeug. Texte werden durch einen neutralen Entfernungsvermerk ersetzt, Links/Labels gelöscht. Actor und Zeitpunkt werden an der betroffenen Provenance gespeichert.

Ein Trigger trennt echte spätere Workspace-Bearbeitungen **feldweise**: veränderter Text/Typ löst die Textkontrolle; veränderte URL/Quellenbezeichnung löst die Linkkontrolle. Eine Textänderung löst nicht automatisch die Kontrolle des unberührten Quellenlinks. Der Takedown sperrt betroffene Entry-Zeilen und prüft die Zustände erneut, bevor er schreibt. Eigene neue Texte und unbeteiligte Entries bleiben unverändert. Die Herkunftsmarkierung bleibt auch nach eigener Bearbeitung nachvollziehbar.

Konservative Grenze: Kontrollierte Imports sind an exakt die übernommene Revision gebunden. Auch eine spätere redaktionelle Signaländerung oder erneute Quellen-/Signalprüfung kann alte kontrollierte Imports unbrauchbar machen; neue Freigaben stellen alte Kopien nicht still wieder her. Es gibt kein historisches Freigabearchiv und keinen automatischen Reimport. Hypothesenänderung/Archivierung allein verändert die kopierten Texte nicht. Bereits exportierte Inhalte oder bewusst unabhängig neu verfasste Workspace-Inhalte werden nicht zurückgerufen. Keine semantische Erkennung, ob ein neu geschriebener Text noch inhaltlich vom früheren Signal beeinflusst ist.

## 9. Security / RLS

Alle fünf neuen Tabellen haben RLS und keinerlei direkte Rechte für PUBLIC, anon oder authenticated. Neue Helper sind nicht als Client-API ausführbar. Die eng benannten authenticated-RPCs sind `SECURITY DEFINER` mit leerem `search_path` und prüfen die vorhandene Adminfunktion bei jedem Aufruf. Keine Actor-/Owner-Parameter. UI-Actions verwenden ausschließlich den Sessionclient, keinen Service-Role-Client.

Adminrechte und Provenance verleihen keine privaten Workspace-Rechte. Selbst ein zweiter Radaradmin kann den fremden Workspace nicht lesen. Die Importübersicht zeigt weder Workspace-IDs/-Titel noch Owner, Mitglieder, Inhalte, Opportunities oder Ventures. Source-/Signal-Retention löscht keine privaten Workspaces. Owner-Account-Löschung verwendet die bestehenden Kaskaden: Workspace, Entries, Handoff und Items verschwinden; Hypothesen-Actorbezüge werden wie andere Auditbezüge anonymisiert.

Keine HTTP-Abfrage von Quellen, DNS-/Redirect-/robots-/OpenGraph-/Favicon-Prüfung, kein Modellaufruf, kein Cron. Externe Quelllinks bleiben einfache Links mit `noopener noreferrer nofollow`. Die neue Workspace-Herkunftsmarkierung enthält keine Radar-Adminnotizen oder internen Quellrichtlinien.

## 10. Retention / Betrieb

Entwurf: 30 Tage seit letzter ausdrücklich gespeicherter Änderung. Archiviert: 30 Tage seit Archivierung. Geprüft: spätestens nach 180 Tagen erneute Prüfung, anschließend 30 Tage Nachfrist zur Bereinigung (insgesamt 210 Tage seit Review). Nach 180 Tagen keine neue Übergabe; nach Ablauf der Löschfrist keine Hypothesenanzeige. Das Adminwerkzeug `purge_radar_hypotheses()` entfernt pro Aufruf bis zu 250 abgelaufene Hypothesen und Ereignisse älter als 180 Tage. Keine Verlängerung durch Lesen, Duplikate oder Handoff. Ein neuer menschlicher Review setzt bewusst neue Fristen.

Ohne Cron muss die verantwortliche Adminperson die Bereinigung regelmäßig ausführen. Bestehende Signalbereinigung aus 7.8b bleibt separat bestehen. Minimale ID-Provenance bleibt zweckgebunden erhalten, solange die zugehörigen privaten Imports existieren; Löschung des Entry/Workspace entfernt sie. Keine unbegrenzte Aufbewahrung der Hypothesentexte im Radar, kein Volltext-Auditarchiv. Takedown nach Signalpurge funktioniert weiterhin über den opaken Signalherkunftsschlüssel.

## 11. Tests

`supabase/tests/radar_hypotheses_handoff.sql`: 92 echte pgTAP-Prüfungen mit Transaktions-Rollback und synthetischen `.invalid`-Fixtures. Unter anderem:

- Admin, Normaluser, anon, Entzug, direkte Grants/RLS, interne Helper, manipulierte Actor-/Signal-/Entry-IDs;
- Erstellen, Editieren, Review, Archivierung, Fristen, konkrete Revision, ein/mehrere Signale, n:m, Dedupe;
- Quellen-/Domainzählung, Crosspostgruppe, unbekannte Herkunft/Datum/Region, Datumsspanne und Sprachen, kein Score;
- Evidence-Verlust durch Source-Entzug, Sperre, Frist und neue Revision; maskierte unbrauchbare Evidence;
- Admin ohne CONNECT bzw. ohne aktives Profil, Fremdsignal, fehlende Bestätigung, Sessionowner, Auswahl, keine Mitglieder-/Publish-/Opportunity-Kopie;
- injizierter Fehler nach Workspace-Erstellung: vollständiger Rollback einschließlich Provenance;
- identische Wiederholung, veränderte Retry-Payload, getrennte Workspace-Berechtigung;
- sofortige Importsperre, bestätigte gezielte Redaktion, unangetastete private Entries, Erhalt späterer Ownertexte und Entfernung des noch kontrollierten Links;
- Hypothesen-/Signalbereinigung erhält Workspace und minimale Takedown-Herkunft.

`features/problem-radar/__tests__/hypotheses.test.ts`: 11 App-Tests mit bestehendem Node-/Dependency-Hook-Muster. Sessionguard, Payload-Whitelist, manipulierte Daten, Auswahl/Bestätigung, neutrale Konfliktantworten, enge Redaktionsparameter, DE/EN-Texte, fehlende automatisierte Public-Objekte. Ein werfender `fetch`-Mock bleibt im Handoff unaufgerufen. Die 13 bestehenden Radar-App-Tests laufen unverändert mit.

Browser auf lokalem Production-Build mit getrennten synthetischen Admin-/Nichtadmin-Sitzungen: Hypothese über echtes Formular erstellen, zwei Signale zuordnen, Evidence anzeigen, reviewen, keine vorausgewählten Kopien, ein Signal plus Link wählen, Vorschau, Bestätigung und neuer privater Workspace. Source-Entzug danach per lokalem Session-RPC; Redaktion anschließend über echte Browser-Vorschau/Bestätigung. Neue Ownertexte und unbeteiligter Entry bleiben sichtbar. Nichtadmin erhält keine Daten auf Liste/Detail/Handoff/Importübersicht oder fremdem Workspace; anon keine Radardaten. Der vorhandene Forschungsdialog des synthetischen Founderkontos wurde mit „Nein, danke“ geschlossen.

Evidence, Handoff-Auswahl, Importübersicht und Workspace DE/EN bei 320/375/768/1440 px und 650 px Höhe geprüft; Handoff-Bestätigung zusätzlich DE bei allen vier Breiten. Kein horizontaler Überlauf, Screenshots visuell kontrolliert, keine Browserfehler. Keine Quelllinks geöffnet; keine `.invalid`-Resource-Requests. Zwei tatsächlich parallele lokale HTTP-RPC-Bestätigungen mit demselben Request erzeugten denselben Workspace. Dieser Integrationstest nutzte einen Sessionclient, keinen Admin-Bypass.

Nach Entfernung der isolierten Browserfixtures ist `npm run ci:check` bestanden: TypeScript, 2.723 App-Tests, Production-Build und 2.058 DB-Tests in 134 Dateien. `npx supabase test db` ist zusätzlich separat bestanden (2.058 Tests / 134 Dateien). `git diff --check` ist bestanden. Beide Browserkonten, ihre synthetischen Radardaten/Workspaces und temporären Auth-State-Dateien wurden entfernt. Ein früher Lauf fand erwartbar zwei globale Profil-Zähltests durch das noch vorhandene synthetische aktive Browserprofil; kein Produktcode wurde dafür verändert. Die gesamte DB-Suite enthält die bestehenden Moderations-, CONNECT-, Workspace-, Opportunity-, Venture- und Publish-Regressionen. Diese Altflows wurden nicht sämtlich nochmals im Browser durchgespielt.

## 12. Bewusste Grenzen

Kein Collector, keine echten Drittquellen, kein automatisches Clustering, AI, Empfehlung, Notification, Opportunity-/Venture-Erzeugung oder Radar-Publish. Keine neue Workspace-Rolle, keine privaten Admin-Leserechte. Keine Gleichsetzung einer Domain oder Ursprungsgruppe mit unabhängiger Evidenz. Kein vollautomatisches Erkennen von Personenbezug oder inhaltlicher Abhängigkeit. Review- und Retentionbetrieb bleibt organisatorisch betreut.

## 13. Voraussetzungen für den ersten Collector

Quellenbezogene ausdrückliche Erlaubnis, passender Abrufmechanismus und Scope, technische Egress-/SSRF-Sicherung, Rate-/Laufzeitlimits, Retries/Idempotenz und datensparsame Logs separat konzipieren und testen. Bestehende manuelle URL-Validierung ist keine Fetch-Genehmigung. Ein Collector muss denselben Source-/Revision-/Retentionvertrag einhalten, darf keine Eigenfreigabe oder Veröffentlichung auslösen und muss Takedown-Provenance berücksichtigen. Menschliche Prüfung bleibt Gate. Keine dieser Collector-Funktionen wurde hier aktiviert.

## Deployment

Branch: `codex/phase-7-8c-hypotheses-handoff`. Eine neue Migration, keine neuen Env-Variablen, keine Vercel-Konfigurationsänderung. **DB vor Code: ja.** Aus dem Repository-Root nach Prüfung des verknüpften Supabase-Projekts:

```sh
git switch codex/phase-7-8c-hypotheses-handoff
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-8c-hypotheses-handoff
git push origin main
```

Vercel deployt über den bestehenden main-Git-Deploy. Bei inzwischen fortgeschrittenem main stoppt `--ff-only`; dann integrieren und erneut prüfen. Kein Production-DB-Push oder Production-Deploy während dieser Umsetzung.
